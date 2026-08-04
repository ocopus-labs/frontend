import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';
import CommandIcon from '@lucide/svelte/icons/command';
import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import CreditCardIcon from '@lucide/svelte/icons/credit-card';
import UtensilsIcon from '@lucide/svelte/icons/utensils';
import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
import TableIcon from '@lucide/svelte/icons/table';
import ContactIcon from '@lucide/svelte/icons/contact';
import PackageIcon from '@lucide/svelte/icons/package';
import DollarSignIcon from '@lucide/svelte/icons/dollar-sign';
import MonitorIcon from '@lucide/svelte/icons/monitor';
import UsersIcon from '@lucide/svelte/icons/users';
import SettingsIcon from '@lucide/svelte/icons/settings';
import LandmarkIcon from '@lucide/svelte/icons/landmark';
import StarIcon from '@lucide/svelte/icons/star';
import TicketPercentIcon from '@lucide/svelte/icons/ticket-percent';
import SparklesIcon from '@lucide/svelte/icons/sparkles';
import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
export interface NavSubItem {
	title: string;
	url: string;
	/**
	 * Business-level feature gate, same semantics as `NavItem.requiredFeature`.
	 *
	 * A parent can be enabled while one of its children is not — Team is on for
	 * every vertical, but Commission is gated on `appointments` and 403s for a
	 * restaurant. Without this the link renders and dies on its first call,
	 * which is how a permission boundary reaches the user as a bug report.
	 */
	requiredFeature?: string;
}

export type SidebarRole =
	'owner' | 'restaurant_owner' | 'manager' | 'staff' | 'viewer' | 'accountant';

export interface NavItem {
	title: string;
	url: string;
	icon?: any;
	isActive?: boolean;
	/** Business-level feature gate — item hidden if feature not in enabledFeatures */
	requiredFeature?: string;
	/** Tier-level plan gate — item shows lock icon if plan insufficient */
	requiredPlan?: 'PRO' | 'ENTERPRISE';
	/** Roles that can see this item. If omitted, visible to all roles. */
	allowedRoles?: SidebarRole[];
	items?: NavSubItem[];
}

export interface SidebarData {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
	teams: {
		name: string;
		logo: any;
		plan: string;
	}[];
	navMain: NavItem[];
}

export const sidebarData: Record<string, SidebarData> = {
	restaurant: {
		user: {
			name: 'John Manager',
			email: 'manager@restaurant.com',
			avatar: '/avatars/manager.jpg'
		},
		teams: [
			{
				name: 'Bella Vista Restaurant',
				logo: GalleryVerticalEndIcon,
				plan: 'Premium'
			},
			{
				name: 'Ocean Breeze Diner',
				logo: AudioWaveformIcon,
				plan: 'Standard'
			},
			{
				name: 'Mountain Grill',
				logo: CommandIcon,
				plan: 'Basic'
			}
		],
		navMain: [
			{
				title: 'Dashboard',
				url: '/[business]/[slug]/dashboard',
				icon: LayoutDashboardIcon,
				isActive: true,
				items: [
					{
						title: 'Overview',
						url: '/[business]/[slug]/dashboard'
					},
					{
						title: 'Analytics',
						url: '/[business]/[slug]/dashboard/analytics'
					},
					{
						title: 'Reports',
						url: '/[business]/[slug]/dashboard/reports'
					}
				]
			},
			{
				// Second, under Dashboard: the assistant answers the same
				// questions the dashboard does, and until B1 it had no nav entry
				// at all — it was reachable only by typing the URL.
				title: 'Assistant',
				url: '/[business]/[slug]/assistant',
				icon: SparklesIcon
			},
			{
				title: 'POS',
				url: '/[business]/[slug]/pos',
				icon: CreditCardIcon,
				items: [
					{
						title: 'New Order',
						url: '/[business]/[slug]/pos/new-order'
					},
					{
						title: 'Transactions',
						url: '/[business]/[slug]/pos/transactions'
					}
				]
			},
			{
				title: 'Cash Drawer',
				url: '/[business]/[slug]/cash-drawer',
				icon: LandmarkIcon,
				allowedRoles: ['owner', 'restaurant_owner', 'manager', 'staff']
			},
			{
				title: 'Menu',
				url: '/[business]/[slug]/menu',
				icon: UtensilsIcon,
				requiredFeature: 'menu',
				allowedRoles: ['owner', 'restaurant_owner', 'manager']
				// Sections live in the menu tab bar (`menu/+layout.svelte`).
				// `/menu` redirects to Items.
			},
			{
				// Only the service verticals can enable `appointments`, so this entry
				// is invisible to a restaurant without any per-type nav list: the
				// feature filter in `nav-main.svelte` does the work.
				title: 'Appointments',
				url: '/[business]/[slug]/appointments',
				icon: CalendarClockIcon,
				requiredFeature: 'appointments',
				items: [
					{
						title: 'Diary',
						url: '/[business]/[slug]/appointments'
					},
					{
						// Chairs and rooms. Under Appointments rather than Settings
						// because it is the other half of what a booking occupies —
						// the person and the place — and the diary is where anyone
						// looking for it will be.
						title: 'Chairs & rooms',
						url: '/[business]/[slug]/appointments/resources'
					}
				]
			},
			{
				// Status views live in the orders tab bar (`orders/+layout.svelte`),
				// which also adds an overview at /orders. Same reasoning as Settings
				// and Expenses — one list, not two that drift.
				title: 'Orders',
				url: '/[business]/[slug]/orders',
				icon: ClipboardListIcon
			},
			{
				title: 'Kitchen Display',
				url: '/[business]/[slug]/kitchen-display',
				icon: MonitorIcon,
				requiredFeature: 'kds',
				requiredPlan: 'PRO',
				items: [
					{
						title: 'Orders Queue',
						url: '/[business]/[slug]/kitchen-display/orders'
					},
					{
						title: 'Hall Display',
						url: '/[business]/[slug]/kitchen-display/status'
					}
				]
			},
			{
				// Layout/Reservations/Waitlist live in the tables tab bar
				// (`tables/+layout.svelte`) — same reasoning as Expenses and Menu.
				// `/tables` redirects to Layout.
				title: 'Tables',
				url: '/[business]/[slug]/tables',
				icon: TableIcon,
				requiredFeature: 'tables'
			},
			{
				// Excludes viewer and accountant, matching the backend: every read on
				// CustomerController except `/stats` returns PII decrypted from
				// AES-256-GCM, and neither role holds a customer permission. Without
				// this the entry stays visible and the page 403s on its first call —
				// a dead link is how a permission change reaches the user as a bug
				// report instead of as a boundary.
				title: 'Customers',
				url: '/[business]/[slug]/customers',
				icon: ContactIcon,
				allowedRoles: ['owner', 'restaurant_owner', 'manager', 'staff'],
				items: [
					{
						title: 'All Customers',
						url: '/[business]/[slug]/customers'
					}
				]
			},
			{
				title: 'Coupons',
				url: '/[business]/[slug]/coupons',
				icon: TicketPercentIcon,
				requiredFeature: 'orders',
				allowedRoles: ['owner', 'restaurant_owner', 'manager']
			},
			{
				title: 'Reviews',
				url: '/[business]/[slug]/reviews',
				icon: StarIcon,
				requiredFeature: 'orders',
				allowedRoles: ['owner', 'restaurant_owner', 'manager']
			},
			{
				title: 'Inventory',
				url: '/[business]/[slug]/inventory',
				icon: PackageIcon,
				requiredFeature: 'inventory',
				items: [
					{
						title: 'Stock',
						url: '/[business]/[slug]/inventory/stock'
					},
					{
						title: 'Suppliers',
						url: '/[business]/[slug]/inventory/suppliers'
					}
				]
			},
			{
				// Daily/Monthly/Reports live in the expenses tab bar
				// (`expenses/+layout.svelte`) — see the Settings entry below for why
				// they aren't duplicated here. `/expenses` redirects to Daily.
				title: 'Expenses',
				url: '/[business]/[slug]/expenses',
				icon: DollarSignIcon,
				requiredFeature: 'expenses'
			},
			{
				title: 'Team',
				url: '/[business]/[slug]/team',
				icon: UsersIcon,
				requiredFeature: 'team',
				allowedRoles: ['owner', 'restaurant_owner', 'manager'],
				items: [
					{
						title: 'Members',
						url: '/[business]/[slug]/team'
					},
					{
						// Previously reachable only from the appointments page, which
						// meant a restaurant could not find its own rota.
						title: 'Schedule',
						url: '/[business]/[slug]/team/schedule'
					},
					{
						// Payroll, and salon-only: the backend gates it on
						// `appointments`, so a restaurant must not see the link.
						title: 'Commission',
						url: '/[business]/[slug]/team/commissions',
						requiredFeature: 'appointments'
					}
				]
			},
			{
				// Settings owns its own tab bar (`settings/+layout.svelte`), which
				// enumerates all twelve sections. Duplicating them here meant two
				// lists to keep in sync — and they had already drifted.
				title: 'Settings',
				url: '/[business]/[slug]/settings',
				icon: SettingsIcon,
				allowedRoles: ['owner', 'restaurant_owner']
			}
		]
	}
};
