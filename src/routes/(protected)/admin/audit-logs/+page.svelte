<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ScrollText from '@lucide/svelte/icons/scroll-text';

	let { data }: { data: PageData } = $props();

	let resourceFilter = $state(data.filters.resource || '');
	let actionFilter = $state(data.filters.action || '');

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function updateFilters(updates: Record<string, string | undefined>) {
		const params = new URLSearchParams($page.url.searchParams);
		for (const [key, value] of Object.entries(updates)) {
			if (value) {
				params.set(key, value);
			} else {
				params.delete(key);
			}
		}
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function handleResourceChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		updateFilters({ resource: target.value || undefined });
	}

	function handleActionChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		updateFilters({ action: target.value || undefined });
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`?${params.toString()}`);
	}

	const resourceOptions = [
		{ value: '', label: 'All Resources' },
		{ value: 'business', label: 'Business' },
		{ value: 'user', label: 'User' },
		{ value: 'order', label: 'Order' },
		{ value: 'payment', label: 'Payment' },
		{ value: 'menu', label: 'Menu' },
		{ value: 'inventory', label: 'Inventory' }
	];

	const actionOptions = [
		{ value: '', label: 'All Actions' },
		{ value: 'CREATE', label: 'Create' },
		{ value: 'UPDATE', label: 'Update' },
		{ value: 'DELETE', label: 'Delete' },
		{ value: 'LOGIN', label: 'Login' }
	];

	function getActionBadgeVariant(action: string): 'default' | 'destructive' | 'secondary' | 'outline' {
		if (action === 'CREATE') return 'default';
		if (action === 'DELETE') return 'destructive';
		if (action === 'UPDATE') return 'secondary';
		return 'outline';
	}
</script>

<svelte:head>
	<title>Audit Logs | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Audit Logs</h1>
			<p class="text-muted-foreground">View all system activity logs</p>
		</div>
		<div class="flex items-center gap-2">
			<ScrollText class="h-5 w-5 text-muted-foreground" />
			<Badge variant="secondary" class="text-lg px-4 py-2">
				{data.total} entries
			</Badge>
		</div>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-wrap gap-4">
				<select
					bind:value={resourceFilter}
					onchange={handleResourceChange}
					class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					{#each resourceOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>

				<select
					bind:value={actionFilter}
					onchange={handleActionChange}
					class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					{#each actionOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Table -->
	<Card.Root>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Time</Table.Head>
					<Table.Head>User</Table.Head>
					<Table.Head>Action</Table.Head>
					<Table.Head>Resource</Table.Head>
					<Table.Head>Business</Table.Head>
					<Table.Head>Details</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.data as log}
					<Table.Row>
						<Table.Cell class="text-muted-foreground text-sm whitespace-nowrap">
							{formatDate(log.createdAt)}
						</Table.Cell>
						<Table.Cell>
							{#if log.user}
								<div>
									<p class="text-sm">{log.user.name || 'Unnamed'}</p>
									<p class="text-xs text-muted-foreground">{log.user.email}</p>
								</div>
							{:else}
								<span class="text-muted-foreground text-sm">System</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<Badge variant={getActionBadgeVariant(log.action)}>
								{log.action}
							</Badge>
						</Table.Cell>
						<Table.Cell class="capitalize">{log.resource}</Table.Cell>
						<Table.Cell>
							{#if log.restaurant}
								<a
									href="/admin/businesses/{log.restaurant.id}"
									class="text-sm hover:underline"
								>
									{log.restaurant.name}
								</a>
							{:else}
								<span class="text-muted-foreground text-sm">-</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if log.details}
								<code class="text-xs bg-muted px-1 py-0.5 rounded">
									{JSON.stringify(log.details).slice(0, 50)}...
								</code>
							{:else}
								<span class="text-muted-foreground text-sm">-</span>
							{/if}
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="text-center py-12 text-muted-foreground">
							No audit logs found
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Root>

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Showing {(data.page - 1) * data.limit + 1} to {Math.min(
					data.page * data.limit,
					data.total
				)} of {data.total} logs
			</p>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={data.page <= 1}
					onclick={() => goToPage(data.page - 1)}
				>
					<ChevronLeft class="h-4 w-4" />
					Previous
				</Button>
				<span class="text-sm">
					Page {data.page} of {data.totalPages}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={data.page >= data.totalPages}
					onclick={() => goToPage(data.page + 1)}
				>
					Next
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}
</div>
