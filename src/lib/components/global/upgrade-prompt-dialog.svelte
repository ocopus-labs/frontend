<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import CheckIcon from '@lucide/svelte/icons/check';

	let {
		open = $bindable(false),
		featureName = '',
		requiredPlan = 'PRO'
	}: {
		open?: boolean;
		featureName?: string;
		requiredPlan?: 'PRO' | 'ENTERPRISE';
	} = $props();

	const planFeatures: Record<'PRO' | 'ENTERPRISE', string[]> = {
		PRO: [
			'Kitchen Display System',
			'Inventory Management',
			'Expense Tracking',
			'Advanced Analytics',
			'Up to 5 business locations',
			'Up to 15 team members',
			'Unlimited orders'
		],
		ENTERPRISE: [
			'Everything in PRO',
			'API Access',
			'White-label Options',
			'Unlimited locations',
			'Unlimited team members',
			'Priority Support'
		]
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<SparklesIcon class="size-5 text-primary" />
				Upgrade to {requiredPlan}
			</Dialog.Title>
			<Dialog.Description>
				{featureName} is available on the {requiredPlan} plan and above.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<div class="rounded-lg border p-4">
				<div class="flex items-center justify-between mb-3">
					<span class="font-semibold">{requiredPlan} Plan</span>
					<Badge variant={requiredPlan === 'ENTERPRISE' ? 'default' : 'secondary'}>
						{requiredPlan === 'ENTERPRISE' ? 'Best Value' : 'Popular'}
					</Badge>
				</div>
				<ul class="space-y-2">
					{#each planFeatures[requiredPlan] as feature}
						<li class="flex items-center gap-2 text-sm text-muted-foreground">
							<CheckIcon class="size-4 text-primary" />
							{feature}
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button variant="outline" onclick={() => (open = false)} class="w-full sm:w-auto">
				Maybe Later
			</Button>
			<Button href="/dashboard/subscriptions" class="w-full sm:w-auto">
				View Plans
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
