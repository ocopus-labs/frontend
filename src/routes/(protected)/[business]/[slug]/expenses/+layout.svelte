<script lang="ts">
	import SectionNav, { type SectionNavItem } from '$lib/components/global/section-nav.svelte';
	import { page } from '$app/stores';

	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import ChartColumn from '@lucide/svelte/icons/chart-column';

	let { data, children } = $props();

	/**
	 * Three views of the same expense data, so they get a tab bar rather than
	 * three unrelated sidebar entries. Each page keeps its own header — this
	 * layout supplies only the nav.
	 */
	const base = $derived(`/${data.businessType}/${$page.params.slug}/expenses`);

	const items = $derived<SectionNavItem[]>([
		{ label: 'Daily', href: `${base}/daily`, icon: CalendarDays },
		{ label: 'Monthly', href: `${base}/monthly`, icon: CalendarRange },
		{ label: 'Reports', href: `${base}/reports`, icon: ChartColumn }
	]);
</script>

<div class="px-4 pt-4 md:px-6 md:pt-6">
	<SectionNav {items} label="Expense views" />
</div>

{@render children()}
