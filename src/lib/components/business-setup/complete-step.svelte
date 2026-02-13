<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		IconCheck,
		IconSparkles,
		IconStorm,
		IconUsers,
		IconCreditCard,
		IconClock
	} from '@tabler/icons-svelte';

	let {
		onComplete = () => {}
	}: {
		onComplete: () => void;
	} = $props();
</script>

<div class="space-y-8">
	<div class="text-center">
		<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10" aria-hidden="true">
			<IconSparkles class="h-8 w-8 text-primary" />
		</div>
		<h1 class="step-heading mt-4 text-3xl font-bold" tabindex="-1">You're all set!</h1>
		<p class="mt-2 text-muted-foreground">Your business is ready to start accepting orders</p>
	</div>

	<div class="space-y-4">
		<div class="rounded-lg border p-4">
			<div class="flex items-start gap-3">
				<div class="rounded-full bg-emerald-100 p-1 dark:bg-emerald-900" aria-hidden="true">
					<IconCheck class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<IconStorm class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
						<h3 class="font-semibold">Business Profile</h3>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">
						Business details and first location created
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border p-4">
			<div class="flex items-start gap-3">
				<div class="rounded-full bg-emerald-100 p-1 dark:bg-emerald-900" aria-hidden="true">
					<IconCheck class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<IconUsers class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
						<h3 class="font-semibold">Team Setup</h3>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">
						Team members invited and roles configured
					</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border p-4">
			<div class="flex items-start gap-3">
				<div class="rounded-full bg-emerald-100 p-1 dark:bg-emerald-900" aria-hidden="true">
					<IconCheck class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<IconCreditCard class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
						<h3 class="font-semibold">Payment Methods</h3>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">Payment options configured and ready</p>
				</div>
			</div>
		</div>

		<div class="rounded-lg border p-4">
			<div class="flex items-start gap-3">
				<div class="rounded-full bg-emerald-100 p-1 dark:bg-emerald-900" aria-hidden="true">
					<IconCheck class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<IconClock class="h-5 w-5 text-muted-foreground" aria-hidden="true" />
						<h3 class="font-semibold">Business Hours</h3>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">Operating hours set for your location</p>
				</div>
			</div>
		</div>
	</div>

	<div class="space-y-4 border-t pt-6">
		<h3 class="font-semibold">What's Next?</h3>
		<ul aria-label="Recommended next steps" class="space-y-3 text-sm text-muted-foreground">
			<li>Add your menu items and products</li>
			<li>Configure tax rates and discounts</li>
			<li>Set up your hardware (printers, card readers)</li>
			<li>Test your first transaction</li>
		</ul>
	</div>

	<div class="flex justify-center pt-4">
		<Button size="lg" onclick={onComplete} class="min-w-[200px]">Go to Dashboard</Button>
	</div>
</div>
