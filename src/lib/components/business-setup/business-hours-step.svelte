<script lang="ts">
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import * as Field from '$lib/components/ui/field';
	import { z } from 'zod';

	let {
		hoursType = $bindable('same'),
		errors = $bindable({})
	}: {
		hoursType: string;
		errors: Record<string, string>;
	} = $props();

	// Validation schema
	export const businessHoursSchema = z.object({
		hoursType: z.enum(['same', 'different']).refine((val) => !!val, {
			message: 'Please select an option for business hours'
		})
	});

	// Validate function
	export function validate() {
		try {
			businessHoursSchema.parse({ hoursType });
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
		<h1 class="text-3xl font-bold">Business Hours</h1>
		<p class="mt-2 text-muted-foreground">
			Set your operating hours (you can customize this later)
		</p>
	</div>

	<div class="space-y-6">
		<Field.Group>
			<Field.Field>
				<Field.Label>Operating Hours</Field.Label>
				<RadioGroup.Root bind:value={hoursType}>
					<div class="space-y-3">
						<div class="rounded-lg border p-4">
							<div class="flex items-start gap-3">
								<RadioGroup.Item value="same" id="hours-same" />
								<div class="flex-1">
									<label
										for="hours-same"
										class="cursor-pointer text-base leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										Same hours every day
									</label>
									<p class="mt-1 text-sm text-muted-foreground">
										Open Monday-Sunday with the same schedule
									</p>
									{#if hoursType === 'same'}
										<div
											class="mt-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground"
										>
											Default: 9:00 AM - 9:00 PM (You can customize this after setup)
										</div>
									{/if}
								</div>
							</div>
						</div>

						<div class="rounded-lg border p-4">
							<div class="flex items-start gap-3">
								<RadioGroup.Item value="different" id="hours-different" />
								<div class="flex-1">
									<label
										for="hours-different"
										class="cursor-pointer text-base leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
									>
										Different hours for different days
									</label>
									<p class="mt-1 text-sm text-muted-foreground">
										I'll set specific hours for each day of the week
									</p>
									{#if hoursType === 'different'}
										<div
											class="mt-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground"
										>
											You'll be able to set custom hours for each day after completing setup
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</RadioGroup.Root>
				{#if errors.hoursType}
					<Field.Error>{errors.hoursType}</Field.Error>
				{/if}
			</Field.Field>
		</Field.Group>
	</div>

	<div
		class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950"
	>
		<p class="text-sm text-blue-900 dark:text-blue-100">
			<strong>Note:</strong> You can always adjust these hours later in Settings → Business Hours
		</p>
	</div>
</div>
