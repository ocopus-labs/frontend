<script lang="ts">
	/**
	 * Floating assistant panel, mounted once in the business layout so it
	 * persists across navigation.
	 *
	 * Since B1 it is bound to a real, saved session rather than a throwaway
	 * in-memory thread — so a question asked from the panel is still there in
	 * the sidebar afterwards, and "open in full page" continues the same
	 * conversation rather than starting a new one.
	 */
	import type { Chat } from '@ai-sdk/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { MediaQuery } from 'svelte/reactivity';
	import { agent, ASSISTANT_NAME } from '$lib/stores/agent.svelte';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import XIcon from '@lucide/svelte/icons/x';
	import MaximizeIcon from '@lucide/svelte/icons/maximize-2';
	import PlusIcon from '@lucide/svelte/icons/plus';

	/**
	 * The real business UUID, from the layout's server load.
	 *
	 * NOT `page.params.business` — that segment is the business *type*
	 * ("restaurant", "salon"), and `[slug]` is the business slug. Neither is
	 * the id the API is keyed on.
	 */
	let { businessId }: { businessId: string } = $props();

	const businessType = $derived(page.params.business);
	const slug = $derived(page.params.slug);

	// Below `md` the floating card would sit over the bottom nav on a screen
	// barely wider than itself. A Sheet is the shape that already exists for
	// "temporary surface on a phone", and it brings its own focus management.
	const isDesktop = new MediaQuery('(min-width: 768px)');

	/**
	 * AgentThread is imported lazily and only in the browser.
	 *
	 * Its markdown chain pulls in `decode-named-character-reference`, whose
	 * browser build calls `document.createElement` at module scope — so merely
	 * importing it during SSR crashes every page this layout wraps. A render
	 * guard is not enough; the module must not be evaluated on the server.
	 * Lazy-loading also keeps the markdown/highlighter bundle off the initial
	 * page load, which this overlay does not need.
	 */
	let AgentThread = $state<typeof import('./agent-thread.svelte').default | null>(null);
	let chat = $state<Chat | null>(null);

	let panelRef = $state<HTMLElement | null>(null);
	let fabRef = $state<HTMLButtonElement | null>(null);
	/** The element focused before the panel opened, to hand focus back to. */
	let returnFocusTo: HTMLElement | null = null;

	onMount(async () => {
		AgentThread = (await import('./agent-thread.svelte')).default;
	});

	// The dedicated page renders the same conversations, so floating on top of
	// it would be a confusing duplicate.
	const onAssistantPage = $derived(page.url.pathname.includes('/assistant'));

	$effect(() => {
		if (businessId) agent.bind(businessId);
	});

	// The session is created when the panel is first opened, not on mount —
	// every business layout mounts this, and most operators never open it.
	$effect(() => {
		if (!agent.panelOpen || !businessId || chat) return;
		void agent.ensurePanelSession().then((sessionId) => {
			if (sessionId) void agent.hydrate(sessionId).then((bound) => (chat = bound));
		});
	});

	/**
	 * Move focus into the panel when it opens, and back out when it closes.
	 *
	 * Without this, opening the panel from the keyboard leaves focus on the FAB
	 * behind it: Tab walks the page underneath, and the composer — the only
	 * thing the panel is for — is unreachable without a mouse.
	 */
	$effect(() => {
		if (!isDesktop.current) return;
		if (agent.panelOpen) {
			returnFocusTo = document.activeElement as HTMLElement | null;
			// After the panel and its lazily-imported thread have rendered.
			queueMicrotask(() => focusablesIn(panelRef)[0]?.focus());
		} else if (returnFocusTo) {
			const target = returnFocusTo;
			returnFocusTo = null;
			queueMicrotask(() => (fabRef ?? target)?.focus());
		}
	});

	const FOCUSABLE =
		'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

	function focusablesIn(root: HTMLElement | null): HTMLElement[] {
		if (!root) return [];
		return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
			(el) => el.offsetParent !== null || el === document.activeElement
		);
	}

	/**
	 * Trap Tab inside the panel and close on Escape.
	 *
	 * Menus and dialogs opened from inside the panel portal to `document.body`
	 * and run their own focus management, so their keystrokes never reach this
	 * handler — the two do not fight.
	 */
	function onPanelKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.stopPropagation();
			agent.closePanel();
			return;
		}
		if (event.key !== 'Tab') return;

		const items = focusablesIn(panelRef);
		if (items.length === 0) return;

		const first = items[0];
		const last = items[items.length - 1];
		const active = document.activeElement;

		if (event.shiftKey && (active === first || !panelRef?.contains(active))) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	}

	async function startFresh() {
		const session = await agent.newSession();
		if (!session) return;
		agent.panelSessionId = session.id;
		chat = await agent.hydrate(session.id);
	}

	function openFullPage() {
		agent.closePanel();
		const target = agent.panelSessionId
			? `/${businessType}/${slug}/assistant/${agent.panelSessionId}`
			: `/${businessType}/${slug}/assistant`;
		void goto(target);
	}
</script>

{#snippet header(showClose: boolean)}
	<header class="flex items-center gap-2 border-b border-border px-3 py-2">
		<SparklesIcon class="size-4 text-primary" aria-hidden="true" />
		<span id="jay-panel-title" class="flex-1 font-semibold">{ASSISTANT_NAME}</span>
		<Button variant="ghost" size="icon-sm" onclick={startFresh} aria-label="New conversation">
			<PlusIcon class="size-4" />
		</Button>
		<Button variant="ghost" size="icon-sm" onclick={openFullPage} aria-label="Open in full page">
			<MaximizeIcon class="size-4" />
		</Button>
		{#if showClose}
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={() => agent.closePanel()}
				aria-label="Close assistant"
			>
				<XIcon class="size-4" />
			</Button>
		{/if}
	</header>
{/snippet}

{#snippet body()}
	<div class="min-h-0 flex-1">
		{#if AgentThread && chat}
			<AgentThread {chat} compact />
		{:else}
			<div class="flex h-full items-center justify-center gap-2" role="status">
				<Spinner class="size-4 text-muted-foreground" />
				<span class="text-sm text-muted-foreground">Loading {ASSISTANT_NAME}…</span>
			</div>
		{/if}
	</div>
{/snippet}

{#if businessId && !onAssistantPage}
	{#if agent.panelOpen && isDesktop.current}
		<!--
			`aria-modal` with a real Tab trap, rather than a bare floating div.
			A dialog a screen reader can wander out of is worse than no dialog:
			the user hears page content while the panel is still on screen.
		-->
		<div
			bind:this={panelRef}
			role="dialog"
			aria-modal="true"
			aria-labelledby="jay-panel-title"
			tabindex="-1"
			onkeydown={onPanelKeydown}
			class="fixed right-4 bottom-4 z-50 flex h-[min(36rem,calc(100dvh-6rem))] w-[min(26rem,calc(100vw-2rem))] flex-col rounded-xl border border-border bg-background shadow-lg"
		>
			{@render header(true)}
			{@render body()}
		</div>
	{:else if !isDesktop.current}
		<Sheet.Root
			open={agent.panelOpen}
			onOpenChange={(open) => (open ? agent.openPanel() : agent.closePanel())}
		>
			<!-- 90dvh, not 90vh: the mobile keyboard shrinks the visual viewport
			     and vh keeps reporting the taller value, pushing the composer
			     underneath the keyboard being used to type into it. -->
			<Sheet.Content side="bottom" class="flex h-[90dvh] flex-col gap-0 p-0">
				<Sheet.Header class="sr-only">
					<Sheet.Title>{ASSISTANT_NAME}</Sheet.Title>
					<Sheet.Description>Ask about your business.</Sheet.Description>
				</Sheet.Header>
				{@render header(false)}
				{@render body()}
			</Sheet.Content>
		</Sheet.Root>
	{/if}

	{#if !agent.panelOpen}
		<!-- Clear of the mobile bottom nav (h-16, md:hidden), which the FAB
		     otherwise covers on exactly the screens where it matters most. -->
		<Button
			bind:ref={fabRef}
			class="fixed right-4 bottom-20 z-50 rounded-full shadow-lg md:bottom-4"
			size="icon-touch"
			onclick={() => agent.openPanel()}
			aria-label={`Open ${ASSISTANT_NAME}`}
		>
			<SparklesIcon class="size-5" />
		</Button>
	{/if}
{/if}
