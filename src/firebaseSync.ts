import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
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
 */
export function initCloudSync() {
  console.log('⚡ Initializing Real-time Cloud Sync with Firebase Firestore...');

  // 1. Listen to Firestore "products" collection
  onSnapshot(collection(cloudDb, 'products'), async (snapshot) => {
    isSyncingFromCloud = true;
    try {
      const cloudItems: Product[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      
      // Update local Dexie DB with cloud products
      for (const item of cloudItems) {
        if (item.id && item.name) {
          await db.products.put(item);
        }
      }

      // Handle deletions from cloud
      const cloudIds = new Set(cloudItems.map(item => item.id));
      const localProducts = await db.products.toArray();
      for (const localDoc of localProducts) {
        if (!cloudIds.has(localDoc.id)) {
          await db.products.delete(localDoc.id);
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

      for (const tx of cloudTransactions) {
        if (tx.id) {
          await db.transactions.put(tx);
        }
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
 * 📤 Push a product to Cloud Firestore
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
