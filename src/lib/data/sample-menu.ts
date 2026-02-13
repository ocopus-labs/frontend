// Sample API response structure for POS menu data
import type { MenuResponse, MenuCategory, MenuItem } from '$lib/types/menu';

export const sampleMenuResponse: MenuResponse = {
	categories: [
		{
			id: 'cat-1',
			name: 'Main Course',
			description: 'Primary dishes and entrees',
			sortOrder: 1,
			isActive: true,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		},
		{
			id: 'cat-2',
			name: 'Beverages',
			description: 'Drinks and refreshments',
			sortOrder: 2,
			isActive: true,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		},
		{
			id: 'cat-3',
			name: 'Desserts',
			description: 'Sweet treats and desserts',
			sortOrder: 3,
			isActive: true,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		},
		{
			id: 'cat-4',
			name: 'Appetizers',
			description: 'Starters and small plates',
			sortOrder: 4,
			isActive: true,
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		}
	],
	items: [
		{
			id: 'item-1',
			name: 'Butter Chicken',
			description: 'Creamy, rich curry with tender chicken pieces',
			price: 12.84,
			image: '',
			categoryId: 'cat-1',
			isAvailable: true,
			isVegetarian: false,
			isVegan: false,
			isGlutenFree: false,
			preparationTime: 15,
			sortOrder: 1,
			modifiers: {
				sizes: [
					{ id: 'size-1', name: 'Regular', price: 0, sortOrder: 1 },
					{ id: 'size-2', name: 'Large', price: 3.0, sortOrder: 2 }
				],
				spiceLevels: [
					{ id: 'spice-1', name: 'Mild', price: 0, sortOrder: 1 },
					{ id: 'spice-2', name: 'Medium', price: 0, sortOrder: 2 },
					{ id: 'spice-3', name: 'Spicy', price: 0, sortOrder: 3 },
					{ id: 'spice-4', name: 'Extra Spicy', price: 1.0, sortOrder: 4 }
				],
				addOns: [
					{ id: 'addon-1', name: 'Extra Naan', price: 2.0, sortOrder: 1 },
					{ id: 'addon-2', name: 'Raita', price: 1.5, sortOrder: 2 }
				],
				removals: ['Onions', 'Tomatoes']
			},
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		},
		{
			id: 'item-2',
			name: 'French Fries',
			description: 'Crispy golden fries',
			price: 7.5,
			image: '',
			categoryId: 'cat-4',
			isAvailable: true,
			isVegetarian: true,
			isVegan: true,
			isGlutenFree: false,
			preparationTime: 8,
			sortOrder: 1,
			modifiers: {
				sizes: [
					{ id: 'size-3', name: 'Small', price: 0, sortOrder: 1 },
					{ id: 'size-4', name: 'Medium', price: 1.5, sortOrder: 2 },
					{ id: 'size-5', name: 'Large', price: 3.0, sortOrder: 3 }
				],
				addOns: [
					{ id: 'addon-3', name: 'Cheese', price: 1.5, sortOrder: 1 },
					{ id: 'addon-4', name: 'Bacon', price: 2.0, sortOrder: 2 }
				]
			},
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		},
		{
			id: 'item-3',
			name: 'Coca Cola',
			description: 'Classic cola drink',
			price: 2.5,
			image: '',
			categoryId: 'cat-2',
			isAvailable: true,
			isVegetarian: true,
			isVegan: true,
			isGlutenFree: true,
			preparationTime: 1,
			sortOrder: 1,
			modifiers: {
				sizes: [
					{ id: 'size-6', name: 'Small', price: 0, sortOrder: 1 },
					{ id: 'size-7', name: 'Medium', price: 0.5, sortOrder: 2 },
					{ id: 'size-8', name: 'Large', price: 1.0, sortOrder: 3 }
				]
			},
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		},
		{
			id: 'item-4',
			name: 'Chocolate Cake',
			description: 'Rich chocolate cake with frosting',
			price: 6.5,
			image: '',
			categoryId: 'cat-3',
			isAvailable: true,
			isVegetarian: true,
			isVegan: false,
			isGlutenFree: false,
			preparationTime: 5,
			sortOrder: 1,
			modifiers: {
				sizes: [
					{ id: 'size-9', name: 'Slice', price: 0, sortOrder: 1 },
					{ id: 'size-10', name: 'Whole', price: 25.0, sortOrder: 2 }
				],
				addOns: [
					{ id: 'addon-5', name: 'Extra Chocolate', price: 1.0, sortOrder: 1 },
					{ id: 'addon-6', name: 'Ice Cream', price: 2.0, sortOrder: 2 }
				]
			},
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z'
		}
	],
	modifierGroups: [],
	totalCategories: 4,
	totalItems: 4,
	totalModifierGroups: 0,
	menuVersion: 1.0,
	lastPublished: '2024-01-01T00:00:00Z'
};

// Helper function to get items by category
export function getItemsByCategory(response: MenuResponse, categoryId: string): MenuItem[] {
	return response.items.filter((item) => item.categoryId === categoryId);
}

// Helper function to get category counts
export function getCategoryCounts(response: MenuResponse): Array<{ name: string; count: number }> {
	return response.categories.map((category) => ({
		name: category.name,
		count: response.items.filter((item) => item.categoryId === category.id).length
	}));
}
