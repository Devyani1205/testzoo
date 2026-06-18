// IndexedDB utilities for offline caching and sync

const DB_NAME = 'testzoo-db';
const DB_VERSION = 1;
const STORES = {
  CHAT_HISTORY: 'chat_history',
  ORDERS: 'orders',
  RECOMMENDATIONS: 'recommendations',
  SYNC_QUEUE: 'sync_queue',
};

export class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Chat history
        if (!db.objectStoreNames.contains(STORES.CHAT_HISTORY)) {
          const store = db.createObjectStore(STORES.CHAT_HISTORY, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Orders
        if (!db.objectStoreNames.contains(STORES.ORDERS)) {
          const store = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }

        // Recommendations
        if (!db.objectStoreNames.contains(STORES.RECOMMENDATIONS)) {
          const store = db.createObjectStore(STORES.RECOMMENDATIONS, { keyPath: 'id' });
          store.createIndex('doctor_id', 'doctor_id', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }

        // Sync queue for offline actions
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async saveChatMessage(message: any): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.CHAT_HISTORY], 'readwrite');
      const store = tx.objectStore(STORES.CHAT_HISTORY);
      const request = store.add({
        ...message,
        timestamp: Date.now(),
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getChatHistory(limit: number = 50): Promise<any[]> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.CHAT_HISTORY], 'readonly');
      const store = tx.objectStore(STORES.CHAT_HISTORY);
      const index = store.index('timestamp');
      const range = IDBKeyRange.lowerBound(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
      const request = index.getAll(range);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result.slice(-limit));
    });
  }

  async saveOrder(order: any): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.ORDERS], 'readwrite');
      const store = tx.objectStore(STORES.ORDERS);
      const request = store.put(order);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async queueSyncAction(action: any): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.add({
        ...action,
        createdAt: Date.now(),
        synced: false,
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSyncQueue(): Promise<any[]> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.SYNC_QUEUE], 'readonly');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result.filter((item) => !item.synced));
    });
  }

  async markSyncedAction(id: number): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.SYNC_QUEUE], 'readwrite');
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.synced = true;
          const updateRequest = store.put(item);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve();
        }
      };
    });
  }
}

export const dbManager = new IndexedDBManager();
