<script lang="ts" module>
	export type KpiAccent =
		| 'primary'
		| 'chart-1'
		| 'chart-2'
		| 'chart-3'
		| 'chart-4'
		| 'chart-5'
		| 'chart-6'
		| 'chart-7'
		| 'chart-8'
		| 'success'
		| 'warning'
		| 'destructive'
		| 'muted';

	// Literal class strings (Tailwind scans these — no dynamic interpolation).
	const accentChip: Record<KpiAccent, string> = {
		primary: 'bg-primary/10 text-primary',
		'chart-1': 'bg-chart-1/10 text-chart-1',
		'chart-2': 'bg-chart-2/10 text-chart-2',
		'chart-3': 'bg-chart-3/10 text-chart-3',
		'chart-4': 'bg-chart-4/10 text-chart-4',
		'chart-5': 'bg-chart-5/10 text-chart-5',
		'chart-6': 'bg-chart-6/10 text-chart-6',
		'chart-7': 'bg-chart-7/10 text-chart-7',
		'chart-8': 'bg-chart-8/10 text-chart-8',
		success: 'bg-success/10 text-success',
		warning: 'bg-warning/10 text-warning',
		destructive: 'bg-destructive/10 text-destructive',
		muted: 'bg-muted text-muted-foreground'
	};

	const accentText: Record<KpiAccent, string> = {
		primary: 'text-primary',
		'chart-1': 'text-chart-1',
		'chart-2': 'text-chart-2',
		'chart-3': 'text-chart-3',
		'chart-4': 'text-chart-4',
		'chart-5': 'text-chart-5',
		'chart-6': 'text-chart-6',
		'chart-7': 'text-chart-7',
		'chart-8': 'text-chart-8',
		success: 'text-success',
		warning: 'text-warning',
		destructive: 'text-destructive',
		muted: 'text-foreground'
	};
</script>

<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { TrendBadge } from '$lib/components/data-display';
	import { cn } from '$lib/utils.js';

	interface Props {
		/** Metric name — rendered as an uppercase eyebrow label. */
		label: string;
		value: string | number;
		/** Period-over-period change as a signed percentage. Omit or 0 to hide the trend. */
		change?: number;
		/** Small muted caption shown next to / instead of the trend (e.g. "vs last period"). */
		description?: string;
		/** Icon component (lucide/tabler). Rendered in an accent-tinted chip. */
		icon?: any;
		/** Accent drives the icon chip and (optionally) the value color. */
		accent?: KpiAccent;
		/** Tint the big value with the accent color. Off by default (tight/neutral look). */
		emphasize?: boolean;
		/** 14-ish point series for the faint background sparkline. */
		sparkline?: number[];
		/** Drill-down link — turns the whole card into an anchor with hover affordance. */
		href?: string;
		/** For metrics where down is good (cancellation rate, refunds): flips trend colors. */
		invertTrend?: boolean;
		class?: string;
	}

	let {
		label,
		value,
		change,
		description,
		icon: Icon,
		accent = 'muted',
		emphasize = false,
		sparkline,
		href,
		invertTrend = false,
		class: className = ''
	}: Props = $props();

	const hasTrend = $derived(change !== undefined && change !== 0);

	function buildSparklinePath(data: number[], width: number, height: number): string {
		if (!data || data.length < 2) return '';
		const max = Math.max(...data);
		const min = Math.min(...data);
		const range = max - min || 1;
		const step = width / (data.length - 1);
		const padding = 2;
		const usableHeight = height - padding * 2;
		return data
			.map((v, i) => {
				const x = i * step;
				const y = padding + usableHeight - ((v - min) / range) * usableHeight;
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	}

	const sparklinePath = $derived(sparkline ? buildSparklinePath(sparkline, 120, 40) : '');
	// Up = good unless inverted; color the sparkline with the same semantics as the trend.
	const sparkColor = $derived(
		(change ?? 0) >= 0
			? invertTrend
				? 'text-destructive'
				: 'text-success'
			: invertTrend
				? 'text-success'
				: 'text-destructive'
	);
</script>

{#snippet body()}
	<Card.Root
		class={cn(
			'relative gap-0 overflow-hidden',
			href && 'transition-all group-hover:shadow-md group-hover:ring-primary/40',
			className
		)}
	>
		{#if sparklinePath}
			<svg
				class={cn(
					'pointer-events-none absolute right-0 bottom-0 h-12 w-28 opacity-[0.10]',
					sparkColor
				)}
				viewBox="0 0 120 40"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path
					d={sparklinePath}
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{/if}

		<div class="flex flex-col px-4">
			<div class="flex items-start justify-between gap-2">
				<span
					class="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase"
					title={label}
				>
					{label}
				</span>
				{#if Icon}
					<span
						class={cn(
							'flex size-8 shrink-0 items-center justify-center rounded-lg',
							accentChip[accent]
						)}
					>
						<Icon class="size-4" />
					</span>
				{/if}
			</div>

			<div
				class={cn(
					'text-2xl leading-none font-semibold tabular-nums',
					emphasize && accentText[accent]
				)}
			>
				{value}
			</div>

			<div class="flex min-h-5 items-center gap-2">
				{#if hasTrend}
					<TrendBadge
						value={change as number}
						changePercent={change as number}
						format="percent"
						size="sm"
						invertColors={invertTrend}
					/>
				{/if}
				{#if description}
					<span class="truncate text-xs text-muted-foreground">{description}</span>
				{/if}
			</div>
		</div>
	</Card.Root>
{/snippet}

{#if href}
	<a {href} class="group block rounded-lg no-underline">
		{@render body()}
	</a>
{:else}
	{@render body()}
{/if}
