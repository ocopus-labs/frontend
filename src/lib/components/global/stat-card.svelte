<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	interface Props {
		label: string;
		value: string | number;
		subtitle?: string;
		icon?: any;
		iconColor?: string;
		iconBg?: string;
		trend?: { value: number; label?: string };
		class?: string;
	}

	let {
		label,
		value,
		subtitle,
		icon: Icon,
		iconColor = 'text-primary',
		iconBg = 'bg-primary/10',
		trend,
		class: className = ''
	}: Props = $props();
</script>

<Card.Root class="overflow-hidden {className}">
	<Card.Content class="px-4 py-3">
		<div class="flex items-center justify-between gap-3">
			<div class="min-w-0 flex-1">
				<p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
				<p class="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
				{#if subtitle}
					<p class="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
				{/if}
				{#if trend}
					<div class="mt-1.5 flex items-center gap-1">
						<span class="text-xs font-medium {trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
							{trend.value >= 0 ? '+' : ''}{trend.value}%
						</span>
						{#if trend.label}
							<span class="text-xs text-muted-foreground">{trend.label}</span>
						{/if}
					</div>
				{/if}
			</div>
			{#if Icon}
				<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md {iconBg}">
					<Icon class="h-3.5 w-3.5 {iconColor}" />
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
