<script lang="ts">
	import type { PageData } from './$types';
	import { env } from '$env/dynamic/public';
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import {
		IconBrandStripe,
		IconLock,
		IconCopy,
		IconCheck,
		IconX,
		IconRefresh,
		IconTrash,
		IconCreditCard,
		IconLoader2,
		IconChevronDown,
		IconChevronUp,
		IconExternalLink,
		IconAlertCircle,
		IconInfoCircle,
		IconBulb
	} from '@tabler/icons-svelte';

	import * as Card from '$lib/components/ui/card';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Switch } from '$lib/components/ui/switch';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import PageHeader from '$lib/components/global/page-header.svelte';

	import {
		updatePaymentCredential,
		deletePaymentCredential,
		verifyPaymentCredential,
		type MaskedPaymentCredential,
		type PaymentProvider,
		type PaymentMode,
		type UpdateCredentialPayload
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatDate } from '$lib/utils/formatting';

	let { data }: { data: PageData } = $props();

	const businessId = $derived((data as any).businessId as string);
	const credentials = $derived(((data as any).credentials ?? []) as MaskedPaymentCredential[]);
	const credentialsError = $derived((data as any).credentialsError as string | undefined);

	// ==================== Provider metadata ====================

	interface ProviderMeta {
		name: string;
		tagline: string;
		description: string;
		useCase: string;
		publicKeyLabel: string | null;
		publicKeyPlaceholder: string | null;
		secretKeyPlaceholder: string;
		webhookSecretPlaceholder: string;
		docsUrl: string;
		color: string;
		customerFacing: boolean;
		webhookPath: (businessId: string) => string;
		webhookNote?: string;
	}

	const PROVIDERS: Record<PaymentProvider, ProviderMeta> = {
		stripe: {
			name: 'Stripe',
			tagline: 'International Card Payments',
			description:
				'Best for businesses accepting international cards, Apple Pay, and Google Pay. Supports 135+ currencies.',
			useCase:
				'Recommended if you serve international customers or accept non-Indian cards.',
			publicKeyLabel: 'Publishable Key',
			publicKeyPlaceholder: 'pk_test_... or pk_live_...',
			secretKeyPlaceholder: 'sk_test_... or sk_live_...',
			webhookSecretPlaceholder: 'whsec_...',
			docsUrl: 'https://dashboard.stripe.com/apikeys',
			color: 'rgb(99, 91, 255)',
			customerFacing: true,
			webhookPath: (id) => `/webhook/stripe/${id}`
		},
		razorpay: {
			name: 'Razorpay',
			tagline: 'India Payments (UPI, Cards, Wallets)',
			description:
				'Best for Indian businesses. Supports UPI, cards, net banking, wallets (Paytm, PhonePe, etc.), and EMI.',
			useCase:
				'Recommended if you primarily serve Indian customers. Lower fees for domestic payments.',
			publicKeyLabel: 'Key ID',
			publicKeyPlaceholder: 'rzp_test_... or rzp_live_...',
			secretKeyPlaceholder: 'Razorpay key secret',
			webhookSecretPlaceholder: 'Webhook signing secret',
			docsUrl: 'https://dashboard.razorpay.com/app/keys',
			color: 'rgb(0, 130, 196)',
			customerFacing: true,
			webhookPath: (id) => `/webhook/razorpay/${id}`
		},
		dodo: {
			name: 'Dodo Payments',
			tagline: 'Subscription Billing (Platform)',
			description:
				'Used internally for your monthly subscription billing. Not used for customer-facing payments at this time.',
			useCase:
				'Automatically managed by the platform. You typically do not need to configure this unless you have a special arrangement.',
			publicKeyLabel: null,
			publicKeyPlaceholder: null,
			secretKeyPlaceholder: 'Dodo API key',
			webhookSecretPlaceholder: 'Webhook signing secret',
			docsUrl: 'https://app.dodopayments.com/developer/api-keys',
			color: 'rgb(255, 107, 0)',
			customerFacing: false,
			webhookPath: () => `/webhook/dodo`,
			webhookNote: 'Dodo webhooks are platform-level and shared across all businesses.'
		}
	};

	const PROVIDER_ORDER: PaymentProvider[] = ['stripe', 'razorpay', 'dodo'];

	// ==================== Backend URL resolution ====================

	const backendUrl = $derived.by(() => {
		const fromEnv = env.PUBLIC_BACKEND_URL;
		if (fromEnv) return fromEnv.replace(/\/$/, '');
		if (typeof window !== 'undefined') {
			return window.location.origin.replace(':5173', ':3000');
		}
		return '';
	});

	// ==================== Per-provider form state ====================

	type ProviderFormState = {
		enabled: boolean;
		mode: PaymentMode;
		publishableKey: string;
		keyId: string;
		secretKey: string;
		webhookSecret: string;
		expanded: boolean;
		saving: boolean;
		verifying: boolean;
		deleting: boolean;
		// Track saved baseline for dirty detection
		savedEnabled: boolean;
		savedMode: PaymentMode;
		savedPublishableKey: string;
		savedKeyId: string;
	};

	function emptyFormState(): ProviderFormState {
		return {
			enabled: false,
			mode: 'test',
			publishableKey: '',
			keyId: '',
			secretKey: '',
			webhookSecret: '',
			expanded: false,
			saving: false,
			verifying: false,
			deleting: false,
			savedEnabled: false,
			savedMode: 'test',
			savedPublishableKey: '',
			savedKeyId: ''
		};
	}

	let forms = $state<Record<PaymentProvider, ProviderFormState>>({
		stripe: emptyFormState(),
		razorpay: emptyFormState(),
		dodo: emptyFormState()
	});

	// Track delete confirmation dialog state
	let deleteDialogOpen = $state(false);
	let deleteTargetProvider = $state<PaymentProvider | null>(null);

	// ==================== Credential lookup ====================

	const credentialMap = $derived.by(() => {
		const map = new Map<PaymentProvider, MaskedPaymentCredential>();
		for (const cred of credentials) {
			map.set(cred.provider, cred);
		}
		return map;
	});

	// Sync loaded credentials into form state (runs whenever credentials change)
	$effect(() => {
		for (const provider of PROVIDER_ORDER) {
			const cred = credentialMap.get(provider);
			if (cred) {
				forms[provider].enabled = cred.enabled;
				forms[provider].mode = cred.mode;
				forms[provider].publishableKey = cred.publishableKey ?? '';
				forms[provider].keyId = cred.keyId ?? '';
				forms[provider].savedEnabled = cred.enabled;
				forms[provider].savedMode = cred.mode;
				forms[provider].savedPublishableKey = cred.publishableKey ?? '';
				forms[provider].savedKeyId = cred.keyId ?? '';
			}
		}
	});

	function getCredential(provider: PaymentProvider): MaskedPaymentCredential | undefined {
		return credentialMap.get(provider);
	}

	function isDirty(provider: PaymentProvider): boolean {
		const form = forms[provider];
		if (form.enabled !== form.savedEnabled) return true;
		if (form.mode !== form.savedMode) return true;
		if (form.publishableKey !== form.savedPublishableKey) return true;
		if (form.keyId !== form.savedKeyId) return true;
		if (form.secretKey.length > 0) return true;
		if (form.webhookSecret.length > 0) return true;
		return false;
	}

	function statusBadge(cred: MaskedPaymentCredential | undefined) {
		if (!cred || cred.source === 'none') {
			return { label: 'Not Configured', variant: 'outline' as const, className: '' };
		}
		if (cred.source === 'platform') {
			return {
				label: 'Using Platform Defaults',
				variant: 'secondary' as const,
				className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
			};
		}
		if (cred.enabled) {
			return {
				label: 'Active',
				variant: 'default' as const,
				className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
			};
		}
		return { label: 'Inactive', variant: 'secondary' as const, className: '' };
	}

	function modeBadgeClass(mode: PaymentMode) {
		return mode === 'live'
			? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
			: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
	}

	// ==================== Actions ====================

	async function handleSave(provider: PaymentProvider) {
		const form = forms[provider];
		form.saving = true;
		try {
			const payload: UpdateCredentialPayload = {
				enabled: form.enabled,
				mode: form.mode
			};

			if (provider === 'stripe') {
				if (form.publishableKey !== form.savedPublishableKey) {
					payload.publishableKey = form.publishableKey;
				}
			} else if (provider === 'razorpay') {
				if (form.keyId !== form.savedKeyId) {
					payload.keyId = form.keyId;
				}
			}

			if (form.secretKey.trim().length > 0) {
				payload.secretKey = form.secretKey;
			}
			if (form.webhookSecret.trim().length > 0) {
				payload.webhookSecret = form.webhookSecret;
			}

			await updatePaymentCredential(businessId, provider, payload);
			toast.success(`${PROVIDERS[provider].name} credentials saved`);

			// Clear sensitive fields from memory immediately
			form.secretKey = '';
			form.webhookSecret = '';

			await invalidate('app:payment-credentials');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			form.saving = false;
		}
	}

	async function handleVerify(provider: PaymentProvider) {
		const form = forms[provider];
		form.verifying = true;
		try {
			const result = await verifyPaymentCredential(businessId, provider);
			if (result.success) {
				toast.success(`${PROVIDERS[provider].name} connection verified`);
				await invalidate('app:payment-credentials');
			} else {
				toast.error(result.error || `${PROVIDERS[provider].name} verification failed`);
			}
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			form.verifying = false;
		}
	}

	function requestDelete(provider: PaymentProvider) {
		deleteTargetProvider = provider;
		deleteDialogOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTargetProvider) return;
		const provider = deleteTargetProvider;
		const form = forms[provider];
		form.deleting = true;
		try {
			await deletePaymentCredential(businessId, provider);
			toast.success(`${PROVIDERS[provider].name} credentials removed`);

			// Reset form state to empty
			forms[provider] = { ...emptyFormState(), expanded: form.expanded };

			await invalidate('app:payment-credentials');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			form.deleting = false;
			deleteTargetProvider = null;
		}
	}

	async function copyToClipboard(text: string, label: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(`${label} copied`);
		} catch {
			toast.error('Unable to copy to clipboard');
		}
	}

	function toggleExpanded(provider: PaymentProvider) {
		forms[provider].expanded = !forms[provider].expanded;
	}

	function secretPlaceholder(cred: MaskedPaymentCredential | undefined): string {
		if (cred?.secretKeyLastFour) {
			return `••••••••${cred.secretKeyLastFour}`;
		}
		return PROVIDERS.stripe.secretKeyPlaceholder;
	}

	function webhookSecretPlaceholder(
		provider: PaymentProvider,
		cred: MaskedPaymentCredential | undefined
	): string {
		if (cred?.hasWebhookSecret) {
			return '••••••••••••';
		}
		return PROVIDERS[provider].webhookSecretPlaceholder;
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<PageHeader
		title="Payment Credentials"
		description="Configure per-business API keys for Stripe, Razorpay, and Dodo Payments"
	/>

	{#if credentialsError}
		<Card.Root class="border-destructive/40">
			<Card.Content class="flex items-center gap-3 p-4 text-sm">
				<IconAlertCircle class="size-5 text-destructive" />
				<div>
					<p class="font-medium">Failed to load payment credentials</p>
					<p class="text-muted-foreground">{credentialsError}</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<div
		class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30"
	>
		<div class="flex items-start gap-3">
			<IconBulb class="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
			<div class="space-y-2 text-amber-900 dark:text-amber-100">
				<p class="font-semibold">Recommended Setup</p>
				<ul class="space-y-1 text-xs leading-relaxed">
					<li>
						<span class="font-medium">For Indian businesses:</span> Enable
						<span class="font-semibold">Razorpay</span> (lowest fees for domestic).
					</li>
					<li>
						<span class="font-medium">For international:</span> Enable
						<span class="font-semibold">Stripe</span>.
					</li>
					<li>
						<span class="font-medium">For both:</span> Enable both — customers will see gateway choices
						at checkout.
					</li>
				</ul>
			</div>
		</div>
	</div>

	<div class="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
		<p class="mb-1 font-medium text-foreground">Security notice</p>
		<p>
			API secret keys are stored encrypted and never displayed in full after saving. Only enter a
			secret key when creating or rotating it — leaving a secret field blank keeps the existing
			value.
		</p>
	</div>

	{#each PROVIDER_ORDER as provider (provider)}
		{@const meta = PROVIDERS[provider]}
		{@const cred = getCredential(provider)}
		{@const form = forms[provider]}
		{@const status = statusBadge(cred)}
		{@const usingPlatform = cred?.source === 'platform'}
		{@const hasBusinessCreds = cred?.source === 'business'}

		<Card.Root>
			<Card.Header class="pb-4">
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-start gap-3">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-lg"
							style="background-color: {meta.color}1a; color: {meta.color}"
						>
							{#if provider === 'stripe'}
								<IconBrandStripe class="size-6" />
							{:else if provider === 'razorpay'}
								<IconCreditCard class="size-6" />
							{:else}
								<IconLock class="size-6" />
							{/if}
						</div>
						<div>
							<div class="flex flex-wrap items-center gap-2">
								<Card.Title class="text-lg font-semibold">{meta.name}</Card.Title>
								<Badge variant={status.variant} class={status.className}>{status.label}</Badge>
								{#if cred && cred.enabled && cred.source === 'business'}
									<Badge variant="outline" class={modeBadgeClass(cred.mode)}>
										{cred.mode === 'live' ? 'Live' : 'Test'}
									</Badge>
								{/if}
								{#if !meta.customerFacing}
									<Badge
										variant="secondary"
										class="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
									>
										Platform Managed
									</Badge>
								{/if}
							</div>
							<p class="mt-1 text-xs text-muted-foreground">{meta.tagline}</p>
							{#if cred?.lastVerifiedAt}
								<p class="mt-1 flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
									<IconCheck class="size-3.5" />
									Verified {formatDate(cred.lastVerifiedAt)}
								</p>
							{/if}
						</div>
					</div>

					<Button
						variant="ghost"
						size="sm"
						onclick={() => toggleExpanded(provider)}
						aria-label={form.expanded ? 'Collapse' : 'Expand'}
					>
						{#if form.expanded}
							<IconChevronUp class="size-4" />
						{:else}
							<IconChevronDown class="size-4" />
						{/if}
					</Button>
				</div>
			</Card.Header>

			{#if form.expanded}
				<Card.Content class="flex flex-col gap-5 border-t pt-5">
					<!-- Description + use-case tip -->
					<div class="flex flex-col gap-3">
						<p class="text-sm leading-relaxed text-muted-foreground">{meta.description}</p>
						<div
							class="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3"
						>
							<IconInfoCircle class="mt-0.5 size-4 shrink-0 text-primary" />
							<p class="text-xs leading-relaxed text-foreground">
								<span class="font-medium">Tip: </span>{meta.useCase}
							</p>
						</div>
						{#if !meta.customerFacing}
							<div
								class="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30"
							>
								<IconAlertCircle
									class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
								/>
								<p class="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
									<span class="font-medium">Not for customer payments. </span>
									{meta.name} will not appear in your POS or online checkout. It is used only for
									platform subscription billing.
								</p>
							</div>
						{/if}
					</div>

					{#if usingPlatform}
						<div
							class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"
						>
							<p class="font-medium">Using platform-managed credentials</p>
							<p class="mt-1 text-xs">
								This business does not have its own {meta.name} keys. Platform defaults are being used.
								Configure keys below to override.
							</p>
						</div>
					{/if}

					<!-- Enable toggle -->
					<div class="flex items-center justify-between gap-4">
						<div>
							<p class="text-sm font-medium">Enable {meta.name}</p>
							<p class="text-xs text-muted-foreground">
								When disabled, this provider will not be offered at checkout for this business.
							</p>
						</div>
						<Switch bind:checked={forms[provider].enabled} />
					</div>

					<!-- Mode selector -->
					<div class="grid gap-2">
						<Label class="text-sm font-medium">Mode</Label>
						<RadioGroup.Root bind:value={forms[provider].mode} class="flex gap-6">
							<div class="flex items-center gap-2">
								<RadioGroup.Item value="test" id="{provider}-mode-test" />
								<Label for="{provider}-mode-test" class="cursor-pointer text-sm font-normal">
									Test
								</Label>
							</div>
							<div class="flex items-center gap-2">
								<RadioGroup.Item value="live" id="{provider}-mode-live" />
								<Label for="{provider}-mode-live" class="cursor-pointer text-sm font-normal">
									Live
								</Label>
							</div>
						</RadioGroup.Root>
					</div>

					<!-- Public key (Stripe: publishableKey, Razorpay: keyId) -->
					{#if meta.publicKeyLabel}
						<div class="grid gap-2">
							<Label for="{provider}-public-key" class="text-sm font-medium">
								{meta.publicKeyLabel}
							</Label>
							{#if provider === 'stripe'}
								<Input
									id="{provider}-public-key"
									type="text"
									bind:value={forms[provider].publishableKey}
									placeholder={meta.publicKeyPlaceholder ?? ''}
									autocomplete="off"
								/>
							{:else if provider === 'razorpay'}
								<Input
									id="{provider}-public-key"
									type="text"
									bind:value={forms[provider].keyId}
									placeholder={meta.publicKeyPlaceholder ?? ''}
									autocomplete="off"
								/>
							{/if}
							<p class="text-xs text-muted-foreground">
								This value is safe to expose to clients (not sensitive).
							</p>
						</div>
					{/if}

					<!-- Secret key -->
					<div class="grid gap-2">
						<Label for="{provider}-secret" class="text-sm font-medium">Secret Key</Label>
						<Input
							id="{provider}-secret"
							type="password"
							bind:value={forms[provider].secretKey}
							placeholder={cred?.secretKeyLastFour
								? `••••••••${cred.secretKeyLastFour}`
								: meta.secretKeyPlaceholder}
							autocomplete="off"
						/>
						<p class="text-xs text-muted-foreground">
							Only enter the secret key when creating or changing it. Leave blank to keep the
							existing key.
						</p>
					</div>

					<!-- Webhook secret -->
					<div class="grid gap-2">
						<Label for="{provider}-webhook-secret" class="text-sm font-medium">
							Webhook Signing Secret
						</Label>
						<Input
							id="{provider}-webhook-secret"
							type="password"
							bind:value={forms[provider].webhookSecret}
							placeholder={webhookSecretPlaceholder(provider, cred)}
							autocomplete="off"
						/>
						<p class="text-xs text-muted-foreground">
							Used to verify webhook payload signatures. Leave blank to keep the existing secret.
						</p>
					</div>

					<!-- Webhook URL (read-only) -->
					<div class="grid gap-2">
						<Label class="text-sm font-medium">Webhook URL</Label>
						<div class="flex items-center gap-2">
							<Input
								type="text"
								value={backendUrl + meta.webhookPath(businessId)}
								readonly
								class="font-mono text-xs"
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								onclick={() =>
									copyToClipboard(
										backendUrl + meta.webhookPath(businessId),
										`${meta.name} webhook URL`
									)}
								aria-label="Copy webhook URL"
							>
								<IconCopy class="size-4" />
							</Button>
						</div>
						<p class="text-xs text-muted-foreground">
							Add this URL to your {meta.name} dashboard's webhook settings.
							{#if meta.webhookNote}
								<span class="block mt-1 italic">{meta.webhookNote}</span>
							{/if}
						</p>
						<a
							href={meta.docsUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
						>
							Open {meta.name} dashboard
							<IconExternalLink class="size-3" />
						</a>
					</div>
				</Card.Content>

				<Card.Footer class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
					<div class="flex flex-wrap gap-2">
						<Button
							variant="outline"
							onclick={() => handleVerify(provider)}
							disabled={form.verifying || !cred || cred.source === 'none'}
						>
							{#if form.verifying}
								<IconLoader2 class="mr-2 size-4 animate-spin" />
							{:else}
								<IconRefresh class="mr-2 size-4" />
							{/if}
							Test Connection
						</Button>
						{#if hasBusinessCreds}
							<Button
								variant="destructive"
								onclick={() => requestDelete(provider)}
								disabled={form.deleting}
							>
								{#if form.deleting}
									<IconLoader2 class="mr-2 size-4 animate-spin" />
								{:else}
									<IconTrash class="mr-2 size-4" />
								{/if}
								Delete Credentials
							</Button>
						{/if}
					</div>
					<Button onclick={() => handleSave(provider)} disabled={form.saving || !isDirty(provider)}>
						{#if form.saving}
							<IconLoader2 class="mr-2 size-4 animate-spin" />
						{/if}
						Save
					</Button>
				</Card.Footer>
			{/if}
		</Card.Root>
	{/each}
</div>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete payment credentials?"
	description={deleteTargetProvider
		? `This will remove the saved ${PROVIDERS[deleteTargetProvider].name} credentials for this business. Payments through ${PROVIDERS[deleteTargetProvider].name} will fall back to platform defaults or be unavailable.`
		: ''}
	confirmLabel="Delete"
	cancelLabel="Cancel"
	variant="destructive"
	onConfirm={confirmDelete}
	onCancel={() => (deleteTargetProvider = null)}
/>
