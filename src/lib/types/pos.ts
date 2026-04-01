/**
 * POS and Kitchen Display types used across route components.
 * Extends base API types for display-specific needs.
 */

import type { OrderItemType } from '$lib/components/pos';

/** Extended order item with API fields for order submission */
export interface ExtendedOrderItem extends OrderItemType {
	menuItemId: string;
	basePrice: number;
	_modifierPrices?: {
		sizePrice?: number;
		spiceLevelPrice?: number;
		addOnPrices?: Record<string, number>;
	};
}

/** Menu item shaped for POS grid display */
export interface POSMenuItem {
	id: string;
	menuItemId: string;
	categoryId: string;
	name: string;
	description?: string;
	price: number;
	image: string;
	available: boolean;
	isVegetarian?: boolean;
	isVegan?: boolean;
	isGlutenFree?: boolean;
	preparationTime?: number;
	modifiers?: {
		sizes?: { id: string; name: string; price: number }[];
		spiceLevels?: { id: string; name: string; price: number }[];
		preparation?: string[];
		addOns?: { id: string; name: string; price: number }[];
		removals?: string[];
	};
}

/** Order transformed for kitchen display */
export interface KitchenOrder {
	id: string;
	orderId: string;
	table: string;
	type: string;
	createdAt: string;
	rawCreatedAt: number;
	elapsed: number;
	priority: string;
	priorityWeight: number;
	readyCount: number;
	totalCount: number;
	orderSource?: string;
	items: Array<{
		id: string;
		name: string;
		quantity: number;
		notes: string | null;
		status: string;
		cancellationReason?: string;
	}>;
}
