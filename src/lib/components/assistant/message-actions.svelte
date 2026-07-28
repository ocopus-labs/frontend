<script lang="ts" module>
	export interface MessageActionsProps {
		/** The turn these actions belong to. */
		messageId: string;
		role: 'user' | 'assistant';
		/** Plain text of the turn, for copy. Empty disables the copy button. */
		text: string;
		/** The thread, needed to regenerate or branch. */
		sessionId: string;
		/** True while a turn is streaming — every action that mutates is refused. */
		busy?: boolean;
		/** Opens the inline editor on a user turn. */
		onEdit?: (messageId: string) => void;
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { agent } from '$lib/stores/agent.svelte';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	import RegenerateIcon from '@lucide/svelte/icons/refresh-cw';
	import BranchIcon from '@lucide/svelte/icons/git-branch';
	import ThumbsUpIcon from '@lucide/svelte/icons/thumbs-up';
	import ThumbsDownIcon from '@lucide/svelte/icons/thumbs-down';
	import PencilIcon from '@lucide/svelte/icons/pencil';

	let { messageId, role, text, sessionId, busy = false, onEdit }: MessageActionsProps = $props();

	/**
	 * Reverts to the copy icon on its own.
	 *
	 * A tick that stays forever stops meaning "copied just now" and starts
	 * meaning nothing at all — and on a long thread every message would end up
	 * ticked.
	 */
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | undefined;

	const rating = $derived(agent.messageFeedback[messageId]);
	const usage = $derived(agent.messageUsage[messageId]);
	const isAssistant = $derived(role === 'assistant');

	async function handleCopy() {
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1600);
		} catch {
			// Clipboard access is denied in insecure contexts and by some
			// policies. Failing silently is right here: the operator can still
			// select the text, and an error banner over a copy button would be
			// louder than the problem.
		}
	}

	function handleRegenerate() {
		void agent.regenerate(sessionId, messageId);
	}

	async function handleBranch() {
		const session = await agent.branch(sessionId, messageId);
		if (!session) return;
		// The fork is a different conversation; landing on it is what makes that
		// obvious. Built from the current route so it works from the panel too.
		await goto(`/${page.params.business}/${page.params.slug}/assistant/${session.id}`);
	}

	function handleRate(next: 'up' | 'down') {
		void agent.rateMessage(messageId, next);
	}

	/** Token counts, once the turn has settled. Never shown mid-stream. */
	const usageLabel = $derived(
		usage
			? `${(usage.promptTokens + usage.completionTokens).toLocaleString()} tokens · ` +
					`${(usage.latencyMs / 1000).toFixed(1)}s · ${usage.modelId}`
			: null
	);
</script>

<!--
	Revealed on hover and on keyboard focus, not permanently visible: five
	controls under every message turns a thread into a wall of buttons. The
	`focus-within` half is what keeps them reachable without a mouse — opacity
	alone would hide them from a keyboard user entirely.
-->
<div
	class={cn(
		'mt-1 flex items-center gap-0.5 opacity-0 transition-opacity',
		'group-hover/message:opacity-100 focus-within:opacity-100',
		role === 'user' && 'justify-end'
	)}
>
	<Button
		variant="ghost"
		size="icon-sm"
		onclick={handleCopy}
		disabled={!text}
		aria-label={copied ? 'Copied' : 'Copy message'}
		title={copied ? 'Copied' : 'Copy message'}
	>
		{#if copied}
			<CheckIcon class="size-3.5 text-success" />
		{:else}
			<CopyIcon class="size-3.5" />
		{/if}
	</Button>

	{#if isAssistant}
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={handleRegenerate}
			disabled={busy}
			aria-label="Regenerate this answer"
			title="Regenerate this answer"
		>
			<RegenerateIcon class="size-3.5" />
		</Button>

		<Button
			variant="ghost"
			size="icon-sm"
			onclick={handleBranch}
			disabled={busy}
			aria-label="Branch the conversation here"
			title="Branch the conversation here"
		>
			<BranchIcon class="size-3.5" />
		</Button>

		<Button
			variant="ghost"
			size="icon-sm"
			onclick={() => handleRate('up')}
			aria-label="Good answer"
			aria-pressed={rating === 'up'}
			title="Good answer"
		>
			<ThumbsUpIcon class={cn('size-3.5', rating === 'up' && 'text-success')} />
		</Button>

		<Button
			variant="ghost"
			size="icon-sm"
			onclick={() => handleRate('down')}
			aria-label="Bad answer"
			aria-pressed={rating === 'down'}
			title="Bad answer"
		>
			<ThumbsDownIcon class={cn('size-3.5', rating === 'down' && 'text-destructive')} />
		</Button>

		{#if usageLabel}
			<!--
				Cost is deliberately absent. The backend has no per-model prices,
				so every amount it could report would be zero — see the contract's
				§5 note. Tokens are the number that is actually measured.
			-->
			<span class="ml-1 truncate text-xs text-muted-foreground" title={usageLabel}>
				{usageLabel}
			</span>
		{/if}
	{:else}
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={() => onEdit?.(messageId)}
			disabled={busy || !onEdit}
			aria-label="Edit and resend"
			title="Edit and resend"
		>
			<PencilIcon class="size-3.5" />
		</Button>
	{/if}
</div>
