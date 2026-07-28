import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export interface ApiKey {
	id: string;
	name: string;
	keyPrefix: string;
	scopes: string[];
	permissions: string[];
	rateLimit: number;
	lastUsedAt: string | null;
	expiresAt: string | null;
	isActive: boolean;
	createdAt: string;
}

export interface CreateApiKeyPayload {
	name: string;
	scopes: string[];
	permissions: string[];
	expiresAt?: string;
}

export interface CreateApiKeyResponse {
	key: string;
	apiKey: ApiKey;
}

// ==================== API FUNCTIONS ====================

export async function getApiKeys(
	businessId: string,
	options?: { fetch?: typeof fetch }
): Promise<ApiKey[]> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get<ApiKey[]>(`/business/${businessId}/api-keys`);
}

export async function createApiKey(
	businessId: string,
	payload: CreateApiKeyPayload
): Promise<CreateApiKeyResponse> {
	const api = getApiClient();
	return api.post<CreateApiKeyResponse>(`/business/${businessId}/api-keys`, payload);
}

export async function revokeApiKey(
	businessId: string,
	keyId: string
): Promise<{ message: string }> {
	const api = getApiClient();
	return api.delete<{ message: string }>(`/business/${businessId}/api-keys/${keyId}`);
}

export async function rotateApiKey(
	businessId: string,
	keyId: string
): Promise<CreateApiKeyResponse> {
	const api = getApiClient();
	return api.post<CreateApiKeyResponse>(`/business/${businessId}/api-keys/${keyId}/rotate`);
}

/**
 * Permissions the current user's role is allowed to grant on a key.
 * The picker must be filtered against this — the backend enforces the same
 * ceiling and rejects the whole request if anything exceeds it.
 */
export async function getGrantablePermissions(
	businessId: string,
	options?: { fetch?: typeof fetch }
): Promise<{ role: string; permissions: string[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get<{ role: string; permissions: string[] }>(
		`/business/${businessId}/api-keys/grantable`
	);
}

// ==================== CONSTANTS ====================

export const AVAILABLE_SCOPES = [
	{ value: 'orders', label: 'Orders', description: 'Create and manage orders' },
	{ value: 'menu', label: 'Menu', description: 'Read and update menu items' },
	{ value: 'tables', label: 'Tables', description: 'View table status and layout' },
	{ value: 'inventory', label: 'Inventory', description: 'Manage stock levels' },
	{ value: 'payments', label: 'Payments', description: 'Process and view payments' },
	{ value: 'analytics', label: 'Analytics', description: 'View business analytics' },
	{ value: 'team', label: 'Team', description: 'View team members' },
	{ value: 'expenses', label: 'Expenses', description: 'Record and view expenses' },
	{ value: 'search', label: 'Search', description: 'Search across all resources' },
	{
		value: 'customers',
		label: 'Customers',
		description: 'Customer records, segments and campaigns'
	},
	{ value: 'reservations', label: 'Reservations', description: 'Bookings and seating' },
	{ value: 'waitlist', label: 'Waitlist', description: 'Walk-in queue management' },
	{ value: 'delivery', label: 'Delivery', description: 'Drivers, zones and delivery status' },
	{ value: 'kitchen', label: 'Kitchen', description: 'Kitchen station routing' },
	{ value: 'loyalty', label: 'Loyalty', description: 'Points, tiers and promotions' },
	{ value: 'coupons', label: 'Coupons', description: 'Discount codes' },
	{ value: 'cash-drawer', label: 'Cash Drawer', description: 'Till sessions and reconciliation' },
	{ value: 'receipts', label: 'Receipts', description: 'Receipt delivery to customers' },
	{ value: 'tax', label: 'Tax', description: 'Tax settings, GST summaries and filing exports' },
	{ value: 'accounting', label: 'Accounting', description: 'Accounting exports' },
	{
		value: 'purchase-orders',
		label: 'Purchase Orders',
		description: 'Supplier POs and reordering'
	},
	{
		value: 'subscription',
		label: 'Subscription',
		description: 'Plan, usage and limits (read-only)'
	},
	{ value: 'franchise', label: 'Franchise', description: 'Multi-location management' },
	{ value: 'staff-schedule', label: 'Staff Schedule', description: 'Shifts, rosters and leave' },
	{ value: 'notifications', label: 'Notifications', description: 'SMS and push messaging' },
	{
		value: 'announcements',
		label: 'Announcements',
		description: 'Read and dismiss platform notices'
	},
	{ value: 'reviews', label: 'Reviews', description: 'Customer reviews and ratings' },
	{ value: 'qr', label: 'QR & UPI', description: 'Table QR codes and UPI payment settings' },
	{ value: 'onboarding', label: 'Onboarding', description: 'Business setup progress' },
	{
		value: 'destructive',
		label: 'Destructive operations',
		description:
			'DANGER: unlocks delete, cancel, refund, drawer-close and irreversible customer messaging within the other scopes granted above. Grants nothing on its own. Leave off unless the key genuinely needs it.'
	}
] as const;

export const AVAILABLE_PERMISSIONS = [
	{ value: 'operations:read', label: 'Read Orders', scope: 'orders' },
	{ value: 'operations:create', label: 'Create Orders', scope: 'orders' },
	{ value: 'operations:update', label: 'Update Orders', scope: 'orders' },
	{ value: 'operations:cancel', label: 'Cancel Orders', scope: 'orders' },
	{ value: 'catalog:read', label: 'Read Menu', scope: 'menu' },
	{ value: 'catalog:create', label: 'Create Menu Items', scope: 'menu' },
	{ value: 'catalog:update', label: 'Update Menu', scope: 'menu' },
	{ value: 'scheduling:read', label: 'Read Tables', scope: 'tables' },
	{ value: 'inventory:read', label: 'Read Inventory', scope: 'inventory' },
	{ value: 'inventory:manage_stock', label: 'Adjust Stock', scope: 'inventory' },
	{ value: 'billing:read_invoice', label: 'Read Payments', scope: 'payments' },
	{ value: 'billing:process_payment', label: 'Process Payments', scope: 'payments' },
	{ value: 'analytics:view', label: 'View Analytics', scope: 'analytics' },
	{ value: 'business:read', label: 'Read Team', scope: 'team' },
	{ value: 'expense:read', label: 'Read Expenses', scope: 'expenses' },
	{ value: 'expense:create', label: 'Create Expenses', scope: 'expenses' },
	{ value: 'operations:view_all', label: 'View All Customers', scope: 'customers' },
	{ value: 'scheduling:reserve', label: 'Manage Reservations', scope: 'reservations' },
	{ value: 'scheduling:manage', label: 'Manage Waitlist', scope: 'waitlist' },
	{ value: 'scheduling:create', label: 'Create Bookings', scope: 'reservations' },
	{ value: 'scheduling:update', label: 'Update Bookings', scope: 'reservations' },
	{ value: 'catalog:delete', label: 'Delete Catalog Items', scope: 'menu' },
	{ value: 'inventory:create', label: 'Create Inventory/POs', scope: 'purchase-orders' },
	{ value: 'inventory:update', label: 'Update Inventory/POs', scope: 'purchase-orders' },
	{ value: 'billing:create_invoice', label: 'Issue Invoices & Receipts', scope: 'receipts' },
	{ value: 'billing:refund', label: 'Refunds & Cash Payouts', scope: 'cash-drawer' },
	{ value: 'billing:view_reports', label: 'View Financial Reports', scope: 'tax' },
	{ value: 'billing:manage_subscriptions', label: 'Read Subscription', scope: 'subscription' },
	{ value: 'analytics:export', label: 'Export Reports', scope: 'accounting' },
	{ value: 'business:update', label: 'Update Business', scope: 'onboarding' },
	{ value: 'business:manage_settings', label: 'Manage Settings (incl. UPI)', scope: 'qr' },
	{ value: 'restaurant:manage_tables', label: 'Manage Table QR Codes', scope: 'qr' },
	{ value: 'staff:manage', label: 'Manage Staff', scope: 'staff-schedule' },
	{ value: 'staff:manage_shifts', label: 'Manage Shifts', scope: 'staff-schedule' },
	{ value: 'staff:view_attendance', label: 'View Attendance', scope: 'staff-schedule' },
	{ value: 'franchise:read', label: 'Read Franchise', scope: 'franchise' },
	{ value: 'franchise:update', label: 'Update Franchise', scope: 'franchise' },
	{ value: 'franchise:manage_businesses', label: 'Manage Locations', scope: 'franchise' },
	{
		value: 'franchise:manage_franchise_staff',
		label: 'Manage Franchise Staff',
		scope: 'franchise'
	},
	{
		value: 'franchise:view_franchise_analytics',
		label: 'View Franchise Analytics',
		scope: 'franchise'
	}
] as const;
