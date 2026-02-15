// API Response Types for POS
export interface MenuCategory {
	id: string;
	name: string;
	description?: string;
	image?: string;
	sortOrder: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface MenuItemModifier {
	id: string;
	name: string;
	price: number;
	isDefault?: boolean;
	sortOrder: number;
}

export interface MenuItemIngredient {
	inventoryItemId: string;
	inventoryItemName: string;
	quantityUsed: number;
	unit: string;
	costPerUnit: number;
}

export interface MenuItem {
	id: string;
	name: string;
	description?: string;
	price: number;
	image?: string;
	categoryId: string;
	isAvailable: boolean;
	isVegetarian?: boolean;
	isVegan?: boolean;
	isGlutenFree?: boolean;
	preparationTime?: number; // in minutes
	sortOrder: number;
	modifiers?: {
		sizes?: MenuItemModifier[];
		spiceLevels?: MenuItemModifier[];
		preparation?: string[]; // Simple string array for preparation options
		addOns?: MenuItemModifier[];
		removals?: string[]; // Simple string array for removal options
	};
	ingredients?: MenuItemIngredient[];
	foodCost?: number;
	taxCode?: string;
	taxCategory?: string;
	customTaxRate?: number;
	createdAt: string;
	updatedAt: string;
}

export interface ModifierGroupOption {
	id: string;
	name: string;
	price: number;
	isDefault?: boolean;
	sortOrder: number;
}

export interface ModifierGroup {
	id: string;
	name: string;
	required: boolean;
	multiSelect: boolean;
	minSelections?: number;
	maxSelections?: number;
	options: ModifierGroupOption[];
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

export interface MenuResponse {
	categories: MenuCategory[];
	items: MenuItem[];
	modifierGroups: ModifierGroup[];
	totalCategories: number;
	totalItems: number;
	totalModifierGroups: number;
	menuVersion: number;
	lastPublished?: string;
}
