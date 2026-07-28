<script lang="ts" module>
	import type { Chat } from '@ai-sdk/svelte';

	export interface AgentThreadProps {
		/** The bound conversation. One per session; see `agent.chatFor`. */
		chat: Chat;
		/** Compact tightens spacing for the floating panel. */
		compact?: boolean;
		/** Rendered above the composer when the thread is empty. */
		empty?: Snippet;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Conversation from '$lib/components/ai-elements/conversation/index.js';
	import { Response } from '$lib/components/ai-elements/response/index.js';
	import * as Reasoning from '$lib/components/ai-elements/reasoning/index.js';
	import { Shimmer } from '@shimmer-from-structure/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import ToolCall from './tool-call/tool-call.svelte';
	import ResultSources from './tool-call/result-sources.svelte';
	import MessageActions from './message-actions.svelte';
	import MessageEditor from './message-editor.svelte';
	import type { ConsequenceData, ToolPart } from '$lib/api/agent';
	import Composer from './composer.svelte';
	import StatusLine from './status-line.svelte';
	import AgentError from './agent-error.svelte';
	import { agentErrorCopy, agentErrorFrom } from './agent-errors';
	import { agent, ASSISTANT_NAME } from '$lib/stores/agent.svelte';
	import { cn } from '$lib/utils.js';

	let { chat, compact = false, empty }: AgentThreadProps = $props();

	/**
	 * One centred column for every row of the thread.
	 *
	 * The pane runs the full width of the window on a desktop. Left-aligned
	 * answers and right-aligned questions were landing the better part of a
	 * metre apart, which reads as two unrelated columns rather than one
	 * conversation. Applied per row rather than to the scroll container so the
	 * scrollbar stays at the edge of the pane where it belongs.
	 */
	const COLUMN = 'mx-auto w-full max-w-3xl';

	const readiness = $derived(agent.readiness);
	const busy = $derived(chat.status === 'submitted' || chat.status === 'streaming');
	// The composer is shimmered rather than withheld while readiness resolves.
	// Rendering nothing and then dropping a 90px control into place moves the
	// whole thread the moment the operator starts reading it (UI audit §3.3).
	const checking = $derived(readiness.state === 'unknown' || readiness.state === 'checking');

	/** Parts of the turn in flight, for the status line. Empty when idle. */
	const liveParts = $derived.by(() => {
		const last = chat.messages[chat.messages.length - 1];
		if (!last || last.role !== 'assistant') return [];
		return last.parts as { type: string; toolName?: string; state?: string }[];
	});

	function handleSend(text: string) {
		void chat.sendMessage({ text });
	}

	function handleStop() {
		if (chat.status === 'streaming') void chat.stop();
	}

	/**
	 * Retry after a failed turn.
	 *
	 * Since B4 the transport distinguishes a regeneration from a send, so this
	 * is safe whichever role the trailing message has: a trailing user turn is
	 * re-asked, and a trailing assistant turn is superseded and re-answered
	 * rather than being posted back as an approval continuation. It is still
	 * refused mid-stream, where there is nothing to retry yet.
	 */
	const canRetry = $derived(chat.messages.length > 0 && !busy);

	function handleRetry() {
		const last = chat.messages[chat.messages.length - 1];
		if (!canRetry || !last) return;
		void agent.regenerate(chat.id, last.id);
	}

	/** Plain text of a turn, for the copy button and the inline editor. */
	function textOf(parts: readonly { type: string }[]): string {
		return parts
			.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
			.map((p) => p.text)
			.join('\n\n')
			.trim();
	}

	function handleEditSubmit(messageId: string, text: string) {
		void agent.editAndResend(chat.id, messageId, text);
	}

	function handleApprove(id: string, approved: boolean) {
		void chat.addToolApprovalResponse({ id, approved });
	}

	/** The turn at the end of the thread — the only one that can be streaming. */
	function isLast(messageId: string): boolean {
		return chat.messages[chat.messages.length - 1]?.id === messageId;
	}

	/** Tool parts cover both the typed (`tool-*`) and MCP-discovered shapes. */
	function isToolPart(part: { type: string }): boolean {
		return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
	}

	/**
	 * Consequences, indexed by the call they describe.
	 *
	 * They travel as their own parts rather than on the approval, because the
	 * SDK's approval-request chunk has no free-text field. Building the index
	 * once per message is what keeps the approval card from scanning the whole
	 * parts array for every gated call in a multi-step turn.
	 */
	function consequenceIndex(parts: readonly { type: string }[]): Record<string, ConsequenceData> {
		// A plain object, not a Map: it is rebuilt from `parts` on every render
		// and never mutated afterwards, so there is nothing for a reactive
		// collection to track.
		const index: Record<string, ConsequenceData> = {};
		for (const part of parts) {
			if (part.type !== 'data-consequence') continue;
			const data = (part as { data?: ConsequenceData }).data;
			if (data?.toolCallId) index[data.toolCallId] = data;
		}
		return index;
	}

	/**
	 * Tool calls that actually produced something, for the sources strip.
	 *
	 * A rejected or failed call is not a source for anything the answer says,
	 * and listing it would offer the operator a citation that leads to an
	 * error message.
	 */
	function sourceCalls(parts: readonly { type: string }[]): ToolPart[] {
		return parts
			.filter(isToolPart)
			.map((part) => part as unknown as ToolPart)
			.filter((part) => part.state === 'output-available');
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	{#if readiness.state === 'blocked'}
		<div class="p-4">
			<AgentError
				copy={agentErrorCopy(readiness.code, readiness.message)}
				onRetry={() => void agent.checkReadiness()}
			/>
		</div>
	{:else}
		<Conversation.Root class="min-h-0 flex-1">
			<!--
				`gap-*`, not `space-y-*`: the content div is a flex column with its
				own `gap-8`, and tailwind-merge only collapses like with like — a
				`space-y` class left both in play and spaced every turn three rems
				apart.
			-->
			<Conversation.Content class={compact ? 'gap-3 p-3' : 'gap-5 p-4'}>
				{#if chat.messages.length === 0 && empty}
					<!--
						`m-auto`, so the greeting sits in the middle of an empty thread.
						As a plain first child it clung to the top of a 900px-tall pane
						with the whole conversation area blank beneath it.
					-->
					<div class="m-auto">
						{@render empty()}
					</div>
				{/if}

				<!--
					A long thread arrives as its newest page. Without this the rest
					was unreachable: the server returned `prevCursor` and nothing
					read it, so a 200-message conversation silently became its last
					50 with no sign the earlier ones existed.
				-->
				{#if agent.hasOlderMessages(chat.id)}
					<div class={cn(COLUMN, 'flex justify-center')}>
						<Button
							variant="ghost"
							size="sm"
							disabled={agent.loadingOlder === chat.id || busy}
							onclick={() => void agent.loadOlderMessages(chat.id)}
						>
							{#if agent.loadingOlder === chat.id}
								<Spinner class="size-3.5" />
								Loading earlier messages…
							{:else}
								Load earlier messages
							{/if}
						</Button>
					</div>
				{/if}

				{#each chat.messages as message (message.id)}
					{@const consequences = consequenceIndex(message.parts)}
					{@const editing = agent.editingMessageId === message.id}
					<!--
						`group/message` is what the hover-revealed action row keys off.
						Named rather than bare so a nested `group` inside a tool result
						cannot capture the hover and light up the wrong message's buttons.
					-->
					<div
						class={cn(
							'group/message',
							COLUMN,
							message.role === 'user' && 'flex flex-col items-end'
						)}
					>
						{#if editing}
							<!--
								Full width while editing regardless of role: a rewrite needs
								room, and the 85% bubble width makes a three-line question
								scroll inside a box the size of a tooltip.
							-->
							<div class="w-full max-w-[68ch] self-end">
								<MessageEditor
									initial={textOf(message.parts)}
									onSubmit={(text) => handleEditSubmit(message.id, text)}
									onCancel={() => (agent.editingMessageId = null)}
								/>
							</div>
						{:else}
							<!--
								The assistant block takes the whole column, and the 68ch
								reading measure is applied to the prose alone (below). Capping
								the block itself also cropped the tool-result cards, so a
								six-column table was squeezed into two thirds of the room
								available to it.
							-->
							<div
								class={message.role === 'user'
									? 'max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground'
									: 'w-full min-w-0'}
							>
								{#each message.parts as part, i (i)}
									{#if part.type === 'text'}
										{#if message.role === 'user'}
											<p class="text-sm whitespace-pre-wrap">{part.text}</p>
										{:else}
											<Response content={part.text} class="max-w-[68ch]" />
										{/if}
									{:else if part.type === 'reasoning'}
										<!--
											Only the turn actually being written is streaming.
											Passed for every message, each completed turn in the
											thread flipped back to "Thinking…" the moment a new
											answer started — a thread that looked stuck in six
											places at once.
										-->
										<Reasoning.Root isStreaming={chat.status === 'streaming' && isLast(message.id)}>
											<Reasoning.Trigger />
											<Reasoning.Content content={part.text} />
										</Reasoning.Root>
									{:else if isToolPart(part)}
										{@const tool = part as unknown as ToolPart}
										<ToolCall
											part={tool}
											consequence={consequences[tool.toolCallId]}
											onApprove={handleApprove}
											{busy}
										/>
									{/if}
								{/each}

								<!--
								Only once the turn has settled. A strip that appears
								mid-stream, then grows as each further tool call lands,
								moves the text the operator is reading.
							-->
								{#if message.role === 'assistant' && !busy}
									<ResultSources calls={sourceCalls(message.parts)} />
								{/if}
							</div>

							<!--
								Withheld while a turn is streaming. Half the actions mutate
								the thread, and the last message is still being written into
								the array they would truncate.
							-->
							{#if !busy}
								<MessageActions
									messageId={message.id}
									role={message.role === 'user' ? 'user' : 'assistant'}
									text={textOf(message.parts)}
									sessionId={chat.id}
									{busy}
									onEdit={message.role === 'user'
										? (id) => (agent.editingMessageId = id)
										: undefined}
								/>
							{/if}
						{/if}
					</div>
				{/each}

				{#if chat.error}
					<AgentError
						copy={agentErrorFrom(chat.error)}
						onRetry={canRetry ? handleRetry : undefined}
					/>
				{/if}
			</Conversation.Content>
			<Conversation.ScrollButton />
		</Conversation.Root>

		<div class={compact ? 'border-t border-border p-2' : 'border-t border-border p-4'}>
			<Shimmer loading={checking} class="rounded-xl">
				<Composer
					onSend={handleSend}
					status={chat.status}
					onStop={handleStop}
					placeholder={`Ask ${ASSISTANT_NAME}…`}
					{compact}
				>
					{#snippet above()}
						<StatusLine parts={liveParts} status={chat.status} />
					{/snippet}
				</Composer>
			</Shimmer>
		</div>
	{/if}
</div>
