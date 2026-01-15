export type BusinessType = 'restaurant' | 'cafe' | 'bar' | 'retail';

export interface Business {
	id: string;
	name: string;
	type: BusinessType;
	slug: string;
}

export const VALID_BUSINESS_TYPES: BusinessType[] = ['restaurant', 'cafe', 'bar', 'retail'];

export const BUSINESS_TYPE_CONFIG: Record<
	BusinessType,
	{
		label: string;
		description: string;
		defaultMenuCategories: string[];
		features: string[];
	}
> = {
	restaurant: {
		label: 'Restaurant',
		description: 'Full-service restaurant management',
		defaultMenuCategories: ['Main Course', 'Appetizer', 'Dessert', 'Beverage'],
		features: ['menu', 'pos', 'tables', 'inventory', 'settings']
	},
	cafe: {
		label: 'Cafe',
		description: 'Cafe and coffee shop management',
		defaultMenuCategories: ['Coffee', 'Pastry', 'Sandwich', 'Beverage'],
		features: ['menu', 'pos', 'tables', 'inventory', 'settings']
	},
	bar: {
		label: 'Bar',
		description: 'Bar and lounge management',
		defaultMenuCategories: ['Beverages', 'Appetizers', 'Main Courses'],
		features: ['menu', 'pos', 'tables', 'inventory', 'settings']
	},
	retail: {
		label: 'Retail',
		description: 'Retail store management',
		defaultMenuCategories: ['Electronics', 'Clothing', 'Home Goods', 'Accessories'],
		features: ['products', 'pos', 'inventory', 'settings']
	}
};
