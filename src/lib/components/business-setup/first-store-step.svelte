<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Field from '$lib/components/ui/field';
	import { z } from 'zod';

	let {
		address = $bindable(''),
		phone = $bindable(''),
		taxRate = $bindable(''),
		errors = $bindable({})
	}: {
		address: string;
		phone: string;
		taxRate: string;
		errors: Record<string, string>;
	} = $props();

	// Validation schema - all fields optional
	export const locationDetailsSchema = z.object({
		address: z.string().optional(),
		phone: z.string().optional(),
		taxRate: z
			.string()
			.optional()
			.refine(
				(val) => !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
				{ message: 'Tax rate must be a number between 0 and 100' }
			)
	});

	// Validate function - always succeeds unless taxRate is invalid
	export function validate() {
		try {
			locationDetailsSchema.parse({
				address,
				phone,
				taxRate
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
</script>

<div class="space-y-8">
	<div>
		<h1 class="step-heading text-3xl font-bold" tabindex="-1">Location & Details</h1>
		<p class="mt-2 text-muted-foreground">All optional — you can configure these from your dashboard later.</p>
	</div>

	<div class="space-y-6">
		<Field.Group>
			<Field.Field>
				<Field.Label for="store-address">Address (Optional)</Field.Label>
				<Textarea
					id="store-address"
					placeholder="123 Main Street, Suite 100"
					bind:value={address}
					rows={2}
					aria-describedby="store-address-desc"
				/>
				<Field.Description id="store-address-desc"
					>Full address including street, city, state, and zip code</Field.Description
				>
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label for="store-phone">Phone Number (Optional)</Field.Label>
				<Input
					id="store-phone"
					type="tel"
					placeholder="+1 (555) 000-0000"
					bind:value={phone}
				/>
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label for="tax-rate">Tax Rate (%) (Optional)</Field.Label>
				<Input
					id="tax-rate"
					type="number"
					step="0.001"
					placeholder="8.875"
					bind:value={taxRate}
					aria-invalid={!!errors.taxRate || undefined}
					aria-describedby={errors.taxRate ? 'tax-rate-error' : 'tax-rate-desc'}
				/>
				{#if errors.taxRate}
					<Field.Error id="tax-rate-error">{errors.taxRate}</Field.Error>
				{:else}
					<Field.Description id="tax-rate-desc">Standard tax rate for transactions at this location</Field.Description>
				{/if}
			</Field.Field>
		</Field.Group>
	</div>
</div>
