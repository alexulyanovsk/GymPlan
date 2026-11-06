/**
 * Файл: js/db.js
 * Версия: 1.3.0
 * Описание: dbPromise сбрасывается при ошибке, таймеры очищаются.
 */

const DB_NAME = 'GymPlanDB';
const DB_VERSION = 1;
const STORE_NAME = 'state';

let dbPromise = null;

function getDB() {
  if (dbPromise) return dbPromise;
  const p = new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err, db) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) {
        dbPromise = null;
        reject(err);
      } else {
        resolve(db);
      }
    };
    const timer = setTimeout(() => finish(new Error('DB open timeout')), 3000);

    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      finish(e);
      return;
    }

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = e => finish(null, e.target.result);
    req.onerror = e => finish(e.target.error || new Error('DB open error'));
    req.onblocked = () => finish(new Error('DB blocked'));
  });

  dbPromise = p.catch(err => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

function withTimeout(promise, ms = 3000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function dbSet(key, value) {
  const db = await getDB();
  const p = new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(STORE_NAME, 'readwrite');
    } catch (e) {
      dbPromise = null;
      reject(e);
      return;
    }
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error || new Error('DB tx error'));
    tx.onabort = () => reject(new Error('DB tx aborted'));
  });
  return withTimeout(p);
}

export async function dbGet(key) {
  const db = await getDB();
  const p = new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(STORE_NAME, 'readonly');
    } catch (e) {
      dbPromise = null;
      reject(e);
      return;
    }
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error || new Error('DB get error'));
  });
  return withTimeout(p);
}

export async function dbDelete(key) {
  const db = await getDB();
  const p = new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(STORE_NAME, 'readwrite');
    } catch (e) {
      dbPromise = null;
      reject(e);
      return;
    }
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error || new Error('DB tx error'));
  });
  return withTimeout(p);
}
