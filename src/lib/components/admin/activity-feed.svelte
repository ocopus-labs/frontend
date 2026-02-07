<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import type { ActivityFeedItem } from '$lib/api/admin';

	type Props = {
		activities: ActivityFeedItem[];
		loading?: boolean;
	};

	let { activities = [], loading = false }: Props = $props();

	function formatRelativeTime(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSeconds = Math.floor(diffMs / 1000);
		const diffMins = Math.floor(diffSeconds / 60);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffSeconds < 60) return 'just now';
		if (diffMins < 60) return `${diffMins} min ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
		if (diffDays === 1) return 'yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getActionColor(action: string): string {
		if (action.endsWith('.create') || action.includes('invite')) {
			return 'bg-green-500';
		}
		if (action.endsWith('.update') || action.includes('update') || action.includes('extend') || action.includes('split')) {
			return 'bg-blue-500';
		}
		if (action.endsWith('.delete') || action.endsWith('.cancel') || action.includes('ban') || action.includes('remove')) {
			return 'bg-red-500';
		}
		if (action.endsWith('.refund')) {
			return 'bg-red-500';
		}
		return 'bg-yellow-500';
	}

	function getResourceBadgeVariant(resource: string): 'default' | 'secondary' | 'outline' | 'destructive' {
		switch (resource) {
			case 'business':
				return 'default';
			case 'order':
			case 'payment':
				return 'secondary';
			case 'admin':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

{#if loading}
	<div class="space-y-4">
		{#each Array(5) as _}
			<div class="flex gap-3">
				<div class="flex flex-col items-center">
					<Skeleton class="h-3 w-3 rounded-full" />
					<Skeleton class="mt-1 h-8 w-px" />
				</div>
				<div class="flex-1 space-y-1.5 pb-4">
					<Skeleton class="h-4 w-3/4" />
					<Skeleton class="h-3 w-1/4" />
				</div>
			</div>
		{/each}
	</div>
{:else if activities.length === 0}
	<div class="flex flex-col items-center justify-center py-8 text-center">
		<p class="text-sm text-muted-foreground">No recent activity</p>
		<p class="mt-1 text-xs text-muted-foreground">Platform activity will appear here as it happens</p>
	</div>
{:else}
	<div class="relative max-h-[480px] overflow-y-auto pr-1">
		{#each activities as activity, index (activity.id)}
			{@const isLast = index === activities.length - 1}
			<div class="relative flex gap-3 {isLast ? '' : 'pb-4'}">
				<!-- Timeline connector -->
				<div class="flex flex-col items-center">
					<div class="relative z-10 mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full {getActionColor(activity.action)}"></div>
					{#if !isLast}
						<div class="mt-0.5 w-px flex-1 bg-border"></div>
					{/if}
				</div>

				<!-- Content -->
				<div class="flex-1 min-w-0 pb-1">
					<div class="flex items-start justify-between gap-2">
						<p class="text-sm leading-snug">{activity.description}</p>
						<Badge variant={getResourceBadgeVariant(activity.resource)} class="flex-shrink-0 text-[10px] px-1.5 py-0">
							{activity.resource}
						</Badge>
					</div>
					<div class="mt-0.5 flex items-center gap-2">
						<time class="text-xs text-muted-foreground">
							{formatRelativeTime(activity.timestamp)}
						</time>
						{#if activity.businessName}
							<span class="text-xs text-muted-foreground">
								&middot; {activity.businessName}
							</span>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
