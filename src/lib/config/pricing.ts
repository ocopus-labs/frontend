/**
 * Pricing catalogue — the SINGLE source of truth for plan and module content.
 *
 * Before this file, plan/feature copy was hardcoded in five places that had
 * already drifted apart (the public pricing page said Pro = "3 locations / 10
 * staff"; upgrade-prompt-dialog said "5 locations / 15 members"; the seeded
 * plan says 5 and 15). Everything user-facing now reads from here.
 *
 * WHAT IS AUTHORITATIVE WHERE
 * - Tier PRICES and LIMITS come from the API (`GET /subscription/plans`, seeded
 *   in `backend/prisma/seed.ts`). Never hardcode them in a page; use the API
 *   values and fall back to `TIER_FALLBACK` only when the call fails.
 * - Tier POSITIONING copy (tagline, highlights, who it's for) lives here.
 * - Module catalogue mirrors `backend/src/modules/business/config/feature-registry.ts`.
 *   If a slug is added there, add it here too — `MODULE_CATALOGUE` is what the
 *   pricing page and the billing modules tab render.
 *
 * ⚠️ MODULE PRICES ARE PROVISIONAL — NOT COMMERCIALLY APPROVED.
 * Tier prices (₹2,499 / ₹8,499) are the real seeded numbers. The per-module
 * add-on prices below are placeholders chosen for structure only; willingness
 * to pay has not been validated with design partners yet, and there is no
 * backend billing path for them (see docs/PRICING-MODEL.md). Do not treat them
 * as launch pricing.
 */

export type Tier = 'FREE' | 'PRO' | 'ENTERPRISE';

/** Billing scope. Modules are priced per outlet — adding a location adds cost. */
export const BILLING_SCOPE = 'per outlet' as const;

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

export interface TierCopy {
	slug: string;
	name: string;
	tagline: string;
	/** Who this is for — one honest sentence, not a feature list. */
	audience: string;
	/** 4-6 bullets. Keep them outcomes, not feature names where possible. */
	highlights: string[];
	cta: string;
	href: string;
	highlighted?: boolean;
}

export const TIER_COPY: TierCopy[] = [
	{
		slug: 'free',
		name: 'Starter',
		tagline: 'Run one outlet, free forever',
		audience: 'A single shop testing whether this replaces your current till.',
		highlights: [
			'Full POS billing — no feature crippling',
			'Orders and customer database included',
			'Pick 2–3 extra modules for free',
			'Email support'
		],
		cta: 'Start free',
		href: '/register'
	},
	{
		slug: 'pro',
		name: 'Pro',
		tagline: 'For shops that have outgrown a till',
		audience: 'Growing businesses running several outlets with a real team.',
		highlights: [
			'Everything in Starter, unmetered',
			'Unlimited orders and modules',
			'Kitchen Display System',
			'Advanced analytics and reports',
			'Priority support'
		],
		cta: 'Start free trial',
		href: '/register?plan=pro',
		highlighted: true
	},
	{
		slug: 'enterprise',
		name: 'Enterprise',
		tagline: 'For franchises and chains',
		audience: 'Multi-outlet groups that need consolidated control and integrations.',
		highlights: [
			'Everything in Pro',
			'Franchise console with consolidated reporting',
			'API access for custom integrations',
			'White-label branding'
		],
		cta: 'Talk to us',
		href: '/contact'
	}
];

/**
 * Display-only fallback used when `GET /subscription/plans` fails. These mirror
 * the seeded plans — if you change the seed, change these. The page must prefer
 * live API values.
 */
export const TIER_FALLBACK: Record<
	string,
	{
		priceMonthly: number;
		priceYearly: number;
		maxLocations: number;
		maxTeamMembers: number;
		maxOrdersPerMonth: number;
	}
> = {
	free: {
		priceMonthly: 0,
		priceYearly: 0,
		maxLocations: 1,
		maxTeamMembers: 2,
		maxOrdersPerMonth: 100
	},
	pro: {
		priceMonthly: 2499,
		priceYearly: 24990,
		maxLocations: 5,
		maxTeamMembers: 15,
		maxOrdersPerMonth: -1
	},
	enterprise: {
		priceMonthly: 8499,
		priceYearly: 84990,
		maxLocations: -1,
		maxTeamMembers: -1,
		maxOrdersPerMonth: -1
	}
};

// ---------------------------------------------------------------------------
// Module catalogue
// ---------------------------------------------------------------------------

export type ModuleGroup = 'selling' | 'operations' | 'growth' | 'platform';

export const MODULE_GROUP_LABELS: Record<ModuleGroup, string> = {
	selling: 'Selling',
	operations: 'Operations',
	growth: 'Growth',
	platform: 'Platform'
};

export interface ModuleCopy {
	/** Must match a slug in backend feature-registry.ts. */
	slug: string;
	name: string;
	/** One line, benefit-first — this is what sells it. */
	description: string;
	group: ModuleGroup;
	/** Always-on, never billed separately. */
	core?: boolean;
	/** Minimum tier that may enable it, mirroring the registry. */
	minimumTier: Tier;
	/** Other module slugs this needs. */
	dependsOn?: string[];
	/**
	 * PROVISIONAL add-on price, ₹ per outlet per month. `0` = included with any
	 * plan (consumes a free slot on Starter). `null` = not sold as an add-on;
	 * only available by upgrading the tier.
	 */
	addOnMonthly: number | null;
	/** Business types this is relevant to; omit for all. */
	forTypes?: string[];
}

export const MODULE_CATALOGUE: ModuleCopy[] = [
	// --- Core: always on, never billed ---------------------------------------
	{
		slug: 'pos',
		name: 'POS',
		description: 'Ring up sales on any device, online or off.',
		group: 'selling',
		core: true,
		minimumTier: 'FREE',
		addOnMonthly: 0
	},
	{
		slug: 'orders',
		name: 'Orders',
		description: 'Every order in one queue, from first tap to settled bill.',
		group: 'selling',
		core: true,
		minimumTier: 'FREE',
		addOnMonthly: 0
	},
	{
		slug: 'customers',
		name: 'Customers',
		description: 'Know who buys what, and how often.',
		group: 'selling',
		core: true,
		minimumTier: 'FREE',
		addOnMonthly: 0
	},

	// --- Selling --------------------------------------------------------------
	{
		slug: 'menu',
		name: 'Menu & Catalog',
		description: 'Items, variants and pricing that stay in sync everywhere.',
		group: 'selling',
		minimumTier: 'FREE',
		addOnMonthly: 299
	},
	{
		slug: 'tables',
		name: 'Tables',
		description: 'Floor plan, table state and running bills per seat.',
		group: 'selling',
		minimumTier: 'FREE',
		addOnMonthly: 299,
		forTypes: ['restaurant', 'cafe', 'bar']
	},
	{
		slug: 'qr-ordering',
		name: 'QR Ordering',
		description: 'Diners scan, browse and order without waiting for staff.',
		group: 'selling',
		minimumTier: 'FREE',
		dependsOn: ['tables'],
		addOnMonthly: 499
	},
	{
		slug: 'reservations',
		name: 'Reservations',
		description: 'Take bookings and hold tables without the diary.',
		group: 'selling',
		minimumTier: 'FREE',
		dependsOn: ['tables'],
		addOnMonthly: 399
	},
	{
		slug: 'delivery',
		name: 'Delivery',
		description: 'Dispatch, assign riders and track orders to the door.',
		group: 'selling',
		minimumTier: 'FREE',
		addOnMonthly: 499
	},
	{
		slug: 'appointments',
		name: 'Appointments',
		description: 'Book slots by staff member with no double-booking.',
		group: 'selling',
		minimumTier: 'FREE',
		addOnMonthly: 399,
		forTypes: ['salon', 'spa', 'clinic']
	},
	{
		slug: 'services',
		name: 'Services',
		description: 'Service catalogue with durations and per-staff pricing.',
		group: 'selling',
		minimumTier: 'FREE',
		addOnMonthly: 299,
		forTypes: ['salon', 'spa', 'clinic']
	},
	{
		slug: 'memberships',
		name: 'Memberships',
		description: 'Recurring plans, renewals and expiry tracking.',
		group: 'selling',
		minimumTier: 'FREE',
		addOnMonthly: 499,
		forTypes: ['gym']
	},
	{
		slug: 'classes',
		name: 'Classes',
		description: 'Schedule classes and track who actually turned up.',
		group: 'selling',
		minimumTier: 'FREE',
		addOnMonthly: 399,
		forTypes: ['gym']
	},

	// --- Operations -----------------------------------------------------------
	{
		slug: 'kds',
		name: 'Kitchen Display',
		description: 'Route tickets to the right station and kill paper KOTs.',
		group: 'operations',
		minimumTier: 'PRO',
		addOnMonthly: 599
	},
	{
		slug: 'inventory',
		name: 'Inventory',
		description: 'Stock levels, purchase orders and low-stock alerts.',
		group: 'operations',
		minimumTier: 'FREE',
		addOnMonthly: 499
	},
	{
		slug: 'expenses',
		name: 'Expenses',
		description: 'Log spend against categories so margin is real.',
		group: 'operations',
		minimumTier: 'FREE',
		addOnMonthly: 299
	},
	{
		slug: 'team',
		name: 'Team',
		description: 'Staff accounts, roles and permissions per outlet.',
		group: 'operations',
		minimumTier: 'FREE',
		addOnMonthly: 299
	},
	{
		slug: 'scheduling',
		name: 'Scheduling',
		description: 'Build the rota and see labour cost before you publish.',
		group: 'operations',
		minimumTier: 'FREE',
		dependsOn: ['team'],
		addOnMonthly: 399
	},

	// --- Growth ---------------------------------------------------------------
	{
		slug: 'analytics',
		name: 'Analytics',
		description: 'Sales, peak hours and what actually makes money.',
		group: 'growth',
		minimumTier: 'FREE',
		addOnMonthly: 399
	},
	{
		slug: 'loyalty',
		name: 'Loyalty',
		description: 'Points and rewards that bring customers back.',
		group: 'growth',
		minimumTier: 'FREE',
		addOnMonthly: 399
	},

	// --- Platform (tier-only, not sold à la carte) ---------------------------
	{
		slug: 'api',
		name: 'API Access',
		description: 'Build your own integrations against your data.',
		group: 'platform',
		minimumTier: 'ENTERPRISE',
		addOnMonthly: null
	},
	{
		slug: 'white-label',
		name: 'White Label',
		description: 'Your branding end to end, ours nowhere.',
		group: 'platform',
		minimumTier: 'ENTERPRISE',
		addOnMonthly: null
	}
];

export const CORE_MODULES = MODULE_CATALOGUE.filter((m) => m.core);
export const ADDON_MODULES = MODULE_CATALOGUE.filter((m) => !m.core);

export function getModule(slug: string): ModuleCopy | undefined {
	return MODULE_CATALOGUE.find((m) => m.slug === slug);
}

export function modulesByGroup(group: ModuleGroup): ModuleCopy[] {
	return MODULE_CATALOGUE.filter((m) => m.group === group);
}

// ---------------------------------------------------------------------------
// Comparison matrix
// ---------------------------------------------------------------------------

export interface ComparisonRow {
	label: string;
	/** `true`/`false` render as check/cross; strings render verbatim. */
	free: string | boolean;
	pro: string | boolean;
	enterprise: string | boolean;
}

/**
 * Kept deliberately short. A 15-row matrix that repeats the module catalogue is
 * noise — this covers only what genuinely differs between tiers.
 *
 * NOTE: outlets / team members / orders are deliberately NOT here. Those are
 * live plan limits and the page prepends them from `GET /subscription/plans`.
 * Hardcoding them again is exactly the drift this file exists to kill.
 */
export const COMPARISON_ROWS: ComparisonRow[] = [
	{
		label: 'Modules included',
		free: '2–3 of your choice',
		pro: 'All except platform',
		enterprise: 'Everything'
	},
	{ label: 'Add-on modules', free: true, pro: true, enterprise: true },
	{ label: 'Kitchen Display System', free: false, pro: true, enterprise: true },
	{ label: 'Franchise console', free: false, pro: false, enterprise: true },
	{ label: 'API access', free: false, pro: false, enterprise: true },
	{ label: 'White-label branding', free: false, pro: false, enterprise: true },
	{ label: 'Support', free: 'Email', pro: 'Priority', enterprise: 'Dedicated manager' }
];

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface FaqItem {
	q: string;
	a: string;
}

export const PRICING_FAQ: FaqItem[] = [
	{
		q: 'Do I have to buy a whole bundle?',
		a: "No. Every plan includes POS, orders and customers. Everything else is a module you switch on when you need it and off when you don't — you only pay for what you actually use."
	},
	{
		q: 'How are modules priced?',
		a: `Modules are priced ${BILLING_SCOPE} per month. Adding an outlet adds only the modules that outlet actually needs, so a second location doesn't have to cost the same as your first.`
	},
	{
		q: 'What happens if I turn a module off?',
		a: 'Billing for it stops at the end of the current period. Your data stays — turn it back on later and it is exactly where you left it. For seven days after a downgrade the module stays readable so you can export anything you need.'
	},
	{
		q: 'Can I change plans later?',
		a: 'Yes, in either direction, at any time. Upgrades take effect immediately and are prorated. Downgrades take effect at the end of your current billing period so you keep what you paid for.'
	},
	{
		q: 'Is there a contract?',
		a: 'No lock-in and no setup fee. Monthly plans can be cancelled at any time; annual plans run to the end of the term you paid for.'
	},
	{
		q: 'What about GST?',
		a: 'All prices shown are exclusive of GST. Applicable GST is added at checkout and appears on your invoice.'
	},
	{
		q: 'Do you offer a trial?',
		a: 'Starter is free forever with no card required, so you can run real sales through it before paying for anything. Pro includes a free trial when you sign up.'
	},
	{
		q: 'I have more than 10 outlets. What then?',
		a: 'Talk to us. Enterprise is priced per group rather than per outlet, and includes the franchise console for consolidated reporting across locations.'
	}
];
