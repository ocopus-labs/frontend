<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { toast } from 'svelte-sonner';
	import { seedMenuTemplate } from '$lib/api';
	import { updateFranchiseMenuTemplate } from '$lib/api/franchise';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Check from '@lucide/svelte/icons/check';

	let {
		franchiseId,
		locationId,
		businessType,
		completed = $bindable(false),
		summary = $bindable('')
	}: {
		franchiseId: string;
		locationId: string;
		businessType: string;
		completed: boolean;
		summary?: string;
	} = $props();

	const TEMPLATES: Record<string, { label: string; icon: string }> = {
		indian: { label: 'Indian', icon: '🍛' },
		italian: { label: 'Italian', icon: '🍝' },
		cafe: { label: 'Cafe', icon: '☕' },
		bar: { label: 'Bar', icon: '🍹' },
		bakery: { label: 'Bakery', icon: '🧁' },
		'fast-food': { label: 'Fast Food', icon: '🍔' },
		salon: { label: 'Salon', icon: '💇' },
		gym: { label: 'Gym', icon: '🏋️' }
	};

	const relevant = $derived(() => {
		const byType: Record<string, string[]> = {
			restaurant: ['indian', 'italian', 'fast-food'],
			cafe: ['cafe', 'bakery'],
			bar: ['bar'],
			salon: ['salon'],
			gym: ['gym'],
			bakery: ['bakery']
		};
		return (byType[businessType] ?? Object.keys(TEMPLATES)).filter((k) => k in TEMPLATES);
	});

	let selected = $state('');
	let isLoading = $state(false);

	export async function save(): Promise<boolean> {
		if (completed || !selected) return true;

		isLoading = true;
		try {
			// Seed the first location so the owner has a working menu immediately...
			const result = await seedMenuTemplate(locationId, selected);

			// ...and record the choice on the franchise so later locations inherit
			// it. Without this the template would be a one-off applied to a single
			// outlet, which defeats the point of a franchise-wide menu.
			await updateFranchiseMenuTemplate(franchiseId, { template: selected });

			completed = true;
			summary = `${TEMPLATES[selected].label} template — ${result.itemsCreated} items`;
			toast.success(`Menu template applied: ${TEMPLATES[selected].label}`);
			return true;
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to apply the menu template');
			return false;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="step-heading text-3xl font-bold" tabindex="-1">Shared menu template</h1>
		<p class="mt-2 text-muted-foreground">
			Pick a starting menu. It's applied to your first location and inherited by every location you
			add later.
		</p>
	</div>

	{#if completed}
		<!-- Alert has no `success` variant; the semantic token carries the meaning
		     and stays correct in both themes. -->
		<Alert.Root>
			<Check class="size-4 text-success" />
			<Alert.Description>{summary}</Alert.Description>
		</Alert.Root>
	{/if}

	<ToggleGroup.Root
		type="single"
		bind:value={selected}
		class="grid grid-cols-2 gap-3 sm:grid-cols-3"
	>
		{#each relevant() as key (key)}
			<ToggleGroup.Item
				value={key}
				aria-label={TEMPLATES[key].label}
				class="h-auto flex-col items-start gap-1 rounded-lg border-2 p-4 data-[state=on]:border-primary data-[state=on]:bg-primary/5"
			>
				<span class="text-2xl">{TEMPLATES[key].icon}</span>
				<span class="text-sm font-medium">{TEMPLATES[key].label}</span>
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>

	<div class="flex items-center gap-3">
		<Button onclick={save} disabled={isLoading || completed || !selected}>
			{#if isLoading}
				<Loader2 class="mr-2 size-4 animate-spin" />
				Applying...
			{:else if completed}
				<Check class="mr-2 size-4" />
				Applied
			{:else}
				Apply template
			{/if}
		</Button>
		<p class="text-sm text-muted-foreground">You can edit every item afterwards, per location.</p>
	</div>
</div>
