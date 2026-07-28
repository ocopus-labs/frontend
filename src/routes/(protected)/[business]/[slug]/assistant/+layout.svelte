<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { createShortcutHandler } from '$lib/utils/keyboard-shortcuts';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import SessionSidebar from '$lib/components/assistant/session-sidebar.svelte';
	import { agent, ASSISTANT_NAME } from '$lib/stores/agent.svelte';
	import PanelIcon from '@lucide/svelte/icons/panel-left';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// From the [slug] layout's server load — the [business] route param is the
	// business *type* ("restaurant"), not the id the API is keyed on.
	const businessId = $derived(data.businessId as string);
	const basePath = $derived(`/${page.params.business}/${page.params.slug}/assistant`);
	const activeSessionId = $derived(page.params.sessionId ?? null);

	let mobileNavOpen = $state(false);

	$effect(() => {
		if (!businessId) return;
		agent.bind(businessId);
		agent.primeSessions(data.sessions, data.sessionsCursor ?? undefined);
		if (agent.readiness.state === 'unknown') void agent.checkReadiness();
	});

	// Opening a thread on a phone should not leave the list covering it.
	$effect(() => {
		void activeSessionId;
		mobileNavOpen = false;
	});

	/**
	 * Assistant shortcuts.
	 *
	 * Unmodified single keys, on purpose. `createShortcutHandler` refuses to fire
	 * while an input, textarea, select or contenteditable has focus, so these
	 * cannot steal a keystroke from the composer — which is where an operator
	 * spends nearly all their time, and the reason plain letters are safe here at
	 * all. It is the same convention Gmail and GitHub use.
	 *
	 * The alternative, Ctrl-combinations, collides with the browser: Ctrl+Shift+N
	 * opens an incognito window in Chrome and never reaches the page.
	 *
	 * Deliberately few, and none destructive — a mistyped shortcut must not be
	 * able to delete a conversation.
	 */
	const shortcuts = createShortcutHandler([
		{
			key: 'n',
			description: 'Start a new conversation',
			handler: () => void startNewSession()
		},
		{
			key: 'e',
			description: 'Export the open conversation',
			handler: () => {
				if (activeSessionId) void agent.exportSession(activeSessionId);
			}
		},
		{
			key: '/',
			description: 'Focus the conversation search',
			handler: () => {
				const search = document.querySelector<HTMLInputElement>('[data-agent-session-search]');
				search?.focus();
				search?.select();
			}
		}
	]);

	async function startNewSession() {
		const session = await agent.newSession();
		if (session) await goto(`${basePath}/${session.id}`);
	}
</script>

<svelte:window onkeydown={shortcuts} />

<svelte:head>
	<title>{ASSISTANT_NAME} | Assistant</title>
</svelte:head>

<!--
	100dvh, not 100vh: on mobile Safari the visual viewport shrinks when the
	keyboard opens, and 100vh keeps reporting the taller value — which pushes
	the composer under the keyboard exactly when it is being typed into.
-->
<div class="flex h-dvh min-h-0 gap-4 p-2">
	<aside class="hidden w-64 shrink-0 lg:block" aria-label="Conversation list">
		<SessionSidebar {basePath} {activeSessionId} />
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<div class="flex items-center gap-2 pb-3 lg:hidden">
			<Button
				variant="outline"
				size="icon-touch"
				onclick={() => (mobileNavOpen = true)}
				aria-label="Show conversations"
			>
				<PanelIcon class="size-4" />
			</Button>
			<SparklesIcon class="size-4 text-primary" aria-hidden="true" />
			<span class="font-semibold">{ASSISTANT_NAME}</span>
		</div>

		<div class="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
			{@render children()}
		</div>
	</div>
</div>

<Sheet.Root bind:open={mobileNavOpen}>
	<Sheet.Content side="left" class="w-[19rem] p-4">
		<Sheet.Header class="sr-only">
			<Sheet.Title>Conversations</Sheet.Title>
			<Sheet.Description>Your saved {ASSISTANT_NAME} conversations.</Sheet.Description>
		</Sheet.Header>
		<div class="h-full min-h-0 pt-6">
			<SessionSidebar {basePath} {activeSessionId} />
		</div>
	</Sheet.Content>
</Sheet.Root>
