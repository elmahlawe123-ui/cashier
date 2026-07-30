import { liveQuery } from 'dexie';
import { db, generateId } from './db';
import type { Table } from 'dexie';

export type CollectionName = 'products' | 'transactions' | 'customers' | 'settings';

export interface DocRef {
  id: string;
  path: string;
  _collection: CollectionName;
  _id: string;
}

export interface CollectionRef {
  _collection: CollectionName;
}

export interface QueryRef {
  _collection: CollectionName;
  _filters: Array<{ field: string; op: string; value: any }>;
}

function getTable(name: CollectionName): Table<any, string> {
  const map: Record<CollectionName, Table<any, string>> = {
    products: db.products as Table<any, string>,
    transactions: db.transactions as Table<any, string>,
    customers: db.customers as Table<any, string>,
    settings: db.settings as Table<any, string>
  };
  return map[name];
}

export function collection(_dbInstance: any, collectionName: CollectionName): CollectionRef {
  return { _collection: collectionName };
}

export function doc(arg1: any, arg2?: string, arg3?: string): DocRef {
  if (typeof arg2 === 'string' && arg3 !== undefined) {
    return { id: arg3, path: `${arg2}/${arg3}`, _collection: arg2 as CollectionName, _id: arg3 };
  } else if (typeof arg2 === 'string' && arg3 === undefined) {
    const id = generateId();
    return { id, path: `${arg2}/${id}`, _collection: arg2 as CollectionName, _id: id };
  } else if (arg1 && arg1._collection && typeof arg2 === 'string') {
    return { id: arg2, path: `${arg1._collection}/${arg2}`, _collection: arg1._collection, _id: arg2 };
  }
  const id = generateId();
  return { id, path: `products/${id}`, _collection: 'products', _id: id };
}

export function query(collectionRef: CollectionRef, ...constraints: any[]): QueryRef {
  const base: QueryRef = {
    _collection: collectionRef._collection,
    _filters: []
  };

  for (const c of constraints) {
    if (c._type === 'where') {
      base._filters.push({ field: c.field, op: c.op, value: c.value });
    }
  }
  return base;
}

export function where(field: string, op: string, value: any) {
  return { _type: 'where', field, op, value };
}

export async function getDocs(ref: CollectionRef | QueryRef) {
  const table = getTable(ref._collection);
  let data = await table.toArray();

  const qRef = ref as QueryRef;
  if (qRef._filters?.length) {
    data = data.filter(item => {
      return qRef._filters.every(f => {
        const val = item[f.field];
        if (f.op === '==') return val === f.value;
        if (f.op === '!=') return val !== f.value;
        return true;
      });
    });
  }

  return {
    docs: data.map(item => ({
      id: item.id,
      data: () => item,
      exists: () => true
    })),
    empty: data.length === 0,
    size: data.length
  };
}

export async function addDoc(collectionRef: CollectionRef, data: any) {
  const table = getTable(collectionRef._collection);
  const id = data.id || generateId();
  const record = { ...data, id, createdAt: new Date().toISOString() };
  await table.put(record);
  return { id };
}

export async function setDoc(docRef: DocRef, data: any) {
  const table = getTable(docRef._collection);
  await table.put({ ...data, id: docRef._id });
}

export async function updateDoc(docRef: DocRef, data: any) {
  const table = getTable(docRef._collection);
  const existing = await table.get(docRef._id);
  await table.put({ ...existing, ...data, id: docRef._id });
}

export async function deleteDoc(docRef: DocRef) {
  const table = getTable(docRef._collection);
  await table.delete(docRef._id);
}

export function onSnapshot(ref: CollectionRef | QueryRef, callback: (snap: any) => void) {
  const table = getTable(ref._collection);
  const subscription = liveQuery(() => table.toArray()).subscribe({
    next: (data) => {
      callback({
        docs: data.map(item => ({ id: item.id, data: () => item, exists: () => true })),
        empty: data.length === 0,
        size: data.length
      });
    }
  });
  return () => subscription.unsubscribe();
}

export const firestoreDb = db;
