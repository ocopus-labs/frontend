# RestaurantPro — Frontend

Multi-tenant dashboard, POS interface, and customer-facing ordering for the RestaurantPro platform. Built with SvelteKit 2, Svelte 5, Tailwind CSS v4, and shadcn-svelte.

## Tech Stack

- **Framework**: SvelteKit 2 + Svelte 5 (runes — `$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Tailwind CSS v4
- **Components**: shadcn-svelte (60+ base components)
- **Forms**: Superforms + Formsnap
- **Charts**: LayerChart (D3-based) with lazy-loaded wrappers
- **Auth**: Better Auth client (sessions, OAuth, OTP, 2FA)
- **Payments**:
  - Stripe Elements (`@stripe/stripe-js`) for card payments + Apple Pay / Google Pay
  - Razorpay Checkout (lazy-loaded script) for India payments
  - Dodo Payments client for platform subscription billing
- **Icons**: Tabler Icons + Lucide (4500+ icons)
- **Real-time**: Socket.io client (order updates, kitchen display, waitlist)
- **i18n**: Custom message-based system with 12 locales and 10 currencies
- **PWA**: `@vite-pwa/sveltekit` with service worker (offline POS, background sync)
- **PDF**: `html2pdf.js` for client-side receipt PDF generation
- **Barcode**: Browser `BarcodeDetector` API with camera access
- **Testing**: Playwright (E2E)
- **Storybook**: v10 for component development
- **Runtime**: Bun (via `svelte-adapter-bun`) — swappable in `svelte.config.js`

## Getting Started

### Prerequisites

- Node.js 20+ (or Bun)
- Backend server running on port 3000

### Setup

```bash
cd frontend
npm install

# Copy env file (optional — sensible defaults)
cp .env.example .env

# Start dev server (Vite proxies /api to localhost:3000)
npm run dev
```

Visit `http://localhost:5173`.

### Scripts

| Command             | Description                           |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Vite dev server with API proxy        |
| `npm run build`     | Production build                      |
| `npm run preview`   | Preview production build              |
| `npm run check`     | Svelte type checking (`svelte-check`) |
| `npm run lint`      | Prettier + ESLint check               |
| `npm run format`    | Prettier formatting                   |
| `npm run test:e2e`  | Playwright E2E tests                  |
| `npm run storybook` | Component dev on port 6006            |

## Environment Variables

Public env vars (accessible in client code) are prefixed with `PUBLIC_`:

| Variable               | Required | Description                                                                                                                                                                               |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_API_BASE`      | No       | Backend API base URL (default: `/api`)                                                                                                                                                    |
| `PUBLIC_SUPPORT_EMAIL` | No       | Support email shown in UI                                                                                                                                                                 |
| `PUBLIC_BACKEND_URL`   | No       | Public backend origin for webhook URL display in credentials settings. Leave empty in dev (auto-detected from `window.location`); set to e.g. `https://api.yourdomain.com` in production. |

## Architecture

```
src/
├── routes/
│   ├── (auth)/                           # Login, register, OTP, 2FA, password reset
│   ├── (public)/                         # Landing, pricing, blog, public pages
│   │   ├── display/[slug]/               # Customer-facing order status TV display
│   │   ├── delivery/track/[token]/       # Public delivery tracking
│   │   └── waitlist/track/[token]/       # Public waitlist position tracking
│   ├── (order)/                          # QR dine-in ordering (public)
│   │   └── order/[slug]/[tableNumber]/   # Menu, cart, checkout, tracking
│   ├── (order-online)/                   # Standalone online ordering (public)
│   │   └── [slug]/                       # Menu browser + 3-step checkout
│   │       └── checkout/                 # Details → Confirm → Payment flow
│   └── (protected)/                      # Authenticated routes
│       ├── admin/                        # Super admin panel
│       │   ├── analytics/                # Platform metrics
│       │   ├── announcements/            # System announcements
│       │   ├── audit-logs/               # Full audit trail viewer
│       │   ├── businesses/               # All businesses management
│       │   ├── monitoring/               # System monitoring
│       │   ├── plans/                    # Subscription plan management
│       │   ├── subscriptions/            # Active subscriptions
│       │   ├── users/                    # Platform user management
│       │   └── webhooks/                 # Webhook monitoring
│       ├── dashboard/                    # User account
│       │   ├── businesses/               # Business list + switcher
│       │   ├── billing/                  # Billing info
│       │   ├── notifications/            # Notification preferences
│       │   ├── security/                 # Password, sessions, 2FA
│       │   └── subscriptions/            # Subscription management
│       ├── franchise/[franchiseSlug]/    # Franchise management
│       │   ├── analytics/                # Aggregated franchise analytics
│       │   ├── audit-trail/              # Franchise audit log
│       │   ├── locations/                # Location management
│       │   ├── settings/                 # Franchise-level settings
│       │   └── team/                     # Franchise team
│       └── [business]/[slug]/            # Business-scoped pages
│           ├── pos/                      # POS interface
│           │   ├── menu/                 # Menu-based POS
│           │   ├── new-order/            # Create order
│           │   └── transactions/         # Payment transactions
│           ├── orders/                   # Order management
│           │   ├── pending/              # Active orders
│           │   ├── completed/            # Completed orders
│           │   ├── history/              # Full history
│           │   └── [orderId]/            # Order detail
│           ├── menu/                     # Menu editor
│           │   ├── items/                # Item CRUD
│           │   ├── categories/           # Category management
│           │   ├── groups/               # Item groups
│           │   └── modifiers/            # Modifier sets
│           ├── tables/                   # Table management
│           │   ├── layout/               # Drag-and-drop floor plan
│           │   ├── reservations/         # Reservation management
│           │   └── waitlist/             # Walk-in queue
│           ├── delivery/                 # Delivery operations
│           │   ├── drivers/              # Driver management
│           │   ├── zones/                # Delivery zones
│           │   └── active/               # Active delivery pipeline (kanban)
│           ├── kitchen-display/          # KDS
│           │   ├── orders/               # Active kitchen orders
│           │   └── status/               # Station status
│           ├── team/                     # Staff management
│           │   └── schedule/             # Weekly roster + leave management
│           ├── customers/                # CRM
│           │   ├── [customerId]/         # Customer detail with loyalty card
│           │   ├── segments/             # Rule-based segmentation
│           │   └── campaigns/            # Email/SMS campaigns
│           ├── inventory/                # Inventory
│           │   ├── stock/                # Stock management + barcode
│           │   ├── suppliers/            # Supplier database
│           │   └── purchase-orders/      # PO lifecycle
│           │       └── new/              # New PO form
│           ├── expenses/
│           │   ├── daily/
│           │   ├── monthly/
│           │   └── reports/
│           ├── cash-drawer/              # Cash drawer sessions
│           ├── dashboard/                # Business overview
│           │   ├── analytics/            # Charts, top items, trends, forecasts
│           │   ├── reports/              # Standard reports
│           │   │   ├── builder/          # Custom report builder
│           │   │   └── gst/              # GST/tax reports
│           └── settings/                 # Business settings
│               ├── payments/             # Payment configuration
│               │   └── credentials/      # Per-business gateway credentials (NEW)
│               ├── online-ordering/      # Online store config + QR code (NEW)
│               ├── accounting/           # Accounting exports
│               ├── loyalty/              # Loyalty tiers + promotions
│               ├── kitchen-stations/     # KDS station setup
│               ├── features/             # Feature toggles
│               ├── api-keys/             # API key management
│               └── tax/                  # Tax + e-invoicing
│                   └── export/           # GST export
├── lib/
│   ├── api/                              # Typed API client modules (35+)
│   │   ├── client.ts                     # Base HTTP client with caching
│   │   ├── types.ts                      # Shared TypeScript types
│   │   ├── index.ts                      # Barrel export
│   │   ├── accounting.ts                 # Accounting export API
│   │   ├── admin.ts                      # Admin operations
│   │   ├── analytics.ts                  # Analytics + forecasts
│   │   ├── announcement.ts               # Announcements
│   │   ├── api-keys.ts                   # API key management
│   │   ├── business.ts                   # Business CRUD
│   │   ├── campaign.ts                   # Marketing campaigns
│   │   ├── cash-drawer.ts                # Cash drawer sessions
│   │   ├── customer.ts                   # Customer database
│   │   ├── customer-order.ts             # QR ordering
│   │   ├── dashboard.ts                  # Dashboard stats
│   │   ├── delivery.ts                   # Delivery management
│   │   ├── display.ts                    # Waiting display queue
│   │   ├── expense.ts                    # Expenses
│   │   ├── features.ts                   # Feature flags
│   │   ├── franchise.ts                  # Franchise management
│   │   ├── inventory.ts                  # Inventory + barcode lookup
│   │   ├── kitchen-station.ts            # KDS stations
│   │   ├── loyalty.ts                    # Loyalty + tiers + referrals
│   │   ├── menu.ts                       # Menu items
│   │   ├── notification.ts               # Device tokens + preferences
│   │   ├── online-ordering.ts            # Online store settings
│   │   ├── online-order.ts               # Online checkout + Stripe intent
│   │   ├── order.ts                      # Order CRUD
│   │   ├── payment.ts                    # Payment processing
│   │   ├── payment-credentials.ts        # Per-business gateway credentials
│   │   ├── purchase-order.ts             # PO workflow
│   │   ├── qr.ts                         # QR code generation
│   │   ├── razorpay.ts                   # Razorpay order creation
│   │   ├── receipt.ts                    # Receipt delivery
│   │   ├── report-builder.ts             # Custom report builder
│   │   ├── schedule.ts                   # Staff scheduling
│   │   ├── search.ts                     # Global search
│   │   ├── segment.ts                    # Customer segmentation
│   │   ├── stripe.ts                     # Stripe intent creation
│   │   ├── subscription.ts               # Subscription management
│   │   ├── table.ts                      # Tables + reservations
│   │   ├── tax.ts                        # Tax settings + e-invoicing
│   │   ├── team.ts                       # Team management
│   │   ├── user.ts                       # User profile
│   │   └── waitlist.ts                   # Walk-in queue
│   ├── auth.ts                           # Better Auth client setup
│   ├── auth.server.ts                    # Server-side auth helpers
│   ├── socket.ts                         # Socket.io client setup
│   ├── i18n.svelte.ts                    # Reactive i18n with $state + $derived
│   ├── i18n/                             # Message files
│   │   ├── en.json                       # English (259 strings)
│   │   └── hi.json                       # Hindi (259 strings)
│   ├── components/
│   │   ├── ui/                           # shadcn-svelte base (60+ components)
│   │   ├── pos/                          # POS components
│   │   │   ├── Receipt.svelte            # Thermal-style receipt preview
│   │   │   ├── ReceiptDialog.svelte      # Receipt modal with print/email/WhatsApp
│   │   │   ├── PaymentDialog.svelte      # Multi-gateway payment flow
│   │   │   ├── KotPrintView.svelte       # Kitchen order ticket
│   │   │   ├── BarcodeScanner.svelte     # Camera + USB scanner component
│   │   │   ├── MenuItemCard.svelte       # POS menu tile
│   │   │   ├── ItemCustomizationDialog.svelte  # Modifiers + quantity
│   │   │   ├── OrderSummary.svelte       # Order panel
│   │   │   ├── TableFloorPlan.svelte     # Interactive floor plan editor
│   │   │   └── ...
│   │   ├── global/                       # Layout + shared
│   │   │   ├── nav-main.svelte           # Main navigation
│   │   │   ├── nav-user.svelte           # User menu with language switcher
│   │   │   ├── business-switcher.svelte  # Multi-business selector
│   │   │   ├── bottom-nav.svelte         # Mobile bottom nav
│   │   │   ├── announcement-banner.svelte
│   │   │   ├── subscription-banner.svelte
│   │   │   ├── page-header.svelte
│   │   │   ├── stat-card.svelte
│   │   │   ├── confirm-dialog.svelte
│   │   │   ├── locale-switcher.svelte    # Language picker
│   │   │   ├── offline-indicator.svelte
│   │   │   ├── pwa-update-prompt.svelte
│   │   │   └── theme-toggle.svelte
│   │   ├── chart/                        # Chart wrappers
│   │   │   ├── lazy-bar-chart.svelte
│   │   │   ├── lazy-pie-chart.svelte
│   │   │   ├── area-chart-interactive.svelte
│   │   │   └── revenue-heatmap.svelte
│   │   ├── data-display/                 # Stats + visualizations
│   │   │   ├── activity-timeline.svelte
│   │   │   ├── empty-state.svelte
│   │   │   ├── live-counter.svelte
│   │   │   ├── metric-ring.svelte
│   │   │   ├── stat-comparison.svelte
│   │   │   ├── status-pill.svelte
│   │   │   └── trend-badge.svelte
│   │   ├── business-setup/               # Onboarding wizard steps
│   │   ├── admin/                        # Admin-specific components
│   │   └── team/
│   ├── constants/                        # Config, currency, sidebar data
│   └── utils/                            # Helpers (errors, currency, dates)
├── hooks.server.ts                       # Server hooks (auth, maintenance)
├── hooks.client.ts                       # Client hooks
└── app.html                              # HTML shell (dark mode FOUC prevention)
```

### API Client Pattern

All backend communication goes through typed API modules in `src/lib/api/`. Each module exports functions with this signature:

```typescript
export async function getResource(
  businessId: string,
  params?: { ... },
  options?: { fetch?: typeof fetch }
): Promise<{ ... }> {
  const api = options?.fetch
    ? createApiClient({ fetch: options.fetch })  // SSR — uses passed fetch
    : getApiClient();                             // Browser — uses browser fetch with cache
  return api.get(`/business/${businessId}/resource`);
}
```

The base client (`client.ts`) handles:

- 30-second client-side GET cache
- Automatic credentials inclusion for session cookies
- Session expiry redirect to login
- Maintenance mode detection
- Error wrapping via `ApiError` class

### Page Load Pattern

SvelteKit page loaders follow this pattern:

```typescript
// +page.ts
import type { PageLoad } from './$types';
import { getResource } from '$lib/api';

export const load: PageLoad = async ({ parent, fetch, url, depends }) => {
	depends('app:resource'); // Enable manual invalidation
	const parentData = await parent(); // Inherit from layout (businessId, business)

	const [resourceResult, statsResult] = await Promise.allSettled([
		getResource(parentData.businessId, undefined, { fetch }),
		getStats(parentData.businessId, undefined, { fetch })
	]);

	return {
		...parentData,
		resource: resourceResult.status === 'fulfilled' ? resourceResult.value : null,
		stats: statsResult.status === 'fulfilled' ? statsResult.value : null
	};
};
```

After mutations, invalidate with `invalidate('app:resource')`.

### Svelte 5 Runes

All new components use Svelte 5 runes:

```svelte
<script lang="ts">
	interface Props {
		open: boolean;
		businessId: string;
		onClose: () => void;
	}

	let { open, businessId, onClose }: Props = $props();

	let loading = $state(false);
	let items = $state<Item[]>([]);
	const filtered = $derived(items.filter((i) => i.active));

	$effect(() => {
		if (open && businessId) loadData();
	});

	async function loadData() {
		/* ... */
	}
</script>
```

### Key Features

#### POS System (`pos/new-order/+page.svelte`)

- Menu browsing with category tabs
- Cart with modifier customization
- **Multi-gateway payment** — PaymentDialog dynamically shows Stripe and/or Razorpay based on per-business credentials
- Split payments across methods
- Barcode scan-to-add via `BarcodeScanner.svelte`
- Offline mode — orders queue in IndexedDB and sync on reconnect
- Thermal receipt printing via WebUSB

#### Online Ordering (`(order-online)/[slug]/`)

Public customer-facing ordering with 3-step checkout:

1. **Details** — cart review, customer info, delivery address if applicable
2. **Confirm** — final review with itemized pricing
3. **Payment** — gateway selection (Stripe / Razorpay / Cash on Pickup)

Stripe flow:

- Lazy-loads `@stripe/stripe-js` only when needed
- Creates payment intent via backend `/create-payment-intent` endpoint
- Mounts Stripe Payment Element with business's publishable key
- Handles 3DS redirect with sessionStorage context restore

Razorpay flow:

- Lazy-loads `checkout.razorpay.com/v1/checkout.js` script
- Creates server-side order via backend `/create-razorpay-order`
- Opens Razorpay Checkout popup with business's keyId
- Verifies signature server-side via `/verify-razorpay-payment`

#### Payment Credentials UI (`settings/payments/credentials/`)

- Per-provider cards (Stripe, Razorpay, Dodo)
- Taglines explaining each provider's use case (International / India / Platform)
- Enable/disable toggle + Test/Live mode selector
- Publishable key input (plain text)
- Secret key input (password field with `••••4242` masked display)
- Webhook secret input
- **Webhook URL display** — auto-generated per-business URL with copy button
- **Test Connection** button — pings the provider API to verify keys work
- Delete button with confirmation dialog
- Platform fallback indicator when business hasn't configured own keys

#### Online Ordering Settings (`settings/online-ordering/`)

- Enable/disable online store
- Takeaway / delivery toggles
- Minimum order amount
- Accepted payment methods
- Estimated prep time
- **Shareable URL** with copy button
- **QR code** generation with PNG download
- Helper text and security notes

#### Staff Scheduling (`team/schedule/`)

- Weekly roster grid (staff × days)
- Shift template picker with color coding
- Drag-and-drop assignment (or click to assign)
- Leave management tab with approval queue
- Week navigation (prev/next/today)
- Conflict detection warnings

#### Delivery Management (`delivery/`)

- Drivers page with status badges
- Zones page with polygon editor (coordinate entry)
- Active deliveries kanban — Pending → Assigned → Picked Up → In Transit → Delivered
- Public tracking page showing driver name, phone, ETA

#### Analytics & Reports

- Real-time dashboard with revenue trends, top items, peak hours
- **Predictive analytics** — revenue forecast (actual vs predicted), demand planning table, reorder suggestions
- **Custom Report Builder** — pick metrics + dimensions + filters, preview table/chart, save/export CSV

### Authentication

Auth is handled by Better Auth with these capabilities:

- Email/password with email OTP verification
- Google OAuth
- Two-factor authentication (TOTP)
- Session management (list, revoke)
- Password change with strength meter
- Admin impersonation (super admin)

Client setup is in `src/lib/auth.ts`. The Vite dev server proxies `/api` requests to the NestJS backend at `localhost:3000`.

### Internationalization

Custom reactive i18n system in `src/lib/i18n.svelte.ts`:

```typescript
import { t, locale, setLocale, SUPPORTED_LOCALES } from '$lib/i18n.svelte';

// In component:
<h1>{t('nav.dashboard')}</h1>
<button onclick={() => setLocale('hi')}>{t('common.switchToHindi')}</button>

// With interpolation:
<p>{t('greeting', { name: userName })}</p>
```

Messages are loaded eagerly at build time via `import.meta.glob('./i18n/*.json')`. Supports 259 message keys across English and Hindi. New locales can be added by dropping a JSON file into `src/lib/i18n/` and adding it to `SUPPORTED_LOCALES`.

The user's language preference is persisted to `localStorage` and auto-detected from browser language on first visit.

Locale switcher component is available at `src/lib/components/global/locale-switcher.svelte` and integrated into the user dropdown in the sidebar.

### PWA & Offline Support

- Service worker via `@vite-pwa/sveltekit`
- Runtime caching:
  - **CacheFirst** for Google Fonts
  - **NetworkFirst** for `/api/*` with 5-minute TTL
  - **NetworkOnly** for `/api/auth/*` (no caching)
- Install prompt component (`pwa-update-prompt.svelte`)
- Offline indicator (`offline-indicator.svelte`)
- IndexedDB store for offline order queue (`src/lib/utils/offline-store.ts`)

### Code Splitting

Manual chunks configured in `vite.config.ts`:

- `vendor-charts` — d3, layerchart
- `vendor-socket` — socket.io, engine.io
- `vendor-table` — @tanstack/table-core
- `vendor-auth` — better-auth
- `vendor-ui` — bits-ui + shadcn

Large components use lazy imports:

```typescript
const LazyBarChart = lazy(() => import('./chart/bar-chart.svelte'));
```

## Configuration

### Vite Proxy

In development, `/api/*` requests are proxied to the backend:

```ts
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

### SvelteKit Adapter

The app uses `svelte-adapter-bun` for production deployment. Change the adapter in `svelte.config.js` if deploying to Node, Vercel, Cloudflare, or another runtime.

## Component Library

The UI is built on [shadcn-svelte](https://shadcn-svelte.com/) with 60+ base components in `src/lib/components/ui/`. Key custom components:

| Component          | Location                          | Purpose                              |
| ------------------ | --------------------------------- | ------------------------------------ |
| `ConfirmDialog`    | `global/confirm-dialog.svelte`    | Destructive confirmation dialogs     |
| `EmptyState`       | `data-display/empty-state.svelte` | Empty data placeholders              |
| `PageHeader`       | `global/page-header.svelte`       | Consistent page headers with actions |
| `StatCard`         | `global/stat-card.svelte`         | Metric display cards                 |
| `BusinessSwitcher` | `global/business-switcher.svelte` | Multi-business selector              |
| `ThemeToggle`      | `global/theme-toggle.svelte`      | Dark/light mode switch               |
| `LocaleSwitcher`   | `global/locale-switcher.svelte`   | Language picker                      |
| `BarcodeScanner`   | `pos/BarcodeScanner.svelte`       | Camera-based barcode scanning        |
| `PaymentDialog`    | `pos/PaymentDialog.svelte`        | Multi-gateway payment flow           |
| `ReceiptDialog`    | `pos/ReceiptDialog.svelte`        | Print + email + WhatsApp delivery    |
| `TableFloorPlan`   | `pos/TableFloorPlan.svelte`       | Drag-and-drop floor plan editor      |
| `LazyBarChart`     | `chart/lazy-bar-chart.svelte`     | Code-split chart wrapper             |
| `LazyPieChart`     | `chart/lazy-pie-chart.svelte`     | Code-split chart wrapper             |

Before creating new UI components, check `@ieedan/shadcn-svelte-extras` for existing implementations.

## Testing

```bash
# E2E tests with Playwright
npm run test:e2e

# Type checking
npm run check

# Lint + format check
npm run lint
```

Storybook for component development:

```bash
npm run storybook  # port 6006
```

## Deployment

### Build

```bash
npm run build
npm run preview  # local preview
```

### Adapter

Default adapter is `svelte-adapter-bun`. To switch to Node:

```bash
npm install -D @sveltejs/adapter-node
```

Then update `svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-node';
// ...
kit: {
	adapter: adapter();
}
```

### Environment

Ensure these env vars are set in production:

- `PUBLIC_API_BASE` — your backend API URL
- `PUBLIC_BACKEND_URL` — your backend public origin (for webhook URL display)
- `PUBLIC_SUPPORT_EMAIL` — support contact

## License

Proprietary. All rights reserved.
