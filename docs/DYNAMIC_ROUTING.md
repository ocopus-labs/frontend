# Dynamic Multi-Business POS System - Implementation Guide

## Overview

The POS system has been successfully refactored to use a **dynamic route structure** that supports multiple business types (Restaurant, Cafe, Bar, Retail) from a single set of pages.

## Architecture

### Route Structure

```
(protected)/
  [business]/              # Dynamic business type parameter
    [slug]/                # Dynamic business instance ID
      dashboard/
        +page.svelte       # Business-specific dashboard
      menu/
        +page.svelte       # Adaptive menu/products page
      pos/
        new-order/
          +page.svelte
        orders/
          +page.svelte
      inventory/
        +page.svelte
      settings/
        +page.svelte
      +layout.ts           # Business validation & config loading
      +layout.svelte       # Context provider
```

### Supported Business Types

- **Restaurant**: Full-service restaurant with menu, tables, kitchen display
- **Cafe**: Coffee shop with menu, pastries, milk type customizations
- **Bar**: Beverage-focused with drinks menu, tables, inventory
- **Retail**: Product sales with inventory, SKU management

## How It Works

### 1. Business Type Validation (`+layout.ts`)

When a user navigates to a URL like `/restaurant/bella-vista` or `/cafe/morning-brew`:

```svelte
// URL: /restaurant/bella-vista
// Params:
//   - business: "restaurant"
//   - slug: "bella-vista"

export const load: LayoutLoad = async ({ params }) => {
	const { business, slug } = params;

	// Validate business type
	if (!VALID_BUSINESS_TYPES.includes(business)) {
		redirect(307, '/');
	}

	// Load business configuration
	const businessConfig = BUSINESS_TYPE_CONFIG[business];

	return {
		business: { id: slug, name, type: business, slug },
		businessType: business,
		config: businessConfig
	};
};
```

### 2. Dynamic Content Rendering

Pages use the business type to conditionally render content:

```svelte
<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const businessType = data.businessType;
	const config = data.config;

	// Dynamic titles
	const getPageTitle = () => {
		switch (businessType) {
			case 'retail':
				return 'Product Management';
			default:
				return 'Menu Management';
		}
	};

	// Dynamic stats
	let stats = $derived.by(() => {
		switch (businessType) {
			case 'retail':
				return [
					{ title: 'Total Sales', value: '$12,450', change: 8.2 }
					// ...
				];
			case 'cafe':
				return [
					{ title: 'Total Orders', value: 856, change: 12.5 }
					// ...
				];
			// ...
		}
	});
</script>
```

## Business Type Configuration

Defined in `src/lib/types/business.ts`:

```typescript
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
```

## Example Usage

### URL Patterns

```
Restaurant:  /restaurant/bella-vista/dashboard
Cafe:        /cafe/morning-brew/menu
Bar:         /bar/night-owl/pos/new-order
Retail:      /retail/fashion-boutique/products
```

### Page Behavior Adaptation

#### Dashboard

- **Restaurant**: Shows total orders, revenue, customer metrics
- **Cafe**: Shows coffee sales, repeat customers, avg order value
- **Bar**: Shows beverage revenue, customers today, avg check value
- **Retail**: Shows total sales, items sold, inventory value

#### Menu/Products Page

- **Restaurant/Cafe/Bar**: Title = "Menu Management", Shows menu items
- **Retail**: Title = "Product Management", Shows products with SKUs

#### Inventory

- All types show relevant inventory tracking
- Retail includes stock quantity and SKU management

## Key Features

### 1. Centralized Page Logic

- Single component handles all business types
- Configuration-driven rendering using `$derived` blocks
- Consistent UI/UX across all business types

### 2. Extensibility

- Add new business type: Update `BUSINESS_TYPE_CONFIG` and `VALID_BUSINESS_TYPES`
- Customize page behavior: Add new `switch` cases in component logic
- No need to create duplicate route files

### 3. Type Safety

- TypeScript types for `BusinessType` and business configuration
- Validates business type at layout level
- Compile-time safety with `PageData` types

### 4. Sidebar Navigation

- Dynamic sidebar links use `[business]/[slug]` pattern
- Updates automatically based on active business type
- Configured in `src/lib/constants/sidebar-data.ts`

## Migration from Old Routes

### Before (Specific Routes)

```
/restaurant/[slug]/menu
/cafe/[slug]/menu
/bar/[slug]/menu
/retail/[slug]/products
```

### After (Dynamic Routes)

```
/[business]/[slug]/menu      (business = restaurant/cafe/bar/retail)
/[business]/[slug]/products  (same as menu, adapted for retail)
```

## Adding a New Business Type

1. **Update `src/lib/types/business.ts`**:

```typescript
export type BusinessType = 'restaurant' | 'cafe' | 'bar' | 'retail' | 'hotel';

export const BUSINESS_TYPE_CONFIG = {
	// ... existing types
	hotel: {
		label: 'Hotel',
		description: 'Hotel management',
		defaultMenuCategories: ['Rooms', 'Services', 'Amenities'],
		features: ['menu', 'pos', 'rooms', 'inventory', 'settings']
	}
};
```

2. **Update page components**:

```svelte
const getPageTitle = () => {
	switch (businessType) {
		case 'hotel':
			return 'Room Management';
		// ... other cases
	}
};
```

3. **Update sidebar navigation** in `src/lib/constants/sidebar-data.ts`

## Performance Considerations

- **Bundle size**: Minimal increase - single component handles all types
- **Runtime**: Conditional rendering is negligible
- **Type checking**: Full TypeScript support

## Future Enhancements

1. **Database integration**: Load business configuration from database
2. **Feature flags**: Control features per business type
3. **Custom branding**: Per-business-type styling
4. **API endpoints**: Business-type-specific data fetching
5. **Role-based access**: Restrict features by user role and business type

## Testing

URLs to test:

```
http://localhost:5173/restaurant/bella-vista/dashboard
http://localhost:5173/cafe/morning-brew/menu
http://localhost:5173/bar/night-owl/pos/new-order
http://localhost:5173/retail/fashion-boutique/inventory
```

## File Structure Summary

```
src/
├── lib/
│   ├── types/
│   │   └── business.ts              # Business type definitions & config
│   ├── constants/
│   │   └── sidebar-data.ts          # Updated with dynamic routes
│   └── components/
│       └── pos/
│           ├── MenuCategories.svelte
│           ├── OrderSummary.svelte
│           └── ItemCustomizationDialog.svelte
└── routes/
    └── (protected)/
        └── [business]/
            └── [slug]/
                ├── +layout.ts        # Business validation & loading
                ├── +layout.svelte    # Context provider
                ├── dashboard/
                │   └── +page.svelte
                ├── menu/
                │   └── +page.svelte
                ├── pos/
                │   ├── new-order/
                │   └── orders/
                ├── inventory/
                └── settings/
```

## Summary

The dynamic routing system provides:

- ✅ Single codebase for all business types
- ✅ Type-safe configuration management
- ✅ Easy to extend with new business types
- ✅ Consistent user experience
- ✅ Maintainable and scalable architecture
