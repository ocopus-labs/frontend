import type { MoneyByCurrency } from '$lib/utils/money';

export type BusinessType =
	'restaurant' | 'cafe' | 'bar' | 'salon' | 'spa' | 'gym' | 'retail' | 'clinic' | 'other';

export interface BusinessAddress {
	street?: string;
	city?: string;
	state?: string;
	country: string;
	postalCode?: string;
	lat?: number;
	lng?: number;
}

export interface BusinessContact {
	email?: string;
	phone?: string;
	website?: string;
}

export interface BusinessSettings {
	timezone: string;
	currency: string;
	taxRate?: string;
	businessHours?: Record<string, { open: string; close: string; isClosed?: boolean }>;
	paymentMethods?: string[];
}

export interface Business {
	id: string;
	name: string;
	slug: string;
	type: BusinessType;
	logo?: string;
	description?: string;
	address: BusinessAddress;
	contact: BusinessContact;
	settings: BusinessSettings;
	enabledFeatures?: string[];
	status: string;
	franchiseId?: string;
	configSource?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateBusinessPayload {
	name: string;
	type: BusinessType;
	description?: string;
	logo?: string;
	subType?: string;
	address: BusinessAddress;
	contact: BusinessContact;
	settings: BusinessSettings;
}

export interface UpdateBusinessPayload extends Partial<CreateBusinessPayload> {
	status?: 'active' | 'inactive' | 'suspended';
}

export interface BusinessTypeConfig {
	value: string;
	label: string;
	description: string;
	subtypes: string[];
	features: string[];
}

// ==================== FRANCHISE TYPES ====================

export interface Franchise {
	id: string;
	name: string;
	slug: string;
	ownerId: string;
	logo?: string;
	description?: string;
	status: string;
	settings: Record<string, unknown>;
	menuTemplate?: Record<string, unknown>;
	branding?: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
	_count?: { businesses: number; staff: number };
	userRole?: string;
}

export interface FranchiseUser {
	id: string;
	franchiseId: string;
	userId: string;
	role: string;
	status: string;
	permissions: string[];
	joinedAt: string;
	user: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	};
}

export interface FranchiseAnalytics {
	/**
	 * Per-currency. A franchise can span countries, so the network total is a
	 * set of amounts, never one number.
	 */
	totalRevenue: MoneyByCurrency;
	totalOrders: number;
	totalLocations: number;
	totalStaff: number;
	locationBreakdown: {
		businessId: string;
		businessName: string;
		/** A single outlet bills in one currency, so its revenue stays scalar. */
		currency: string;
		revenue: number;
		orders: number;
	}[];
}

export interface FranchiseAuditLog {
	id: string;
	restaurantId: string;
	userId: string | null;
	action: string;
	resource: string;
	resourceId: string | null;
	details: Record<string, unknown> | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
	businessName: string;
	user: {
		id: string;
		name: string | null;
		email: string;
	} | null;
}
