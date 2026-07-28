/**
 * Business types, mirrored from the backend.
 *
 * The canonical list lives in the backend repo at
 * `backend/src/modules/business/config/business-types.config.ts`. This is a
 * separate git repo, so it cannot be imported — `scripts/check-business-types.mjs`
 * diffs the two during `npm run lint` instead.
 *
 * Keep this list complete. `(protected)/[business]/[slug]/+layout.server.ts`
 * redirects any type not in `VALID_BUSINESS_TYPES` to `/`, and business URLs are
 * built as `/{business.type}/{business.slug}`. When this list held only
 * restaurant/cafe/bar/retail, onboarding was still creating salon, spa, gym and
 * clinic businesses: they were created successfully and were then unreachable,
 * bouncing their owner to `/` from every page of their own tenant.
 *
 * `BusinessType` is derived from this array rather than declared separately, so
 * adding a type here is enough — there is no second union to forget.
 */
export const VALID_BUSINESS_TYPES = [
	'restaurant',
	'cafe',
	'bar',
	'food_truck',
	'salon',
	'spa',
	'gym',
	'retail',
	'clinic',
	'other'
] as const;

export type BusinessType = (typeof VALID_BUSINESS_TYPES)[number];

export interface Business {
	id: string;
	name: string;
	type: BusinessType;
	slug: string;
}

export function isValidBusinessType(type: string): type is BusinessType {
	return (VALID_BUSINESS_TYPES as readonly string[]).includes(type);
}

/**
 * Presentation config per type. `defaultMenuCategories` is a UI hint only — the
 * authoritative seed categories are created backend-side in `menu.service.ts`.
 */
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
		label: 'Cafe / Coffee Shop',
		description: 'Cafe and coffee shop management',
		defaultMenuCategories: ['Coffee', 'Pastry', 'Sandwich', 'Beverage'],
		features: ['menu', 'pos', 'tables', 'inventory', 'settings']
	},
	bar: {
		label: 'Bar / Pub',
		description: 'Bar and lounge management',
		defaultMenuCategories: ['Beverages', 'Appetizers', 'Main Courses'],
		features: ['menu', 'pos', 'tables', 'inventory', 'settings']
	},
	food_truck: {
		label: 'Food Truck',
		description: 'Mobile food service management',
		defaultMenuCategories: ['Mains', 'Sides', 'Beverages'],
		features: ['menu', 'pos', 'inventory', 'settings']
	},
	salon: {
		label: 'Salon',
		description: 'Hair, nail, and beauty salon management',
		defaultMenuCategories: ['Hair', 'Colour', 'Nails', 'Skin', 'Packages'],
		features: ['services', 'pos', 'appointments', 'inventory', 'settings']
	},
	spa: {
		label: 'Spa / Wellness',
		description: 'Day spa and wellness centre management',
		defaultMenuCategories: ['Massages', 'Facials', 'Body Treatments', 'Packages'],
		features: ['services', 'pos', 'appointments', 'inventory', 'settings']
	},
	gym: {
		label: 'Gym / Fitness',
		description: 'Gym and fitness studio management',
		defaultMenuCategories: ['Memberships', 'Classes', 'Personal Training'],
		features: ['memberships', 'pos', 'classes', 'inventory', 'settings']
	},
	retail: {
		label: 'Retail Store',
		description: 'Retail store management',
		defaultMenuCategories: ['Electronics', 'Clothing', 'Home Goods', 'Accessories'],
		features: ['products', 'pos', 'inventory', 'settings']
	},
	clinic: {
		label: 'Clinic',
		description: 'Medical and dental clinic management',
		defaultMenuCategories: ['Consultations', 'Procedures', 'Diagnostics'],
		features: ['services', 'pos', 'appointments', 'inventory', 'settings']
	},
	other: {
		label: 'Other',
		description: 'General business management',
		defaultMenuCategories: ['Products', 'Services'],
		features: ['pos', 'inventory', 'settings']
	}
};
