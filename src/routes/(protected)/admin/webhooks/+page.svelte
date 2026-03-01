<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import type { PageData } from './$types';
	import type { AdminWebhookDetail } from '$lib/api/admin';
	import { getAdminWebhookDetail, retryAdminWebhook } from '$lib/api/admin';

	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Webhook from '@lucide/svelte/icons/webhook';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Eye from '@lucide/svelte/icons/eye';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	let { data }: { data: PageData } = $props();

	let providerFilter = $state(data.filters.provider || '');
	let statusFilter = $state(data.filters.status || '');
	let eventTypeFilter = $state(data.filters.eventType || '');
	let startDate = $state(data.filters.startDate || '');
	let endDate = $state(data.filters.endDate || '');

	// Detail sheet state
	let detailSheetOpen = $state(false);
	let selectedEvent: AdminWebhookDetail | null = $state(null);
	let isLoadingDetail = $state(false);

	// Retry dialog state
	let retryDialogOpen = $state(false);
	let retryTargetId = $state('');
	let retryTargetEventId = $state('');
	let isRetrying = $state(false);

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString(undefined, {
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

	function handleProviderChange(value: string) {
		providerFilter = value;
		updateFilters({ provider: value || undefined });
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		updateFilters({ status: value || undefined });
	}

	function handleEventTypeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		updateFilters({ eventType: target.value || undefined });
	}

	function handleEventTypeKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleEventTypeChange(e);
		}
	}

	function applyDateFilter() {
		updateFilters({
			startDate: startDate || undefined,
			endDate: endDate || undefined
		});
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(pageNum));
		goto(`?${params.toString()}`);
	}

	async function openDetail(webhookId: string) {
		isLoadingDetail = true;
		detailSheetOpen = true;
		try {
			const result = await getAdminWebhookDetail(webhookId);
			selectedEvent = result.event;
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to load webhook details'));
			detailSheetOpen = false;
		} finally {
			isLoadingDetail = false;
		}
	}

	function triggerRetry(id: string, eventId: string) {
		retryTargetId = id;
		retryTargetEventId = eventId;
		retryDialogOpen = true;
	}

	async function confirmRetry() {
		isRetrying = true;
		try {
			await retryAdminWebhook(retryTargetId);
			toast.success('Webhook event queued for retry');
			// Update detail if viewing the same event
			if (selectedEvent && selectedEvent.id === retryTargetId) {
				const result = await getAdminWebhookDetail(retryTargetId);
				selectedEvent = result.event;
			}
			await invalidate('app:webhooks');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to retry webhook event'));
		} finally {
			isRetrying = false;
		}
	}

	function getStatusBadgeVariant(
		status: string
	): 'default' | 'destructive' | 'secondary' | 'outline' {
		if (status === 'processed') return 'default';
		if (status === 'failed') return 'destructive';
		if (status === 'pending') return 'secondary';
		return 'outline';
	}

	const providerOptions = [
		{ value: '', label: 'All Providers' },
		{ value: 'dodo', label: 'Dodo' },
		{ value: 'razorpay', label: 'Razorpay' },
		{ value: 'stripe', label: 'Stripe' }
	];

	const statusOptions = [
		{ value: '', label: 'All Statuses' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'processed', label: 'Processed' },
		{ value: 'failed', label: 'Failed' }
	];
</script>

<svelte:head>
	<title>Webhooks | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Webhooks</h1>
			<p class="text-muted-foreground">Monitor and manage incoming webhook events</p>
		</div>
		<div class="flex items-center gap-2">
			<Webhook class="h-5 w-5 text-muted-foreground" />
			<Badge variant="secondary" class="text-lg px-4 py-2">
				{data.total} events
			</Badge>
		</div>
	</div>

	<!-- Filters -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-wrap gap-4 items-end">
				<div class="space-y-1">
					<Label class="text-xs">Provider</Label>
					<Select.Root type="single" value={providerFilter} onValueChange={(v) => handleProviderChange(v)}>
						<Select.Trigger class="w-[180px]">
							{providerOptions.find(o => o.value === providerFilter)?.label || 'All Providers'}
						</Select.Trigger>
						<Select.Content>
							{#each providerOptions as option}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-1">
					<Label class="text-xs">Status</Label>
					<Select.Root type="single" value={statusFilter} onValueChange={(v) => handleStatusChange(v)}>
						<Select.Trigger class="w-[180px]">
							{statusOptions.find(o => o.value === statusFilter)?.label || 'All Statuses'}
						</Select.Trigger>
						<Select.Content>
							{#each statusOptions as option}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-1">
					<Label for="eventTypeFilter" class="text-xs">Event Type</Label>
					<Input
						type="text"
						id="eventTypeFilter"
						bind:value={eventTypeFilter}
						placeholder="e.g. payment.completed"
						class="w-[200px] h-10"
						onkeydown={handleEventTypeKeydown}
					/>
				</div>

				<div class="space-y-1">
					<Label for="webhookStartDate" class="text-xs">Start Date</Label>
					<Input
						type="date"
						id="webhookStartDate"
						bind:value={startDate}
						class="w-[150px] h-10"
					/>
				</div>
				<div class="space-y-1">
					<Label for="webhookEndDate" class="text-xs">End Date</Label>
					<Input
						type="date"
						id="webhookEndDate"
						bind:value={endDate}
						class="w-[150px] h-10"
					/>
				</div>
				<Button variant="outline" size="sm" onclick={applyDateFilter} class="h-10">
					Apply Dates
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Table -->
	<Card.Root>
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Event ID</Table.Head>
						<Table.Head>Provider</Table.Head>
						<Table.Head>Event Type</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Retries</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head>Processed</Table.Head>
						<Table.Head class="w-[100px]">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.data as webhook}
						<Table.Row
							class="cursor-pointer hover:bg-muted/50"
							onclick={() => openDetail(webhook.id)}
						>
							<Table.Cell>
								<code class="text-xs bg-muted px-1.5 py-0.5 rounded">
									{webhook.eventId.length > 20
										? webhook.eventId.slice(0, 20) + '...'
										: webhook.eventId}
								</code>
							</Table.Cell>
							<Table.Cell class="capitalize">{webhook.provider}</Table.Cell>
							<Table.Cell>
								<code class="text-xs">{webhook.eventType}</code>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={getStatusBadgeVariant(webhook.status)}>
									{webhook.status}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								{#if webhook.retryCount > 0}
									<Badge variant="outline">{webhook.retryCount}</Badge>
								{:else}
									<span class="text-muted-foreground text-sm">0</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm whitespace-nowrap">
								{formatDate(webhook.createdAt)}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm whitespace-nowrap">
								{#if webhook.processedAt}
									{formatDate(webhook.processedAt)}
								{:else}
									<span class="text-muted-foreground">-</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										onclick={(e: MouseEvent) => {
											e.stopPropagation();
											openDetail(webhook.id);
										}}
										aria-label="View webhook details"
									>
										<Eye class="h-4 w-4" />
									</Button>
									{#if webhook.status === 'failed'}
										<Button
											variant="ghost"
											size="icon"
											onclick={(e: MouseEvent) => {
												e.stopPropagation();
												triggerRetry(webhook.id, webhook.eventId);
											}}
											disabled={isRetrying}
											aria-label="Retry webhook"
										>
											<RefreshCw class="h-4 w-4" />
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={8} class="text-center py-12 text-muted-foreground">
								No webhook events found
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Root>

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Showing {(data.page - 1) * data.limit + 1} to {Math.min(
					data.page * data.limit,
					data.total
				)} of {data.total} events
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

<!-- Detail Sheet -->
<Sheet.Root bind:open={detailSheetOpen}>
	<Sheet.Content class="sm:max-w-xl overflow-y-auto">
		<Sheet.Header>
			<Sheet.Title>Webhook Event Details</Sheet.Title>
			<Sheet.Description>
				{#if selectedEvent}
					Full details for event <code class="text-xs bg-muted px-1 py-0.5 rounded"
						>{selectedEvent.eventId}</code
					>
				{:else}
					Loading event details...
				{/if}
			</Sheet.Description>
		</Sheet.Header>

		{#if isLoadingDetail}
			<div class="flex items-center justify-center py-12">
				<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		{:else if selectedEvent}
			<div class="space-y-6 py-4">
				<!-- Summary Fields -->
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1">
						<p class="text-xs text-muted-foreground font-medium">Provider</p>
						<p class="text-sm capitalize">{selectedEvent.provider}</p>
					</div>
					<div class="space-y-1">
						<p class="text-xs text-muted-foreground font-medium">Status</p>
						<Badge variant={getStatusBadgeVariant(selectedEvent.status)}>
							{selectedEvent.status}
						</Badge>
					</div>
					<div class="space-y-1">
						<p class="text-xs text-muted-foreground font-medium">Event Type</p>
						<code class="text-sm">{selectedEvent.eventType}</code>
					</div>
					<div class="space-y-1">
						<p class="text-xs text-muted-foreground font-medium">Retry Count</p>
						<p class="text-sm">{selectedEvent.retryCount}</p>
					</div>
					<div class="space-y-1">
						<p class="text-xs text-muted-foreground font-medium">Created</p>
						<p class="text-sm">{formatDate(selectedEvent.createdAt)}</p>
					</div>
					<div class="space-y-1">
						<p class="text-xs text-muted-foreground font-medium">Processed</p>
						<p class="text-sm">
							{selectedEvent.processedAt ? formatDate(selectedEvent.processedAt) : 'Not yet'}
						</p>
					</div>
				</div>

				<!-- Event ID -->
				<div class="space-y-1">
					<p class="text-xs text-muted-foreground font-medium">Event ID</p>
					<code class="text-xs bg-muted px-2 py-1 rounded block break-all">
						{selectedEvent.eventId}
					</code>
				</div>

				<!-- Error Message -->
				{#if selectedEvent.errorMessage}
					<div class="space-y-1">
						<p class="text-xs text-muted-foreground font-medium">Error Message</p>
						<div class="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
							<p class="text-sm text-destructive">{selectedEvent.errorMessage}</p>
						</div>
					</div>
				{/if}

				<!-- Payload -->
				<div class="space-y-1">
					<p class="text-xs text-muted-foreground font-medium">Payload</p>
					<div class="max-h-[400px] overflow-auto">
						<pre
							class="text-xs bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all"
						>{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
					</div>
				</div>

				<!-- Retry Button for Failed Events -->
				{#if selectedEvent.status === 'failed'}
					<div class="pt-2">
						<Button
							variant="outline"
							onclick={() => {
								if (selectedEvent) {
									triggerRetry(selectedEvent.id, selectedEvent.eventId);
								}
							}}
							disabled={isRetrying}
							class="w-full"
						>
							<RefreshCw class="h-4 w-4 mr-2" />
							Retry This Event
						</Button>
					</div>
				{/if}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>

<!-- Retry Confirmation Dialog -->
<ConfirmDialog
	bind:open={retryDialogOpen}
	title="Retry Webhook Event"
	description="Are you sure you want to retry webhook event {retryTargetEventId}? This will reset its status to pending and increment the retry count."
	confirmLabel="Retry"
	onConfirm={confirmRetry}
/>
