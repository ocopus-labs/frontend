<script lang="ts" module>
	import type { AgentSession } from '$lib/api/agent';

	export interface SessionSidebarProps {
		/** Route base, e.g. `/restaurant/my-cafe/assistant`. */
		basePath: string;
		/** The session currently open, if any. */
		activeSessionId?: string | null;
	}

	export interface SessionGroup {
		label: string;
		sessions: AgentSession[];
	}

	/**
	 * Bucket sessions the way an operator remembers them — "the one from
	 * yesterday" — rather than by raw date. Pinned threads are pulled out
	 * entirely: their whole point is not to age out of view.
	 *
	 * `now` is a parameter so this is testable without freezing the clock.
	 */
	export function groupSessions(sessions: AgentSession[], now = new Date()): SessionGroup[] {
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		const DAY = 86_400_000;

		const pinned: AgentSession[] = [];
		const today: AgentSession[] = [];
		const yesterday: AgentSession[] = [];
		const week: AgentSession[] = [];
		const older: AgentSession[] = [];

		for (const session of sessions) {
			if (session.pinned) {
				pinned.push(session);
				continue;
			}
			const at = new Date(session.lastMessageAt).getTime();
			if (at >= startOfToday) today.push(session);
			else if (at >= startOfToday - DAY) yesterday.push(session);
			else if (at >= startOfToday - 7 * DAY) week.push(session);
			else older.push(session);
		}

		return [
			{ label: 'Pinned', sessions: pinned },
			{ label: 'Today', sessions: today },
			{ label: 'Yesterday', sessions: yesterday },
			{ label: 'Previous 7 days', sessions: week },
			{ label: 'Older', sessions: older }
		].filter((group) => group.sessions.length > 0);
	}
</script>

<script lang="ts">
	import { Shimmer } from '@shimmer-from-structure/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import SessionListItem from './session-list-item.svelte';
	import { agent, ASSISTANT_NAME } from '$lib/stores/agent.svelte';
	import { goto } from '$app/navigation';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import MessagesIcon from '@lucide/svelte/icons/messages-square';

	let { basePath, activeSessionId = null }: SessionSidebarProps = $props();

	let pendingDeleteId = $state<string | null>(null);
	let creating = $state(false);

	const groups = $derived(groupSessions(agent.sessions));
	const pendingDeleteLabel = $derived(
		pendingDeleteId
			? (agent.sessionById(pendingDeleteId)?.title ?? 'this conversation')
			: 'this conversation'
	);

	/**
	 * Placeholder rows so <Shimmer> mirrors the real layout while loading —
	 * a generic grey bar tells you something is coming but not what shape.
	 */
	const placeholders: AgentSession[] = Array.from({ length: 5 }, (_, i) => ({
		id: `placeholder-${i}`,
		title: i % 2 === 0 ? 'Placeholder conversation title' : 'Shorter placeholder',
		pinned: false,
		archived: false,
		messageCount: 0,
		lastMessageAt: new Date().toISOString(),
		createdAt: new Date().toISOString(),
		providerSlug: null,
		modelId: null
	}));

	/** Debounced so a search does not fire a request per keystroke. */
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function onSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => void agent.loadSessions(), 250);
	}

	async function startNew() {
		if (creating) return;
		creating = true;
		try {
			const session = await agent.newSession();
			if (session) await goto(`${basePath}/${session.id}`);
		} finally {
			creating = false;
		}
	}

	function toggleArchived() {
		agent.showArchived = !agent.showArchived;
		void agent.loadSessions();
	}

	async function confirmDelete() {
		const id = pendingDeleteId;
		pendingDeleteId = null;
		if (!id) return;
		await agent.removeSession(id);
		// Deleting the thread you are reading has to move you somewhere; the
		// empty state is the only place guaranteed to still exist.
		if (id === activeSessionId) await goto(basePath);
	}
</script>

<div class="flex h-full min-h-0 flex-col gap-3">
	<Button size="touch" class="w-full justify-start" onclick={startNew} disabled={creating}>
		<PlusIcon class="size-4" />
		New conversation
	</Button>

	<div class="relative">
		<SearchIcon
			class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
			aria-hidden="true"
		/>
		<Input
			bind:value={agent.query}
			oninput={onSearchInput}
			class="h-9 pl-8"
			type="search"
			placeholder="Search conversations"
			aria-label="Search conversations"
		/>
	</div>

	<nav class="min-h-0 flex-1 overflow-y-auto" aria-label="Conversations">
		{#if agent.sessionsLoading && agent.sessions.length === 0}
			<Shimmer loading>
				<ul class="space-y-0.5">
					{#each placeholders as placeholder (placeholder.id)}
						<li class="rounded-md px-2 py-2 text-sm">
							<span class="truncate">{placeholder.title}</span>
						</li>
					{/each}
				</ul>
			</Shimmer>
		{:else if agent.sessions.length === 0}
			<Empty.Root class="border-none py-8">
				<Empty.Header>
					<Empty.Media variant="icon">
						<MessagesIcon />
					</Empty.Media>
					<Empty.Title>
						{#if agent.query.trim()}
							No matches
						{:else if agent.showArchived}
							Nothing archived
						{:else}
							No conversations yet
						{/if}
					</Empty.Title>
					<Empty.Description>
						{#if agent.query.trim()}
							Nothing matches “{agent.query}”.
						{:else if agent.showArchived}
							Archived conversations will appear here.
						{:else}
							Ask a question to start one.
						{/if}
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			{#each groups as group (group.label)}
				<div class="mb-3">
					<h3
						class="px-2 pb-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase"
					>
						{group.label}
					</h3>
					<ul class="space-y-0.5">
						{#each group.sessions as session (session.id)}
							<SessionListItem
								{session}
								href={`${basePath}/${session.id}`}
								active={session.id === activeSessionId}
								onRename={(id, title) => void agent.patchSession(id, { title })}
								onTogglePin={(id) =>
									void agent.patchSession(id, {
										pinned: !agent.sessionById(id)?.pinned
									})}
								onToggleArchive={(id) =>
									void agent.patchSession(id, {
										archived: !agent.sessionById(id)?.archived
									})}
								onDelete={(id) => (pendingDeleteId = id)}
							/>
						{/each}
					</ul>
				</div>
			{/each}

			<!--
				The server has always returned `nextCursor`; nothing read it, so
				the list simply stopped at 30 with no sign there was more behind
				it. A button rather than infinite scroll: the sidebar is also the
				keyboard path to an older thread, and a list that grows as you
				arrow through it is worse than one you extend deliberately.
			-->
			{#if agent.sessionsCursor}
				<Button
					variant="ghost"
					size="sm"
					class="w-full justify-center text-muted-foreground"
					disabled={agent.sessionsLoadingMore}
					onclick={() => void agent.loadMoreSessions()}
				>
					{#if agent.sessionsLoadingMore}
						<Spinner class="size-3.5" />
						Loading…
					{:else}
						Load older conversations
					{/if}
				</Button>
			{/if}
		{/if}
	</nav>

	{#if agent.sessionsError}
		<p class="px-2 text-xs text-destructive" role="alert">{agent.sessionsError}</p>
	{/if}

	<Button
		variant="ghost"
		size="sm"
		class="w-full justify-start text-muted-foreground"
		onclick={toggleArchived}
		aria-pressed={agent.showArchived}
	>
		<ArchiveIcon class="size-3.5" />
		{agent.showArchived ? 'Back to active' : 'Archived'}
	</Button>
</div>

<ConfirmDialog
	open={pendingDeleteId !== null}
	title="Delete this conversation?"
	description={`“${pendingDeleteLabel}” will be removed from your list. Any changes ${ASSISTANT_NAME} already made to your business are not undone.`}
	confirmLabel="Delete"
	variant="destructive"
	onConfirm={confirmDelete}
	onCancel={() => (pendingDeleteId = null)}
/>
