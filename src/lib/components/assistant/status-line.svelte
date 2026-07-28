<script lang="ts" module>
	/**
	 * What the assistant is doing right now, in words.
	 *
	 * A spinner alone is the same signal whether the model is thinking, halfway
	 * through reading orders, or stuck — and a tool-calling turn can take a
	 * dozen seconds across several steps. Naming the step is what makes a long
	 * wait legible instead of suspicious.
	 */
	export interface StatusLineProps {
		/** Parts of the assistant message currently being produced. */
		parts: { type: string; toolName?: string; state?: string }[];
		status: 'submitted' | 'streaming' | 'ready' | 'error';
	}

	interface Step {
		key: string;
		label: string;
		done: boolean;
		failed: boolean;
	}

	/**
	 * `list-orders` → "Reading orders". Derived from the verb prefix rather than
	 * a lookup table: there are 204 tools and any table would be stale within a
	 * release. Unmapped verbs fall back to the name with hyphens removed, which
	 * reads acceptably ("reconcile payments") and never lies.
	 */
	const VERBS: Record<string, string> = {
		list: 'Reading',
		get: 'Reading',
		search: 'Searching',
		find: 'Searching',
		view: 'Reading',
		check: 'Checking',
		validate: 'Checking',
		detect: 'Checking',
		calculate: 'Calculating',
		estimate: 'Estimating',
		preview: 'Previewing',
		export: 'Exporting',
		download: 'Exporting',
		create: 'Creating',
		add: 'Adding',
		update: 'Updating',
		set: 'Updating',
		adjust: 'Adjusting',
		delete: 'Deleting',
		remove: 'Removing',
		cancel: 'Cancelling',
		close: 'Closing',
		send: 'Sending',
		mark: 'Updating',
		assign: 'Assigning',
		record: 'Recording',
		generate: 'Generating',
		redeem: 'Redeeming',
		process: 'Processing',
		approve: 'Approving',
		complete: 'Completing',
		seat: 'Seating',
		confirm: 'Confirming',
		toggle: 'Updating',
		refresh: 'Refreshing',
		dismiss: 'Dismissing'
	};

	export function humanizeToolName(name: string): string {
		const parts = name.toLowerCase().replace(/_/g, '-').split('-');
		const verb = VERBS[parts[0]];
		if (!verb || parts.length < 2) return name.replace(/[-_]/g, ' ');
		return `${verb} ${parts.slice(1).join(' ')}`;
	}
</script>

<script lang="ts">
	import * as Task from '$lib/components/ai-elements/task/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import AlertIcon from '@lucide/svelte/icons/triangle-alert';
	import PauseIcon from '@lucide/svelte/icons/circle-pause';

	let { parts, status }: StatusLineProps = $props();

	const active = $derived(status === 'submitted' || status === 'streaming');

	const steps = $derived.by((): Step[] =>
		parts
			.filter((p) => p.type.startsWith('tool-') || p.type === 'dynamic-tool')
			.map((p, i) => {
				const name = p.toolName ?? p.type.replace(/^tool-/, '');
				return {
					key: `${name}-${i}`,
					label: humanizeToolName(name),
					done: p.state === 'output-available' || p.state === 'output-denied',
					failed: p.state === 'output-error'
				};
			})
	);

	// The step still running, or the last one if they have all settled. Approval
	// pauses count as running: the turn genuinely has not moved on.
	const current = $derived(steps.find((s) => !s.done && !s.failed) ?? steps[steps.length - 1]);

	const awaitingApproval = $derived(parts.some((p) => p.state === 'approval-requested'));

	const headline = $derived.by(() => {
		if (awaitingApproval) return 'Waiting for your approval';
		if (current) return current.label;
		return status === 'submitted' ? 'Thinking' : 'Writing';
	});
</script>

<!--
	Rendered only while a turn is in flight. Once the answer is there the steps
	are visible in the thread itself as tool cards, and a second summary of the
	same thing is noise.
-->
{#if active || awaitingApproval}
	<div
		class="flex flex-col gap-1 py-1 text-sm text-muted-foreground"
		aria-live="polite"
		aria-atomic="true"
	>
		{#if steps.length > 1}
			<Task.Root open={false}>
				<Task.Trigger title={`${headline}…`} />
				<Task.Content>
					{#each steps as step (step.key)}
						<Task.Item>
							<span class="flex items-center gap-2">
								{#if step.failed}
									<AlertIcon class="size-3.5 text-destructive" aria-hidden="true" />
								{:else if step.done}
									<CheckIcon class="size-3.5 text-success-text" aria-hidden="true" />
								{:else if awaitingApproval}
									<PauseIcon class="size-3.5 text-warning-text" aria-hidden="true" />
								{:else}
									<Spinner class="size-3.5" />
								{/if}
								<span>{step.label}</span>
							</span>
						</Task.Item>
					{/each}
				</Task.Content>
			</Task.Root>
		{:else}
			<span class="flex items-center gap-2">
				{#if awaitingApproval}
					<PauseIcon class="size-3.5 text-warning-text" aria-hidden="true" />
				{:else}
					<Spinner class="size-3.5" />
				{/if}
				<span>{headline}…</span>
			</span>
		{/if}
	</div>
{/if}
