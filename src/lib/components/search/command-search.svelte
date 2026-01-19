<script lang="ts" module>
	export type SearchResult = {
		id: string;
		title: string;
		description?: string;
		icon?: typeof import('svelte').SvelteComponent;
		href?: string;
		category?: string;
		keywords?: string[];
		action?: () => void;
	};

	export type SearchGroup = {
		heading: string;
		results: SearchResult[];
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import * as Command from '$lib/components/ui/command';
	import { Kbd } from '$lib/components/ui/kbd';
	import { Badge } from '$lib/components/ui/badge';
	import SearchIcon from '@lucide/svelte/icons/search';
	import FileIcon from '@lucide/svelte/icons/file';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CornerDownLeftIcon from '@lucide/svelte/icons/corner-down-left';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import { goto } from '$app/navigation';

	type Props = {
		open?: boolean;
		query?: string;
		results?: SearchResult[];
		groups?: SearchGroup[];
		loading?: boolean;
		placeholder?: string;
		emptyMessage?: string;
		recentSearches?: string[];
		class?: string;
		onSearch?: (query: string) => void;
		onSelect?: (result: SearchResult) => void;
		onOpenChange?: (open: boolean) => void;
	};

	let {
		open = $bindable(false),
		query = $bindable(''),
		results = [],
		groups = [],
		loading = false,
		placeholder = 'Search...',
		emptyMessage = 'No results found.',
		recentSearches = [],
		onSearch,
		onSelect,
		onOpenChange,
		class: className
	}: Props = $props();

	// Combine flat results into groups or use provided groups
	const displayGroups = $derived(
		groups.length > 0
			? groups
			: results.length > 0
				? [{ heading: 'Results', results }]
				: []
	);

	const hasResults = $derived(displayGroups.some((g) => g.results.length > 0));

	function handleSelect(result: SearchResult) {
		onSelect?.(result);

		if (result.action) {
			result.action();
		} else if (result.href) {
			goto(result.href);
		}

		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		// Handle Cmd/Ctrl + K to open
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			open = !open;
		}
	}

	// Global keyboard listener
	$effect(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	// Debounced search
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			if (query) {
				onSearch?.(query);
			}
		}, 200);
	});
</script>

<Command.Dialog
	bind:open
	bind:value={query}
	onOpenChange={onOpenChange}
	title="Search"
	description="Search for pages, actions, and more"
>
	<Command.Input {placeholder} class="h-12" />

	<Command.List class="max-h-[400px]">
		{#if loading}
			<div class="flex items-center justify-center py-6">
				<LoaderCircleIcon class="text-muted-foreground h-6 w-6 animate-spin" />
			</div>
		{:else if !hasResults && query}
			<Command.Empty class="py-6 text-center">
				<div class="text-muted-foreground flex flex-col items-center gap-2">
					<SearchIcon class="h-10 w-10 opacity-50" />
					<p>{emptyMessage}</p>
					<p class="text-xs">Try adjusting your search terms</p>
				</div>
			</Command.Empty>
		{:else if !query && recentSearches.length > 0}
			<Command.Group heading="Recent Searches">
				{#each recentSearches as search}
					<Command.Item
						value={search}
						onSelect={() => {
							query = search;
							onSearch?.(search);
						}}
					>
						<SearchIcon class="text-muted-foreground mr-2 h-4 w-4" />
						<span>{search}</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{:else}
			{#each displayGroups as group}
				{#if group.results.length > 0}
					<Command.Group heading={group.heading}>
						{#each group.results as result (result.id)}
							{#if result.href}
								<Command.LinkItem
									href={result.href}
									value={result.title}
									keywords={result.keywords}
									onSelect={() => handleSelect(result)}
									class="group"
								>
									<div class="flex flex-1 items-center gap-3">
										{#if result.icon}
											<result.icon class="text-muted-foreground h-4 w-4" />
										{:else}
											<FileIcon class="text-muted-foreground h-4 w-4" />
										{/if}
										<div class="flex flex-col">
											<span class="font-medium">{result.title}</span>
											{#if result.description}
												<span class="text-muted-foreground text-xs">{result.description}</span>
											{/if}
										</div>
									</div>
									{#if result.category}
										<Badge variant="outline" class="text-xs">{result.category}</Badge>
									{/if}
									<ArrowRightIcon
										class="text-muted-foreground ml-2 h-4 w-4 opacity-0 transition-opacity group-data-[selected]:opacity-100"
									/>
								</Command.LinkItem>
							{:else}
								<Command.Item
									value={result.title}
									keywords={result.keywords}
									onSelect={() => handleSelect(result)}
									class="group"
								>
									<div class="flex flex-1 items-center gap-3">
										{#if result.icon}
											<result.icon class="text-muted-foreground h-4 w-4" />
										{:else}
											<FileIcon class="text-muted-foreground h-4 w-4" />
										{/if}
										<div class="flex flex-col">
											<span class="font-medium">{result.title}</span>
											{#if result.description}
												<span class="text-muted-foreground text-xs">{result.description}</span>
											{/if}
										</div>
									</div>
									{#if result.category}
										<Badge variant="outline" class="text-xs">{result.category}</Badge>
									{/if}
									<ArrowRightIcon
										class="text-muted-foreground ml-2 h-4 w-4 opacity-0 transition-opacity group-data-[selected]:opacity-100"
									/>
								</Command.Item>
							{/if}
						{/each}
					</Command.Group>
				{/if}
			{/each}
		{/if}
	</Command.List>

	<!-- Footer with keyboard hints -->
	<div class="text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-xs">
		<div class="flex items-center gap-3">
			<span class="flex items-center gap-1">
				<Kbd class="text-[10px]">↑</Kbd>
				<Kbd class="text-[10px]">↓</Kbd>
				to navigate
			</span>
			<span class="flex items-center gap-1">
				<Kbd class="text-[10px]">↵</Kbd>
				to select
			</span>
		</div>
		<span class="flex items-center gap-1">
			<Kbd class="text-[10px]">esc</Kbd>
			to close
		</span>
	</div>
</Command.Dialog>
