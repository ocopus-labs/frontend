<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { createBusiness, type CreateBusinessPayload, type BusinessType } from '$lib/api';

	import Building2 from '@lucide/svelte/icons/building-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	// Import step components
	import BusinessEssentialsStep from '$lib/components/business-setup/business-essentials-step.svelte';
	import FirstStoreStep from '$lib/components/business-setup/first-store-step.svelte';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { useSession, signOut } from '$lib/auth';
	import * as Avatar from '$lib/components/ui/avatar';
	import LogOut from '@lucide/svelte/icons/log-out';

	// Session
	const session = useSession();
	const user = $derived($session.data?.user);

	async function handleLogout() {
		try {
			sessionStorage.removeItem('business-setup-progress');
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
			id: 'location-details',
			name: 'Location & Details',
			icon: MapPin,
			description: 'Address, phone, and tax rate',
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

	// Form data - Step 2: Location & Details
	let address = $state('');
	let phone = $state('');
	let taxRate = $state('');
	let step2Errors = $state({});

	// Loading state for form submission
	let isSubmitting = $state(false);

	// Accessibility: live region announcement
	let stepAnnouncement = $state('');

	// Component refs for validation
	let step1Component = $state<any>(null);
	let step2Component = $state<any>(null);

	// Track highest step reached (for navigation)
	let highestStepReached = $state(0);

	// Flag to prevent effect loops
	let isInitialized = $state(false);

	// Load saved progress on mount (runs once)
	if (typeof window !== 'undefined') {
		const saved = sessionStorage.getItem('business-setup-progress');
		if (saved) {
			try {
				const data = JSON.parse(saved);
				currentStep = Math.min(data.currentStep ?? 0, 1);
				highestStepReached = Math.min(data.highestStepReached ?? 0, 1);
				businessName = data.businessName ?? '';
				businessType = data.businessType ?? '';
				restaurantSubType = data.restaurantSubType ?? '';
				businessDescription = data.businessDescription ?? '';
				businessLogo = data.businessLogo ?? '';
				country = data.country ?? '';
				city = data.city ?? '';
				timezone = data.timezone ?? '';
				currency = data.currency ?? '';
				address = data.address ?? data.storeAddress ?? '';
				phone = data.phone ?? data.storePhone ?? '';
				taxRate = data.taxRate ?? '';
			} catch (e) {
				console.error('Failed to load saved progress:', e);
			}
		}
		isInitialized = true;
	}

	// Save form data to sessionStorage (with debounce)
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
					address,
					phone,
					taxRate
				};
				sessionStorage.setItem('business-setup-progress', JSON.stringify(formData));
			}, 500);
		}
	});

	// Validate current step
	function validateCurrentStep(): boolean {
		switch (currentStep) {
			case 0:
				return step1Component?.validate() ?? false;
			case 1:
				return step2Component?.validate() ?? false;
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
			} else {
				return { ...step, status: 'upcoming' as const };
			}
		});
	}

	// Navigation functions
	async function goToNextStep() {
		// Validate current step before proceeding
		if (!validateCurrentStep()) {
			toast.error('Please fix the errors before continuing');
			// Focus first invalid field
			await tick();
			if (typeof document !== 'undefined') {
				const invalidEl = document.querySelector<HTMLElement>('[aria-invalid="true"]');
				if (invalidEl) {
					invalidEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
					invalidEl.focus();
				}
			}
			return;
		}

		if (currentStep === 0) {
			currentStep = 1;
			if (1 > highestStepReached) {
				highestStepReached = 1;
			}
			updateStepStatuses();
			stepAnnouncement = `Step 2 of 2: ${steps[1].name}`;
			await tick();
			if (typeof document !== 'undefined') {
				const heading = document.querySelector<HTMLElement>('.step-heading');
				if (heading) heading.focus();
			}
		} else if (currentStep === 1) {
			await completeSetup();
		}
	}

	async function goToPreviousStep() {
		if (currentStep > 0) {
			currentStep--;
			updateStepStatuses();
			stepAnnouncement = `Step ${currentStep + 1} of 2: ${steps[currentStep].name}`;
			await tick();
			if (typeof document !== 'undefined') {
				const heading = document.querySelector<HTMLElement>('.step-heading');
				if (heading) heading.focus();
			}
		}
	}

	async function goToStep(index: number) {
		if (index <= highestStepReached) {
			currentStep = index;
			updateStepStatuses();
			stepAnnouncement = `Step ${currentStep + 1} of 2: ${steps[currentStep].name}`;
			await tick();
			if (typeof document !== 'undefined') {
				const heading = document.querySelector<HTMLElement>('.step-heading');
				if (heading) heading.focus();
			}
		}
	}

	async function skipAndCreate() {
		await completeSetup();
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
					street: address || undefined,
					city: city || undefined,
					state: undefined,
					country: country,
					postalCode: undefined
				},
				contact: {
					email: user?.email || undefined,
					phone: phone || undefined
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
				sessionStorage.removeItem('business-setup-progress');
			}

			toast.success('Business created successfully!');

			// Navigate to the new business dashboard
			goto(`/${result.business.type}/${result.business.slug}/dashboard`);
		} catch (error: any) {
			console.error('Setup failed:', error);
			const message = error?.message || '';
			if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already exists')) {
				toast.error('A business with this name already exists. Please choose a different name.');
			} else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
				toast.error('Network error. Please check your connection and try again.');
			} else if (error?.status === 401 || message.toLowerCase().includes('unauthorized')) {
				toast.error('Session expired. Please log in again.');
				goto('/login');
			} else {
				toast.error(message || 'Failed to create business. Please try again.');
			}
		} finally {
			isSubmitting = false;
		}
	}
</script>

<a href="#step-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
	Skip to content
</a>

<!-- Visually-hidden live region for step announcements -->
<div aria-live="polite" aria-atomic="true" class="sr-only">{stepAnnouncement}</div>

<div class="flex h-dvh w-full bg-background">
	<!-- Left Sidebar - Steps Navigation -->
	<aside aria-label="Setup progress" class="hidden w-72 flex-col border-r bg-card px-6 py-8 lg:flex">
		<div class="mb-8">
			<h2 class="text-2xl font-bold">Business Setup</h2>
			<p class="mt-2 text-sm text-muted-foreground">Let's get your business up and running</p>
		</div>

		<nav aria-label="Setup steps" class="space-y-2">
			{#each steps as step, index (step.id)}
				{@const isClickable = index <= highestStepReached}
				<button
					class={cn(
						'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
						step.status === 'current' && 'bg-muted text-foreground',
						step.status === 'completed' && 'text-muted-foreground hover:bg-muted/50',
						!isClickable && 'cursor-not-allowed text-muted-foreground/60'
					)}
					aria-current={step.status === 'current' ? 'step' : undefined}
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
				<div
					class="h-2 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
					aria-valuenow={currentStep + 1}
					aria-valuemin={1}
					aria-valuemax={steps.length}
					aria-label="Setup progress: Step {currentStep + 1} of {steps.length}"
				>
					<div
						class="h-full bg-primary transition-all duration-300"
						style="width: {((currentStep + 1) / steps.length) * 100}%"
					></div>
				</div>
				<p class="mt-2 text-sm font-medium">{steps[currentStep].name}</p>
				<div class="mt-1 flex justify-center gap-1.5" aria-hidden="true">
					{#each steps as _, i}
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
						bind:address
						bind:phone
						bind:taxRate
						bind:errors={step2Errors}
					/>
				{/if}

				<!-- Navigation Buttons -->
				<div class="flex items-center justify-between border-t pt-6">
					<div>
						{#if currentStep === 0}
							<Button variant="ghost" onclick={() => goto('/dashboard')}>Cancel</Button>
						{:else}
							<Button variant="ghost" onclick={goToPreviousStep}>
								<ChevronLeft class="mr-1 size-4" />
								Back
							</Button>
						{/if}
					</div>

					<div class="flex items-center gap-3">
						{#if currentStep === 0}
							<Button onclick={goToNextStep}>
								Continue
								<ChevronRight class="ml-1 size-4" />
							</Button>
						{:else}
							<Button variant="outline" onclick={skipAndCreate} disabled={isSubmitting}>
								Skip & Create Business
							</Button>
							<Button onclick={goToNextStep} disabled={isSubmitting}>
								{#if isSubmitting}
									<Loader2 class="mr-2 size-4 animate-spin" />
									Creating...
								{:else}
									Create Business
								{/if}
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</main>
</div>
