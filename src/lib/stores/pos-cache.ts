/**
 * Client-side cache for POS data (menu, tables).
 * Keeps data in memory for the duration of a business session
 * so POS navigation is instant — no re-fetching on every page.
 *
 * Cache is keyed by businessId and invalidated when:
 * - Business changes (user switches to different business)
 * - Manual invalidation (menu update, table change)
 * - TTL expires (5 min)
 */

import { writable, get } from 'svelte/store';
import { getMenu } from '$lib/api/menu';
import { getTables } from '$lib/api/table';
import { cacheMenu as persistMenuToIDB, getCachedMenu as getMenuFromIDB } from '$lib/utils/offline-store';
import type { MenuResponse } from '$lib/types/menu';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
	data: T;
	businessId: string;
	timestamp: number;
}

function isValid<T>(entry: CacheEntry<T> | null, businessId: string): entry is CacheEntry<T> {
	if (!entry) return false;
	if (entry.businessId !== businessId) return false;
	if (Date.now() - entry.timestamp > CACHE_TTL) return false;
	return true;
}

// --- Menu cache ---

const menuCache = writable<CacheEntry<MenuResponse> | null>(null);

export async function getCachedMenu(businessId: string): Promise<MenuResponse> {
	const current = get(menuCache);
	if (isValid(current, businessId)) return current.data;

	try {
		const data = await getMenu(businessId);
		menuCache.set({ data, businessId, timestamp: Date.now() });
		// Persist to IndexedDB for offline fallback
		persistMenuToIDB(businessId, data).catch(() => {});
		return data;
	} catch {
		// Network failed — try IndexedDB offline cache
		const cached = await getMenuFromIDB(businessId);
		if (cached) return cached as MenuResponse;
		throw new Error('Menu unavailable offline');
	}
}

// --- Tables cache ---

const tablesCache = writable<CacheEntry<{ tables: any[] }> | null>(null);

export async function getCachedTables(businessId: string): Promise<{ tables: any[] }> {
	const current = get(tablesCache);
	if (isValid(current, businessId)) return current.data;

	const data = await getTables(businessId);
	tablesCache.set({ data, businessId, timestamp: Date.now() });
	return data;
}

// --- Invalidation ---

export function invalidateMenuCache() {
	menuCache.set(null);
}

export function invalidateTablesCache() {
	tablesCache.set(null);
}

export function invalidateAllPosCache() {
	menuCache.set(null);
	tablesCache.set(null);
}
