<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { goto } from '$app/navigation';

	import XCircle from '@lucide/svelte/icons/x-circle';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import HelpCircle from '@lucide/svelte/icons/help-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Check from '@lucide/svelte/icons/check';

	const reasons = [
		'Access to premium features like advanced analytics',
		'Unlimited orders and team members',
		'Priority customer support',
		'Kitchen Display System included'
	];

	function goToSubscriptions() {
		goto('/dashboard/subscriptions');
	}

	function tryAgain() {
		goto('/dashboard/subscriptions');
	}

	function contactSupport() {
		window.open('mailto:support@example.com?subject=Subscription%20Help', '_blank');
	}
</script>

<svelte:head>
	<title>Payment Cancelled | POS</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center p-4">
	<div class="w-full max-w-lg">
		<Card.Root class="overflow-hidden">
			<!-- Cancelled Header -->
			<div class="bg-gradient-to-br from-slate-500 to-slate-600 px-6 py-10 text-center text-white">
				<div class="mb-4 flex justify-center">
					<div class="rounded-full bg-white/20 p-4">
						<XCircle class="h-12 w-12" />
					</div>
				</div>
				<h1 class="text-2xl font-bold">Payment Cancelled</h1>
				<p class="mt-2 text-slate-200">No worries, you can try again anytime</p>
			</div>

			<Card.Content class="p-6">
				<div class="space-y-6">
					<!-- Info Message -->
					<div class="rounded-lg border bg-muted/30 p-4 text-center">
						<p class="text-muted-foreground">
							Your payment was cancelled and you have not been charged.
							Your current plan remains unchanged.
						</p>
					</div>

					<Separator />

					<!-- Reasons to Upgrade -->
					<div>
						<h3 class="mb-3 font-semibold">Why upgrade?</h3>
						<ul class="space-y-2">
							{#each reasons as reason}
								<li class="flex items-center gap-2 text-sm">
									<Check class="h-4 w-4 shrink-0 text-green-500" />
									<span>{reason}</span>
								</li>
							{/each}
						</ul>
					</div>

					<Separator />

					<!-- Help Section -->
					<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
						<div class="flex items-start gap-3">
							<HelpCircle class="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
							<div>
								<p class="font-medium text-blue-900 dark:text-blue-100">
									Need help deciding?
								</p>
								<p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
									Our team is here to help you choose the right plan for your business.
									Contact us for a personalized recommendation.
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="mt-6 space-y-3">
					<Button class="w-full" size="lg" onclick={tryAgain}>
						<RefreshCw class="mr-2 h-4 w-4" />
						Try Again
					</Button>

					<div class="grid grid-cols-2 gap-3">
						<Button variant="outline" onclick={goToSubscriptions}>
							<ArrowLeft class="mr-2 h-4 w-4" />
							View Plans
						</Button>
						<Button variant="outline" onclick={contactSupport}>
							<HelpCircle class="mr-2 h-4 w-4" />
							Get Help
						</Button>
					</div>

					<Button variant="ghost" class="w-full" onclick={() => goto('/dashboard')}>
						<CreditCard class="mr-2 h-4 w-4" />
						Continue with Free Plan
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
