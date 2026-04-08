<script lang="ts">
	import type { PageData } from './$types';
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		IconPlus,
		IconTrash,
		IconSend,
		IconLoader2,
		IconMail,
		IconMessage,
		IconChartBar,
		IconChevronRight
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import {
		createCampaign,
		sendCampaign,
		getCampaignStats,
		deleteCampaign,
		type Campaign,
		type CampaignChannel,
		type CampaignStatus,
		type CampaignStatsResponse,
		type Segment,
		type CreateCampaignPayload
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatDate } from '$lib/utils/formatting';

	let { data }: { data: PageData } = $props();

	let campaigns = $state<Campaign[]>((data as any).campaigns || []);
	let segments = $state<Segment[]>((data as any).segments || []);
	let showCreateDialog = $state(false);
	let showStatsDialog = $state(false);
	let isSubmitting = $state(false);
	let isSending = $state<string | null>(null);
	let isLoadingStats = $state(false);

	// Delete dialog
	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state('');

	// Stats dialog
	let statsData = $state<CampaignStatsResponse | null>(null);

	// Form state
	let formName = $state('');
	let formSegmentId = $state('');
	let formChannel = $state<CampaignChannel>('email');
	let formSubject = $state('');
	let formBody = $state('');
	let formScheduleMode = $state<'now' | 'later'>('now');
	let formScheduledAt = $state('');

	$effect(() => {
		campaigns = (data as any).campaigns || [];
		segments = (data as any).segments || [];
	});

	const channelOptions: { value: CampaignChannel; label: string }[] = [
		{ value: 'email', label: 'Email' },
		{ value: 'sms', label: 'SMS' },
		{ value: 'both', label: 'Email + SMS' }
	];

	function resetForm() {
		formName = '';
		formSegmentId = '';
		formChannel = 'email';
		formSubject = '';
		formBody = '';
		formScheduleMode = 'now';
		formScheduledAt = '';
	}

	function getStatusInfo(status: CampaignStatus) {
		switch (status) {
			case 'draft':
				return { label: 'Draft', status: 'neutral' as const };
			case 'scheduled':
				return { label: 'Scheduled', status: 'info' as const };
			case 'sending':
				return { label: 'Sending', status: 'warning' as const };
			case 'sent':
				return { label: 'Sent', status: 'success' as const };
			case 'failed':
				return { label: 'Failed', status: 'error' as const };
			default:
				return { label: status, status: 'neutral' as const };
		}
	}

	function getChannelBadge(channel: CampaignChannel) {
		switch (channel) {
			case 'email':
				return { label: 'Email', variant: 'default' as const };
			case 'sms':
				return { label: 'SMS', variant: 'secondary' as const };
			case 'both':
				return { label: 'Email + SMS', variant: 'outline' as const };
		}
	}

	async function handleCreate() {
		if (!formName.trim()) {
			toast.error('Campaign name is required');
			return;
		}
		if (!formBody.trim()) {
			toast.error('Message body is required');
			return;
		}
		if ((formChannel === 'email' || formChannel === 'both') && !formSubject.trim()) {
			toast.error('Email subject is required');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateCampaignPayload = {
				name: formName.trim(),
				channel: formChannel,
				body: formBody.trim(),
				segmentId: formSegmentId || undefined,
				subject: formSubject.trim() || undefined,
				scheduledAt:
					formScheduleMode === 'later' && formScheduledAt
						? new Date(formScheduledAt).toISOString()
						: undefined
			};
			await createCampaign((data as any).businessId, payload);
			toast.success('Campaign created');
			showCreateDialog = false;
			resetForm();
			await invalidate('app:campaigns');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSubmitting = false;
		}
	}

	async function handleSend(campaignId: string) {
		isSending = campaignId;
		try {
			const result = await sendCampaign((data as any).businessId, campaignId);
			toast.success(result.message);
			await invalidate('app:campaigns');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSending = null;
		}
	}

	async function handleViewStats(campaignId: string) {
		isLoadingStats = true;
		statsData = null;
		showStatsDialog = true;
		try {
			statsData = await getCampaignStats((data as any).businessId, campaignId);
		} catch (error) {
			toast.error(userFriendlyError(error));
			showStatsDialog = false;
		} finally {
			isLoadingStats = false;
		}
	}

	function confirmDelete(campaignId: string) {
		deleteTargetId = campaignId;
		deleteDialogOpen = true;
	}

	async function handleDelete() {
		try {
			await deleteCampaign((data as any).businessId, deleteTargetId);
			toast.success('Campaign deleted');
			await invalidate('app:campaigns');
		} catch (error) {
			toast.error(userFriendlyError(error));
		}
	}

	function funnelPercent(value: number, total: number): number {
		if (total === 0) return 0;
		return Math.round((value / total) * 100);
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Page Header -->
	<PageHeader title="Campaigns" description="Send targeted messages to your customer segments">
		{#snippet actions()}
			<Button size="sm" onclick={() => { resetForm(); showCreateDialog = true; }}>
				<IconPlus class="mr-2 h-4 w-4" />
				Create Campaign
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Stats -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Total Campaigns</p>
				<p class="text-2xl font-bold">{campaigns.length}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Draft</p>
				<p class="text-2xl font-bold text-muted-foreground">
					{campaigns.filter((c) => c.status === 'draft').length}
				</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Sent</p>
				<p class="text-2xl font-bold text-emerald-600">
					{campaigns.filter((c) => c.status === 'sent').length}
				</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Scheduled</p>
				<p class="text-2xl font-bold text-blue-600">
					{campaigns.filter((c) => c.status === 'scheduled').length}
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Campaigns Table -->
	{#if campaigns.length === 0}
		<EmptyState
			type="empty"
			title="No campaigns yet"
			description="Create your first campaign to start reaching your customers."
			actionLabel="Create Campaign"
			onAction={() => { resetForm(); showCreateDialog = true; }}
		/>
	{:else}
		<Card.Root>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head class="hidden md:table-cell">Segment</Table.Head>
						<Table.Head>Channel</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="hidden lg:table-cell text-right">Sent</Table.Head>
						<Table.Head class="hidden lg:table-cell text-right">Delivered</Table.Head>
						<Table.Head class="hidden lg:table-cell text-right">Opened</Table.Head>
						<Table.Head class="hidden sm:table-cell">Created</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each campaigns as campaign (campaign.id)}
						{@const statusInfo = getStatusInfo(campaign.status as CampaignStatus)}
						{@const channelInfo = getChannelBadge(campaign.channel)}
						{@const stats = campaign.stats || { sent: 0, delivered: 0, opened: 0, failed: 0 }}
						<Table.Row
							class="cursor-pointer"
							onclick={() => handleViewStats(campaign.id)}
						>
							<Table.Cell class="font-medium">{campaign.name}</Table.Cell>
							<Table.Cell class="hidden md:table-cell">
								{#if campaign.segment}
									<Badge variant="outline">{campaign.segment.name}</Badge>
								{:else}
									<span class="text-muted-foreground">All Customers</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<Badge variant={channelInfo.variant}>
									{#if campaign.channel === 'email' || campaign.channel === 'both'}
										<IconMail class="mr-1 h-3 w-3" />
									{/if}
									{#if campaign.channel === 'sms' || campaign.channel === 'both'}
										<IconMessage class="mr-1 h-3 w-3" />
									{/if}
									{channelInfo.label}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								<StatusPill label={statusInfo.label} status={statusInfo.status} />
							</Table.Cell>
							<Table.Cell class="hidden lg:table-cell text-right">
								{stats.sent}
							</Table.Cell>
							<Table.Cell class="hidden lg:table-cell text-right">
								{stats.delivered}
							</Table.Cell>
							<Table.Cell class="hidden lg:table-cell text-right">
								{stats.opened}
							</Table.Cell>
							<Table.Cell class="hidden sm:table-cell text-muted-foreground">
								{formatDate(campaign.createdAt)}
							</Table.Cell>
							<Table.Cell class="text-right">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="flex items-center justify-end gap-1" onclick={(e) => e.stopPropagation()}>
									{#if campaign.status === 'draft' || campaign.status === 'scheduled'}
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8"
											disabled={isSending === campaign.id}
											onclick={() => handleSend(campaign.id)}
											title="Send now"
										>
											{#if isSending === campaign.id}
												<IconLoader2 class="h-4 w-4 animate-spin" />
											{:else}
												<IconSend class="h-4 w-4" />
											{/if}
										</Button>
									{/if}
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										onclick={() => handleViewStats(campaign.id)}
										title="View stats"
									>
										<IconChartBar class="h-4 w-4" />
									</Button>
									{#if campaign.status !== 'sending'}
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-destructive"
											onclick={() => confirmDelete(campaign.id)}
										>
											<IconTrash class="h-4 w-4" />
										</Button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>
	{/if}
</div>

<!-- Create Campaign Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Create Campaign</Dialog.Title>
			<Dialog.Description>
				Compose a message and choose your audience.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="camp-name" class="text-sm font-medium">Campaign Name *</label>
				<Input id="camp-name" bind:value={formName} placeholder="e.g., Summer Sale Announcement" />
			</div>

			<!-- Segment Selection -->
			<div class="grid gap-2">
				<label class="text-sm font-medium">Target Segment</label>
				<Select.Root type="single" bind:value={formSegmentId}>
					<Select.Trigger class="w-full">
						{#if formSegmentId}
							{segments.find((s) => s.id === formSegmentId)?.name || 'Select segment'}
						{:else}
							All Customers
						{/if}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Customers</Select.Item>
						{#each segments as segment}
							<Select.Item value={segment.id}>
								{segment.name} ({segment.customerCount} customers)
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<p class="text-xs text-muted-foreground">
					Leave as "All Customers" to send to everyone.
				</p>
			</div>

			<!-- Channel -->
			<div class="grid gap-2">
				<label class="text-sm font-medium">Channel *</label>
				<Select.Root type="single" bind:value={formChannel}>
					<Select.Trigger class="w-full">
						{channelOptions.find((o) => o.value === formChannel)?.label || 'Select channel'}
					</Select.Trigger>
					<Select.Content>
						{#each channelOptions as opt}
							<Select.Item value={opt.value}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Subject (for email) -->
			{#if formChannel === 'email' || formChannel === 'both'}
				<div class="grid gap-2">
					<label for="camp-subject" class="text-sm font-medium">Email Subject *</label>
					<Input id="camp-subject" bind:value={formSubject} placeholder="Your email subject line" />
				</div>
			{/if}

			<!-- Body -->
			<div class="grid gap-2">
				<label for="camp-body" class="text-sm font-medium">Message Body *</label>
				<Textarea
					id="camp-body"
					bind:value={formBody}
					placeholder="Write your message here..."
					rows={4}
				/>
			</div>

			<!-- Schedule -->
			<div class="grid gap-2">
				<label class="text-sm font-medium">Delivery</label>
				<div class="flex gap-3">
					<label class="flex items-center gap-2 text-sm">
						<input
							type="radio"
							name="schedule"
							value="now"
							bind:group={formScheduleMode}
							class="rounded border-input"
						/>
						Send after creation (draft)
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input
							type="radio"
							name="schedule"
							value="later"
							bind:group={formScheduleMode}
							class="rounded border-input"
						/>
						Schedule for later
					</label>
				</div>
				{#if formScheduleMode === 'later'}
					<Input type="datetime-local" bind:value={formScheduledAt} />
				{/if}
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showCreateDialog = false)}>Cancel</Button>
			<Button onclick={handleCreate} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Campaign
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Campaign Stats Dialog -->
<Dialog.Root bind:open={showStatsDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Campaign Stats</Dialog.Title>
			{#if statsData}
				<Dialog.Description>
					Delivery funnel for "{statsData.campaign.name}"
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<div class="py-4">
			{#if isLoadingStats}
				<div class="flex items-center justify-center py-12">
					<IconLoader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else if statsData}
				{@const funnel = statsData.funnel}
				{@const total = funnel.total || 1}

				<!-- Campaign Info -->
				<div class="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
					<Badge variant="outline">{statsData.campaign.channel}</Badge>
					<StatusPill
						label={getStatusInfo(statsData.campaign.status as CampaignStatus).label}
						status={getStatusInfo(statsData.campaign.status as CampaignStatus).status}
					/>
					{#if statsData.campaign.sentAt}
						<span>Sent {formatDate(statsData.campaign.sentAt)}</span>
					{/if}
				</div>

				<!-- Delivery Funnel -->
				<div class="grid gap-3">
					<!-- Sent -->
					<div class="grid gap-1">
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">Sent</span>
							<span>{funnel.sent} <span class="text-muted-foreground">({funnelPercent(funnel.sent, total)}%)</span></span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-blue-500 transition-all"
								style="width: {funnelPercent(funnel.sent, total)}%"
							></div>
						</div>
					</div>

					<div class="flex justify-center">
						<IconChevronRight class="h-4 w-4 rotate-90 text-muted-foreground" />
					</div>

					<!-- Delivered -->
					<div class="grid gap-1">
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">Delivered</span>
							<span>{funnel.delivered} <span class="text-muted-foreground">({funnelPercent(funnel.delivered, total)}%)</span></span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-emerald-500 transition-all"
								style="width: {funnelPercent(funnel.delivered, total)}%"
							></div>
						</div>
					</div>

					<div class="flex justify-center">
						<IconChevronRight class="h-4 w-4 rotate-90 text-muted-foreground" />
					</div>

					<!-- Opened -->
					<div class="grid gap-1">
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">Opened</span>
							<span>{funnel.opened} <span class="text-muted-foreground">({funnelPercent(funnel.opened, total)}%)</span></span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-violet-500 transition-all"
								style="width: {funnelPercent(funnel.opened, total)}%"
							></div>
						</div>
					</div>

					<!-- Failed (if any) -->
					{#if funnel.failed > 0}
						<div class="mt-2 grid gap-1">
							<div class="flex items-center justify-between text-sm">
								<span class="font-medium text-destructive">Failed</span>
								<span class="text-destructive">{funnel.failed} <span class="text-muted-foreground">({funnelPercent(funnel.failed, total)}%)</span></span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full bg-destructive transition-all"
									style="width: {funnelPercent(funnel.failed, total)}%"
								></div>
							</div>
						</div>
					{/if}

					<!-- Pending (if any) -->
					{#if funnel.pending > 0}
						<div class="mt-1 grid gap-1">
							<div class="flex items-center justify-between text-sm">
								<span class="font-medium text-muted-foreground">Pending</span>
								<span class="text-muted-foreground">{funnel.pending} ({funnelPercent(funnel.pending, total)}%)</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full bg-amber-400 transition-all"
									style="width: {funnelPercent(funnel.pending, total)}%"
								></div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Summary Stats -->
				<div class="mt-4 grid grid-cols-4 gap-2">
					<div class="rounded-md border p-2 text-center">
						<p class="text-lg font-bold">{statsData.stats.sent}</p>
						<p class="text-xs text-muted-foreground">Sent</p>
					</div>
					<div class="rounded-md border p-2 text-center">
						<p class="text-lg font-bold text-emerald-600">{statsData.stats.delivered}</p>
						<p class="text-xs text-muted-foreground">Delivered</p>
					</div>
					<div class="rounded-md border p-2 text-center">
						<p class="text-lg font-bold text-violet-600">{statsData.stats.opened}</p>
						<p class="text-xs text-muted-foreground">Opened</p>
					</div>
					<div class="rounded-md border p-2 text-center">
						<p class="text-lg font-bold text-destructive">{statsData.stats.failed}</p>
						<p class="text-xs text-muted-foreground">Failed</p>
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showStatsDialog = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Campaign"
	description="Are you sure you want to delete this campaign? This action cannot be undone."
	confirmLabel="Delete"
	variant="destructive"
	onConfirm={handleDelete}
/>
