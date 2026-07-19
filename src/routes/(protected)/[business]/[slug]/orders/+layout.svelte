<script lang="ts">
	import SectionNav, { type SectionNavItem } from '$lib/components/global/section-nav.svelte';
	import { page } from '$app/stores';

	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	import Clock from '@lucide/svelte/icons/clock';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import History from '@lucide/svelte/icons/history';

	let { data, children } = $props();

	const base = $derived(`/${data.businessType}/${$page.params.slug}/orders`);

	/**
	 * Four status views over one dataset, plus an overview. `exact` on Overview
	 * so it doesn't stay lit on every child route.
	 */
	const items = $derived<SectionNavItem[]>([
		{ label: 'Overview', href: base, icon: LayoutDashboard, exact: true },
		{ label: 'Pending', href: `${base}/pending`, icon: Clock },
		{ label: 'Approval', href: `${base}/pending-approval`, icon: ShieldCheck },
		{ label: 'Completed', href: `${base}/completed`, icon: CircleCheck },
		{ label: 'History', href: `${base}/history`, icon: History }
	]);

	/**
	 * A single order is a destination, not a sibling view — showing the status
	 * tabs there would imply the detail page is one of them. `[orderId]` shares
	 * this layout because it's nested under /orders, so the nav is hidden
	 * rather than the route being moved into a group (which would churn the
	 * route tree for a purely visual concern).
	 */
	const isDetailRoute = $derived(Boolean($page.params.orderId));
</script>

{#if !isDetailRoute}
	<div class="px-4 pt-4 md:px-6 md:pt-6">
		<SectionNav {items} label="Order views" />
	</div>
{/if}

{@render children()}
