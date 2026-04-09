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
export interface NavSubItem {
	title: string;
	url: string;
}

export type SidebarRole = 'owner' | 'restaurant_owner' | 'manager' | 'staff' | 'viewer' | 'accountant';

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
				allowedRoles: ['owner', 'restaurant_owner', 'manager', 'staff'],
			},
			{
				title: 'Menu',
				url: '/[business]/[slug]/menu',
				icon: UtensilsIcon,
				requiredFeature: 'menu',
				allowedRoles: ['owner', 'restaurant_owner', 'manager'],
				items: [
					{
						title: 'Items',
						url: '/[business]/[slug]/menu/items'
					},
					{
						title: 'Categories',
						url: '/[business]/[slug]/menu/categories'
					},
					{
						title: 'Modifiers',
						url: '/[business]/[slug]/menu/modifiers'
					},
					{
						title: 'Groups',
						url: '/[business]/[slug]/menu/groups'
					}
				]
			},
			{
				title: 'Orders',
				url: '/[business]/[slug]/orders',
				icon: ClipboardListIcon,
				items: [
					{
						title: 'Pending',
						url: '/[business]/[slug]/orders/pending'
					},
					{
						title: 'Completed',
						url: '/[business]/[slug]/orders/completed'
					},
					{
						title: 'History',
						url: '/[business]/[slug]/orders/history'
					}
				]
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
				title: 'Tables',
				url: '/[business]/[slug]/tables',
				icon: TableIcon,
				requiredFeature: 'tables',
				items: [
					{
						title: 'Layout',
						url: '/[business]/[slug]/tables/layout'
					},
					{
						title: 'Reservations',
						url: '/[business]/[slug]/tables/reservations'
					}
				]
			},
			{
				title: 'Customers',
				url: '/[business]/[slug]/customers',
				icon: ContactIcon,
				items: [
					{
						title: 'All Customers',
						url: '/[business]/[slug]/customers'
					}
				]
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
				title: 'Expenses',
				url: '/[business]/[slug]/expenses',
				icon: DollarSignIcon,
				requiredFeature: 'expenses',
				items: [
					{
						title: 'Daily',
						url: '/[business]/[slug]/expenses/daily'
					},
					{
						title: 'Monthly',
						url: '/[business]/[slug]/expenses/monthly'
					},
					{
						title: 'Reports',
						url: '/[business]/[slug]/expenses/reports'
					}
				]
			},
			{
				title: 'Team',
				url: '/[business]/[slug]/team',
				icon: UsersIcon,
				requiredFeature: 'team',
				allowedRoles: ['owner', 'restaurant_owner', 'manager']
			},
			{
				title: 'Settings',
				url: '/[business]/[slug]/settings',
				icon: SettingsIcon,
				allowedRoles: ['owner', 'restaurant_owner'],
				items: [
					{
						title: 'General',
						url: '/[business]/[slug]/settings'
					},
					{
						title: 'Tax & Invoicing',
						url: '/[business]/[slug]/settings/tax'
					},
					{
						title: 'Loyalty',
						url: '/[business]/[slug]/settings/loyalty'
					},
					{
						title: 'Online Ordering',
						url: '/[business]/[slug]/settings/online-ordering'
					},
					{
						title: 'UPI Payments',
						url: '/[business]/[slug]/settings/payments'
					},
					{
						title: 'API Keys',
						url: '/[business]/[slug]/settings/api-keys'
					},
					{
						title: 'Kitchen Stations',
						url: '/[business]/[slug]/settings/kitchen-stations'
					},
					{
						title: 'Features',
						url: '/[business]/[slug]/settings/features'
					}
				]
			}
		]
	}
};
