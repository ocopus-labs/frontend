<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Field from '$lib/components/ui/field';
	import { z } from 'zod';

	let {
		storeName = $bindable(''),
		storeAddress = $bindable(''),
		storePhone = $bindable(''),
		taxRate = $bindable(''),
		storeNotes = $bindable(''),
		errors = $bindable({})
	}: {
		storeName: string;
		storeAddress: string;
		storePhone: string;
		taxRate: string;
		storeNotes: string;
		errors: Record<string, string>;
	} = $props();

	// Validation schema
	export const firstStoreSchema = z.object({
		storeName: z
			.string()
			.min(2, 'Store name must be at least 2 characters')
			.max(100, 'Store name is too long'),
		storeAddress: z.string().optional(),
		storePhone: z.string().optional(),
		taxRate: z.number().optional(),
		// .refine((val) => {
		// 	const num = parseFloat(val);
		// 	return !isNaN(num) && num >= 0 && num <= 100;
		// }, 'Tax rate must be between 0 and 100'),
		storeNotes: z.string().optional()
	});

	// Validate function
	export function validate() {
		try {
			firstStoreSchema.parse({
				storeName,
				storeAddress,
				storePhone,
				taxRate,
				storeNotes
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
		<h1 class="text-3xl font-bold">Create your first store</h1>
		<p class="mt-2 text-muted-foreground">You can add more locations later</p>
	</div>

	<div class="space-y-6">
		<Field.Group>
			<Field.Field>
				<Field.Label for="store-name">Store/Location Name *</Field.Label>
				<Input
					id="store-name"
					type="text"
					placeholder={'e.g., "Main Store", "Times Square", "Downtown"'}
					bind:value={storeName}
					class={errors.storeName ? 'border-destructive' : ''}
				/>
				{#if errors.storeName}
					<Field.Error>{errors.storeName}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label for="store-address">Store Address (Optional)</Field.Label>
				<Textarea
					id="store-address"
					placeholder="123 Main Street, Suite 100"
					bind:value={storeAddress}
					rows={2}
				/>
				<Field.Description
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
					bind:value={storePhone}
				/>
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label for="tax-rate">Tax Rate for this location (%) (Optional)</Field.Label>
				<Input
					id="tax-rate"
					type="number"
					step="0.001"
					placeholder="8.875"
					bind:value={taxRate}
					class={errors.taxRate ? 'border-destructive' : ''}
				/>
				{#if errors.taxRate}
					<Field.Error>{errors.taxRate}</Field.Error>
				{:else}
					<Field.Description>Standard tax rate for transactions at this location</Field.Description>
				{/if}
			</Field.Field>
		</Field.Group>

		<Field.Group>
			<Field.Field>
				<Field.Label for="store-notes">Additional Notes (Optional)</Field.Label>
				<Textarea
					id="store-notes"
					placeholder="Any additional information about this location..."
					bind:value={storeNotes}
					rows={3}
				/>
				<Field.Description>Special instructions, parking info, or other details</Field.Description>
			</Field.Field>
		</Field.Group>
	</div>
</div>
