<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import {
		IconCopy,
		IconQrcode,
		IconDownload,
		IconExternalLink,
		IconDeviceFloppy,
		IconAlertTriangle,
		IconClock,
		IconCash
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { browser } from '$app/environment';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { updateOnlineOrderingSettings, type OnlineOrderingConfig } from '$lib/api';

	let { data }: { data: PageData } = $props();

	const initialConfig = (data as any).onlineOrderingSettings as OnlineOrderingConfig;
	const onlineOrderingError = (data as any).onlineOrderingError as string | undefined;
	const businessSlug = (data as any).business?.slug as string;
	const businessCurrencyCode = ((data as any).business?.settings?.currency as string) ?? 'USD';

	const CURRENCY_SYMBOLS: Record<string, string> = {
		USD: '$',
		EUR: '€',
		GBP: '£',
		INR: '₹',
		AUD: 'A$',
		CAD: 'C$',
		JPY: '¥',
		CNY: '¥',
		AED: 'د.إ',
		SGD: 'S$'
	};
	const currencySymbol = CURRENCY_SYMBOLS[businessCurrencyCode] ?? businessCurrencyCode;

	// Reactive form state. The loader always supplies a complete config (it falls
	// back to a full default object on error), so no per-field defaults here.
	let initialSettings = $state<OnlineOrderingConfig>({ ...initialConfig });
	let settings = $state<OnlineOrderingConfig>({ ...initialConfig });
	let saving = $state(false);

	const hasChanges = $derived(JSON.stringify(initialSettings) !== JSON.stringify(settings));

	// Shareable URL
	const orderingUrl = $derived.by(() => {
		if (!browser) return `/order-online/${businessSlug}`;
		return `${window.location.origin}/order-online/${businessSlug}`;
	});

	// QR code URL via public service (no npm dep). Local generation can replace this later.
	const qrImageUrl = $derived.by(() => {
		const data = encodeURIComponent(orderingUrl);
		return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${data}`;
	});

	// Payment method helpers
	const PAYMENT_METHODS = [
		{
			value: 'cash',
			label: 'Cash on Pickup/Delivery',
			description: 'Customer pays in cash when receiving the order'
		},
		{
			value: 'online',
			label: 'Online Payment',
			description: 'Customer pays online via Stripe / Razorpay / Dodo'
		},
		{
			value: 'card',
			label: 'Card at Pickup/Delivery',
			description: 'Customer pays with a card on the card reader when receiving the order'
		}
	];

	function togglePaymentMethod(method: string, checked: boolean) {
		const current = new Set(settings.acceptedPaymentMethods);
		if (checked) {
			current.add(method);
		} else {
			current.delete(method);
		}
		settings.acceptedPaymentMethods = Array.from(current);
	}

	function isPaymentMethodChecked(method: string): boolean {
		return settings.acceptedPaymentMethods.includes(method);
	}

	async function handleCopyLink() {
		if (!browser) return;
		try {
			await navigator.clipboard.writeText(orderingUrl);
			toast.success('Link copied to clipboard');
		} catch {
			toast.error('Failed to copy link');
		}
	}

	async function handleDownloadQr() {
		if (!browser) return;
		try {
			const response = await fetch(qrImageUrl);
			if (!response.ok) throw new Error('Failed to fetch QR image');
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${businessSlug}-online-ordering-qr.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			toast.success('QR code downloaded');
		} catch (err) {
			toast.error(`Download failed: ${(err as Error).message}`);
		}
	}

	function openStoreInNewTab() {
		if (!browser) return;
		window.open(orderingUrl, '_blank', 'noopener,noreferrer');
	}

	async function handleSave() {
		if (!hasChanges) return;

		// Basic validation
		if (settings.enabled && !settings.acceptsDelivery && !settings.acceptsTakeaway) {
			toast.error('Enable at least one order type (takeaway or delivery).');
			return;
		}
		if (settings.enabled && settings.acceptedPaymentMethods.length === 0) {
			toast.error('Select at least one accepted payment method.');
			return;
		}
		if (settings.minOrderAmount < 0) {
			toast.error('Minimum order amount cannot be negative.');
			return;
		}
		if (settings.estimatedPrepTime < 0) {
			toast.error('Estimated prep time cannot be negative.');
			return;
		}

		saving = true;
		try {
			const result = await updateOnlineOrderingSettings((data as any).businessId, settings);
			initialSettings = { ...result.settings };
			settings = { ...result.settings };
			toast.success('Online ordering settings saved');
			await invalidate('app:online-ordering-settings');
		} catch (err) {
			toast.error(`Failed: ${(err as Error).message}`);
		} finally {
			saving = false;
		}
	}
</script>

<PageShell
	back
	title="Online Ordering"
	description="Let customers browse your menu, place orders, and pay online."
>
	{#snippet actions()}
		<Badge variant={settings.enabled ? 'default' : 'secondary'}>
			{settings.enabled ? 'Enabled' : 'Disabled'}
		</Badge>
	{/snippet}

	{#if onlineOrderingError}
		<div
			class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
		>
			<IconAlertTriangle class="mt-0.5 size-4 flex-shrink-0" />
			<div>
				<div class="font-medium">Could not load existing settings</div>
				<div class="text-xs opacity-80">{onlineOrderingError}</div>
				<div class="text-xs opacity-80">Showing defaults. Changes will still be saved.</div>
			</div>
		</div>
	{/if}

	<div class="space-y-6 pb-24">
		<div>
			<SettingsSection
				title="Online store"
				description="When enabled, customers can order from your store at a public link. Orders come straight to your POS."
			>
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-0.5">
						<Label for="online-store-enabled" class="text-sm font-medium">Online store</Label>
						<p class="text-xs text-muted-foreground">
							{settings.enabled
								? 'Your store is live and accepting orders.'
								: 'Customers cannot currently place online orders.'}
						</p>
					</div>
					<Switch
						id="online-store-enabled"
						bind:checked={settings.enabled}
						aria-label="Enable online ordering"
					/>
				</div>
			</SettingsSection>
		</div>

		{#if settings.enabled}
			<div>
				<SettingsSection
					title="Order types"
					description="Choose which order types your business supports."
				>
					<div class="space-y-6">
						<div class="flex items-start justify-between gap-4">
							<div class="space-y-0.5">
								<Label for="accepts-takeaway" class="text-sm font-medium">Accept takeaway</Label>
								<p class="text-xs text-muted-foreground">
									Customers order online and pick up at your location.
								</p>
							</div>
							<Switch
								id="accepts-takeaway"
								bind:checked={settings.acceptsTakeaway}
								aria-label="Accept takeaway orders"
							/>
						</div>

						<div class="flex items-start justify-between gap-4">
							<div class="space-y-0.5">
								<Label for="accepts-delivery" class="text-sm font-medium">Accept delivery</Label>
								<p class="text-xs text-muted-foreground">
									Customers order online and you deliver to their address. Configure zones and
									drivers in the Delivery module.
								</p>
							</div>
							<Switch
								id="accepts-delivery"
								bind:checked={settings.acceptsDelivery}
								aria-label="Accept delivery orders"
							/>
						</div>
					</div>
				</SettingsSection>

				<SettingsSection
					title="Customer sign-in"
					description="Whether customers need an account before they can order."
				>
					<div class="flex items-start justify-between gap-4">
						<div class="space-y-0.5">
							<Label for="auth-enabled" class="text-sm font-medium">Require customer sign-in</Label>
							<p class="text-xs text-muted-foreground">
								Customers must sign in with Google or phone before placing an order. Enables loyalty
								tracking and order history. When off, guest checkout stays available.
							</p>
						</div>
						<Switch
							id="auth-enabled"
							bind:checked={settings.authEnabled}
							aria-label="Require customer sign-in"
						/>
					</div>

					<!-- Nested under sign-in: phone verification is an extra step layered on
					     top of an existing sign-in, so it is meaningless on its own. -->
					{#if settings.authEnabled}
						<div class="mt-4 flex items-start justify-between gap-4 border-t border-border pt-4">
							<div class="space-y-0.5">
								<Label for="require-phone-verification" class="text-sm font-medium">
									Also verify phone with an OTP
								</Label>
								<p class="text-xs text-muted-foreground">
									Sends a one-time code to the customer's phone after sign-in. More friction at
									checkout, so leave this off unless you need a verified number. Customers still
									enter a phone number either way.
								</p>
							</div>
							<Switch
								id="require-phone-verification"
								bind:checked={settings.requirePhoneVerification}
								aria-label="Also verify phone with an OTP"
							/>
						</div>
					{/if}
				</SettingsSection>

				<SettingsSection
					title="Order limits"
					description="Thresholds and timing shown to customers at checkout."
				>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="min-order-amount" class="flex items-center gap-1.5">
								<IconCash class="size-4 text-muted-foreground" />
								Minimum order amount
							</Field.Label>
							<div class="relative max-w-[8rem]">
								<span
									class="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
								>
									{currencySymbol}
								</span>
								<Input
									id="min-order-amount"
									type="number"
									min="0"
									step="0.01"
									class="pl-8"
									bind:value={settings.minOrderAmount}
								/>
							</div>
							<Field.Description>
								Orders below this amount will be rejected. Use 0 for no minimum.
							</Field.Description>
						</Field.Field>

						<Field.Field>
							<Field.Label for="prep-time" class="flex items-center gap-1.5">
								<IconClock class="size-4 text-muted-foreground" />
								Estimated prep time (minutes)
							</Field.Label>
							<Input
								id="prep-time"
								type="number"
								min="0"
								step="1"
								class="max-w-[8rem]"
								bind:value={settings.estimatedPrepTime}
							/>
							<Field.Description>Shown to customers as an expected wait time.</Field.Description>
						</Field.Field>
					</div>
				</SettingsSection>

				<SettingsSection
					title="Payment methods"
					description="Pick at least one option customers can use to pay for online orders."
				>
					{#each PAYMENT_METHODS as method (method.value)}
						<Field.Label for="payment-{method.value}" class="cursor-pointer">
							<Field.Field orientation="horizontal">
								<Checkbox
									id="payment-{method.value}"
									checked={isPaymentMethodChecked(method.value)}
									onCheckedChange={(checked) => togglePaymentMethod(method.value, !!checked)}
								/>
								<Field.Content>
									<Field.Title>{method.label}</Field.Title>
									<Field.Description>{method.description}</Field.Description>
								</Field.Content>
							</Field.Field>
						</Field.Label>
					{/each}
				</SettingsSection>

				<SettingsSection
					title="Shareable link"
					description="Send this link to customers, or point your social profiles at it."
				>
					<Field.Field>
						<Field.Label for="ordering-url">Public store URL</Field.Label>
						<div class="flex flex-col gap-2 sm:flex-row">
							<Input id="ordering-url" readonly value={orderingUrl} class="font-mono text-xs" />
							<div class="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onclick={handleCopyLink}
									class="flex-1 sm:flex-none"
								>
									<IconCopy class="mr-2 size-4" />
									Copy
								</Button>
								<Button
									type="button"
									variant="outline"
									onclick={openStoreInNewTab}
									class="flex-1 sm:flex-none"
								>
									<IconExternalLink class="mr-2 size-4" />
									Open
								</Button>
							</div>
						</div>
					</Field.Field>
				</SettingsSection>
			</div>

			<!-- Genuine artifact: a print-ready QR preview panel, not a settings section. -->
			<Card.Root>
				<Card.Header>
					<Card.Title>QR code</Card.Title>
					<Card.Description>
						Print the QR code for tables, takeaway counters, flyers and more.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
						<div class="flex justify-center sm:justify-start">
							{#if browser}
								<div class="rounded-lg border bg-muted/40 p-3">
									<img
										src={qrImageUrl}
										alt="QR code for online ordering store"
										class="size-40 sm:size-48"
										loading="lazy"
									/>
								</div>
							{:else}
								<div
									class="flex size-40 items-center justify-center rounded-lg border bg-muted/40 sm:size-48"
								>
									<IconQrcode class="size-10 text-muted-foreground" />
								</div>
							{/if}
						</div>
						<div class="space-y-3">
							<div>
								<div class="text-sm font-medium">Print-ready QR code</div>
								<p class="text-xs text-muted-foreground">
									Download as a PNG and print on table tents, menus, receipts, counter signs, or
									delivery bags. Customers scan it with their phone camera to open your menu
									instantly.
								</p>
							</div>
							<Button type="button" variant="default" onclick={handleDownloadQr}>
								<IconDownload class="mr-2 size-4" />
								Download QR
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Sticky save bar -->
		<div
			class="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-4 backdrop-blur sm:rounded-b-none md:-mx-6 md:px-6"
		>
			<div class="text-xs text-muted-foreground">
				{#if hasChanges}
					<span class="text-warning">You have unsaved changes.</span>
				{:else}
					All changes saved.
				{/if}
			</div>
			<Button onclick={handleSave} disabled={saving || !hasChanges}>
				<IconDeviceFloppy class="mr-2 size-4" />
				{saving ? 'Saving...' : 'Save Settings'}
			</Button>
		</div>
	</div>
</PageShell>
