<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import * as InputGroup from '$lib/components/ui/input-group';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import FilterSelect from '$lib/components/global/filter-select.svelte';
	import SectionHeader from '$lib/components/global/section-header.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { getFranchiseAuditTrail } from '$lib/api/franchise';
	import type { FranchiseAuditLog } from '$lib/api/types';

	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);

	const PAGE_SIZE = 50;
	let currentPage = $state(0);
	let logs = $state<FranchiseAuditLog[]>([]);
	let total = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Filters apply to the loaded page only (see the count label below).
	let search = $state('');
	let actionFilter = $state('all');

	async function loadPage(page: number) {
		if (!franchise?.id) return;
		loading = true;
		error = null;
		try {
			const res = await getFranchiseAuditTrail(franchise.id, {
				limit: PAGE_SIZE,
				offset: page * PAGE_SIZE
			});
			logs = res.logs;
			total = res.total;
			currentPage = page;
			// The action list is page-scoped, so a carried-over selection could
			// silently match nothing on the new page.
			actionFilter = 'all';
			search = '';
		} catch (err: any) {
			error = err?.message ?? 'Failed to load audit logs';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		loadPage(0);
	});

	const totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));
	const hasPrev = $derived(currentPage > 0);
	const hasNext = $derived(currentPage < totalPages - 1);

	// Only the actions actually present on this page — an option that matches
	// nothing is a dead end.
	const actionOptions = $derived([
		{ value: 'all', label: 'All actions' },
		...Array.from(new Set(logs.map((log) => log.action)))
			.sort()
			.map((action) => ({ value: action, label: action }))
	]);

	const visibleLogs = $derived.by(() => {
		const query = search.trim().toLowerCase();
		return logs.filter((log) => {
			if (actionFilter !== 'all' && log.action !== actionFilter) return false;
			if (!query) return true;
			const haystack = [
				log.action,
				log.resource,
				log.resourceId,
				log.businessName,
				log.user?.name,
				log.user?.email
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return haystack.includes(query);
		});
	});

	const hasActiveFilters = $derived(search.trim() !== '' || actionFilter !== 'all');

	function clearFilters() {
		search = '';
		actionFilter = 'all';
	}

	// Range of the current page within the full history.
	const rangeStart = $derived(total === 0 ? 0 : currentPage * PAGE_SIZE + 1);
	const rangeEnd = $derived(Math.min(total, currentPage * PAGE_SIZE + logs.length));

	function formatAbsolute(iso: string) {
		return new Date(iso).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function formatRelative(iso: string) {
		const then = new Date(iso).getTime();
		if (Number.isNaN(then)) return '—';
		const seconds = Math.round((Date.now() - then) / 1000);
		if (seconds < 0) return 'just now';
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.round(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.round(hours / 24);
		if (days < 30) return `${days}d ago`;
		const months = Math.round(days / 30);
		if (months < 12) return `${months}mo ago`;
		return `${Math.round(months / 12)}y ago`;
	}

	/** Token-only accent for the action badge. */
	function actionBadgeClass(action: string) {
		const a = action.toLowerCase();
		if (/(create|add|invite|grant|open)/.test(a)) {
			return 'border-success/30 bg-success/10 text-success';
		}
		if (/(update|edit|change|sync|assign|move)/.test(a)) {
			return 'border-warning/30 bg-warning/10 text-warning';
		}
		if (/(delete|remove|revoke|cancel|void|close)/.test(a)) {
			return 'border-destructive/30 bg-destructive/10 text-destructive';
		}
		return 'border-border bg-muted text-muted-foreground';
	}

	function formatDetails(details: Record<string, unknown> | null) {
		if (!details) return '—';
		try {
			const text = JSON.stringify(details);
			return text === '{}' ? '—' : text;
		} catch {
			return '—';
		}
	}
</script>

<svelte:head>
	<title>Audit Trail - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

<SectionHeader
	title="Audit trail"
	description="Cross-location activity across every business in this franchise."
/>

{#if error}
	<Alert.Root variant="destructive">
		<AlertTriangle class="size-4" />
		<Alert.Title>Couldn't load the audit trail</Alert.Title>
		<Alert.Description>{error}</Alert.Description>
	</Alert.Root>
{/if}

<!-- ── Toolbar (filters this page only) ──────────────────────────────────── -->
{#if !loading && !error && logs.length > 0}
	<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
		<InputGroup.Root class="w-full sm:max-w-xs">
			<InputGroup.Addon>
				<Search class="size-4 text-muted-foreground" />
			</InputGroup.Addon>
			<InputGroup.Input
				placeholder="Search this page…"
				bind:value={search}
				aria-label="Search entries on this page"
			/>
			{#if search}
				<InputGroup.Button size="icon-sm" onclick={() => (search = '')} aria-label="Clear search">
					<X class="size-4" />
				</InputGroup.Button>
			{/if}
		</InputGroup.Root>

		<FilterSelect
			value={actionFilter}
			options={actionOptions}
			onValueChange={(v) => (actionFilter = v)}
			class="w-[180px]"
		/>

		<div class="flex items-center gap-3 sm:ml-auto">
			<span class="text-sm text-muted-foreground tabular-nums">
				{visibleLogs.length} of {logs.length} on this page
			</span>
			{#if hasActiveFilters}
				<Button variant="ghost" size="sm" onclick={clearFilters}>Clear filters</Button>
			{/if}
		</div>
	</div>
{/if}

<!-- ── Log table ─────────────────────────────────────────────────────────── -->
<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0">
		<div>
			<Card.Title class="text-section-title">Activity log</Card.Title>
			<Card.Description>
				{#if loading}
					Loading entries…
				{:else}
					<span class="tabular-nums">{total.toLocaleString()}</span>
					{total === 1 ? 'entry' : 'entries'} recorded
				{/if}
			</Card.Description>
		</div>
	</Card.Header>
	<Card.Content class="p-0">
		{#if loading}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Time</Table.Head>
						<Table.Head>Location</Table.Head>
						<Table.Head class="hidden lg:table-cell">User</Table.Head>
						<Table.Head>Action</Table.Head>
						<Table.Head class="hidden sm:table-cell">Resource</Table.Head>
						<Table.Head class="hidden lg:table-cell">Details</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each [1, 2, 3, 4, 5, 6, 7, 8] as row (row)}
						<Table.Row>
							<Table.Cell>
								<Skeleton class="h-3.5 w-20" />
								<Skeleton class="mt-1.5 h-2.5 w-28" />
							</Table.Cell>
							<Table.Cell><Skeleton class="h-3.5 w-28" /></Table.Cell>
							<Table.Cell class="hidden lg:table-cell">
								<Skeleton class="h-3.5 w-24" />
								<Skeleton class="mt-1.5 h-2.5 w-32" />
							</Table.Cell>
							<Table.Cell><Skeleton class="h-5 w-20 rounded-full" /></Table.Cell>
							<Table.Cell class="hidden sm:table-cell"><Skeleton class="h-3.5 w-24" /></Table.Cell>
							<Table.Cell class="hidden lg:table-cell"><Skeleton class="h-3.5 w-40" /></Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{:else if logs.length === 0}
			<EmptyState
				type="no-data"
				icon={ClipboardList}
				title="No activity yet"
				description="Actions taken across your locations will show up here as they happen."
			/>
		{:else if visibleLogs.length === 0}
			<EmptyState
				type="no-results"
				title="Nothing matches on this page"
				description="Filters only apply to the entries loaded on this page. Clear them, or page through the rest of the history."
				actionLabel="Clear filters"
				onAction={clearFilters}
			/>
		{:else}
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Time</Table.Head>
							<Table.Head>Location</Table.Head>
							<Table.Head class="hidden lg:table-cell">User</Table.Head>
							<Table.Head>Action</Table.Head>
							<Table.Head class="hidden sm:table-cell">Resource</Table.Head>
							<Table.Head class="hidden lg:table-cell">Details</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each visibleLogs as log (log.id)}
							{@const badgeClass = actionBadgeClass(log.action)}
							<Table.Row>
								<Table.Cell class="align-top whitespace-nowrap">
									<p class="text-sm tabular-nums">{formatRelative(log.createdAt)}</p>
									<p class="text-xs text-muted-foreground tabular-nums">
										{formatAbsolute(log.createdAt)}
									</p>
								</Table.Cell>
								<Table.Cell class="align-top font-medium">{log.businessName}</Table.Cell>
								<Table.Cell class="hidden align-top lg:table-cell">
									{#if log.user}
										<p class="text-sm leading-none font-medium">{log.user.name ?? '—'}</p>
										<p class="mt-1 text-xs text-muted-foreground">{log.user.email}</p>
									{:else}
										<span class="text-sm text-muted-foreground">System</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="align-top">
									<Badge variant="outline" class={badgeClass}>{log.action}</Badge>
								</Table.Cell>
								<Table.Cell class="hidden align-top text-muted-foreground sm:table-cell">
									{log.resource}{log.resourceId ? ` / ${log.resourceId}` : ''}
								</Table.Cell>
								<Table.Cell
									class="hidden max-w-xs truncate align-top text-xs text-muted-foreground lg:table-cell"
								>
									{formatDetails(log.details)}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		{/if}
	</Card.Content>

	{#if !loading && !error && total > 0}
		<Card.Footer
			class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
		>
			<p class="text-sm text-muted-foreground tabular-nums">
				Showing {rangeStart}–{rangeEnd} of {total}
			</p>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={!hasPrev || loading}
					onclick={() => loadPage(currentPage - 1)}
				>
					<ChevronLeft class="mr-1 size-4" />
					Previous
				</Button>
				<span class="text-sm text-muted-foreground tabular-nums">
					Page {currentPage + 1} of {totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={!hasNext || loading}
					onclick={() => loadPage(currentPage + 1)}
				>
					Next
					<ChevronRight class="ml-1 size-4" />
				</Button>
			</div>
		</Card.Footer>
	{/if}
</Card.Root>
