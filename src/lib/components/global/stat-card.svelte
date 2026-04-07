<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	interface Props {
		label: string;
		value: string | number;
		subtitle?: string;
		trend?: { value: number; label?: string };
		class?: string;
	}

	let {
		label,
		value,
		subtitle,
		trend,
		class: className = ''
	}: Props = $props();
</script>

<Card.Root class="{className}">
	<Card.Content class="px-5 py-4">
		<p class="text-sm text-muted-foreground">{label}</p>
		<p class="mt-1 text-2xl font-bold tabular-nums">{value}</p>
		{#if trend}
			<div class="mt-2 flex items-center gap-1.5">
				<span class="inline-flex h-4 w-4 items-center justify-center rounded-full {trend.value >= 0 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}">
					<span class="text-[9px] font-bold {trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
						{trend.value >= 0 ? '↑' : '↓'}
					</span>
				</span>
				<span class="text-xs font-medium {trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
					{trend.value >= 0 ? '+' : ''}{trend.value}%
				</span>
				{#if trend.label}
					<span class="text-xs text-muted-foreground">{trend.label}</span>
				{/if}
			</div>
		{:else if subtitle}
			<p class="mt-2 text-xs text-muted-foreground">{subtitle}</p>
		{/if}
	</Card.Content>
</Card.Root>
