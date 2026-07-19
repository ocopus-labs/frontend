<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import {
		createBusiness,
		enableFeature,
		disableFeature,
		type CreateBusinessPayload,
		type BusinessType
	} from '$lib/api';
	import { addBusinessToFranchise } from '$lib/api/franchise';
	import { page } from '$app/stores';
	import { BUSINESS_TYPE_CONFIG } from '$lib/types/business';

	import Building2 from '@lucide/svelte/icons/building-2';
	import Puzzle from '@lucide/svelte/icons/puzzle';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Rocket from '@lucide/svelte/icons/rocket';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import LogOut from '@lucide/svelte/icons/log-out';

	import BusinessEssentialsStep from '$lib/components/business-setup/business-essentials-step.svelte';
	import FirstStoreStep from '$lib/components/business-setup/first-store-step.svelte';
	import MenuSetupStep from '$lib/components/business-setup/menu-setup-step.svelte';
	import TablesSetupStep from '$lib/components/business-setup/tables-setup-step.svelte';
	import PaymentTaxStep from '$lib/components/business-setup/payment-tax-step.svelte';
	import ReviewLaunchStep from '$lib/components/business-setup/review-launch-step.svelte';

	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { useSession, signOut } from '$lib/auth';
	import * as Avatar from '$lib/components/ui/avatar';

	const STORAGE_KEY = 'onboarding-wizard';

	// Session
	const session = useSession();
	const user = $derived($session.data?.user);

	async function handleLogout() {
		try {
			clearProgress();
			await signOut();
			toast.success('Logged out successfully');
			goto('/login');
		} catch (error) {
			toast.error('Failed to logout');
		}
	}

	// Step definitions
	type StepDef = {
		id: string;
		name: string;
		icon: any;
		description: string;
	};

	const allSteps: StepDef[] = [
		{
			id: 'essentials',
			name: 'Business Info',
			icon: Building2,
			description: 'Name, type, and details'
		},
		{ id: 'features', name: 'Features', icon: Puzzle, description: 'Choose your features' },
		{ id: 'menu', name: 'Menu', icon: UtensilsCrossed, description: 'Add items to sell' },
		{ id: 'tables', name: 'Tables', icon: Grid3x3, description: 'Set up your layout' },
		{ id: 'payment', name: 'Payment & Tax', icon: CreditCard, description: 'How you get paid' },
		{ id: 'launch', name: 'Launch', icon: Rocket, description: 'Review and go live' }
	];

	// Franchise context — set when the wizard is opened from a franchise's
	// Locations page. Drives the banner, the post-create attach, and where
	// Cancel returns to.
	const franchiseId = $derived($page.url.searchParams.get('franchise'));
	const franchiseSlug = $derived($page.url.searchParams.get('franchiseSlug'));
	const franchiseName = $derived($page.url.searchParams.get('franchiseName'));

	// State
	let currentStep = $state(0);
	let highestStepReached = $state(0);
	let isSubmitting = $state(false);

	// Business data (created in Step 1)
	let businessId = $state('');
	let businessSlug = $state('');
	let businessTypeResult = $state('');

	// Step 1 form data
	let businessName = $state('');
	let businessType = $state('');
	let restaurantSubType = $state('');
	let businessDescription = $state('');
	let businessLogo = $state('');
	let country = $state('');
	let city = $state('');
	let timezone = $state('');
	let currency = $state('');
	let step1Errors = $state({});
	let address = $state('');
	let phone = $state('');
	let taxRate = $state('');
	let step2Errors = $state({});

	// Feature selection (Step 2)
	let selectedExtras = $state<string[]>([]);

	// Get available extras and slot limit for the selected business type
	const featureConfig = $derived(() => {
		const type = businessType || 'restaurant';
		const configs: Record<
			string,
			{ available: { slug: string; label: string }[]; defaults: string[]; slots: number }
		> = {
			restaurant: {
				available: [
					{ slug: 'tables', label: 'Tables' },
					{ slug: 'menu', label: 'Menu' },
					{ slug: 'inventory', label: 'Inventory' },
					{ slug: 'expenses', label: 'Expenses' },
					{ slug: 'loyalty', label: 'Loyalty' },
					{ slug: 'team', label: 'Team' }
				],
				defaults: ['tables', 'menu'],
				slots: 3
			},
			cafe: {
				available: [
					{ slug: 'tables', label: 'Tables' },
					{ slug: 'menu', label: 'Menu' },
					{ slug: 'inventory', label: 'Inventory' },
					{ slug: 'expenses', label: 'Expenses' },
					{ slug: 'loyalty', label: 'Loyalty' },
					{ slug: 'team', label: 'Team' }
				],
				defaults: ['menu'],
				slots: 2
			},
			bar: {
				available: [
					{ slug: 'tables', label: 'Tables' },
					{ slug: 'menu', label: 'Menu' },
					{ slug: 'inventory', label: 'Inventory' },
					{ slug: 'expenses', label: 'Expenses' },
					{ slug: 'loyalty', label: 'Loyalty' },
					{ slug: 'team', label: 'Team' }
				],
				defaults: ['tables', 'menu'],
				slots: 3
			},
			salon: {
				available: [
					{ slug: 'appointments', label: 'Appointments' },
					{ slug: 'services', label: 'Services' },
					{ slug: 'inventory', label: 'Inventory' },
					{ slug: 'expenses', label: 'Expenses' },
					{ slug: 'loyalty', label: 'Loyalty' },
					{ slug: 'team', label: 'Team' }
				],
				defaults: ['appointments', 'services'],
				slots: 3
			},
			gym: {
				available: [
					{ slug: 'memberships', label: 'Memberships' },
					{ slug: 'classes', label: 'Classes' },
					{ slug: 'inventory', label: 'Inventory' },
					{ slug: 'expenses', label: 'Expenses' },
					{ slug: 'loyalty', label: 'Loyalty' },
					{ slug: 'team', label: 'Team' }
				],
				defaults: ['memberships', 'classes'],
				slots: 3
			},
			clinic: {
				available: [
					{ slug: 'appointments', label: 'Appointments' },
					{ slug: 'services', label: 'Services' },
					{ slug: 'inventory', label: 'Inventory' },
					{ slug: 'expenses', label: 'Expenses' },
					{ slug: 'team', label: 'Team' }
				],
				defaults: ['appointments', 'services'],
				slots: 3
			},
			retail: {
				available: [
					{ slug: 'inventory', label: 'Inventory' },
					{ slug: 'loyalty', label: 'Loyalty' },
					{ slug: 'expenses', label: 'Expenses' },
					{ slug: 'team', label: 'Team' }
				],
				defaults: ['inventory'],
				slots: 2
			}
		};
		return (
			configs[type] ?? {
				available: [
					{ slug: 'inventory', label: 'Inventory' },
					{ slug: 'expenses', label: 'Expenses' },
					{ slug: 'team', label: 'Team' }
				],
				defaults: [],
				slots: 2
			}
		);
	});

	// Initialize defaults when business type changes
	$effect(() => {
		if (businessType && selectedExtras.length === 0) {
			selectedExtras = [...featureConfig().defaults];
		}
	});

	function toggleExtra(slug: string) {
		if (selectedExtras.includes(slug)) {
			selectedExtras = selectedExtras.filter((s) => s !== slug);
		} else if (selectedExtras.length < featureConfig().slots) {
			selectedExtras = [...selectedExtras, slug];
		}
	}

	// Step completion tracking
	let menuCompleted = $state(false);
	let tablesCompleted = $state(false);
	let paymentCompleted = $state(false);

	// Summary text for review
	let menuSummary = $state('');
	let tablesSummary = $state('');
	let paymentSummary = $state('');

	// Component refs
	let step1Component = $state<any>(null);
	let step2Component = $state<any>(null);

	// Check if tables step should be shown
	const supportsTable = $derived(() => {
		const config = BUSINESS_TYPE_CONFIG[businessType as keyof typeof BUSINESS_TYPE_CONFIG];
		return config?.features?.includes('tables') ?? false;
	});

	// Steps visible to user (may skip tables)
	const visibleSteps = $derived(
		supportsTable() ? allSteps : allSteps.filter((s) => s.id !== 'tables')
	);

	const totalSteps = $derived(visibleSteps.length);
	const currentStepId = $derived(visibleSteps[currentStep]?.id ?? '');
	let stepAnnouncement = $state('');
	let isInitialized = $state(false);

	// Load saved progress from localStorage
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const data = JSON.parse(saved);
				businessId = data.businessId ?? '';
				businessSlug = data.businessSlug ?? '';
				businessTypeResult = data.businessTypeResult ?? '';
				currentStep = data.currentStep ?? 0;
				highestStepReached = data.highestStepReached ?? 0;
				businessName = data.businessName ?? '';
				businessType = data.businessType ?? '';
				restaurantSubType = data.restaurantSubType ?? '';
				businessDescription = data.businessDescription ?? '';
				businessLogo = data.businessLogo ?? '';
				country = data.country ?? '';
				city = data.city ?? '';
				timezone = data.timezone ?? '';
				currency = data.currency ?? '';
				address = data.address ?? '';
				phone = data.phone ?? '';
				taxRate = data.taxRate ?? '';
				menuCompleted = data.menuCompleted ?? false;
				tablesCompleted = data.tablesCompleted ?? false;
				paymentCompleted = data.paymentCompleted ?? false;
				selectedExtras = data.selectedExtras ?? [];
				menuSummary = data.menuSummary ?? '';
				tablesSummary = data.tablesSummary ?? '';
				paymentSummary = data.paymentSummary ?? '';
			} catch (e) {
				console.error('Failed to load wizard progress:', e);
			}
		}
		isInitialized = true;
	}

	// Save progress (debounced)
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (!isInitialized) return;
		if (typeof window === 'undefined') return;

		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					businessId,
					businessSlug,
					businessTypeResult,
					currentStep,
					highestStepReached,
					businessName,
					businessType,
					restaurantSubType,
					businessDescription,
					businessLogo,
					country,
					city,
					timezone,
					currency,
					address,
					phone,
					taxRate,
					menuCompleted,
					tablesCompleted,
					paymentCompleted,
					menuSummary,
					tablesSummary,
					paymentSummary,
					selectedExtras
				})
			);
		}, 500);
	});

	function clearProgress() {
		if (typeof window !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY);
			sessionStorage.removeItem('business-setup-progress');
		}
	}

	// Get the real step index (accounting for hidden tables step)
	function getStepId(visibleIndex: number): string {
		return visibleSteps[visibleIndex]?.id ?? '';
	}

	// Navigation
	function updateStepStatuses() {
		stepAnnouncement = `Step ${currentStep + 1} of ${totalSteps}: ${visibleSteps[currentStep]?.name}`;
	}

	async function focusStepHeading() {
		await tick();
		if (typeof document !== 'undefined') {
			const heading = document.querySelector<HTMLElement>('.step-heading');
			if (heading) heading.focus();
		}
	}

	async function goToNextStep() {
		const stepId = getStepId(currentStep);

		// Step 1: validate form and create business
		if (stepId === 'essentials') {
			// Validate essentials
			if (!(step1Component?.validate() ?? false)) {
				toast.error('Please fix the errors before continuing');
				return;
			}

			// If business not yet created, create it
			if (!businessId) {
				isSubmitting = true;
				try {
					const payload: CreateBusinessPayload = {
						name: businessName,
						type: businessType as BusinessType,
						description: businessDescription || undefined,
						logo: businessLogo || undefined,
						subType: restaurantSubType || undefined,
						address: {
							street: address || undefined,
							city: city || undefined,
							country: country
						},
						contact: {
							email: user?.email || undefined,
							phone: phone || undefined
						},
						settings: {
							timezone,
							currency,
							taxRate: taxRate || '0'
						}
					};
					const result = await createBusiness(payload);
					businessId = result.business.id;
					businessSlug = result.business.slug;
					businessTypeResult = result.business.type;

					if (franchiseId) {
						// Attach after creating rather than using the franchise create
						// endpoint, which doesn't accept logo/subType.
						try {
							await addBusinessToFranchise(franchiseId, {
								businessId: result.business.id,
								configSource: 'hybrid'
							});
							toast.success('Location created and added to the franchise!');
						} catch {
							// The business exists — don't fail the flow, but say so and
							// point at the recovery path.
							toast.error(
								'Business created, but adding it to the franchise failed. You can transfer it in from the franchise Locations page.'
							);
						}
					} else {
						toast.success('Business created!');
					}
				} catch (error: any) {
					const msg = error?.message || '';
					if (
						msg.toLowerCase().includes('duplicate') ||
						msg.toLowerCase().includes('already exists')
					) {
						toast.error('A business with this name already exists.');
					} else {
						toast.error(msg || 'Failed to create business');
					}
					isSubmitting = false;
					return;
				} finally {
					isSubmitting = false;
				}
			}
		}

		// Features step: sync selected extras with the backend
		if (stepId === 'features' && businessId) {
			const defaults = featureConfig().defaults;
			const toEnable = selectedExtras.filter((s) => !defaults.includes(s));
			const toDisable = defaults.filter((s) => !selectedExtras.includes(s));
			try {
				for (const slug of toEnable) await enableFeature(businessId, slug);
				for (const slug of toDisable) await disableFeature(businessId, slug);
			} catch {
				// Non-critical — defaults are already reasonable
			}
		}

		// Advance
		if (currentStep < totalSteps - 1) {
			currentStep++;
			if (currentStep > highestStepReached) highestStepReached = currentStep;
			updateStepStatuses();
			await focusStepHeading();
		}
	}

	async function goToPreviousStep() {
		if (currentStep > 0) {
			currentStep--;
			updateStepStatuses();
			await focusStepHeading();
		}
	}

	async function goToStep(index: number) {
		if (index <= highestStepReached) {
			currentStep = index;
			updateStepStatuses();
			await focusStepHeading();
		}
	}

	function skipStep() {
		if (currentStep < totalSteps - 1) {
			currentStep++;
			if (currentStep > highestStepReached) highestStepReached = currentStep;
			updateStepStatuses();
			focusStepHeading();
		}
	}
</script>

<a
	href="#step-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
>
	Skip to content
</a>

<div aria-live="polite" aria-atomic="true" class="sr-only">{stepAnnouncement}</div>

<div class="flex h-dvh w-full bg-background">
	<!-- Left Sidebar -->
	<aside
		aria-label="Setup progress"
		class="hidden w-72 flex-col border-r bg-card px-6 py-8 lg:flex"
	>
		<div class="mb-8">
			<h2 class="text-2xl font-bold">{franchiseId ? 'Add Location' : 'Business Setup'}</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				{#if franchiseId}
					This location will be added to <span class="font-medium text-foreground"
						>{franchiseName ?? 'your franchise'}</span
					> and inherit its settings.
				{:else}
					Let's get your business up and running
				{/if}
			</p>
		</div>

		<nav aria-label="Setup steps" class="space-y-2">
			{#each visibleSteps as step, index (step.id)}
				{@const isClickable = index <= highestStepReached}
				{@const isCurrent = index === currentStep}
				{@const isCompleted = index < currentStep}
				<button
					class={cn(
						'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
						isCurrent && 'bg-muted text-foreground',
						isCompleted && 'text-muted-foreground hover:bg-muted/50',
						!isClickable && 'cursor-not-allowed text-muted-foreground/60'
					)}
					aria-current={isCurrent ? 'step' : undefined}
					disabled={!isClickable}
					onclick={() => goToStep(index)}
				>
					<div
						class={cn(
							'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
							isCompleted && 'border-primary bg-primary text-primary-foreground',
							isCurrent && 'border-primary bg-background text-primary',
							!isClickable && 'border-muted-foreground/30'
						)}
					>
						{#if isCompleted}
							<CheckCircle2 class="size-4" />
						{:else}
							{@const Icon = step.icon}
							<Icon class="size-4" />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium">{step.name}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
					</div>
				</button>
			{/each}
		</nav>

		<!-- Profile -->
		<div class="mt-auto border-t pt-4">
			{#if user}
				<div class="flex items-center gap-3 rounded-lg px-3 py-2">
					<Avatar.Root class="size-9">
						<Avatar.Image src={user.image} alt={user.name} />
						<Avatar.Fallback class="bg-primary/10 text-primary">
							{user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? '?'}
						</Avatar.Fallback>
					</Avatar.Root>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{user.name ?? 'User'}</p>
						<p class="truncate text-xs text-muted-foreground">{user.email}</p>
					</div>
				</div>
				<Button variant="ghost" class="mt-2 w-full justify-start gap-2" onclick={handleLogout}>
					<LogOut class="size-4" />
					Log out
				</Button>
			{:else if $session.isPending}
				<div class="flex items-center gap-3 px-3 py-2">
					<div class="size-9 animate-pulse rounded-full bg-muted"></div>
					<div class="flex-1 space-y-2">
						<div class="h-3 w-20 animate-pulse rounded bg-muted"></div>
						<div class="h-2 w-32 animate-pulse rounded bg-muted"></div>
					</div>
				</div>
			{/if}
		</div>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 overflow-auto">
		<div class="mx-auto max-w-3xl p-6 lg:p-8">
			<!-- Mobile Progress -->
			<div class="mb-6 lg:hidden">
				<div class="mb-2 flex items-center justify-between text-sm text-muted-foreground">
					<span>Step {currentStep + 1} of {totalSteps}</span>
					<span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
				</div>
				<div
					class="h-2 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
					aria-valuenow={currentStep + 1}
					aria-valuemin={1}
					aria-valuemax={totalSteps}
				>
					<div
						class="h-full bg-primary transition-all duration-300"
						style="width: {((currentStep + 1) / totalSteps) * 100}%"
					></div>
				</div>
				<p class="mt-2 text-sm font-medium">{visibleSteps[currentStep]?.name}</p>
				<div class="mt-1 flex justify-center gap-1.5" aria-hidden="true">
					{#each visibleSteps as _, i}
						<div
							class="size-2 rounded-full transition-colors {i === currentStep
								? 'bg-primary'
								: i < currentStep
									? 'bg-primary/40'
									: 'bg-muted-foreground/30'}"
						></div>
					{/each}
				</div>
			</div>

			<!-- Step Content -->
			<div id="step-content" class="space-y-6">
				{#if currentStepId === 'essentials'}
					<BusinessEssentialsStep
						bind:this={step1Component}
						bind:businessName
						bind:businessType
						bind:restaurantSubType
						bind:businessDescription
						bind:businessLogo
						bind:country
						bind:city
						bind:timezone
						bind:currency
						bind:errors={step1Errors}
					/>
					<!-- Inline location fields (merged from old Step 2) -->
					<FirstStoreStep
						bind:this={step2Component}
						bind:address
						bind:phone
						bind:taxRate
						bind:errors={step2Errors}
					/>
				{:else if currentStepId === 'features'}
					<div class="space-y-4">
						<div>
							<h2 class="text-lg font-semibold">Choose Your Features</h2>
							<p class="text-sm text-muted-foreground">
								Core features (POS, Orders, Customers) are always included. Pick up to
								<strong>{featureConfig().slots}</strong> extras for your free plan.
							</p>
						</div>
						<div class="flex items-center gap-2">
							<Badge variant="outline"
								>{selectedExtras.length}/{featureConfig().slots} slots used</Badge
							>
						</div>
						<div class="grid gap-2 sm:grid-cols-2">
							{#each featureConfig().available as feat}
								{@const selected = selectedExtras.includes(feat.slug)}
								{@const disabled = !selected && selectedExtras.length >= featureConfig().slots}
								<button
									type="button"
									class={cn(
										'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
										selected
											? 'border-primary bg-primary/5'
											: disabled
												? 'cursor-not-allowed opacity-50'
												: 'hover:bg-accent'
									)}
									onclick={() => !disabled && toggleExtra(feat.slug)}
								>
									<span
										class={cn(
											'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2',
											selected
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-muted-foreground'
										)}
									>
										{#if selected}
											<CheckCircle2 class="h-3.5 w-3.5" />
										{/if}
									</span>
									<span class="text-sm font-medium">{feat.label}</span>
								</button>
							{/each}
						</div>
						<p class="text-xs text-muted-foreground">
							You can change these anytime in Settings &gt; Features.
						</p>
					</div>
				{:else if currentStepId === 'menu'}
					<MenuSetupStep
						{businessId}
						businessType={businessTypeResult}
						bind:completed={menuCompleted}
					/>
				{:else if currentStepId === 'tables'}
					<TablesSetupStep {businessId} bind:completed={tablesCompleted} />
				{:else if currentStepId === 'payment'}
					<PaymentTaxStep
						{businessId}
						businessType={businessTypeResult}
						bind:completed={paymentCompleted}
					/>
				{:else if currentStepId === 'launch'}
					<ReviewLaunchStep
						businessType={businessTypeResult}
						{businessSlug}
						{menuCompleted}
						{tablesCompleted}
						{paymentCompleted}
						{menuSummary}
						tablesSummary={tablesCompleted ? tablesSummary : ''}
						paymentSummary={paymentCompleted ? paymentSummary : ''}
					/>
				{/if}

				<!-- Navigation Buttons -->
				{#if currentStepId !== 'launch'}
					<div class="flex items-center justify-between border-t pt-6">
						<div>
							{#if currentStep === 0}
								<Button
									variant="ghost"
									onclick={() =>
										goto(franchiseSlug ? `/franchise/${franchiseSlug}/locations` : '/dashboard')}
									>Cancel</Button
								>
							{:else}
								<Button variant="ghost" onclick={goToPreviousStep}>
									<ChevronLeft class="mr-1 size-4" />
									Back
								</Button>
							{/if}
						</div>

						<div class="flex items-center gap-3">
							{#if currentStepId !== 'essentials' && currentStepId !== 'payment'}
								<Button variant="ghost" onclick={skipStep}>Skip for now</Button>
							{/if}

							<Button onclick={goToNextStep} disabled={isSubmitting}>
								{#if isSubmitting}
									<Loader2 class="mr-2 size-4 animate-spin" />
									Creating business...
								{:else if currentStepId === 'essentials'}
									{businessId ? 'Next' : 'Create & Continue'}
									<ChevronRight class="ml-1 size-4" />
								{:else}
									Next
									<ChevronRight class="ml-1 size-4" />
								{/if}
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
