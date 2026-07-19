<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import * as Field from '$lib/components/ui/field';
	import { IconLoader2, IconLock, IconChevronRight } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import {
		updateUpiSettings,
		generatePaymentQr,
		updateOrderingSettings,
		type UpiSettings,
		type OrderingSettings
	} from '$lib/api';
	import { invalidateAll } from '$app/navigation';
	import { userFriendlyError } from '$lib/utils/error';

	let { data }: { data: PageData } = $props();

	const settings = $derived((data as any).upiSettings as UpiSettings | null);
	const orderingSettings = $derived((data as any).orderingSettings as OrderingSettings | null);

	let enabled = $state(false);
	let vpa = $state('');
	let merchantName = $state('');

	let isSaving = $state(false);

	// QR preview state
	let previewQr = $state<string | null>(null);
	let isLoadingPreview = $state(false);

	// Self-ordering state
	let selfOrderEnabled = $state(false);
	let requirePrepayment = $state(false);
	let isSavingOrdering = $state(false);

	// Sync state from loaded settings
	$effect(() => {
		if (settings) {
			enabled = settings.enabled;
			vpa = settings.vpa;
			merchantName = settings.merchantName;
		}
	});

	$effect(() => {
		if (orderingSettings) {
			selfOrderEnabled = orderingSettings.selfOrderEnabled;
			requirePrepayment = orderingSettings.requirePrepayment;
		}
	});

	async function handleSave() {
		isSaving = true;
		const businessId = (data as any).businessId;

		try {
			await updateUpiSettings(businessId, {
				enabled,
				vpa,
				merchantName
			});
			toast.success('UPI settings saved');
			await invalidateAll();

			// Refresh QR preview after saving if enabled
			if (enabled && vpa) {
				await loadPreviewQr();
			} else {
				previewQr = null;
			}
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSaving = false;
		}
	}

	async function loadPreviewQr() {
		const businessId = (data as any).businessId;
		isLoadingPreview = true;
		try {
			const result = await generatePaymentQr(businessId, 1.0, 'Test QR');
			previewQr = result.dataUrl;
		} catch (error) {
			previewQr = null;
		} finally {
			isLoadingPreview = false;
		}
	}

	// Load QR preview on mount if UPI is enabled
	$effect(() => {
		if (settings?.enabled && settings?.vpa) {
			loadPreviewQr();
		}
	});

	async function handleSaveOrdering() {
		isSavingOrdering = true;
		const businessId = (data as any).businessId;

		try {
			await updateOrderingSettings(businessId, {
				selfOrderEnabled,
				requirePrepayment
			});
			toast.success('Self-ordering settings saved');
			await invalidateAll();
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSavingOrdering = false;
		}
	}
</script>

<PageShell
	back
	title="Payment Settings"
	description="Configure payment methods, gateway credentials, UPI QR codes, and customer self-ordering"
>
	<!-- Navigational tile to the credentials child route — a genuine card, not a settings section. -->
	<Card.Root>
		<Card.Content
			class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="flex items-start gap-4">
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
				>
					<IconLock class="h-5 w-5" />
				</div>
				<div class="space-y-1">
					<h2 class="text-base font-semibold">Payment Gateway Credentials</h2>
					<p class="text-sm text-muted-foreground">
						Configure Stripe, Razorpay, and Dodo credentials for your business. All secrets are
						encrypted at rest.
					</p>
				</div>
			</div>
			<Button
				href="/{(data as any).businessType}/{(data as any).business
					.slug}/settings/payments/credentials"
				variant="outline"
				class="sm:shrink-0"
			>
				Manage Credentials
				<IconChevronRight class="ml-1 h-4 w-4" />
			</Button>
		</Card.Content>
	</Card.Root>

	{#if !settings}
		<Card.Root>
			<Card.Content class="p-8 text-center">
				<p class="text-muted-foreground">Failed to load UPI settings.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div>
			<SettingsSection title="UPI status" description="Enable or disable UPI QR code payments.">
				<Field.Field orientation="horizontal">
					<Field.Content>
						<Field.Label for="upi-enabled">UPI payments</Field.Label>
						<Field.Description>
							{enabled
								? 'Customers can pay by scanning a UPI QR code'
								: 'UPI QR payments are disabled'}
						</Field.Description>
					</Field.Content>
					<Switch id="upi-enabled" bind:checked={enabled} />
				</Field.Field>
			</SettingsSection>

			{#if enabled}
				<SettingsSection
					title="Merchant details"
					description="Your UPI Virtual Payment Address and display name."
				>
					<Field.Field>
						<Field.Label for="vpa">UPI VPA (Virtual Payment Address)</Field.Label>
						<Input id="vpa" type="text" bind:value={vpa} placeholder="merchant@upi" class="max-w-sm" />
						<Field.Description>e.g., yourstore@paytm, shop@ybl, business@oksbi</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label for="merchantName">Merchant Name</Field.Label>
						<Input
							id="merchantName"
							type="text"
							bind:value={merchantName}
							placeholder="Your Business Name"
							maxlength={50}
							class="max-w-sm"
						/>
						<Field.Description>
							Displayed on UPI payment apps (max 50 characters)
						</Field.Description>
					</Field.Field>
				</SettingsSection>
			{/if}
		</div>

		{#if enabled}
			<!-- The QR preview is a rendered artifact, not settings framing — stays a card. -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">QR Code Preview</Card.Title>
					<Card.Description>
						This is how the payment QR code will look (test amount: 1.00 INR)
					</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col items-center gap-4">
					{#if isLoadingPreview}
						<div
							class="flex h-[300px] w-[300px] items-center justify-center rounded-lg border border-dashed border-border"
						>
							<IconLoader2 class="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					{:else if previewQr}
						<img
							src={previewQr}
							alt="UPI QR Code Preview"
							class="h-[300px] w-[300px] rounded-lg border border-border"
						/>
						<p class="text-xs text-muted-foreground">Save settings to update the preview</p>
					{:else}
						<div
							class="flex h-[300px] w-[300px] items-center justify-center rounded-lg border border-dashed border-border"
						>
							<p class="text-sm text-muted-foreground">Save settings to generate QR preview</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}

		<div class="flex justify-end">
			<Button onclick={handleSave} disabled={isSaving}>
				{#if isSaving}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Save UPI Settings
			</Button>
		</div>
	{/if}

	<div class="border-t pt-2">
		<SettingsSection
			title="Customer self-ordering"
			description="Let customers scan a table QR code and place orders from their phone."
		>
			<Field.Field orientation="horizontal">
				<Field.Content>
					<Field.Label for="self-order-enabled">Enable self-ordering</Field.Label>
					<Field.Description>
						{selfOrderEnabled
							? 'Customers can place orders by scanning table QR codes'
							: 'Self-ordering is disabled'}
					</Field.Description>
				</Field.Content>
				<Switch id="self-order-enabled" bind:checked={selfOrderEnabled} />
			</Field.Field>
		</SettingsSection>

		{#if selfOrderEnabled}
			<SettingsSection
				title="Prepayment"
				description="Whether customers pay before the order reaches the kitchen."
			>
				<Field.Field orientation="horizontal">
					<Field.Content>
						<Field.Label for="require-prepayment">Require prepayment</Field.Label>
						<Field.Description>
							{requirePrepayment
								? 'Customers must pay via UPI before the order is sent to kitchen'
								: 'Customers can pay after being served (postpay)'}
						</Field.Description>
					</Field.Content>
					<Switch id="require-prepayment" bind:checked={requirePrepayment} />
				</Field.Field>

				{#snippet footer()}
					<div class="rounded-lg bg-muted/50 p-3">
						<p class="mb-1 font-medium text-foreground">How it works:</p>
						<ol class="list-inside list-decimal space-y-1">
							<li>Generate table QR codes from Tables &gt; Layout</li>
							<li>Customers scan the QR code at their table</li>
							<li>They browse your menu, add items, and enter their name + phone</li>
							{#if requirePrepayment}
								<li>They pay via UPI QR, then the order goes to your POS</li>
							{:else}
								<li>The order goes directly to your POS for preparation</li>
							{/if}
							<li>Orders appear in real-time with a "QR Order" badge</li>
						</ol>
					</div>
				{/snippet}
			</SettingsSection>
		{/if}
	</div>

	<div class="flex justify-end">
		<Button onclick={handleSaveOrdering} disabled={isSavingOrdering}>
			{#if isSavingOrdering}
				<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			Save Ordering Settings
		</Button>
	</div>
</PageShell>
