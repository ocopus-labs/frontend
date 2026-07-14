<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Separator } from '$lib/components/ui/separator';
	import * as Card from '$lib/components/ui/card';
	import {
		IconShoppingCart,
		IconTruck,
		IconPackage,
		IconCopy,
		IconQrcode,
		IconDownload,
		IconExternalLink,
		IconDeviceFloppy,
		IconAlertTriangle,
		IconClock,
		IconCash,
		IconUserCheck
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { browser } from '$app/environment';
	import PageShell from '$lib/components/global/page-shell.svelte';
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

	// Reactive form state
	let initialSettings = $state<OnlineOrderingConfig>({
		authEnabled: false,
		...initialConfig
	});
	let settings = $state<OnlineOrderingConfig>({
		authEnabled: false,
		...initialConfig
	});
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
		<!-- Section 1: Enable Online Ordering -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-start gap-3">
					<div class="rounded-lg bg-primary/10 p-2 text-primary">
						<IconShoppingCart class="size-5" />
					</div>
					<div class="flex-1">
						<Card.Title>Enable Online Ordering</Card.Title>
						<Card.Description>
							When enabled, customers can order from your store at a public link. Orders come
							straight to your POS.
						</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between rounded-lg border p-4">
					<div class="space-y-1 pr-4">
						<div class="text-sm font-medium">Online Store</div>
						<p class="text-xs text-muted-foreground">
							{settings.enabled
								? 'Your store is live and accepting orders.'
								: 'Customers cannot currently place online orders.'}
						</p>
					</div>
					<Switch bind:checked={settings.enabled} aria-label="Enable online ordering" />
				</div>
			</Card.Content>
		</Card.Root>

		{#if settings.enabled}
			<!-- Section 2: Order Types -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Order Types</Card.Title>
					<Card.Description>Choose which order types your business supports.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="flex items-start gap-3 pr-4">
							<IconPackage class="mt-0.5 size-5 text-muted-foreground" />
							<div class="space-y-1">
								<div class="text-sm font-medium">Accept Takeaway</div>
								<p class="text-xs text-muted-foreground">
									Customers order online and pick up at your location.
								</p>
							</div>
						</div>
						<Switch bind:checked={settings.acceptsTakeaway} aria-label="Accept takeaway orders" />
					</div>

					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="flex items-start gap-3 pr-4">
							<IconTruck class="mt-0.5 size-5 text-muted-foreground" />
							<div class="space-y-1">
								<div class="text-sm font-medium">Accept Delivery</div>
								<p class="text-xs text-muted-foreground">
									Customers order online and you deliver to their address. Configure zones and
									drivers in the Delivery module.
								</p>
							</div>
						</div>
						<Switch bind:checked={settings.acceptsDelivery} aria-label="Accept delivery orders" />
					</div>

					<Separator />

					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="flex items-start gap-3 pr-4">
							<IconUserCheck class="mt-0.5 size-5 text-muted-foreground" />
							<div class="space-y-1">
								<div class="text-sm font-medium">Require Customer Sign-In</div>
								<p class="text-xs text-muted-foreground">
									Customers must sign in with Google or phone before placing an order. Enables
									loyalty tracking and order history. When off, guest checkout stays available.
								</p>
							</div>
						</div>
						<Switch bind:checked={settings.authEnabled} aria-label="Require customer sign-in" />
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Section 3: Order Configuration -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Order Configuration</Card.Title>
					<Card.Description>
						Set limits, timing, and which payment methods you accept.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Field.Label for="min-order-amount" class="flex items-center gap-1.5">
								<IconCash class="size-4 text-muted-foreground" />
								Minimum Order Amount
							</Field.Label>
							<div class="relative">
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
								Estimated Prep Time (minutes)
							</Field.Label>
							<Input
								id="prep-time"
								type="number"
								min="0"
								step="1"
								bind:value={settings.estimatedPrepTime}
							/>
							<Field.Description>Shown to customers as an expected wait time.</Field.Description>
						</Field.Field>
					</div>

					<Separator />

					<div class="space-y-3">
						<div>
							<div class="text-sm font-medium">Accepted Payment Methods</div>
							<p class="text-xs text-muted-foreground">
								Pick at least one option customers can use to pay for online orders.
							</p>
						</div>
						<div class="space-y-3">
							{#each PAYMENT_METHODS as method (method.value)}
								<label
									class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
								>
									<Checkbox
										checked={isPaymentMethodChecked(method.value)}
										onCheckedChange={(checked) => togglePaymentMethod(method.value, !!checked)}
									/>
									<div class="space-y-0.5">
										<div class="text-sm font-medium">{method.label}</div>
										<p class="text-xs text-muted-foreground">{method.description}</p>
									</div>
								</label>
							{/each}
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Section 4: Shareable Link + QR Code -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-start gap-3">
						<div class="rounded-lg bg-primary/10 p-2 text-primary">
							<IconQrcode class="size-5" />
						</div>
						<div>
							<Card.Title>Shareable Link & QR Code</Card.Title>
							<Card.Description>
								Share this link with customers, or print the QR code for tables, takeaway counters,
								flyers and more.
							</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-5">
					<Field.Field>
						<Field.Label for="ordering-url">Public Store URL</Field.Label>
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

					<Separator />

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

		<!-- Section 5: Save button -->
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
