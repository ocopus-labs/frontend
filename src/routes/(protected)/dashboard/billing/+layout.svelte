<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import SectionNav, { type SectionNavItem } from '$lib/components/global/section-nav.svelte';
	import { getCustomerPortalUrl } from '$lib/api/subscription';
	import { toast } from 'svelte-sonner';
	import type { LayoutData } from './$types';

	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Gauge from '@lucide/svelte/icons/gauge';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	let { children, data }: { children: any; data: LayoutData } = $props();

	const subscription = $derived(data.subscription);
	const planName = $derived(subscription?.plan?.displayName ?? 'Starter');
	// Only accounts that have actually transacted have a payment-provider record.
	const hasBillingAccount = $derived(Boolean(subscription?.hasBillingAccount));

	const items: SectionNavItem[] = [
		{ label: 'Plan & modules', href: '/dashboard/billing', icon: CreditCard, exact: true },
		{ label: 'Usage', href: '/dashboard/billing/usage', icon: Gauge },
		{ label: 'Invoices', href: '/dashboard/billing/invoices', icon: ReceiptText }
	];

	let openingPortal = $state(false);

	async function handleManageBilling() {
		if (openingPortal) return;
		openingPortal = true;
		try {
			const response = await getCustomerPortalUrl();
			if (response.url) window.open(response.url, '_blank');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to open billing portal');
		} finally {
			openingPortal = false;
		}
	}
</script>

<div class="flex flex-1 flex-col gap-5">
	<PageHeader
		title="Billing"
		description="Your plan, the modules you're paying for, and your invoices."
		gutter={false}
	>
		{#snippet actions()}
			<Badge variant="secondary" class="hidden sm:inline-flex">{planName}</Badge>
			{#if hasBillingAccount}
				<Button variant="outline" onclick={handleManageBilling} disabled={openingPortal}>
					{#if openingPortal}
						<Loader2 class="mr-1.5 size-4 animate-spin" />
					{:else}
						<ExternalLink class="mr-1.5 size-4" />
					{/if}
					Payment portal
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<SectionNav {items} label="Billing sections" />

	{@render children()}
</div>
