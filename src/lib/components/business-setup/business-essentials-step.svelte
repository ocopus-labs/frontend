<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Field from '$lib/components/ui/field';
	import * as ImageCropper from '$lib/components/ui/image-cropper';
	import SearchSelect from '$lib/components/global/search-select.svelte';
	import { REGION_CONFIGS } from '$lib/utils/i18n';
	import { z } from 'zod';
	import { toast } from 'svelte-sonner';

	let {
		businessName = $bindable(''),
		businessType = $bindable(''),
		restaurantSubType = $bindable(''),
		businessDescription = $bindable(''),
		businessLogo = $bindable(''),
		country = $bindable(''),
		city = $bindable(''),
		timezone = $bindable(''),
		currency = $bindable(''),
		errors = $bindable({})
	}: {
		businessName: string;
		businessType: string;
		restaurantSubType: string;
		businessDescription: string;
		businessLogo: string;
		country: string;
		city: string;
		timezone: string;
		currency: string;
		errors: Record<string, string>;
	} = $props();

	// Validation schema
	export const businessEssentialsSchema = z.object({
		businessName: z
			.string()
			.min(2, 'Business name must be at least 2 characters')
			.max(100, 'Business name must be less than 100 characters'),
		businessType: z.string().min(1, 'Please select a business type'),
		restaurantSubType: z.string().optional(),
		businessDescription: z.string().optional(),
		businessLogo: z.string().optional(),
		country: z.string().min(1, 'Please select a country'),
		city: z.string().optional(),
		timezone: z.string().min(1, 'Please select a timezone'),
		currency: z.string().min(1, 'Please select a currency')
	});

	// Options for dropdowns
	const businessTypeOptions = [
		{ label: 'Restaurant', value: 'restaurant' },
		{ label: 'Cafe / Coffee Shop', value: 'cafe' },
		{ label: 'Bar / Pub', value: 'bar' },
		{ label: 'Salon / Spa', value: 'salon' },
		{ label: 'Gym / Fitness', value: 'gym' },
		{ label: 'Retail Store', value: 'retail' },
		{ label: 'Clinic', value: 'clinic' },
		{ label: 'Other', value: 'other' }
	];

	const restaurantSubTypeOptions = [
		{ label: 'Fine Dining', value: 'fine-dining' },
		{ label: 'Casual Dining', value: 'casual-dining' },
		{ label: 'Quick Service / Fast Food', value: 'quick-service' },
		{ label: 'Fast Casual', value: 'fast-casual' },
		{ label: 'Food Truck', value: 'food-truck' },
		{ label: 'Cafe / Bistro', value: 'cafe' },
		{ label: 'Bar / Pub', value: 'bar' },
		{ label: 'Bakery', value: 'bakery' },
		{ label: 'Pizzeria', value: 'pizzeria' },
		{ label: 'Buffet', value: 'buffet' },
		{ label: 'Ghost Kitchen / Cloud Kitchen', value: 'ghost-kitchen' },
		{ label: 'Other', value: 'other' }
	];

	const countryOptions = [
		{ label: 'United States', value: 'us' },
		{ label: 'Canada', value: 'ca' },
		{ label: 'United Kingdom', value: 'uk' },
		{ label: 'India', value: 'in' },
		{ label: 'Australia', value: 'au' }
	];

	const timezoneOptions = [
		{ label: 'America/New_York (EST)', value: 'America/New_York' },
		{ label: 'America/Chicago (CST)', value: 'America/Chicago' },
		{ label: 'America/Denver (MST)', value: 'America/Denver' },
		{ label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
		{ label: 'America/Toronto (EST)', value: 'America/Toronto' },
		{ label: 'Europe/London (GMT)', value: 'Europe/London' },
		{ label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
		{ label: 'Australia/Sydney (AEST)', value: 'Australia/Sydney' }
	];

	const currencyOptions = [
		{ label: 'USD - United States Dollar', value: 'USD' },
		{ label: 'EUR - Euro', value: 'EUR' },
		{ label: 'GBP - British Pound', value: 'GBP' },
		{ label: 'INR - Indian Rupee', value: 'INR' },
		{ label: 'CAD - Canadian Dollar', value: 'CAD' },
		{ label: 'AUD - Australian Dollar', value: 'AUD' }
	];

	// Reset restaurant sub-type when business type changes
	$effect(() => {
		if (businessType !== 'restaurant') {
			restaurantSubType = '';
		}
	});

	// Auto-infer timezone & currency from country (only if not already set)
	$effect(() => {
		if (!country) return;
		const regionConfig = REGION_CONFIGS[country];
		if (!regionConfig) return;

		if (!timezone) {
			timezone = regionConfig.timezone;
		}
		if (!currency) {
			currency = regionConfig.currency;
		}
	});

	// Validate function
	export function validate() {
		try {
			businessEssentialsSchema.parse({
				businessName,
				businessType,
				restaurantSubType,
				businessDescription,
				businessLogo,
				country,
				city,
				timezone,
				currency
			});
			errors = {};
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				errors = error.issues.reduce(
					(acc, err) => {
						acc[err.path[0] as string] = err.message;
						return acc;
					},
					{} as Record<string, string>
				);
			}
			return false;
		}
	}

	function handleLogoUpload(src: string) {
		businessLogo = src;
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="step-heading text-3xl font-bold" tabindex="-1">Let's set up your business</h1>
		<p class="mt-2 text-muted-foreground">
			Just a few essentials to get started. This should take about 5 minutes.
		</p>
	</div>

	<div class="space-y-6">
		<Field.Group>
			<Field.Field>
				<Field.Label for="business-name">Business Name *</Field.Label>
				<Input
					id="business-name"
					type="text"
					placeholder="e.g., Bella Vista Restaurant"
					bind:value={businessName}
					aria-required={true}
					aria-invalid={!!errors.businessName || undefined}
					aria-describedby={errors.businessName ? 'business-name-error' : 'business-name-desc'}
				/>
				{#if errors.businessName}
					<Field.Error id="business-name-error">{errors.businessName}</Field.Error>
				{:else}
					<Field.Description id="business-name-desc">This is how customers will see your business</Field.Description>
				{/if}
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label>Business Type *</Field.Label>
				<SearchSelect
					bind:value={businessType}
					options={businessTypeOptions}
					placeholder="Select business type"
					emptyPlaceholder="No business type found"
					label="Business Type"
					invalid={!!errors.businessType}
					describedBy={errors.businessType ? 'business-type-error' : undefined}
				/>
				{#if errors.businessType}
					<Field.Error id="business-type-error">{errors.businessType}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>

		{#if businessType === 'restaurant'}
			<Field.Group>
				<Field.Field>
					<Field.Label>Restaurant Type</Field.Label>
					<SearchSelect
						bind:value={restaurantSubType}
						options={restaurantSubTypeOptions}
						placeholder="Select restaurant type"
						emptyPlaceholder="No restaurant type found"
						label="Restaurant Type"
						describedBy="restaurant-subtype-desc"
					/>
					<Field.Description id="restaurant-subtype-desc">What type of restaurant service do you offer?</Field.Description>
				</Field.Field>
			</Field.Group>
		{/if}

		<Field.Group>
			<Field.Field>
				<Field.Label for="business-description">Business Description (Optional)</Field.Label>
				<Textarea
					id="business-description"
					placeholder="Tell us about your business..."
					bind:value={businessDescription}
					rows={3}
					aria-describedby="business-desc-desc"
				/>
				<Field.Description id="business-desc-desc"
					>A brief description of your business and what makes it unique</Field.Description
				>
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label for="business-logo">Business Logo (Optional)</Field.Label>
				<ImageCropper.Root
					bind:src={businessLogo}
					onCropped={handleLogoUpload}
					onUnsupportedFile={() => toast.error('Unsupported file type. Please upload an image.')}
				>
					<ImageCropper.UploadTrigger>
						<ImageCropper.Preview class="rounded-md" />
					</ImageCropper.UploadTrigger>
					<ImageCropper.Dialog>
						<ImageCropper.Cropper cropShape="rect" />
						<ImageCropper.Controls>
							<ImageCropper.Crop />
							<ImageCropper.Cancel />
						</ImageCropper.Controls>
					</ImageCropper.Dialog>
				</ImageCropper.Root>
				<Field.Description
					>Your business logo will appear on receipts and customer-facing displays</Field.Description
				>
			</Field.Field>
		</Field.Group>
	</div>

	<div class="space-y-6 border-t pt-6">
		<div>
			<Field.Title>Location</Field.Title>
			<Field.Description>Where is your business located?</Field.Description>
		</div>

		<Field.Group>
			<Field.Field>
				<Field.Label>Country *</Field.Label>
				<SearchSelect
					bind:value={country}
					options={countryOptions}
					placeholder="Select country"
					emptyPlaceholder="No country found"
					label="Country"
					invalid={!!errors.country}
					describedBy={errors.country ? 'country-error' : undefined}
				/>
				{#if errors.country}
					<Field.Error id="country-error">{errors.country}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label for="city">City/Region (Optional)</Field.Label>
				<Input
					id="city"
					type="text"
					placeholder="e.g., New York"
					bind:value={city}
					aria-describedby={errors.city ? 'city-error' : undefined}
					aria-invalid={!!errors.city || undefined}
				/>
				{#if errors.city}
					<Field.Error id="city-error">{errors.city}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>
	</div>

	<div class="space-y-6 border-t pt-6">
		<Field.Group>
			<Field.Field>
				<Field.Label>Timezone *</Field.Label>
				<SearchSelect
					bind:value={timezone}
					options={timezoneOptions}
					placeholder="Select timezone"
					emptyPlaceholder="No timezone found"
					label="Timezone"
					invalid={!!errors.timezone}
					describedBy={errors.timezone ? 'timezone-error' : 'timezone-desc'}
				/>
				{#if errors.timezone}
					<Field.Error id="timezone-error">{errors.timezone}</Field.Error>
				{:else}
					<Field.Description id="timezone-desc">Used for reporting and business hours calculation</Field.Description>
				{/if}
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label>Currency *</Field.Label>
				<SearchSelect
					bind:value={currency}
					options={currencyOptions}
					placeholder="Select currency"
					emptyPlaceholder="No currency found"
					label="Currency"
					invalid={!!errors.currency}
					describedBy={errors.currency ? 'currency-error' : undefined}
				/>
				{#if errors.currency}
					<Field.Error id="currency-error">{errors.currency}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>
	</div>
</div>
