<script lang="ts" module>
	import type { Component } from 'svelte';

	export type TimelineItem = {
		id: string;
		title: string;
		description?: string;
		timestamp: Date | string;
		icon?: Component;
		iconColor?: 'primary' | 'success' | 'warning' | 'destructive' | 'muted';
		avatar?: {
			src?: string;
			fallback: string;
		};
		status?: 'completed' | 'current' | 'pending';
		meta?: string;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import * as Avatar from '$lib/components/ui/avatar';
	import CircleIcon from '@lucide/svelte/icons/circle';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import ClockIcon from '@lucide/svelte/icons/clock';

	type Props = {
		items: TimelineItem[];
		showConnector?: boolean;
		compact?: boolean;
		class?: string;
		itemSlot?: Snippet<[TimelineItem]>;
	};

	let {
		items = [],
		showConnector = true,
		compact = false,
		itemSlot,
		class: className
	}: Props = $props();

	function formatTimestamp(timestamp: Date | string): string {
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getIconColorClass(color?: string): string {
		const colorMap: Record<string, string> = {
			primary: 'text-primary bg-primary/10',
			success: 'text-green-600 bg-green-500/10',
			warning: 'text-yellow-600 bg-yellow-500/10',
			destructive: 'text-destructive bg-destructive/10',
			muted: 'text-muted-foreground bg-muted'
		};
		return colorMap[color ?? 'muted'] ?? colorMap.muted;
	}

	function getStatusIcon(status?: string) {
		switch (status) {
			case 'completed':
				return CheckCircle2Icon;
			case 'current':
				return ClockIcon;
			default:
				return CircleIcon;
		}
	}
</script>

<div class={cn('relative', className)} data-slot="activity-timeline">
	<ul class="space-y-0">
		{#each items as item, index (item.id)}
			{@const isLast = index === items.length - 1}
			{@const StatusIcon = item.icon ?? getStatusIcon(item.status)}

			<li class={cn('relative flex gap-4', compact ? 'pb-4' : 'pb-6', isLast && 'pb-0')}>
				<!-- Connector line -->
				{#if showConnector && !isLast}
					<div
						class="bg-border absolute left-4 top-10 h-full w-px -translate-x-1/2"
						class:top-8={compact}
					></div>
				{/if}

				<!-- Icon or Avatar -->
				<div class="relative z-10 flex-shrink-0">
					{#if item.avatar}
						<Avatar.Root class={cn('border-background border-2', compact ? 'h-6 w-6' : 'h-8 w-8')}>
							{#if item.avatar.src}
								<Avatar.Image src={item.avatar.src} alt={item.avatar.fallback} />
							{/if}
							<Avatar.Fallback class="text-xs">{item.avatar.fallback}</Avatar.Fallback>
						</Avatar.Root>
					{:else}
						<div
							class={cn(
								'flex items-center justify-center rounded-full',
								compact ? 'h-6 w-6' : 'h-8 w-8',
								getIconColorClass(item.iconColor)
							)}
						>
							<StatusIcon class={compact ? 'h-3 w-3' : 'h-4 w-4'} />
						</div>
					{/if}
				</div>

				<!-- Content -->
				<div class="flex-1 min-w-0">
					{#if itemSlot}
						{@render itemSlot(item)}
					{:else}
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<p
									class={cn(
										'font-medium leading-tight',
										compact ? 'text-sm' : 'text-sm',
										item.status === 'pending' && 'text-muted-foreground'
									)}
								>
									{item.title}
								</p>
								{#if item.description}
									<p class="text-muted-foreground mt-0.5 text-sm">{item.description}</p>
								{/if}
							</div>
							<div class="flex flex-shrink-0 items-center gap-2">
								{#if item.meta}
									<span class="text-muted-foreground text-xs">{item.meta}</span>
								{/if}
								<time class="text-muted-foreground whitespace-nowrap text-xs">
									{formatTimestamp(item.timestamp)}
								</time>
							</div>
						</div>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</div>
