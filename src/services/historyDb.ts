import type { HistoryRecord } from '../types';

const DB_NAME = 'localscan-db';
const DB_VERSION = 1;
const STORE_NAME = 'extraction-history';
const MAX_HISTORY_RECORDS = 50;

function openHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open IndexedDB'));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openHistoryDb().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = run(store);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('IndexedDB transaction failed'));
    };
  }));
}

export async function listHistoryRecords(): Promise<HistoryRecord[]> {
  if (typeof indexedDB === 'undefined') return [];

  const records = await withStore<HistoryRecord[]>('readonly', store => store.getAll() as IDBRequest<HistoryRecord[]>);
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Atomic save + prune: both operations run in a single IDB transaction so concurrent
 *  saveHistoryRecord calls (e.g. multi-page PDF extraction) serialize correctly and
 *  cannot race past MAX_HISTORY_RECORDS or torn-write each other. */
export async function saveHistoryRecord(record: HistoryRecord): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  const db = await openHistoryDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // 1. Insert / update the new record.
      store.put(record);

      // 2. Within the SAME transaction, fetch all keys + createdAt to prune excess.
      //    Using getAll() so we can sort by createdAt deterministically.
      const getAllReq = store.getAll() as IDBRequest<HistoryRecord[]>;
      getAllReq.onsuccess = () => {
        const all = getAllReq.result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const expired = all.slice(MAX_HISTORY_RECORDS);
        for (const r of expired) {
          store.delete(r.id);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB save+prune transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    });
  } finally {
    db.close();
  }
}

export async function clearHistoryRecords(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  await withStore<undefined>('readwrite', store => store.clear() as IDBRequest<undefined>);
}
