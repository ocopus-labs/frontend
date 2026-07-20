<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { goto } from '$app/navigation';
	import type { IncompleteOnboarding } from '$lib/api/onboarding';
	import Rocket from '@lucide/svelte/icons/rocket';
	import X from '@lucide/svelte/icons/x';

	let { businesses = [] }: { businesses?: IncompleteOnboarding[] } = $props();

	const DISMISS_KEY = 'onboarding-banner-dismissed';

	// Dismissal is per business and local to the device on purpose. It is a
	// "not right now", not a decision about the business itself -- the setup is
	// still genuinely unfinished, and the server record stays untouched so
	// support tooling and lifecycle email can still see it.
	let dismissed = $state<string[]>([]);

	if (typeof window !== 'undefined') {
		try {
			dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]');
		} catch {
			dismissed = [];
		}
	}

	function dismiss(id: string) {
		dismissed = [...dismissed, id];
		if (typeof window !== 'undefined') {
			localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
		}
	}

	const visible = $derived(businesses.filter((b) => !dismissed.includes(b.id)));

	// Steps whose completion the wizard records. 'essentials' is implicit --
	// the business row exists, so it is always done by the time we get here.
	const TRACKED = [
		{ key: 'menu', label: 'Menu' },
		{ key: 'tables', label: 'Tables' },
		{ key: 'payment', label: 'Payment & tax' }
	] as const;

	function remainingFor(business: IncompleteOnboarding) {
		const completed = business.state?.completed ?? {};
		return TRACKED.filter((step) => !completed[step.key]);
	}

	function progressFor(business: IncompleteOnboarding) {
		const done = TRACKED.length - remainingFor(business).length;
		// +1 / +1 for the essentials step the user has definitionally finished.
		return Math.round(((done + 1) / (TRACKED.length + 1)) * 100);
	}
</script>

{#each visible as business (business.id)}
	<Card.Root class="border-primary/30 bg-primary/5">
		<Card.Content class="flex flex-col gap-4 sm:flex-row sm:items-center">
			<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<Rocket class="size-5 text-primary" />
			</div>

			<div class="min-w-0 flex-1 space-y-2">
				<div>
					<p class="text-sm font-medium">Finish setting up {business.name}</p>
					<p class="mt-0.5 text-sm text-muted-foreground">
						{#if remainingFor(business).length}
							Still to do: {remainingFor(business)
								.map((s) => s.label)
								.join(', ')}
						{:else}
							Almost there — review and launch.
						{/if}
					</p>
				</div>
				<Progress value={progressFor(business)} class="h-1.5" />
			</div>

			<div class="flex shrink-0 items-center gap-2">
				<Button size="sm" onclick={() => goto('/business/setup')}>Continue setup</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Dismiss setup reminder for {business.name}"
					onclick={() => dismiss(business.id)}
				>
					<X class="size-4" />
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
{/each}
