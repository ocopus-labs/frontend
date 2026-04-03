<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { getFranchiseAuditTrail } from '$lib/api/franchise';
	import type { FranchiseAuditLog } from '$lib/api/types';

	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);

	const PAGE_SIZE = 50;
	let currentPage = $state(0);
	let logs = $state<FranchiseAuditLog[]>([]);
	let total = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadPage(page: number) {
		if (!franchise?.id) return;
		loading = true;
		error = null;
		try {
			const res = await getFranchiseAuditTrail(franchise.id, {
				limit: PAGE_SIZE,
				offset: page * PAGE_SIZE,
			});
			logs = res.logs;
			total = res.total;
			currentPage = page;
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

	function formatDate(iso: string) {
		return new Date(iso).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	}

	function formatDetails(details: Record<string, unknown> | null) {
		if (!details) return '—';
		try {
			return JSON.stringify(details);
		} catch {
			return '—';
		}
	}
</script>

<svelte:head>
	<title>Audit Trail - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Audit Trail</h1>
		<p class="mt-1 text-muted-foreground">
			Cross-location activity logs for {franchise?.name}.
		</p>
	</div>

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0">
			<Card.Title class="text-base font-semibold">Activity Logs</Card.Title>
			{#if !loading}
				<span class="text-sm text-muted-foreground">{total} total entries</span>
			{/if}
		</Card.Header>
		<Card.Content class="p-0">
			{#if loading}
				<div class="space-y-0 divide-y">
					{#each [1, 2, 3, 4, 5] as _}
						<div class="flex items-center gap-4 px-6 py-4">
							<div class="h-4 w-36 animate-pulse rounded bg-muted"></div>
							<div class="h-4 w-24 animate-pulse rounded bg-muted"></div>
							<div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
							<div class="h-4 w-20 animate-pulse rounded bg-muted"></div>
							<div class="h-4 flex-1 animate-pulse rounded bg-muted"></div>
						</div>
					{/each}
				</div>
			{:else if error}
				<div class="flex flex-col items-center gap-2 py-12 text-center">
					<ClipboardList class="size-8 text-muted-foreground" />
					<p class="text-sm text-destructive">{error}</p>
				</div>
			{:else if logs.length === 0}
				<div class="flex flex-col items-center gap-2 py-12 text-center">
					<ClipboardList class="size-8 text-muted-foreground" />
					<p class="text-sm text-muted-foreground">No audit logs found.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
								<th class="px-6 py-3 whitespace-nowrap">Timestamp</th>
								<th class="px-4 py-3 whitespace-nowrap">Location</th>
								<th class="px-4 py-3 whitespace-nowrap">User</th>
								<th class="px-4 py-3 whitespace-nowrap">Action</th>
								<th class="px-4 py-3 whitespace-nowrap">Resource</th>
								<th class="px-4 py-3">Details</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each logs as log (log.id)}
								<tr class="hover:bg-muted/30 transition-colors">
									<td class="px-6 py-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
										{formatDate(log.createdAt)}
									</td>
									<td class="px-4 py-3 whitespace-nowrap">
										<span class="font-medium">{log.businessName}</span>
									</td>
									<td class="px-4 py-3 whitespace-nowrap">
										{#if log.user}
											<div>
												<p class="font-medium leading-none">{log.user.name ?? '—'}</p>
												<p class="text-xs text-muted-foreground">{log.user.email}</p>
											</div>
										{:else}
											<span class="text-muted-foreground">System</span>
										{/if}
									</td>
									<td class="px-4 py-3 whitespace-nowrap">
										<span
											class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
										>
											{log.action}
										</span>
									</td>
									<td class="px-4 py-3 whitespace-nowrap text-muted-foreground">
										{log.resource}{log.resourceId ? ` / ${log.resourceId}` : ''}
									</td>
									<td class="px-4 py-3 max-w-xs truncate text-xs text-muted-foreground">
										{formatDetails(log.details)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				<div class="flex items-center justify-between border-t px-6 py-3">
					<p class="text-sm text-muted-foreground">
						Page {currentPage + 1} of {totalPages}
					</p>
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={!hasPrev}
							onclick={() => loadPage(currentPage - 1)}
						>
							<ChevronLeft class="h-4 w-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={!hasNext}
							onclick={() => loadPage(currentPage + 1)}
						>
							Next
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
