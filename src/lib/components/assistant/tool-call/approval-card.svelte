<script lang="ts" module>
	import type { ConsequenceData, ToolApproval } from '$lib/api/agent';

	export interface ApprovalCardProps {
		approval: ToolApproval;
		/** Server-written summary of what running this will do. */
		consequence?: ConsequenceData;
		/** Fallback when no consequence arrived — the humanised tool name. */
		toolLabel: string;
		/** Answered already; the card states the outcome instead of asking. */
		answered?: boolean;
		busy?: boolean;
		onAnswer: (id: string, approved: boolean) => void;
	}
</script>

<script lang="ts">
	/**
	 * The pause before something changes.
	 *
	 * Two decisions carry this component, both from UI audit §2.3:
	 *
	 *  1. **Reject is the visually primary action.** The default on a dialog
	 *     that changes live data should be the one that changes nothing. An
	 *     operator clicking through a stream of approvals — which is what
	 *     happens on a busy shift — lands on the safe answer, and approving is
	 *     the act that requires aim.
	 *  2. **The consequence is in the button.** "Approve" is a word about the
	 *     dialog; "Cancel order ORD-1043" is a word about the business. The
	 *     label is what someone reads when they have already stopped reading
	 *     the paragraph.
	 */
	import { Button } from '$lib/components/ui/button/index.js';
	import AlertIcon from '@lucide/svelte/icons/triangle-alert';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';

	let {
		approval,
		consequence,
		toolLabel,
		answered = false,
		busy = false,
		onAnswer
	}: ApprovalCardProps = $props();

	const text = $derived(consequence?.text ?? `Run ${toolLabel}`);
	const severe = $derived(consequence?.severity === 'high');

	/**
	 * The action, short enough to sit in a button.
	 *
	 * A consequence can run to a clause and a half ("…— messages cannot be
	 * recalled"); the button takes the part before the dash, and the paragraph
	 * above keeps the rest.
	 */
	const shortAction = $derived.by(() => {
		const head = text.split(' — ')[0].trim();
		return head.length > 42 ? 'Approve' : head;
	});
</script>

{#if answered}
	<p class="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
		{#if approval.approved}
			<CheckIcon class="size-4 shrink-0 text-success-text" aria-hidden="true" />
			Approved — {text.charAt(0).toLowerCase() + text.slice(1)}.
		{:else}
			<XIcon class="size-4 shrink-0" aria-hidden="true" />
			Rejected. Nothing was changed.
		{/if}
	</p>
{:else}
	<div
		class={severe
			? 'rounded-md border border-destructive/30 bg-destructive/5 p-3'
			: 'rounded-md border border-warning/30 bg-warning/5 p-3'}
	>
		<div class="flex gap-2">
			<AlertIcon
				class={severe
					? 'mt-0.5 size-4 shrink-0 text-destructive'
					: 'mt-0.5 size-4 shrink-0 text-warning-text'}
				aria-hidden="true"
			/>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-medium">{text}</p>
				<p class="mt-0.5 text-xs text-muted-foreground">
					This changes live business data and cannot be undone from here.
				</p>

				<div class="mt-3 flex flex-wrap gap-2">
					<!--
						Reject first in the DOM as well as in emphasis, so it is also
						the first thing reached by keyboard.
					-->
					<Button
						variant="default"
						size="sm"
						disabled={busy}
						onclick={() => onAnswer(approval.id, false)}
					>
						Don't do it
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={busy}
						onclick={() => onAnswer(approval.id, true)}
					>
						{shortAction}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
