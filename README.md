# POS Platform — Frontend

Multi-tenant dashboard and POS interface. Built with SvelteKit 2, Svelte 5, and shadcn-svelte.

## Tech Stack

- **Framework**: SvelteKit 2 + Svelte 5 (runes)
- **Styling**: Tailwind CSS v4
- **Components**: shadcn-svelte (55+ components)
- **Charts**: LayerChart (D3-based)
- **Auth**: Better Auth client (sessions, OAuth, OTP, 2FA)
- **Payments**: Dodo Payments client
- **Icons**: Lucide + Tabler
- **Forms**: Superforms + Formsnap
- **Testing**: Playwright (E2E)
- **Storybook**: v10 for component development
- **Runtime**: Bun (via `svelte-adapter-bun`)

## Getting Started

### Prerequisites

- Node.js 20+ (or Bun)
- Backend server running on port 3000

### Setup

```bash
cd frontend
npm install

# Start dev server (Vite proxies /api to localhost:3000)
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | Svelte type checking |
| `npm run lint` | Prettier + ESLint check |
| `npm run format` | Prettier formatting |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run storybook` | Component dev on port 6006 |

## Architecture

```
src/
├── routes/
│   ├── (auth)/                    # Login, register, verify email, reset password
│   ├── (public)/                  # Landing page, contact
│   └── (protected)/               # Requires authentication
│       ├── [business]/[slug]/     # Business-scoped pages
│       │   ├── dashboard/         # Analytics, reports
│       │   ├── pos/               # New order, transactions
│       │   ├── orders/            # Pending, completed, history
│       │   ├── menu/              # Items, categories, modifiers
│       │   ├── tables/            # Layout, reservations
│       │   ├── inventory/         # Stock, suppliers
│       │   ├── expenses/          # Daily, monthly, reports
│       │   ├── kitchen-display/   # Kitchen order screen
│       │   ├── team/              # Member management
│       │   └── settings/          # Business settings
│       ├── admin/                 # Super admin panel
│       │   ├── analytics/         # Platform metrics
│       │   ├── businesses/        # Business management
│       │   ├── users/             # User management
│       │   ├── plans/             # Subscription plans
│       │   ├── announcements/     # Platform announcements
│       │   ├── audit-logs/        # Audit trail viewer
│       │   └── webhooks/          # Webhook monitoring
│       └── dashboard/             # User dashboard
│           ├── businesses/        # Business list
│           ├── billing/           # Billing info
│           ├── security/          # Password, sessions, 2FA
│           ├── notifications/     # Notification preferences
│           └── subscriptions/     # Plan management
├── lib/
│   ├── api/                       # API client modules (18 files)
│   ├── auth.ts                    # Better Auth client setup
│   ├── components/
│   │   ├── ui/                    # shadcn-svelte base (55 components)
│   │   ├── pos/                   # POS components (14)
│   │   ├── global/                # Layout & shared (16)
│   │   ├── chart/                 # Chart wrappers (5)
│   │   ├── data-display/          # Stats & visualization (9)
│   │   ├── search/                # Search & filters (8)
│   │   ├── business-setup/        # Onboarding wizard (6)
│   │   ├── admin/                 # Admin panel (3)
│   │   └── team/                  # Team management (1)
│   ├── constants/                 # Config, currency
│   ├── i18n/                      # Formatting (currency, dates)
│   └── utils/                     # Helpers (errors, etc.)
└── app.html                       # HTML shell (dark mode FOUC prevention)
```

### API Client

All backend communication goes through typed API modules in `src/lib/api/`:

| Module | Covers |
|--------|--------|
| `client.ts` | HTTP client config (headers, auth cookies) |
| `business.ts` | Business CRUD, settings |
| `order.ts` | Order lifecycle, receipts |
| `payment.ts` | Processing, splits, refunds |
| `menu.ts` | Items, categories, modifiers |
| `table.ts` | Tables, reservations, sessions |
| `inventory.ts` | Stock, suppliers, transactions |
| `expense.ts` | Expenses, reports |
| `analytics.ts` | Dashboard stats, trends |
| `team.ts` | Members, roles, invites |
| `subscription.ts` | Plans, checkout |
| `admin.ts` | Users, businesses, platform stats |
| `announcement.ts` | Announcements |
| `search.ts` | Global search |
| `user.ts` | User profile |

### Key Features

- **Multi-tenant**: Business-scoped routes via `[business]/[slug]` dynamic segments
- **POS System**: Menu browsing, cart with modifiers, split payments, receipt printing (PDF via html2pdf.js)
- **Table Management**: Floor plan with drag-and-drop, shape picker, live session tracking
- **Kitchen Display**: Real-time order queue via Socket.io
- **Dark Mode**: Toggle with FOUC prevention, persisted via `mode-watcher`
- **Business Setup Wizard**: Multi-step onboarding (essentials → store → team → payment → hours)
- **Admin Panel**: User/business management, analytics, audit logs, announcements
- **Accessibility**: Skip navigation, ARIA labels, dialog autofocus, scroll-to-top

### Authentication

Auth is handled by Better Auth with these capabilities:

- Email/password with email OTP verification
- Google OAuth
- Two-factor authentication (TOTP)
- Session management (list, revoke)
- Password change with strength meter

Client setup is in `src/lib/auth.ts`. The Vite dev server proxies `/api` requests to the NestJS backend at `localhost:3000`.

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

The app uses `svelte-adapter-bun` for production deployment. Change the adapter in `svelte.config.js` if deploying to a different runtime (Node, Vercel, Cloudflare, etc.).

### Environment Variables

Public env vars (accessible in client code) are prefixed with `PUBLIC_`:

| Variable | Description |
|----------|-------------|
| `PUBLIC_API_BASE` | Backend API URL (default: `/api`) |
| `PUBLIC_SUPPORT_EMAIL` | Support email shown in UI |

## Component Library

The UI is built on [shadcn-svelte](https://shadcn-svelte.com/) with 55+ base components in `src/lib/components/ui/`. Key custom components:

| Component | Location | Purpose |
|-----------|----------|---------|
| `ConfirmDialog` | `global/confirm-dialog.svelte` | Confirmation dialogs (replaces `confirm()`) |
| `EmptyState` | `data-display/empty-state.svelte` | Empty data placeholders |
| `PageHeader` | `global/page-header.svelte` | Consistent page headers |
| `StatsCard` | `global/stats-card.svelte` | Metric display cards |
| `BusinessSwitcher` | `global/business-switcher.svelte` | Multi-business selector |
| `ThemeToggle` | `global/theme-toggle.svelte` | Dark/light mode switch |
| `PasswordStrength` | `ui/password-strength/` | Password strength meter |
| `LazyBarChart` | `chart/lazy-bar-chart.svelte` | Code-split chart wrapper |
| `LazyPieChart` | `chart/lazy-pie-chart.svelte` | Code-split chart wrapper |
