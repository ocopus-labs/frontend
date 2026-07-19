<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import * as Field from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { toast } from 'svelte-sonner';
	import IconDeviceFloppy from '@lucide/svelte/icons/save';
	import { updateBusinessSettings } from '$lib/api/business';
	import { invalidate } from '$app/navigation';
	import { CURRENCY_CONFIG, type CurrencyCode } from '$lib/utils/i18n';
	import type { Business } from '$lib/api/types';

	let { data } = $props();

	const business = data.business as Partial<Business> & { name: string };
	const settings = business.settings ?? ({} as Partial<Business['settings']>);

	// Stored as an array, but older records may hold a JSON string.
	const raw = settings.paymentMethods;
	const saved: string[] | undefined = Array.isArray(raw)
		? raw
		: typeof raw === 'string'
			? (JSON.parse(raw) as string[])
			: undefined;

	const METHODS = [
		{ id: 'cash', label: 'Cash', description: 'Notes and coins, counted in the cash drawer' },
		{ id: 'card', label: 'Credit / debit card', description: 'Card machine or terminal' },
		{ id: 'digital', label: 'Digital wallets', description: 'UPI, wallets and QR payments' }
	] as const;

	let currency = $state(settings.currency ?? 'INR');
	let enabled = $state<Record<string, boolean>>({
		cash: saved ? saved.includes('cash') : true,
		card: saved ? saved.includes('card') : true,
		digital: saved ? saved.includes('digital') : false
	});

	const selected = $derived(METHODS.filter((m) => enabled[m.id]).map((m) => m.id));

	let saving = $state(false);

	async function save() {
		if (selected.length === 0) {
			toast.error('Enable at least one payment method — the till cannot take payment otherwise.');
			return;
		}

		saving = true;
		try {
			await updateBusinessSettings(data.businessId, {
				currency,
				paymentMethods: selected
			});
			await invalidate('app:settings');
			await invalidate('app:business-data');
			toast.success('Payment methods saved.');
		} catch (err: unknown) {
			console.error('Failed to save payment methods:', err);
			const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
			toast.error(`Failed to save payment methods: ${message}`);
		} finally {
			saving = false;
		}
	}
</script>

<PageShell
	title="Payment methods"
	description="Which tenders the till accepts, and the currency it prices in"
>
	<div>
		<SettingsSection
			title="Currency"
			description="Applies to prices, receipts and reports for this outlet."
		>
			<Field.Field>
				<Field.Label for="currency">Currency</Field.Label>
				<Select.Root type="single" bind:value={currency}>
					<Select.Trigger id="currency" class="w-full sm:max-w-xs">
						{currency}
						{CURRENCY_CONFIG[currency as CurrencyCode]?.symbol
							? `(${CURRENCY_CONFIG[currency as CurrencyCode].symbol})`
							: ''}
						{CURRENCY_CONFIG[currency as CurrencyCode]?.name ?? ''}
					</Select.Trigger>
					<Select.Content>
						{#each Object.values(CURRENCY_CONFIG) as curr (curr.code)}
							<Select.Item value={curr.code}>
								{curr.code} ({curr.symbol}) — {curr.name}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<Field.Description>
					Changing this does not convert existing prices — it relabels them.
				</Field.Description>
			</Field.Field>
		</SettingsSection>

		<SettingsSection
			title="Accepted at the till"
			description="Only enabled methods appear as payment options when closing an order."
		>
			<div class="-mx-2">
				{#each METHODS as method (method.id)}
					<div class="flex items-start gap-3 rounded-md px-2 py-3 hover:bg-muted/40">
						<Checkbox id={method.id} bind:checked={enabled[method.id]} class="mt-0.5" />
						<div class="space-y-0.5">
							<Label for={method.id} class="text-sm font-medium">{method.label}</Label>
							<p class="text-xs text-muted-foreground">{method.description}</p>
						</div>
					</div>
				{/each}
			</div>

			{#snippet footer()}
				Gateway credentials and UPI QR codes are configured under
				<span class="font-medium text-foreground">Gateways &amp; UPI</span>.
			{/snippet}
		</SettingsSection>
	</div>

	<div class="flex items-center justify-end gap-3">
		{#if selected.length === 0}
			<p class="text-sm text-destructive">Enable at least one payment method.</p>
		{/if}
		<Button onclick={save} disabled={saving || selected.length === 0}>
			<IconDeviceFloppy class="mr-2 size-4" />
			{saving ? 'Saving…' : 'Save payment methods'}
		</Button>
	</div>
</PageShell>
