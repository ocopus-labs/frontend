<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import {
		createBusiness,
		updateBusiness,
		enableFeature,
		disableFeature,
		type CreateBusinessPayload,
		type BusinessType
	} from '$lib/api';
	import { createBusinessUnderFranchise } from '$lib/api/franchise';
	import {
		getOnboardingStatus,
		updateOnboardingState,
		type UpdateOnboardingPayload
	} from '$lib/api/onboarding';
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
	let paymentComponent = $state<any>(null);

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

	// ---- Server-side progress -------------------------------------------------
	//
	// localStorage stays, but only as a cache for the pre-creation phase: on
	// step 1 there is no business row yet, so there is nowhere on the server to
	// put anything. The moment the business exists the server becomes the
	// source of truth, which is what makes progress survive a different device
	// or a cleared browser.
	//
	// Steps are synced by id, not index -- `visibleSteps` omits Tables for
	// business types without them, so index 3 means different things for a
	// restaurant and a salon.
	let hydratedFromServer = $state(false);

	function stepIndexOf(stepId: string | undefined): number {
		if (!stepId) return -1;
		return visibleSteps.findIndex((s) => s.id === stepId);
	}

	async function hydrateFromServer() {
		if (!businessId || hydratedFromServer) return;
		hydratedFromServer = true;
		try {
			const status = await getOnboardingStatus(businessId);
			const saved = status.state ?? {};

			menuCompleted = saved.completed?.menu ?? menuCompleted;
			tablesCompleted = saved.completed?.tables ?? tablesCompleted;
			paymentCompleted = saved.completed?.payment ?? paymentCompleted;
			menuSummary = saved.summaries?.menu ?? menuSummary;
			tablesSummary = saved.summaries?.tables ?? tablesSummary;
			paymentSummary = saved.summaries?.payment ?? paymentSummary;
			if (saved.selectedFeatures?.length) selectedExtras = saved.selectedFeatures;

			// Only move the user forward. If this tab is already further along
			// than the server knows (they kept working while offline), yanking
			// them backwards would be worse than a slightly stale server record.
			const savedIndex = stepIndexOf(saved.currentStepId);
			if (savedIndex > currentStep) currentStep = savedIndex;
			const furthestIndex = stepIndexOf(saved.furthestStepId);
			if (furthestIndex > highestStepReached) highestStepReached = furthestIndex;
		} catch {
			// Offline or the endpoint is unreachable -- the local cache is still
			// perfectly usable, so fall through rather than blocking setup.
		}
	}

	$effect(() => {
		if (businessId) void hydrateFromServer();
	});

	function progressPayload(): UpdateOnboardingPayload {
		return {
			currentStepId: visibleSteps[currentStep]?.id,
			furthestStepId: visibleSteps[highestStepReached]?.id,
			completed: {
				menu: menuCompleted,
				tables: tablesCompleted,
				payment: paymentCompleted
			},
			summaries: {
				...(menuSummary ? { menu: menuSummary } : {}),
				...(tablesSummary ? { tables: tablesSummary } : {}),
				...(paymentSummary ? { payment: paymentSummary } : {})
			},
			selectedFeatures: selectedExtras
		};
	}

	async function syncProgress(extra: Partial<UpdateOnboardingPayload> = {}) {
		if (!businessId) return;
		try {
			await updateOnboardingState(businessId, { ...progressPayload(), ...extra });
		} catch {
			// Best-effort: localStorage already holds this, and the next step
			// change retries. Never block navigation on the sync.
		}
	}

	/** Called when the user launches. Marks setup finished, then drops the cache. */
	async function completeOnboarding() {
		await syncProgress({ complete: true });
		clearProgress();
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
					// One call either way. Creating under a franchise used to be
					// create-then-attach, which could leave an orphaned standalone
					// business if the attach failed; the franchise endpoint now takes
					// the same payload and links inside the same transaction.
					const result = franchiseId
						? await createBusinessUnderFranchise(franchiseId, payload)
						: await createBusiness(payload);
					businessId = result.business.id;
					businessSlug = result.business.slug;
					businessTypeResult = result.business.type;

					toast.success(
						franchiseId ? 'Location created and added to the franchise!' : 'Business created!'
					);
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
			} else {
				// Resumed session: the business already exists, so `createBusiness`
				// is skipped. Without this, every edit made here on a resume was
				// silently discarded -- there was no update path at all.
				isSubmitting = true;
				try {
					await updateBusiness(businessId, {
						name: businessName,
						description: businessDescription || undefined,
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
					});
				} catch (error: unknown) {
					toast.error(error instanceof Error ? error.message : 'Failed to save your changes');
					isSubmitting = false;
					return;
				} finally {
					isSubmitting = false;
				}
			}
		}

		// Payment step: persist before advancing. This step deliberately has no
		// "Skip for now" button, but Next used to advance without saving, so a
		// user who filled the form and hit Next lost all of it.
		if (stepId === 'payment' && businessId && !paymentCompleted) {
			const saved = await paymentComponent?.save();
			if (!saved) return;
		}

		// Features step: sync selected extras with the backend
		if (stepId === 'features' && businessId) {
			const defaults = featureConfig().defaults;
			const toEnable = selectedExtras.filter((s) => !defaults.includes(s));
			const toDisable = defaults.filter((s) => !selectedExtras.includes(s));
			try {
				for (const slug of toEnable) await enableFeature(businessId, slug);
				for (const slug of toDisable) await disableFeature(businessId, slug);
			} catch (error: unknown) {
				// Defaults are already applied server-side, so this isn't fatal --
				// but it was previously swallowed entirely, leaving the user
				// believing their picks had been saved.
				toast.error(
					error instanceof Error
						? `Some features couldn't be applied: ${error.message}. You can set them in Settings > Features.`
						: "Some features couldn't be applied. You can set them in Settings > Features."
				);
			}
		}

		// Advance
		if (currentStep < totalSteps - 1) {
			currentStep++;
			if (currentStep > highestStepReached) highestStepReached = currentStep;
			updateStepStatuses();
			// Persist the new position server-side. Deliberately not awaited --
			// a slow network must not stall the step transition.
			void syncProgress();
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
				<Button
					variant="ghost"
					class={cn(
						'h-auto w-full items-start justify-start gap-3 rounded-lg px-3 py-3 text-left font-normal transition-colors',
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
				</Button>
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
				<!-- Skeleton mirrors the avatar + name/email block above it. Was
				     hand-rolled `animate-pulse` divs; the dashboard already uses
				     the shared primitive. -->
				<div class="flex items-center gap-3 px-3 py-2">
					<Skeleton class="size-9 rounded-full" />
					<div class="flex-1 space-y-2">
						<Skeleton class="h-3 w-20" />
						<Skeleton class="h-2 w-32" />
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
				<!-- Shared Progress primitive: it carries the progressbar role and
				     aria values itself, so the hand-written ones came off. -->
				<Progress value={Math.round(((currentStep + 1) / totalSteps) * 100)} class="h-2" />
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
								<!-- Real Checkbox inside a Label, not a <button> wrapping a
								     <span> styled to look like one. The old markup announced
								     itself as a button with no checked state, so a screen
								     reader user could not tell which features were selected. -->
								<Label
									for="feature-{feat.slug}"
									class={cn(
										'flex items-center gap-3 rounded-lg border p-3 text-left font-normal transition-colors',
										selected
											? 'border-primary bg-primary/5'
											: disabled
												? 'cursor-not-allowed opacity-50'
												: 'cursor-pointer hover:bg-accent'
									)}
								>
									<Checkbox
										id="feature-{feat.slug}"
										checked={selected}
										{disabled}
										onCheckedChange={() => toggleExtra(feat.slug)}
									/>
									<span class="text-sm font-medium">{feat.label}</span>
								</Label>
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
						bind:summary={menuSummary}
					/>
				{:else if currentStepId === 'tables'}
					<TablesSetupStep
						{businessId}
						bind:completed={tablesCompleted}
						bind:summary={tablesSummary}
					/>
				{:else if currentStepId === 'payment'}
					<PaymentTaxStep
						bind:this={paymentComponent}
						{businessId}
						businessType={businessTypeResult}
						{country}
						bind:completed={paymentCompleted}
						bind:summary={paymentSummary}
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
						onLaunch={completeOnboarding}
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
