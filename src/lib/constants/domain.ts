/**
 * Business domain constants — single source of truth.
 * Do NOT hardcode these values in route/component files.
 */

// ==================== ROLES ====================

export const USER_ROLES = {
	SUPER_ADMIN: 'super_admin',
	FRANCHISE_OWNER: 'franchise_owner',
	RESTAURANT_OWNER: 'restaurant_owner',
	MANAGER: 'manager',
	STAFF: 'staff',
	VIEWER: 'viewer',
	ACCOUNTANT: 'accountant'
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<string, string> = {
	super_admin: 'Super Admin',
	franchise_owner: 'Franchise Owner',
	restaurant_owner: 'Owner',
	manager: 'Manager',
	staff: 'Staff',
	viewer: 'Viewer',
	accountant: 'Accountant'
};

/** For admin user role dropdowns (assignment) */
export const ADMIN_ROLE_OPTIONS = [
	{ value: 'user', label: 'User' },
	{ value: 'franchise_owner', label: 'Franchise Owner' },
	{ value: 'super_admin', label: 'Super Admin' }
] as const;

/** For admin user list filtering (all roles) */
export const ALL_ROLE_OPTIONS = [
	{ value: 'super_admin', label: 'Super Admin' },
	{ value: 'franchise_owner', label: 'Franchise Owner' },
	{ value: 'restaurant_owner', label: 'Business Owner' },
	{ value: 'manager', label: 'Manager' },
	{ value: 'staff', label: 'Staff' },
	{ value: 'viewer', label: 'Viewer' },
	{ value: 'accountant', label: 'Accountant' }
] as const;

// ==================== ORDER ====================

export const ORDER_TYPES = {
	DINE_IN: 'dine_in',
	TAKEAWAY: 'takeaway',
	DELIVERY: 'delivery',
	ONLINE: 'online',
	QR_ORDER: 'qr_order'
} as const;

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

export const ORDER_TYPE_LABELS: Record<string, string> = {
	dine_in: 'Dine In',
	takeaway: 'Takeaway',
	delivery: 'Delivery',
	online: 'Online',
	qr_order: 'QR Order'
};

export const ORDER_STATUSES = {
	ACTIVE: 'active',
	PREPARING: 'preparing',
	READY: 'ready',
	SERVING: 'serving',
	COMPLETED: 'completed',
	CANCELLED: 'cancelled'
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const ORDER_STATUS_LABELS: Record<string, string> = {
	active: 'Active',
	preparing: 'Preparing',
	ready: 'Ready',
	serving: 'Serving',
	completed: 'Completed',
	cancelled: 'Cancelled'
};

// ==================== PAYMENT ====================

export const PAYMENT_STATUSES = {
	PENDING: 'pending',
	COMPLETED: 'completed',
	FAILED: 'failed',
	REFUNDED: 'refunded'
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

// ==================== PRIORITY ====================

export const PRIORITY_LEVELS = {
	URGENT: 'urgent',
	HIGH: 'high',
	NORMAL: 'normal',
	LOW: 'low'
} as const;

export const PRIORITY_WEIGHTS: Record<string, number> = {
	urgent: 3,
	high: 2,
	normal: 1,
	low: 0
};

// ==================== BUSINESS ====================

export const BUSINESS_STATUSES = {
	ACTIVE: 'active',
	SUSPENDED: 'suspended',
	DELETED: 'deleted'
} as const;

export const TEAM_STATUSES = {
	ACTIVE: 'active',
	INACTIVE: 'inactive',
	SUSPENDED: 'suspended',
	INVITED: 'invited'
} as const;
