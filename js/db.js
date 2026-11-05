/**
 * Файл: js/db.js
 * Версия: 1.2.0
 * Описание: Добавлены таймауты для предотвращения зависания IndexedDB.
 */

const DB_NAME = 'GymPlanDB';
const DB_VERSION = 1;
const STORE_NAME = 'state';

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    const timer = setTimeout(() => {
      console.warn('[DB] Open timeout');
      reject(new Error('DB open timeout'));
    }, 3000);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = e => { clearTimeout(timer); resolve(e.target.result); };
    req.onerror = e => { clearTimeout(timer); reject(e.target.error); };
    req.onblocked = () => { clearTimeout(timer); reject(new Error('DB blocked')); };
  });
  return dbPromise;
}

function withTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), ms))
  ]);
}

export async function dbSet(key, value) {
  const db = await getDB();
  const p = new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
  return withTimeout(p);
}

export async function dbGet(key) {
  const db = await getDB();
  const p = new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  });
  return withTimeout(p);
}
