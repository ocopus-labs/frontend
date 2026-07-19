<script lang="ts">
	import SectionNav, { type SectionNavItem } from '$lib/components/global/section-nav.svelte';
	import { page } from '$app/stores';

	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Boxes from '@lucide/svelte/icons/boxes';

	let { data, children } = $props();

	const base = $derived(`/${data.businessType}/${$page.params.slug}/menu`);

	/**
	 * "Items" is the landing view rather than a separate overview page — the
	 * item list *is* what people come here to do. `/menu` redirects to it.
	 */
	const items = $derived<SectionNavItem[]>([
		{ label: 'Items', href: `${base}/items`, icon: UtensilsCrossed },
		{ label: 'Categories', href: `${base}/categories`, icon: LayoutGrid },
		{ label: 'Modifiers', href: `${base}/modifiers`, icon: SlidersHorizontal },
		{ label: 'Groups', href: `${base}/groups`, icon: Boxes }
	]);
</script>

<div class="px-4 pt-4 md:px-6 md:pt-6">
	<SectionNav {items} label="Menu sections" />
</div>

{@render children()}
