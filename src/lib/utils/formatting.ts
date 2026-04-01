/**
 * Centralized date and status formatting utilities.
 * Single source of truth — do NOT duplicate these in route/component files.
 */

// ==================== DATE FORMATTING ====================

/** "Mar 28, 2026" */
export function formatDate(dateString?: string | null): string {
	if (!dateString) return '-';
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

/** "Mar 28" (no year — for charts, analytics) */
export function formatDateShort(dateString: string): string {
	return new Date(dateString).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'short'
	});
}

/** "Mar 28, 2026, 02:30 PM" */
export function formatDateTime(dateString?: string | null): string {
	if (!dateString) return '-';
	return new Date(dateString).toLocaleString(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/** "02:30 PM" */
export function formatTime(dateString: string): string {
	return new Date(dateString).toLocaleTimeString(undefined, {
		hour: '2-digit',
		minute: '2-digit'
	});
}

// ==================== BADGE VARIANTS ====================

export type BadgeVariant = 'default' | 'destructive' | 'secondary' | 'outline';

export interface BadgeInfo {
	variant: BadgeVariant;
	text: string;
	class?: string;
}

/** Generic status → badge variant mapping. Covers orders, payments, subscriptions, etc. */
export function getStatusBadgeVariant(status: string): BadgeVariant {
	switch (status) {
		case 'active':
		case 'completed':
		case 'paid':
		case 'confirmed':
		case 'processed':
			return 'default';
		case 'cancelled':
		case 'refunded':
		case 'failed':
		case 'suspended':
		case 'expired':
			return 'destructive';
		case 'pending':
		case 'preparing':
		case 'trialing':
		case 'scheduled':
		case 'archived':
		case 'inactive':
			return 'secondary';
		default:
			return 'outline';
	}
}

// ==================== ORDER FORMATTING ====================

const ORDER_TYPE_LABELS: Record<string, string> = {
	dine_in: 'Dine In',
	takeaway: 'Takeaway',
	delivery: 'Delivery',
	online: 'Online',
	qr_order: 'QR Order'
};

export function formatOrderType(type: string): string {
	return ORDER_TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
