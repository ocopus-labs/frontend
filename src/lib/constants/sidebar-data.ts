import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform';
import BookOpenIcon from '@lucide/svelte/icons/book-open';
import BotIcon from '@lucide/svelte/icons/bot';
import ChartPieIcon from '@lucide/svelte/icons/chart-pie';
import CommandIcon from '@lucide/svelte/icons/command';
import FrameIcon from '@lucide/svelte/icons/frame';
import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end';
import MapIcon from '@lucide/svelte/icons/map';
import Settings2Icon from '@lucide/svelte/icons/settings-2';
import SquareTerminalIcon from '@lucide/svelte/icons/square-terminal';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import CreditCardIcon from '@lucide/svelte/icons/credit-card';
import UtensilsIcon from '@lucide/svelte/icons/utensils';
import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
import TableIcon from '@lucide/svelte/icons/table';
import PackageIcon from '@lucide/svelte/icons/package';
import DollarSignIcon from '@lucide/svelte/icons/dollar-sign';
import MonitorIcon from '@lucide/svelte/icons/monitor';
import UsersIcon from '@lucide/svelte/icons/users';
import type { FeatureKey } from '$lib/utils/plan-features';

export interface NavSubItem {
	title: string;
	url: string;
}

export interface NavItem {
	title: string;
	url: string;
	icon?: any;
	isActive?: boolean;
	requiredFeature?: FeatureKey;
	requiredPlan?: 'PRO' | 'ENTERPRISE';
	items?: NavSubItem[];
}

export interface ProjectItem {
	name: string;
	url: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	icon: any;
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
	projects: ProjectItem[];
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
				title: 'Menu',
				url: '/[business]/[slug]/menu',
				icon: UtensilsIcon,
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
				requiredFeature: 'kitchenDisplay',
				requiredPlan: 'PRO',
				items: [
					{
						title: 'Orders Queue',
						url: '/[business]/[slug]/kitchen-display/orders'
					},
					{
						title: 'Preparation Status',
						url: '/[business]/[slug]/kitchen-display/status'
					}
				]
			},
			{
				title: 'Tables',
				url: '/[business]/[slug]/tables',
				icon: TableIcon,
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
				title: 'Inventory',
				url: '/[business]/[slug]/inventory',
				icon: PackageIcon,
				requiredFeature: 'inventory',
				requiredPlan: 'PRO',
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
				requiredPlan: 'PRO',
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
				items: [
					{
						title: 'Members',
						url: '/[business]/[slug]/team'
					},
					{
						title: 'Roles',
						url: '/[business]/[slug]/team/roles'
					},
					{
						title: 'Invitations',
						url: '/[business]/[slug]/team/invitations'
					}
				]
			}
		],
		projects: [
			{
				name: 'Kitchen',
				url: '/[business]/[slug]/areas/kitchen',
				icon: FrameIcon
			},
			{
				name: 'Dining Area',
				url: '/[business]/[slug]/areas/dining-area',
				icon: ChartPieIcon
			},
			{
				name: 'Bar',
				url: '/[business]/[slug]/areas/bar',
				icon: MapIcon
			}
		]
	}
};
