<script lang="ts">
	import SectionNav, { type SectionNavItem } from './section-nav.svelte';

	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Users from '@lucide/svelte/icons/users';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Settings from '@lucide/svelte/icons/settings';
	import ScrollText from '@lucide/svelte/icons/scroll-text';

	interface Props {
		slug: string;
		class?: string;
	}

	let { slug, class: className = '' }: Props = $props();

	const base = $derived(`/franchise/${slug}`);

	const items = $derived<SectionNavItem[]>([
		{ label: 'Overview', href: base, icon: LayoutDashboard, exact: true },
		{ label: 'Locations', href: `${base}/locations`, icon: MapPin },
		{ label: 'Team', href: `${base}/team`, icon: Users },
		{ label: 'Analytics', href: `${base}/analytics`, icon: BarChart3 },
		{ label: 'Audit Trail', href: `${base}/audit-trail`, icon: ScrollText },
		{ label: 'Settings', href: `${base}/settings`, icon: Settings }
	]);
</script>

<SectionNav {items} label="Franchise sections" class={className} />
