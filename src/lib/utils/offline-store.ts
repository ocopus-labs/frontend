/**
 * IndexedDB-backed offline store for POS.
 *
 * Stores:
 *   - 'offline-orders' — orders queued for sync while offline
 *   - 'menu-cache'     — persistent menu snapshot for offline use
 *   - 'tables-cache'   — persistent tables snapshot for offline use
 */

import { browser } from '$app/environment';

const DB_NAME = 'restaurantpro-offline';
const DB_VERSION = 2;

export interface OfflineOrder {
	id: string; // local UUID
	businessId: string;
	data: any; // CreateOrderPayload
	createdAt: string;
	status: 'pending' | 'syncing' | 'failed';
	error?: string;
}

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		// IndexedDB only exists in the browser. Guard against SSR / non-browser
		// contexts so we reject cleanly instead of dereferencing a null request.
		if (!browser || typeof indexedDB === 'undefined') {
			reject(new Error('IndexedDB is not available outside the browser'));
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains('offline-orders')) {
				db.createObjectStore('offline-orders', { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains('menu-cache')) {
				db.createObjectStore('menu-cache', { keyPath: 'businessId' });
			}
			if (!db.objectStoreNames.contains('tables-cache')) {
				db.createObjectStore('tables-cache', { keyPath: 'businessId' });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/** Queue an order for later sync. */
export async function queueOfflineOrder(order: OfflineOrder): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('offline-orders', 'readwrite');
		const store = tx.objectStore('offline-orders');
		const req = store.put(order);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
		tx.oncomplete = () => db.close();
	});
}

/** Get all pending/failed orders for a business. */
export async function getPendingOrders(businessId: string): Promise<OfflineOrder[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('offline-orders', 'readonly');
		const store = tx.objectStore('offline-orders');
		const req = store.getAll();
		req.onsuccess = () => {
			const all: OfflineOrder[] = req.result ?? [];
			resolve(all.filter((o) => o.businessId === businessId && o.status !== 'syncing'));
		};
		req.onerror = () => reject(req.error);
		tx.oncomplete = () => db.close();
	});
}

/** Remove an order that has been successfully synced. */
export async function removeOfflineOrder(id: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('offline-orders', 'readwrite');
		const store = tx.objectStore('offline-orders');
		const req = store.delete(id);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
		tx.oncomplete = () => db.close();
	});
}

/** Count pending/failed orders for a business. */
export async function getPendingOrderCount(businessId: string): Promise<number> {
	const orders = await getPendingOrders(businessId);
	return orders.length;
}

/** Persist menu data to IndexedDB for offline access. */
export async function cacheMenu(businessId: string, menuData: any): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('menu-cache', 'readwrite');
		const store = tx.objectStore('menu-cache');
		const req = store.put({ businessId, menuData, cachedAt: new Date().toISOString() });
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
		tx.oncomplete = () => db.close();
	});
}

/** Retrieve cached menu data, or null if not found. */
export async function getCachedMenu(businessId: string): Promise<any | null> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('menu-cache', 'readonly');
		const store = tx.objectStore('menu-cache');
		const req = store.get(businessId);
		req.onsuccess = () => {
			const result = req.result;
			resolve(result ? result.menuData : null);
		};
		req.onerror = () => reject(req.error);
		tx.oncomplete = () => db.close();
	});
}

/** Persist tables data to IndexedDB for offline access. */
export async function cacheTables(businessId: string, tablesData: any): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('tables-cache', 'readwrite');
		const store = tx.objectStore('tables-cache');
		const req = store.put({ businessId, tablesData, cachedAt: new Date().toISOString() });
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
		tx.oncomplete = () => db.close();
	});
}

/** Retrieve cached tables data, or null if not found. */
export async function getCachedTables(businessId: string): Promise<any | null> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('tables-cache', 'readonly');
		const store = tx.objectStore('tables-cache');
		const req = store.get(businessId);
		req.onsuccess = () => {
			const result = req.result;
			resolve(result ? result.tablesData : null);
		};
		req.onerror = () => reject(req.error);
		tx.oncomplete = () => db.close();
	});
}
