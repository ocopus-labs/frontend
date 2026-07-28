<script lang="ts">
	import { getMySubscription, getSubscriptionUsage } from '$lib/api/subscription';
	import type { Subscription } from '$lib/api/subscription';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import X from '@lucide/svelte/icons/x';

	let warnings = $state<
		{ id: string; level: 'warning' | 'critical'; message: string; cta?: string; href: string }[]
	>([]);
	let dismissed = $state<Set<string>>(new Set());

	const DISMISSED_KEY = 'dismissed-sub-warnings';

	function loadDismissed(): Set<string> {
		try {
			const raw = localStorage.getItem(DISMISSED_KEY);
			if (raw) return new Set(JSON.parse(raw));
		} catch {
			/* ignore */
		}
		return new Set();
	}

	function dismiss(id: string) {
		dismissed = new Set([...dismissed, id]);
		try {
			localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
		} catch {
			/* ignore */
		}
	}

	const visibleWarnings = $derived(warnings.filter((w) => !dismissed.has(w.id)));

	$effect(() => {
		let cancelled = false;
		dismissed = loadDismissed();

		Promise.all([
			getMySubscription().catch(() => ({ subscription: null as Subscription | null })),
			getSubscriptionUsage().catch(() => ({ usage: null }))
		]).then(([subResult, usageResult]) => {
			if (cancelled) return;

			const result: typeof warnings = [];
			const sub = subResult.subscription;
			const usage = usageResult.usage as any;

			// Past due / payment failed
			if (sub?.status === 'past_due') {
				result.push({
					id: 'past-due',
					level: 'critical',
					message: 'Payment failed. Update your payment method to avoid service interruption.',
					cta: 'Update Payment',
					href: '/dashboard/billing'
				});
			}

			// Cancellation pending
			if (sub && (sub as any).cancelAtPeriodEnd) {
				result.push({
					id: 'cancel-pending',
					level: 'warning',
					message: `Your plan is set to cancel at the end of the billing period.`,
					cta: 'Reactivate',
					href: '/dashboard/billing'
				});
			}

			// Usage thresholds
			if (usage && usage.orderLimit > 0) {
				const pct = (usage.ordersThisMonth / usage.orderLimit) * 100;
				if (pct >= 95) {
					result.push({
						id: 'orders-95',
						level: 'critical',
						message: `You've used ${usage.ordersThisMonth} of ${usage.orderLimit} orders this month. Upgrade to avoid hitting the limit.`,
						cta: 'Upgrade',
						href: '/dashboard/billing'
					});
				} else if (pct >= 80) {
					result.push({
						id: 'orders-80',
						level: 'warning',
						message: `You've used ${usage.ordersThisMonth} of ${usage.orderLimit} orders this month.`,
						cta: 'Upgrade',
						href: '/dashboard/billing'
					});
				}
			}

			if (usage && usage.teamMemberLimit > 0) {
				const pct = (usage.teamMembersCount / usage.teamMemberLimit) * 100;
				if (pct >= 95) {
					result.push({
						id: 'team-95',
						level: 'critical',
						message: `You've used ${usage.teamMembersCount} of ${usage.teamMemberLimit} team member slots.`,
						cta: 'Upgrade',
						href: '/dashboard/billing'
					});
				} else if (pct >= 80) {
					result.push({
						id: 'team-80',
						level: 'warning',
						message: `You've used ${usage.teamMembersCount} of ${usage.teamMemberLimit} team member slots.`,
						cta: 'Upgrade',
						href: '/dashboard/billing'
					});
				}
			}

			warnings = result;
		});

		return () => {
			cancelled = true;
		};
	});
</script>

{#if visibleWarnings.length > 0}
	<div class="space-y-0" aria-live="polite">
		{#each visibleWarnings as warning (warning.id)}
			{@const isCritical = warning.level === 'critical'}
			<div
				class="flex items-center gap-3 border-b px-4 py-2.5 text-sm {isCritical
					? 'border-destructive/30 bg-destructive/10 text-destructive'
					: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'}"
				role="alert"
			>
				{#if isCritical}
					<AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
				{:else}
					<AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
				{/if}
				<span class="flex-1">{warning.message}</span>
				{#if warning.cta}
					<a
						href={warning.href}
						class="shrink-0 rounded-md px-3 py-1 text-xs font-medium {isCritical
							? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
							: 'bg-yellow-600 text-white hover:bg-yellow-700'}"
					>
						{warning.cta}
					</a>
				{/if}
				<button
					onclick={() => dismiss(warning.id)}
					class="shrink-0 rounded-sm p-0.5 opacity-70 transition-opacity hover:opacity-100"
					aria-label="Dismiss"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		{/each}
	</div>
{/if}
