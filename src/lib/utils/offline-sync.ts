/**
 * Syncs queued offline orders to the server once connectivity is restored.
 */

import { getPendingOrders, removeOfflineOrder, getPendingOrderCount } from './offline-store';
import { createOrder } from '$lib/api/order';
import { toast } from 'svelte-sonner';

let isSyncing = false;

export async function syncOfflineOrders(
	businessId: string
): Promise<{ synced: number; failed: number }> {
	if (isSyncing) return { synced: 0, failed: 0 };
	isSyncing = true;

	try {
		const pending = await getPendingOrders(businessId);
		let synced = 0;
		let failed = 0;

		for (const order of pending) {
			try {
				await createOrder(order.businessId, order.data);
				await removeOfflineOrder(order.id);
				synced++;
			} catch (err) {
				failed++;
				console.error(`Failed to sync order ${order.id}:`, err);
			}
		}

		if (synced > 0) {
			toast.success(`${synced} offline order${synced === 1 ? '' : 's'} synced`);
		}
		if (failed > 0) {
			toast.error(`${failed} order${failed === 1 ? '' : 's'} failed to sync`);
		}

		return { synced, failed };
	} finally {
		isSyncing = false;
	}
}

export { getPendingOrderCount } from './offline-store';
