import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { db } from './db';
import type { Product, Transaction } from './types';

const firebaseConfig = {
  projectId: "al-rawi-6a998",
  appId: "1:380948047880:web:87cc3e9b812c2c914009bd",
  storageBucket: "al-rawi-6a998.firebasestorage.app",
  apiKey: "AIzaSyBHz-s08S4vxJ5tY7TR5yG4c5gPC6l9P6Q",
  authDomain: "al-rawi-6a998.firebaseapp.com",
  messagingSenderId: "380948047880"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const cloudDb = getFirestore(app);

// Enable offline persistence for Firestore if supported
try {
  enableIndexedDbPersistence(cloudDb).catch(() => {});
} catch {}

let isSyncingFromCloud = false;

/**
 * 🔄 Start bi-directional real-time sync between Cloud Firestore and Local Dexie DB
 * High-performance batch operations for 600+ products
 */
export function initCloudSync() {
  console.log('⚡ Initializing High-Performance Cloud Sync with Firebase Firestore...');

  // 1. Listen to Firestore "products" collection
  onSnapshot(collection(cloudDb, 'products'), async (snapshot) => {
    isSyncingFromCloud = true;
    try {
      const cloudItems: Product[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      
      if (cloudItems.length > 0) {
        // Fast bulkPut in local Dexie DB (1 atomic operation)
        await db.products.bulkPut(cloudItems);

        // Remove local items deleted from cloud
        const cloudIds = new Set(cloudItems.map(item => item.id));
        const localProducts = await db.products.toArray();
        const toDelete = localProducts.filter(p => !cloudIds.has(p.id)).map(p => p.id);
        if (toDelete.length > 0) {
          await db.products.bulkDelete(toDelete);
        }
      }
    } catch (err) {
      console.error('Error syncing products from cloud:', err);
    } finally {
      isSyncingFromCloud = false;
    }
  }, (err) => {
    console.warn('Firestore products listener error:', err);
  });

  // 2. Listen to Firestore "transactions" collection
  onSnapshot(collection(cloudDb, 'transactions'), async (snapshot) => {
    isSyncingFromCloud = true;
    try {
      const cloudTransactions: Transaction[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      if (cloudTransactions.length > 0) {
        await db.transactions.bulkPut(cloudTransactions);
      }
    } catch (err) {
      console.error('Error syncing transactions from cloud:', err);
    } finally {
      isSyncingFromCloud = false;
    }
  }, (err) => {
    console.warn('Firestore transactions listener error:', err);
  });
}

/**
 * 📤 Push a single product to Cloud Firestore
 */
export async function syncProductToCloud(product: Product) {
  try {
    const ref = doc(cloudDb, 'products', product.id);
    await setDoc(ref, product, { merge: true });
  } catch (err) {
    console.error('Failed to sync product to cloud:', err);
  }
}

/**
 * ⚡ Batch sync large list of products (600+ items) using Firestore writeBatch (500 items max per batch)
 */
export async function syncProductsBatchToCloud(products: Product[]) {
  if (!products.length) return;
  const BATCH_SIZE = 450;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(cloudDb);
    for (const p of chunk) {
      const ref = doc(cloudDb, 'products', p.id);
      batch.set(ref, p, { merge: true });
    }
    await batch.commit();
  }
}

/**
 * 🗑️ Delete a product from Cloud Firestore
 */
export async function deleteProductFromCloud(productId: string) {
  try {
    const ref = doc(cloudDb, 'products', productId);
    await deleteDoc(ref);
  } catch (err) {
    console.error('Failed to delete product from cloud:', err);
  }
}

/**
 * 📤 Push a transaction to Cloud Firestore
 */
export async function syncTransactionToCloud(tx: Transaction) {
  try {
    const ref = doc(cloudDb, 'transactions', tx.id);
    await setDoc(ref, tx, { merge: true });
  } catch (err) {
    console.error('Failed to sync transaction to cloud:', err);
  }
}
