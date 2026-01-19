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
	import CreditCard from '@lucide/svelte/icons/credit-card';

	let { data }: { data: PageData } = $props();

	let statusFilter = $state(data.filters.status || '');

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatCurrency(value: string | number): string {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency: 'INR',
			maximumFractionDigits: 0
		}).format(Number(value));
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

	function handleStatusChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		updateFilters({ status: target.value || undefined });
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`?${params.toString()}`);
	}

	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'active', label: 'Active' },
		{ value: 'canceled', label: 'Canceled' },
		{ value: 'past_due', label: 'Past Due' },
		{ value: 'trialing', label: 'Trialing' }
	];

	function getStatusBadgeVariant(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
		if (status === 'active') return 'default';
		if (status === 'canceled' || status === 'past_due') return 'destructive';
		return 'secondary';
	}
</script>

<svelte:head>
	<title>Subscriptions | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Subscriptions</h1>
			<p class="text-muted-foreground">Manage all platform subscriptions</p>
		</div>
		<Badge variant="secondary" class="text-lg px-4 py-2">
			{data.total} total
		</Badge>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-wrap gap-4">
				<select
					bind:value={statusFilter}
					onchange={handleStatusChange}
					class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					{#each statusOptions as option}
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
					<Table.Head>User</Table.Head>
					<Table.Head>Plan</Table.Head>
					<Table.Head>Price</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Period End</Table.Head>
					<Table.Head>Created</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.data as subscription}
					<Table.Row>
						<Table.Cell>
							<div>
								<a
									href="/admin/users/{subscription.user.id}"
									class="font-medium hover:underline"
								>
									{subscription.user.name || 'Unnamed User'}
								</a>
								<p class="text-xs text-muted-foreground">{subscription.user.email}</p>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<CreditCard class="h-4 w-4 text-muted-foreground" />
								<span class="font-medium">{subscription.plan.displayName}</span>
							</div>
						</Table.Cell>
						<Table.Cell class="font-mono">
							{formatCurrency(subscription.plan.priceMonthly)}/mo
						</Table.Cell>
						<Table.Cell>
							<Badge variant={getStatusBadgeVariant(subscription.status)}>
								{subscription.status}
							</Badge>
							{#if subscription.cancelAtPeriodEnd}
								<Badge variant="outline" class="ml-1">Canceling</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-muted-foreground text-sm">
							{formatDate(subscription.currentPeriodEnd)}
						</Table.Cell>
						<Table.Cell class="text-muted-foreground text-sm">
							{formatDate(subscription.createdAt)}
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="text-center py-12 text-muted-foreground">
							No subscriptions found
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
				)} of {data.total} subscriptions
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
