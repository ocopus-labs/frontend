<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { createBusiness, type CreateBusinessPayload, type BusinessType } from '$lib/api';

	import Building2 from '@lucide/svelte/icons/building-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Users from '@lucide/svelte/icons/users';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Clock from '@lucide/svelte/icons/clock';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	// Import step components
	import BusinessEssentialsStep from '$lib/components/business-setup/business-essentials-step.svelte';
	import FirstStoreStep from '$lib/components/business-setup/first-store-step.svelte';
	import TeamSetupStep from '$lib/components/business-setup/team-setup-step.svelte';
	import PaymentMethodsStep from '$lib/components/business-setup/payment-methods-step.svelte';
	import BusinessHoursStep from '$lib/components/business-setup/business-hours-step.svelte';
	import CompleteStep from '$lib/components/business-setup/complete-step.svelte';
	import { goto } from '$app/navigation';
	import { useSession, signOut } from '$lib/auth';
	import * as Avatar from '$lib/components/ui/avatar';
	import LogOut from '@lucide/svelte/icons/log-out';

	// Session
	const session = useSession();
	const user = $derived($session.data?.user);

	async function handleLogout() {
		try {
			await signOut();
			toast.success('Logged out successfully');
			goto('/login');
		} catch (error) {
			console.error('Logout error:', error);
			toast.error('Failed to logout');
		}
	}

	// Step navigation
	type Step = {
		id: string;
		name: string;
		icon: any;
		description: string;
		status: 'completed' | 'current' | 'upcoming';
	};

	let currentStep = $state(0);

	let steps: Step[] = $state([
		{
			id: 'business-essentials',
			name: 'Business Essentials',
			icon: Building2,
			description: 'Basic information about your business',
			status: 'current'
		},
		{
			id: 'first-store',
			name: 'First Store',
			icon: MapPin,
			description: 'Create your first location',
			status: 'upcoming'
		},
		{
			id: 'team',
			name: 'Team Setup',
			icon: Users,
			description: 'Add team members and permissions',
			status: 'upcoming'
		},
		{
			id: 'payments',
			name: 'Payment Methods',
			icon: CreditCard,
			description: 'Configure payment options',
			status: 'upcoming'
		},
		{
			id: 'hours',
			name: 'Business Hours',
			icon: Clock,
			description: 'Set your operating hours',
			status: 'upcoming'
		},
		{
			id: 'complete',
			name: 'Complete',
			icon: CheckCircle2,
			description: 'Review and finish setup',
			status: 'upcoming'
		}
	]);

	// Form data - Step 1: Business Essentials
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

	// Form data - Step 2: First Store
	let storeName = $state('');
	let storeAddress = $state('');
	let storePhone = $state('');
	let taxRate = $state('');
	let storeNotes = $state('');
	let step2Errors = $state({});

	// Form data - Step 3: Team
	let teamMembers = $state<Array<{ email: string; role: string; stores: string[] }>>([]);
	let step3Errors = $state({});

	// Form data - Step 4: Payments
	let acceptCash = $state(true);
	let acceptCards = $state(false);
	let cardProviders = $state<string[]>([]);
	let acceptDigitalWallets = $state(false);
	let step4Errors = $state({});

	// Form data - Step 5: Business Hours
	let hoursType = $state('same');
	let step5Errors = $state({});

	// Loading state for form submission
	let isSubmitting = $state(false);

	// Component refs for validation
	let step1Component = $state<any>(null);
	let step2Component = $state<any>(null);
	let step3Component = $state<any>(null);
	let step4Component = $state<any>(null);
	let step5Component = $state<any>(null);

	// Track highest step reached (for navigation)
	let highestStepReached = $state(0);

	// Flag to prevent effect loops
	let isInitialized = $state(false);

	// Load saved progress on mount (runs once)
	if (typeof window !== 'undefined') {
		const saved = localStorage.getItem('business-setup-progress');
		if (saved) {
			try {
				const data = JSON.parse(saved);
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
				storeName = data.storeName ?? '';
				storeAddress = data.storeAddress ?? '';
				storePhone = data.storePhone ?? '';
				taxRate = data.taxRate ?? '';
				storeNotes = data.storeNotes ?? '';
				teamMembers = data.teamMembers ?? [];
				acceptCash = data.acceptCash ?? true;
				acceptCards = data.acceptCards ?? false;
				cardProviders = data.cardProviders ?? [];
				acceptDigitalWallets = data.acceptDigitalWallets ?? false;
				hoursType = data.hoursType ?? 'same';
			} catch (e) {
				console.error('Failed to load saved progress:', e);
			}
		}
		isInitialized = true;
	}

	// Save form data to localStorage (with debounce)
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		// Only save after initialization to avoid loops
		if (!isInitialized) return;

		if (typeof window !== 'undefined') {
			// Clear existing timeout
			if (saveTimeout) {
				clearTimeout(saveTimeout);
			}

			// Debounce save
			saveTimeout = setTimeout(() => {
				const formData = {
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
					storeName,
					storeAddress,
					storePhone,
					taxRate,
					storeNotes,
					teamMembers,
					acceptCash,
					acceptCards,
					cardProviders,
					acceptDigitalWallets,
					hoursType
				};
				localStorage.setItem('business-setup-progress', JSON.stringify(formData));
			}, 500); // Save after 500ms of no changes
		}
	});

	// Validate current step
	function validateCurrentStep(): boolean {
		switch (currentStep) {
			case 0:
				return step1Component?.validate() ?? false;
			case 1:
				return step2Component?.validate() ?? false;
			case 2:
				return step3Component?.validate() ?? true; // Optional
			case 3:
				return step4Component?.validate() ?? false;
			case 4:
				return step5Component?.validate() ?? false;
			default:
				return true;
		}
	}

	// Update step status based on progress
	function updateStepStatuses() {
		steps = steps.map((step, index) => {
			if (index < currentStep) {
				return { ...step, status: 'completed' as const };
			} else if (index === currentStep) {
				return { ...step, status: 'current' as const };
			} else if (index <= highestStepReached) {
				return { ...step, status: 'upcoming' as const };
			} else {
				return { ...step, status: 'upcoming' as const };
			}
		});
	}

	// Navigation functions
	function goToNextStep() {
		// Validate current step before proceeding
		if (!validateCurrentStep()) {
			return;
		}

		if (currentStep < steps.length - 1) {
			currentStep++;
			if (currentStep > highestStepReached) {
				highestStepReached = currentStep;
			}
			updateStepStatuses();
		}
	}

	function goToPreviousStep() {
		if (currentStep > 0) {
			currentStep--;
			updateStepStatuses();
		}
	}

	function goToStep(index: number) {
		// Allow navigation to any completed step or current step
		if (index <= highestStepReached) {
			currentStep = index;
			updateStepStatuses();
		}
	}

	function skipStep() {
		// Only allow skipping optional steps (team and hours)
		if (currentStep === 2 || currentStep === 4) {
			if (currentStep < steps.length - 1) {
				currentStep++;
				if (currentStep > highestStepReached) {
					highestStepReached = currentStep;
				}
				updateStepStatuses();
			}
		}
	}

	async function completeSetup() {
		if (isSubmitting) return;
		isSubmitting = true;

		try {
			// Build the business payload
			const payload: CreateBusinessPayload = {
				name: businessName,
				type: businessType as BusinessType,
				description: businessDescription || undefined,
				logo: businessLogo || undefined,
				subType: restaurantSubType || undefined,
				address: {
					street: storeAddress || undefined,
					city: city,
					state: undefined,
					country: country,
					postalCode: undefined
				},
				contact: {
					email: user?.email || undefined,
					phone: storePhone || undefined
				},
				settings: {
					timezone: timezone,
					currency: currency,
					taxRate: taxRate || '0'
				}
			};

			// Create the business
			const result = await createBusiness(payload);

			// Clear saved progress
			if (typeof window !== 'undefined') {
				localStorage.removeItem('business-setup-progress');
			}

			toast.success('Business created successfully!');

			// Navigate to the new business dashboard
			goto(`/${result.business.type}/${result.business.slug}/dashboard`);
		} catch (error) {
			console.error('Setup failed:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to create business');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex h-dvh w-full bg-background">
	<!-- Left Sidebar - Steps Navigation -->
	<aside class="hidden w-72 flex-col border-r bg-card px-6 py-8 lg:flex">
		<div class="mb-8">
			<h2 class="text-2xl font-bold">Business Setup</h2>
			<p class="mt-2 text-sm text-muted-foreground">Let's get your business up and running</p>
		</div>

		<nav class="space-y-2">
			{#each steps as step, index (step.id)}
				{@const isClickable = index <= highestStepReached}
				<button
					class={cn(
						'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
						step.status === 'current' && 'bg-muted text-foreground',
						step.status === 'completed' && 'text-muted-foreground hover:bg-muted/50',
						!isClickable && 'cursor-not-allowed text-muted-foreground/60'
					)}
					disabled={!isClickable}
					onclick={() => goToStep(index)}
				>
					<div
						class={cn(
							'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
							step.status === 'completed' && 'border-primary bg-primary text-primary-foreground',
							step.status === 'current' && 'border-primary bg-background text-primary',
							!isClickable && 'border-muted-foreground/30'
						)}
					>
						{#if step.status === 'completed'}
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

		<!-- Profile Section -->
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
					<span>Step {currentStep + 1} of {steps.length}</span>
					<span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
				</div>
				<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full bg-primary transition-all duration-300"
						style="width: {((currentStep + 1) / steps.length) * 100}%"
					></div>
				</div>
			</div>

			<!-- Step Content -->
			<div class="space-y-6">
				<!-- Step 1: Business Essentials -->
				{#if currentStep === 0}
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
				{:else if currentStep === 1}
					<FirstStoreStep
						bind:this={step2Component}
						bind:storeName
						bind:storeAddress
						bind:storePhone
						bind:taxRate
						bind:storeNotes
						bind:errors={step2Errors}
					/>
				{:else if currentStep === 2}
					<TeamSetupStep bind:this={step3Component} bind:teamMembers bind:errors={step3Errors} />
				{:else if currentStep === 3}
					<PaymentMethodsStep
						bind:this={step4Component}
						bind:acceptCash
						bind:acceptCards
						bind:cardProviders
						bind:acceptDigitalWallets
						bind:errors={step4Errors}
					/>
				{:else if currentStep === 4}
					<BusinessHoursStep bind:this={step5Component} bind:hoursType bind:errors={step5Errors} />
				{:else if currentStep === 5}
					<CompleteStep onComplete={completeSetup} />
				{/if}

				<!-- Navigation Buttons -->
				<div class="flex items-center justify-between border-t pt-6">
					<div>
						{#if currentStep > 0 && currentStep < 5}
							<Button variant="ghost" onclick={goToPreviousStep}>
								<ChevronLeft class="mr-1 size-4" />
								Back
							</Button>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						{#if currentStep < 5 && currentStep !== 0 && currentStep !== 1}
							<Button variant="outline" onclick={skipStep}>Skip for Now</Button>
						{/if}

						{#if currentStep < 5}
							<Button onclick={goToNextStep}>
								Continue
								<ChevronRight class="ml-1 size-4" />
							</Button>
						{:else}
							<Button onclick={completeSetup} size="lg" disabled={isSubmitting}>
								{#if isSubmitting}
									<Loader2 class="mr-2 size-4 animate-spin" />
									Creating...
								{:else}
									Go to Dashboard
									<ChevronRight class="ml-1 size-4" />
								{/if}
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</main>
</div>
