<script lang="ts" module>
	export interface SessionListItemProps {
		session: AgentSession;
		/** Highlighted as the thread currently open. */
		active?: boolean;
		href: string;
		onRename: (id: string, title: string) => void;
		onTogglePin: (id: string) => void;
		onToggleArchive: (id: string) => void;
		onDelete: (id: string) => void;
	}
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { cn } from '$lib/utils.js';
	import type { AgentSession } from '$lib/api/agent';
	import MoreIcon from '@lucide/svelte/icons/ellipsis';
	import PinIcon from '@lucide/svelte/icons/pin';
	import PinOffIcon from '@lucide/svelte/icons/pin-off';
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import ArchiveRestoreIcon from '@lucide/svelte/icons/archive-restore';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import { agent } from '$lib/stores/agent.svelte';

	let {
		session,
		active = false,
		href,
		onRename,
		onTogglePin,
		onToggleArchive,
		onDelete
	}: SessionListItemProps = $props();

	let renaming = $state(false);
	let draft = $state('');
	let inputRef = $state<HTMLInputElement | null>(null);

	const label = $derived(session.title ?? 'New conversation');

	function startRename() {
		draft = session.title ?? '';
		renaming = true;
		// Focus after the input exists, rather than with `autofocus` — the
		// attribute only fires on initial mount, and this input appears in
		// response to a menu action. Renaming is a keyboard action; landing in
		// a field you then have to click is worse than not offering it.
		queueMicrotask(() => {
			inputRef?.focus();
			inputRef?.select();
		});
	}

	function commitRename() {
		if (!renaming) return;
		renaming = false;
		const next = draft.trim();
		if (next && next !== session.title) onRename(session.id, next);
	}

	function onRenameKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			commitRename();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			renaming = false;
		}
	}
</script>

<li class="group/session relative">
	{#if renaming}
		<div class="px-1 py-0.5">
			<Input
				bind:ref={inputRef}
				bind:value={draft}
				class="h-8 text-sm"
				aria-label="Conversation title"
				onkeydown={onRenameKeydown}
				onblur={commitRename}
			/>
		</div>
	{:else}
		<a
			{href}
			class={cn(
				'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
				// Room for the actions button, which sits over the right edge.
				'pr-9',
				active
					? 'bg-muted font-medium text-foreground'
					: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
			)}
			aria-current={active ? 'page' : undefined}
		>
			{#if session.pinned}
				<PinIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
				<span class="sr-only">Pinned.</span>
			{/if}
			<span class="truncate">{label}</span>
		</a>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-sm"
						class={cn(
							'absolute top-1/2 right-1 -translate-y-1/2',
							// Revealed on hover on a mouse, but always present for
							// keyboard and touch — a control you can only reach by
							// hovering is a control a touch user does not have.
							'opacity-0 group-hover/session:opacity-100 focus-visible:opacity-100',
							'data-[state=open]:opacity-100 max-[1024px]:opacity-100'
						)}
						aria-label={`Actions for ${label}`}
					>
						<MoreIcon class="size-3.5" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-44">
				<DropdownMenu.Item onSelect={startRename}>
					<PencilIcon class="size-3.5" />
					Rename
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => onTogglePin(session.id)}>
					{#if session.pinned}
						<PinOffIcon class="size-3.5" />
						Unpin
					{:else}
						<PinIcon class="size-3.5" />
						Pin
					{/if}
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => onToggleArchive(session.id)}>
					{#if session.archived}
						<ArchiveRestoreIcon class="size-3.5" />
						Unarchive
					{:else}
						<ArchiveIcon class="size-3.5" />
						Archive
					{/if}
				</DropdownMenu.Item>
				<DropdownMenu.Item
					disabled={agent.exporting === session.id}
					onSelect={() => void agent.exportSession(session.id)}
				>
					<DownloadIcon class="size-3.5" />
					{agent.exporting === session.id ? 'Exporting…' : 'Export'}
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive" onSelect={() => onDelete(session.id)}>
					<TrashIcon class="size-3.5" />
					Delete
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</li>
