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
	import type { ConsequenceData, ToolPart } from '$lib/api/agent';
	import Composer from './composer.svelte';
	import StatusLine from './status-line.svelte';
	import AgentError from './agent-error.svelte';
	import { agentErrorCopy, agentErrorFrom } from './agent-errors';
	import { agent, ASSISTANT_NAME } from '$lib/stores/agent.svelte';

	let { chat, compact = false, empty }: AgentThreadProps = $props();

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
	 * Retry is offered only when the turn failed before the model produced
	 * anything.
	 *
	 * The transport posts one message — `messages[last]` — so `regenerate()`
	 * re-sends whatever is on the end. With a trailing *user* message that is
	 * exactly right, and the server resolves its model before persisting the
	 * turn, so nothing was written and nothing is duplicated. With a trailing
	 * *assistant* message it would post that back as an approval continuation,
	 * which is a different operation entirely. Proper regeneration needs
	 * `regenerateFromMessageId`, which is B4.
	 */
	const canRetry = $derived(chat.messages[chat.messages.length - 1]?.role === 'user');

	function handleRetry() {
		if (canRetry) void chat.regenerate();
	}

	function handleApprove(id: string, approved: boolean) {
		void chat.addToolApprovalResponse({ id, approved });
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
			<Conversation.Content class={compact ? 'space-y-3 p-3' : 'space-y-4 p-4'}>
				{#if chat.messages.length === 0 && empty}
					{@render empty()}
				{/if}

				<!--
					A long thread arrives as its newest page. Without this the rest
					was unreachable: the server returned `prevCursor` and nothing
					read it, so a 200-message conversation silently became its last
					50 with no sign the earlier ones existed.
				-->
				{#if agent.hasOlderMessages(chat.id)}
					<div class="flex justify-center">
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
					<div class={message.role === 'user' ? 'flex justify-end' : ''}>
						<div
							class={message.role === 'user'
								? 'max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground'
								: // 68ch is the readable measure for prose; unconstrained
									// assistant answers run the full width of a desktop
									// window and become hard to track line to line.
									'w-full max-w-[68ch]'}
						>
							{#each message.parts as part, i (i)}
								{#if part.type === 'text'}
									{#if message.role === 'user'}
										<p class="text-sm whitespace-pre-wrap">{part.text}</p>
									{:else}
										<Response content={part.text} />
									{/if}
								{:else if part.type === 'reasoning'}
									<Reasoning.Root isStreaming={chat.status === 'streaming'}>
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
