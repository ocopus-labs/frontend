<script lang="ts">
	import type { Chat } from '@ai-sdk/svelte';
	import AgentThread from '$lib/components/assistant/agent-thread.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { agent, ASSISTANT_NAME } from '$lib/stores/agent.svelte';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let chat = $state<Chat | null>(null);

	/**
	 * Bind the thread whenever the session changes.
	 *
	 * `hydrate` is memoised per session, so navigating back to a thread you have
	 * already opened reuses its live `Chat` — rebuilding one mid-stream would
	 * abandon the reader and lose the answer in flight.
	 */
	$effect(() => {
		const sessionId = data.sessionId;
		if (!sessionId || !agent.businessId) return;

		let cancelled = false;
		void agent
			.hydrate(sessionId, {
				messages: data.messages ?? undefined,
				prevCursor: data.prevCursor
			})
			.then((bound) => {
				if (cancelled || !bound) return;
				chat = bound;

				// A message typed on the empty state, before this session existed.
				const pending = agent.pendingPrompt;
				if (pending) {
					agent.pendingPrompt = null;
					void bound.sendMessage({ text: pending });
				}
			});

		return () => {
			cancelled = true;
		};
	});
</script>

{#if chat}
	<AgentThread {chat}>
		{#snippet empty()}
			<div class="flex flex-col items-center gap-2 py-10 text-center">
				<SparklesIcon class="size-6 text-muted-foreground" aria-hidden="true" />
				<p class="text-sm text-muted-foreground">
					Ask {ASSISTANT_NAME} anything about your business.
				</p>
			</div>
		{/snippet}
	</AgentThread>
{:else}
	<div class="flex h-full items-center justify-center" role="status">
		<Spinner class="size-5 text-muted-foreground" />
		<span class="sr-only">Loading conversation…</span>
	</div>
{/if}
