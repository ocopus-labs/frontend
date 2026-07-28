<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { useSession } from '$lib/auth';
	import { createFranchise, createBusinessUnderFranchise } from '$lib/api/franchise';
	import type { CreateBusinessPayload, BusinessType } from '$lib/api';
	import BusinessEssentialsStep from '$lib/components/business-setup/business-essentials-step.svelte';
	import FranchiseBrandStep from '$lib/components/franchise-setup/franchise-brand-step.svelte';
	import FranchiseMenuTemplateStep from '$lib/components/franchise-setup/franchise-menu-template-step.svelte';

	import Building2 from '@lucide/svelte/icons/building-2';
	import Store from '@lucide/svelte/icons/store';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Rocket from '@lucide/svelte/icons/rocket';

	const session = useSession();
	const user = $derived($session.data?.user);

	const steps = [
		{ id: 'brand', name: 'Brand', icon: Building2, description: 'Name and identity' },
		{ id: 'location', name: 'First location', icon: Store, description: 'Your first outlet' },
		{
			id: 'menu',
			name: 'Menu template',
			icon: UtensilsCrossed,
			description: 'Shared starting menu'
		}
	];

	let currentStep = $state(0);
	let isSubmitting = $state(false);
	const currentStepId = $derived(steps[currentStep]?.id ?? '');
	const progress = $derived(Math.round(((currentStep + 1) / steps.length) * 100));

	// Brand
	let franchiseName = $state('');
	let franchiseDescription = $state('');
	let franchiseLogo = $state('');
	let brandErrors = $state<Record<string, string>>({});
	let franchiseId = $state('');
	let franchiseSlug = $state('');

	// First location — reuses the business essentials step, since a franchise
	// location IS a business; it just gets created with the franchise attached.
	let businessName = $state('');
	let businessType = $state('');
	let restaurantSubType = $state('');
	let businessDescription = $state('');
	let businessLogo = $state('');
	let country = $state('');
	let city = $state('');
	let timezone = $state('');
	let currency = $state('');
	let locationErrors = $state<Record<string, string>>({});
	let locationId = $state('');
	let locationSlug = $state('');
	let locationTypeResult = $state('');

	// Menu
	let menuCompleted = $state(false);
	let menuSummary = $state('');

	let brandComponent = $state<any>(null);
	let locationComponent = $state<any>(null);
	let menuComponent = $state<any>(null);

	let stepAnnouncement = $state('');

	async function focusStepHeading() {
		await tick();
		if (typeof document !== 'undefined') {
			document.querySelector<HTMLElement>('.step-heading')?.focus();
		}
	}

	function advance() {
		if (currentStep < steps.length - 1) {
			currentStep++;
			stepAnnouncement = `Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep].name}`;
			void focusStepHeading();
		}
	}

	async function goToNextStep() {
		if (currentStepId === 'brand') {
			if (!(brandComponent?.validate() ?? false)) {
				toast.error('Please fix the errors before continuing');
				return;
			}

			// Idempotent: on a back-then-forward the franchise already exists.
			if (!franchiseId) {
				isSubmitting = true;
				try {
					const { franchise } = await createFranchise({
						name: franchiseName.trim(),
						description: franchiseDescription.trim() || undefined,
						logo: franchiseLogo || undefined
					});
					franchiseId = franchise.id;
					franchiseSlug = franchise.slug;
					toast.success('Franchise created!');
				} catch (error: unknown) {
					// The plan gate lands here for single-location plans; its message
					// already explains the upgrade, so surface it verbatim.
					toast.error(error instanceof Error ? error.message : 'Failed to create the franchise');
					return;
				} finally {
					isSubmitting = false;
				}
			}
			advance();
			return;
		}

		if (currentStepId === 'location') {
			if (!(locationComponent?.validate() ?? false)) {
				toast.error('Please fix the errors before continuing');
				return;
			}

			if (!locationId) {
				isSubmitting = true;
				try {
					const payload: CreateBusinessPayload = {
						name: businessName,
						type: businessType as BusinessType,
						description: businessDescription || undefined,
						logo: businessLogo || undefined,
						subType: restaurantSubType || undefined,
						address: { city: city || undefined, country },
						contact: { email: user?.email || undefined },
						settings: { timezone, currency, taxRate: '0' }
					};
					// Single call — the franchise link happens inside the business
					// creation transaction, so a failure can't strand an orphan.
					const { business } = await createBusinessUnderFranchise(franchiseId, payload);
					locationId = business.id;
					locationSlug = business.slug;
					locationTypeResult = business.type;
					toast.success('First location created!');
				} catch (error: unknown) {
					toast.error(error instanceof Error ? error.message : 'Failed to create the location');
					return;
				} finally {
					isSubmitting = false;
				}
			}
			advance();
			return;
		}
	}

	function goToPreviousStep() {
		if (currentStep > 0) {
			currentStep--;
			void focusStepHeading();
		}
	}

	async function finish() {
		// Applying a template is optional, but if one is selected and unsaved we
		// save it rather than silently discarding the choice.
		if (menuComponent && !menuCompleted) {
			await menuComponent.save();
		}
		goto(`/franchise/${franchiseSlug}`);
	}
</script>

<svelte:head><title>Set up your franchise</title></svelte:head>

<div aria-live="polite" class="sr-only">{stepAnnouncement}</div>

<div class="mx-auto w-full max-w-3xl px-4 py-8">
	<div class="mb-8 space-y-3">
		<div class="flex items-center justify-between">
			<p class="text-sm font-medium">
				Step {currentStep + 1} of {steps.length}
			</p>
			<p class="text-sm text-muted-foreground">{steps[currentStep]?.description}</p>
		</div>
		<Progress value={progress} class="h-1.5" />
	</div>

	<Card.Root>
		<Card.Content class="space-y-8 p-6 sm:p-8">
			{#if currentStepId === 'brand'}
				<FranchiseBrandStep
					bind:this={brandComponent}
					bind:franchiseName
					bind:franchiseDescription
					bind:franchiseLogo
					bind:errors={brandErrors}
				/>
			{:else if currentStepId === 'location'}
				<BusinessEssentialsStep
					bind:this={locationComponent}
					bind:businessName
					bind:businessType
					bind:restaurantSubType
					bind:businessDescription
					bind:businessLogo
					bind:country
					bind:city
					bind:timezone
					bind:currency
					bind:errors={locationErrors}
				/>
			{:else if currentStepId === 'menu'}
				<FranchiseMenuTemplateStep
					bind:this={menuComponent}
					{franchiseId}
					{locationId}
					businessType={locationTypeResult}
					bind:completed={menuCompleted}
					bind:summary={menuSummary}
				/>
			{/if}

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
					{#if currentStepId === 'menu'}
						<Button onclick={finish}>
							<Rocket class="mr-2 size-4" />
							Go to franchise
						</Button>
					{:else}
						<Button onclick={goToNextStep} disabled={isSubmitting}>
							{#if isSubmitting}
								<Loader2 class="mr-2 size-4 animate-spin" />
								Creating...
							{:else}
								Continue
								<ChevronRight class="ml-1 size-4" />
							{/if}
						</Button>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
