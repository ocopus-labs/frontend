<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Check from '@lucide/svelte/icons/check';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Rocket from '@lucide/svelte/icons/rocket';
	import { goto } from '$app/navigation';

	let {
		businessType,
		businessSlug,
		menuCompleted,
		tablesCompleted,
		paymentCompleted,
		menuSummary,
		tablesSummary,
		paymentSummary,
	}: {
		businessType: string;
		businessSlug: string;
		menuCompleted: boolean;
		tablesCompleted: boolean;
		paymentCompleted: boolean;
		menuSummary: string;
		tablesSummary: string;
		paymentSummary: string;
	} = $props();

	const sections = $derived([
		{
			label: 'Menu',
			done: menuCompleted,
			summary: menuCompleted ? menuSummary : 'Not set up yet',
			settingsPath: `/${businessType}/${businessSlug}/menu/items`,
		},
		{
			label: 'Tables',
			done: tablesCompleted,
			summary: tablesCompleted ? tablesSummary : 'Not set up',
			settingsPath: `/${businessType}/${businessSlug}/tables/layout`,
		},
		{
			label: 'Payment & Tax',
			done: paymentCompleted,
			summary: paymentCompleted ? paymentSummary : 'Using defaults',
			settingsPath: `/${businessType}/${businessSlug}/settings/payments`,
		},
	]);

	function launch() {
		goto(`/${businessType}/${businessSlug}/pos/new-order?tour=true`);
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="step-heading text-3xl font-bold" tabindex="-1">You're all set!</h1>
		<p class="mt-2 text-muted-foreground">Here's a summary of your setup. You can change anything later in Settings.</p>
	</div>

	<div class="space-y-3">
		{#each sections as section}
			<div class="flex items-start gap-3 rounded-lg border p-4">
				{#if section.done}
					<div class="mt-0.5 flex size-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
						<Check class="size-3 text-green-600 dark:text-green-400" />
					</div>
				{:else}
					<div class="mt-0.5 flex size-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
						<AlertCircle class="size-3 text-amber-600 dark:text-amber-400" />
					</div>
				{/if}
				<div class="flex-1">
					<p class="text-sm font-medium">{section.label}</p>
					<p class="mt-0.5 text-sm text-muted-foreground">{section.summary}</p>
				</div>
				{#if !section.done}
					<a href={section.settingsPath} class="text-xs text-primary hover:underline">Set up later</a>
				{/if}
			</div>
		{/each}
	</div>

	<div class="pt-4">
		<Button size="lg" class="w-full text-base" onclick={launch}>
			<Rocket class="mr-2 size-5" />
			Launch Your Business
		</Button>
		<p class="mt-3 text-center text-xs text-muted-foreground">
			Opens POS with a quick guided walkthrough
		</p>
	</div>
</div>
