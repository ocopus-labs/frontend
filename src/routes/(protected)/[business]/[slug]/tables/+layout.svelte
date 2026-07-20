<script lang="ts">
	import SectionNav, { type SectionNavItem } from '$lib/components/global/section-nav.svelte';
	import { page } from '$app/stores';

	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';

	let { data, children } = $props();

	/**
	 * Three views of the same floor: who's seated now, who's booked later, who's
	 * queued at the door. They were three unlinked leaf routes before — Waitlist
	 * had no sidebar entry at all and was effectively unreachable. Each page
	 * keeps its own header; this layout supplies only the nav.
	 */
	const base = $derived(`/${data.businessType}/${$page.params.slug}/tables`);

	/**
	 * Reservations and Waitlist are both served by controllers carrying
	 * `@RequireBusinessFeature('reservations')` — a separate extra that merely
	 * `dependsOn: ['tables']`. A business can have Tables without it, so those
	 * two tabs are hidden rather than left to 403 on load.
	 *
	 * Empty `enabledFeatures` means "unknown", not "none" — the same convention
	 * the route guard in `[slug]/+layout.server.ts` uses, so don't filter then.
	 */
	const hasReservations = $derived(
		data.enabledFeatures.length === 0 || data.enabledFeatures.includes('reservations')
	);

	const items = $derived<SectionNavItem[]>([
		{ label: 'Layout', href: `${base}/layout`, icon: LayoutGrid },
		...(hasReservations
			? [
					{ label: 'Reservations', href: `${base}/reservations`, icon: CalendarCheck },
					{ label: 'Waitlist', href: `${base}/waitlist`, icon: ListOrdered }
				]
			: [])
	]);
</script>

<!-- A lone "Layout" tab is chrome with no choice in it — hide the bar entirely. -->
{#if items.length > 1}
	<div class="px-4 pt-4 md:px-6 md:pt-6">
		<SectionNav {items} label="Table views" />
	</div>
{/if}

{@render children()}
