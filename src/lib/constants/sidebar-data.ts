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

export const sidebarData = {
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
				url: '/restaurant/[slug]/dashboard',
				icon: LayoutDashboardIcon,
				isActive: true,
				items: [
					{
						title: 'Overview',
						url: '/restaurant/[slug]/dashboard'
					},
					{
						title: 'Analytics',
						url: '/restaurant/[slug]/dashboard/analytics'
					},
					{
						title: 'Reports',
						url: '/restaurant/[slug]/dashboard/reports'
					}
				]
			},
			{
				title: 'POS',
				url: '/restaurant/[slug]/pos',
				icon: CreditCardIcon,
				items: [
					{
						title: 'New Order',
						url: '/restaurant/[slug]/pos/new-order'
					},
					{
						title: 'Transactions',
						url: '/restaurant/[slug]/pos/transactions'
					}
				]
			},
			{
				title: 'Menu',
				url: '/restaurant/[slug]/menu',
				icon: UtensilsIcon,
				items: [
					{
						title: 'Items',
						url: '/restaurant/[slug]/menu/items'
					},
					{
						title: 'Categories',
						url: '/restaurant/[slug]/menu/categories'
					},
					{
						title: 'Modifiers',
						url: '/restaurant/[slug]/menu/modifiers'
					}
				]
			},
			{
				title: 'Orders',
				url: '/restaurant/[slug]/orders',
				icon: ClipboardListIcon,
				items: [
					{
						title: 'Pending',
						url: '/restaurant/[slug]/orders/pending'
					},
					{
						title: 'Completed',
						url: '/restaurant/[slug]/orders/completed'
					},
					{
						title: 'History',
						url: '/restaurant/[slug]/orders/history'
					}
				]
			},
			{
				title: 'Kitchen Display',
				url: '/restaurant/[slug]/kitchen-display',
				icon: MonitorIcon,
				items: [
					{
						title: 'Orders Queue',
						url: '/restaurant/[slug]/kitchen-display/orders'
					},
					{
						title: 'Preparation Status',
						url: '/restaurant/[slug]/kitchen-display/status'
					}
				]
			},
			{
				title: 'Tables',
				url: '/restaurant/[slug]/tables',
				icon: TableIcon,
				items: [
					{
						title: 'Layout',
						url: '/restaurant/[slug]/tables/layout'
					},
					{
						title: 'Reservations',
						url: '/restaurant/[slug]/tables/reservations'
					}
				]
			},
			{
				title: 'Inventory',
				url: '/restaurant/[slug]/inventory',
				icon: PackageIcon,
				items: [
					{
						title: 'Stock',
						url: '/restaurant/[slug]/inventory/stock'
					},
					{
						title: 'Suppliers',
						url: '/restaurant/[slug]/inventory/suppliers'
					}
				]
			},
			{
				title: 'Expenses',
				url: '/restaurant/[slug]/expenses',
				icon: DollarSignIcon,
				items: [
					{
						title: 'Daily',
						url: '/restaurant/[slug]/expenses/daily'
					},
					{
						title: 'Monthly',
						url: '/restaurant/[slug]/expenses/monthly'
					},
					{
						title: 'Reports',
						url: '/restaurant/[slug]/expenses/reports'
					}
				]
			}
		],
		projects: [
			{
				name: 'Kitchen',
				url: '/restaurant/[slug]/areas/kitchen',
				icon: FrameIcon
			},
			{
				name: 'Dining Area',
				url: '/restaurant/[slug]/areas/dining-area',
				icon: ChartPieIcon
			},
			{
				name: 'Bar',
				url: '/restaurant/[slug]/areas/bar',
				icon: MapIcon
			}
		]
	}
};
