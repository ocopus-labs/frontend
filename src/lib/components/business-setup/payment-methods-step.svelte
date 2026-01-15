<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import SearchSelect from '$lib/components/global/search-select.svelte';
	import { z } from 'zod';

	let {
		acceptCash = $bindable(true),
		acceptCards = $bindable(false),
		cardProviders = $bindable([]),
		acceptDigitalWallets = $bindable(false),
		errors = $bindable({})
	}: {
		acceptCash: boolean;
		acceptCards: boolean;
		cardProviders: string[];
		acceptDigitalWallets: boolean;
		errors: Record<string, string>;
	} = $props();

	let newProvider = $state('');

	// Validation schema
	export const paymentMethodsSchema = z
		.object({
			acceptCash: z.boolean(),
			acceptCards: z.boolean(),
			cardProviders: z.array(z.string()).optional(),
			acceptDigitalWallets: z.boolean()
		})
		.refine(
			(data) => {
				// At least one payment method must be selected
				return data.acceptCash || data.acceptCards || data.acceptDigitalWallets;
			},
			{
				message: 'At least one payment method must be selected',
				path: ['paymentMethods']
			}
		)
		.refine(
			(data) => {
				// If cards are accepted, at least one provider must be specified
				if (data.acceptCards && (!data.cardProviders || data.cardProviders.length === 0)) {
					return false;
				}
				return true;
			},
			{
				message: 'Please add at least one card provider',
				path: ['cardProviders']
			}
		);

	const providerOptions = [
		{ label: 'Stripe', value: 'stripe' },
		{ label: 'Square', value: 'square' },
		{ label: 'PayPal', value: 'paypal' },
		{ label: 'Authorize.net', value: 'authorize' },
		{ label: 'Clover', value: 'clover' },
		{ label: 'Other', value: 'other' }
	];

	function addCardProvider() {
		if (newProvider && !cardProviders.includes(newProvider)) {
			cardProviders = [...cardProviders, newProvider];
			newProvider = '';
			errors = {};
		}
	}

	function removeCardProvider(provider: string) {
		cardProviders = cardProviders.filter((p) => p !== provider);
	}

	// Validate function
	export function validate() {
		try {
			paymentMethodsSchema.parse({
				acceptCash,
				acceptCards,
				cardProviders,
				acceptDigitalWallets
			});
			errors = {};
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				errors = error.issues.reduce(
					(acc, err) => {
						acc[(err.path[0] as string) || ('paymentMethods' as string)] = err.message;
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
		<h1 class="text-3xl font-bold">Payment Methods</h1>
		<p class="mt-2 text-muted-foreground">How will you accept payments?</p>
	</div>

	{#if errors.paymentMethods}
		<div class="rounded-lg border border-destructive bg-destructive/10 p-4">
			<p class="text-sm text-destructive">{errors.paymentMethods}</p>
		</div>
	{/if}

	<div class="space-y-6">
		<div class="space-y-4">
			<div class="rounded-lg border p-4">
				<div class="flex items-start gap-3">
					<Checkbox id="accept-cash" bind:checked={acceptCash} class="mt-1" />
					<div class="flex-1">
						<label
							for="accept-cash"
							class="cursor-pointer text-base leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Cash
						</label>
						<p class="mt-1 text-sm text-muted-foreground">Accept physical cash payments</p>
					</div>
				</div>
			</div>

			<div class="rounded-lg border p-4">
				<div class="flex items-start gap-3">
					<Checkbox id="accept-cards" bind:checked={acceptCards} class="mt-1" />
					<div class="flex-1">
						<label
							for="accept-cards"
							class="cursor-pointer text-base leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Credit/Debit Cards
						</label>
						<p class="mt-1 text-sm text-muted-foreground">
							Accept card payments via payment processor
						</p>

						{#if acceptCards}
							<div class="mt-4 space-y-4">
								{#if cardProviders.length > 0}
									<div class="space-y-2">
										{#each cardProviders as provider (provider)}
											<div
												class="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
											>
												<span class="text-sm capitalize">{provider}</span>
												<button
													type="button"
													onclick={() => removeCardProvider(provider)}
													class="text-xs text-muted-foreground hover:text-destructive"
												>
													Remove
												</button>
											</div>
										{/each}
									</div>
								{/if}

								<Field.Group>
									<Field.Field>
										<Field.Label>Add Card Provider</Field.Label>
										<div class="flex gap-2">
											<div class="flex-1">
												<SearchSelect
													bind:value={newProvider}
													options={providerOptions}
													placeholder="Select provider"
													emptyPlaceholder="No provider found"
												/>
											</div>
											<button
												type="button"
												onclick={addCardProvider}
												disabled={!newProvider}
												class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
											>
												Add
											</button>
										</div>
										{#if errors.cardProviders}
											<Field.Error>{errors.cardProviders}</Field.Error>
										{/if}
									</Field.Field>
								</Field.Group>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<div class="rounded-lg border p-4">
				<div class="flex items-start gap-3">
					<Checkbox id="accept-digital" bind:checked={acceptDigitalWallets} class="mt-1" />
					<div class="flex-1">
						<label
							for="accept-digital"
							class="cursor-pointer text-base leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Digital Wallets
						</label>
						<p class="mt-1 text-sm text-muted-foreground">
							Accept Apple Pay, Google Pay, and other digital wallets
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
