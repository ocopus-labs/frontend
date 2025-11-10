<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Field from '$lib/components/ui/field';
	import * as ImageCropper from '$lib/components/ui/image-cropper';
	import SearchSelect from '$lib/components/global/search-select.svelte';
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
		city: z.string().min(2, 'City/Region is required').max(50, 'City name is too long'),
		timezone: z.string().min(1, 'Please select a timezone'),
		currency: z.string().min(1, 'Please select a currency')
	});

	// Options for dropdowns
	const businessTypeOptions = [
		{ label: 'Restaurant', value: 'restaurant' },
		{ label: 'Retail Store', value: 'retail' },
		{ label: 'Salon/Spa', value: 'salon' },
		{ label: 'Coffee Shop', value: 'coffee' },
		{ label: 'Fitness Center', value: 'fitness' },
		{ label: 'Service (Other)', value: 'service' },
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
		{ label: 'Europe/London (GMT)', value: 'Europe/London' },
		{ label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' }
	];

	const currencyOptions = [
		{ label: 'USD - United States Dollar', value: 'usd' },
		{ label: 'EUR - Euro', value: 'eur' },
		{ label: 'GBP - British Pound', value: 'gbp' },
		{ label: 'INR - Indian Rupee', value: 'inr' },
		{ label: 'CAD - Canadian Dollar', value: 'cad' }
	];

	// Reset restaurant sub-type when business type changes
	$effect(() => {
		if (businessType !== 'restaurant') {
			restaurantSubType = '';
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
		<h1 class="text-3xl font-bold">Let's set up your business</h1>
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
					class={errors.businessName ? 'border-destructive' : ''}
				/>
				{#if errors.businessName}
					<Field.Error>{errors.businessName}</Field.Error>
				{:else}
					<Field.Description>This is how customers will see your business</Field.Description>
				{/if}
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<SearchSelect
					bind:value={businessType}
					options={businessTypeOptions}
					placeholder="Select business type"
					emptyPlaceholder="No business type found"
				/>
				{#if errors.businessType}
					<Field.Error>{errors.businessType}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>

		{#if businessType === 'restaurant'}
			<Field.Group>
				<Field.Field>
					<SearchSelect
						bind:value={restaurantSubType}
						options={restaurantSubTypeOptions}
						placeholder="Select restaurant type"
						emptyPlaceholder="No restaurant type found"
					/>
					<Field.Description>What type of restaurant service do you offer?</Field.Description>
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
				/>
				<Field.Description
					>A brief description of your business and what makes it unique</Field.Description
				>
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label for="business-logo">Business Logo (Optional)</Field.Label>
				<ImageCropper.Root
					bind:src={businessLogo}
					onUpload={handleLogoUpload}
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
				<SearchSelect
					bind:value={country}
					options={countryOptions}
					placeholder="Select country"
					emptyPlaceholder="No country found"
				/>
				{#if errors.country}
					<Field.Error>{errors.country}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label for="city">City/Region *</Field.Label>
				<Input
					id="city"
					type="text"
					placeholder="e.g., New York"
					bind:value={city}
					class={errors.city ? 'border-destructive' : ''}
				/>
				{#if errors.city}
					<Field.Error>{errors.city}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>
	</div>

	<div class="space-y-6 border-t pt-6">
		<Field.Group>
			<Field.Field>
				<SearchSelect
					bind:value={timezone}
					options={timezoneOptions}
					placeholder="Select timezone"
					emptyPlaceholder="No timezone found"
				/>
				{#if errors.timezone}
					<Field.Error>{errors.timezone}</Field.Error>
				{:else}
					<Field.Description>Used for reporting and business hours calculation</Field.Description>
				{/if}
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<SearchSelect
					bind:value={currency}
					options={currencyOptions}
					placeholder="Select currency"
					emptyPlaceholder="No currency found"
				/>
				{#if errors.currency}
					<Field.Error>{errors.currency}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>
	</div>
</div>
