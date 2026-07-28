<script lang="ts">
	import SectionNav, { type SectionNavItem } from '$lib/components/global/section-nav.svelte';
	import { page } from '$app/stores';

	import Building2 from '@lucide/svelte/icons/building-2';
	import Clock from '@lucide/svelte/icons/clock';
	import Bell from '@lucide/svelte/icons/bell';
	import Wallet from '@lucide/svelte/icons/wallet';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Receipt from '@lucide/svelte/icons/receipt';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import ChefHat from '@lucide/svelte/icons/chef-hat';
	import Gift from '@lucide/svelte/icons/gift';
	import Blocks from '@lucide/svelte/icons/blocks';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';

	let { data, children } = $props();

	/**
	 * Settings has far more sections than franchise or billing, so the row is
	 * chunked with dividers: business identity · money · operations · platform.
	 * `SectionNav` scrolls horizontally when it doesn't fit.
	 *
	 * Each page still renders its own header — this layout deliberately supplies
	 * only the nav, so the eight pre-existing settings pages keep working
	 * untouched instead of needing a coordinated header refactor.
	 */
	const base = $derived(`/${data.businessType}/${$page.params.slug}/settings`);

	const items = $derived<SectionNavItem[]>([
		{ label: 'General', href: base, icon: Building2, exact: true },
		{ label: 'Hours', href: `${base}/hours`, icon: Clock },
		{ label: 'Notifications', href: `${base}/notifications`, icon: Bell },

		{
			label: 'Payment methods',
			href: `${base}/payment-methods`,
			icon: Wallet,
			startsGroup: true
		},
		{ label: 'Gateways & UPI', href: `${base}/payments`, icon: CreditCard },
		{ label: 'Tax', href: `${base}/tax`, icon: Receipt },
		{ label: 'Accounting', href: `${base}/accounting`, icon: FileSpreadsheet },

		{
			label: 'Online ordering',
			href: `${base}/online-ordering`,
			icon: ShoppingCart,
			startsGroup: true
		},
		{ label: 'Kitchen stations', href: `${base}/kitchen-stations`, icon: ChefHat },
		{ label: 'Loyalty', href: `${base}/loyalty`, icon: Gift },

		{ label: 'Features', href: `${base}/features`, icon: Blocks, startsGroup: true },
		{ label: 'API keys', href: `${base}/api-keys`, icon: KeyRound },
		// Sits in the platform group rather than beside the assistant itself:
		// this is the billing-shaped question ("what is it costing us"), and it
		// is where an owner looks for it.
		{ label: 'Assistant usage', href: `${base}/assistant-usage`, icon: SparklesIcon }
	]);
</script>

<div class="px-4 pt-4 md:px-6 md:pt-6">
	<SectionNav {items} label="Settings sections" />
</div>

{@render children()}
