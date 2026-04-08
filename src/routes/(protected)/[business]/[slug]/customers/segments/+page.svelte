<script lang="ts">
	import type { PageData } from './$types';
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
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
		IconEye,
		IconLoader2,
		IconRefresh,
		IconUsers,
		IconFilter
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { EmptyState } from '$lib/components/data-display';
	import {
		createSegment,
		previewSegment,
		refreshSegment,
		deleteSegment,
		type Segment,
		type SegmentRules,
		type SegmentPreviewCustomer,
		type CreateSegmentPayload
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatDate } from '$lib/utils/formatting';

	let { data }: { data: PageData } = $props();

	let segments = $state<Segment[]>((data as any).segments || []);
	let showCreateDialog = $state(false);
	let showPreviewDialog = $state(false);
	let isSubmitting = $state(false);
	let isPreviewing = $state(false);
	let isRefreshing = $state<string | null>(null);

	// Delete dialog
	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state('');

	// Preview state
	let previewCount = $state(0);
	let previewCustomers = $state<SegmentPreviewCustomer[]>([]);

	// Form state
	let formName = $state('');
	let formAutoRefresh = $state(false);

	// Rule builder state
	interface RuleRow {
		field: string;
		operator: string;
		value: string;
	}

	let ruleRows = $state<RuleRow[]>([{ field: 'minOrders', operator: 'gte', value: '' }]);

	const ruleFields = [
		{ value: 'minOrders', label: 'Order Count' },
		{ value: 'minSpend', label: 'Total Spend' },
		{ value: 'lastVisitDays', label: 'Last Visit (days)' },
		{ value: 'tags', label: 'Tags' },
		{ value: 'status', label: 'Status' }
	];

	const statusOptions = [
		{ value: 'active', label: 'Active' },
		{ value: 'inactive', label: 'Inactive' }
	];

	$effect(() => {
		segments = (data as any).segments || [];
	});

	function resetForm() {
		formName = '';
		formAutoRefresh = false;
		ruleRows = [{ field: 'minOrders', operator: 'gte', value: '' }];
		previewCount = 0;
		previewCustomers = [];
	}

	function addRuleRow() {
		const usedFields = ruleRows.map((r) => r.field);
		const nextField = ruleFields.find((f) => !usedFields.includes(f.value));
		if (nextField) {
			ruleRows = [...ruleRows, { field: nextField.value, operator: 'gte', value: '' }];
		}
	}

	function removeRuleRow(index: number) {
		ruleRows = ruleRows.filter((_, i) => i !== index);
	}

	function buildRules(): SegmentRules {
		const rules: SegmentRules = {};
		for (const row of ruleRows) {
			if (!row.value.trim()) continue;
			switch (row.field) {
				case 'minOrders':
					rules.minOrders = Number(row.value);
					break;
				case 'minSpend':
					rules.minSpend = Number(row.value);
					break;
				case 'lastVisitDays':
					rules.lastVisitDays = Number(row.value);
					break;
				case 'tags':
					rules.tags = row.value
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean);
					break;
				case 'status':
					rules.status = row.value;
					break;
			}
		}
		return rules;
	}

	function formatRulesSummary(rules: SegmentRules): string {
		const parts: string[] = [];
		if (rules.minOrders) parts.push(`Orders >= ${rules.minOrders}`);
		if (rules.minSpend) parts.push(`Spend >= $${rules.minSpend}`);
		if (rules.lastVisitDays) parts.push(`Visited in ${rules.lastVisitDays}d`);
		if (rules.tags?.length) parts.push(`Tags: ${rules.tags.join(', ')}`);
		if (rules.status) parts.push(`Status: ${rules.status}`);
		return parts.length > 0 ? parts.join(' + ') : 'No rules';
	}

	async function handlePreview() {
		const rules = buildRules();
		const hasValues = ruleRows.some((r) => r.value.trim());
		if (!hasValues) {
			toast.error('Add at least one rule with a value');
			return;
		}

		isPreviewing = true;
		try {
			const result = await previewSegment((data as any).businessId, rules);
			previewCount = result.count;
			previewCustomers = result.customers;
			showPreviewDialog = true;
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isPreviewing = false;
		}
	}

	async function handleCreate() {
		if (!formName.trim()) {
			toast.error('Segment name is required');
			return;
		}
		const rules = buildRules();
		const hasValues = ruleRows.some((r) => r.value.trim());
		if (!hasValues) {
			toast.error('Add at least one rule with a value');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateSegmentPayload = {
				name: formName.trim(),
				rules,
				autoRefresh: formAutoRefresh
			};
			await createSegment((data as any).businessId, payload);
			toast.success('Segment created');
			showCreateDialog = false;
			resetForm();
			await invalidate('app:segments');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSubmitting = false;
		}
	}

	async function handleRefresh(segmentId: string) {
		isRefreshing = segmentId;
		try {
			await refreshSegment((data as any).businessId, segmentId);
			toast.success('Segment refreshed');
			await invalidate('app:segments');
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isRefreshing = null;
		}
	}

	function confirmDelete(segmentId: string) {
		deleteTargetId = segmentId;
		deleteDialogOpen = true;
	}

	async function handleDelete() {
		try {
			await deleteSegment((data as any).businessId, deleteTargetId);
			toast.success('Segment deleted');
			await invalidate('app:segments');
		} catch (error) {
			toast.error(userFriendlyError(error));
		}
	}

	function getFieldLabel(field: string): string {
		return ruleFields.find((f) => f.value === field)?.label || field;
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Page Header -->
	<PageHeader title="Customer Segments" description="Group customers by behavior and attributes for targeted campaigns">
		{#snippet actions()}
			<Button size="sm" onclick={() => { resetForm(); showCreateDialog = true; }}>
				<IconPlus class="mr-2 h-4 w-4" />
				Create Segment
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Stats -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Total Segments</p>
				<p class="text-2xl font-bold">{segments.length}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Auto-Refresh</p>
				<p class="text-2xl font-bold text-blue-600">
					{segments.filter((s) => s.autoRefresh).length}
				</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Total Customers Segmented</p>
				<p class="text-2xl font-bold text-emerald-600">
					{segments.reduce((sum, s) => sum + s.customerCount, 0)}
				</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Segments Table -->
	{#if segments.length === 0}
		<EmptyState
			type="empty"
			title="No segments yet"
			description="Create your first customer segment to start targeting specific groups."
			actionLabel="Create Segment"
			onAction={() => { resetForm(); showCreateDialog = true; }}
		/>
	{:else}
		<Card.Root>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head class="text-right">Customers</Table.Head>
						<Table.Head class="hidden md:table-cell">Rules</Table.Head>
						<Table.Head class="hidden sm:table-cell">Auto-Refresh</Table.Head>
						<Table.Head class="hidden sm:table-cell">Created</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each segments as segment (segment.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{segment.name}</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-1.5">
									<IconUsers class="h-3.5 w-3.5 text-muted-foreground" />
									{segment.customerCount}
								</div>
							</Table.Cell>
							<Table.Cell class="hidden max-w-xs truncate md:table-cell">
								<span class="text-sm text-muted-foreground">
									{formatRulesSummary(segment.rules)}
								</span>
							</Table.Cell>
							<Table.Cell class="hidden sm:table-cell">
								<Badge variant={segment.autoRefresh ? 'default' : 'secondary'}>
									{segment.autoRefresh ? 'On' : 'Off'}
								</Badge>
							</Table.Cell>
							<Table.Cell class="hidden sm:table-cell text-muted-foreground">
								{formatDate(segment.createdAt)}
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-1">
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										disabled={isRefreshing === segment.id}
										onclick={() => handleRefresh(segment.id)}
										title="Refresh count"
									>
										{#if isRefreshing === segment.id}
											<IconLoader2 class="h-4 w-4 animate-spin" />
										{:else}
											<IconRefresh class="h-4 w-4" />
										{/if}
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-destructive"
										onclick={() => confirmDelete(segment.id)}
									>
										<IconTrash class="h-4 w-4" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>
	{/if}
</div>

<!-- Create Segment Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Create Segment</Dialog.Title>
			<Dialog.Description>
				Define rules to group customers by their behavior and attributes.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="seg-name" class="text-sm font-medium">Segment Name *</label>
				<Input id="seg-name" bind:value={formName} placeholder="e.g., High Spenders, VIP Regulars" />
			</div>

			<!-- Rule Builder -->
			<div class="grid gap-3">
				<div class="flex items-center justify-between">
					<label class="text-sm font-medium">Conditions</label>
					{#if ruleRows.length < ruleFields.length}
						<Button variant="outline" size="sm" onclick={addRuleRow}>
							<IconPlus class="mr-1 h-3 w-3" />
							Add Condition
						</Button>
					{/if}
				</div>

				{#each ruleRows as row, i}
					<div class="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
						<Select.Root type="single" bind:value={row.field}>
							<Select.Trigger class="w-[140px]">
								{getFieldLabel(row.field)}
							</Select.Trigger>
							<Select.Content>
								{#each ruleFields as field}
									<Select.Item value={field.value}>{field.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>

						{#if row.field === 'status'}
							<Select.Root type="single" bind:value={row.value}>
								<Select.Trigger class="flex-1">
									{statusOptions.find((o) => o.value === row.value)?.label || 'Select status'}
								</Select.Trigger>
								<Select.Content>
									{#each statusOptions as opt}
										<Select.Item value={opt.value}>{opt.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						{:else if row.field === 'tags'}
							<Input
								class="flex-1"
								bind:value={row.value}
								placeholder="VIP, Regular (comma-separated)"
							/>
						{:else if row.field === 'lastVisitDays'}
							<span class="text-sm text-muted-foreground">within</span>
							<Input
								class="flex-1"
								type="number"
								min="1"
								bind:value={row.value}
								placeholder="e.g., 30"
							/>
							<span class="text-sm text-muted-foreground">days</span>
						{:else}
							<span class="text-sm text-muted-foreground">>=</span>
							<Input
								class="flex-1"
								type="number"
								min="0"
								bind:value={row.value}
								placeholder={row.field === 'minSpend' ? 'e.g., 500' : 'e.g., 5'}
							/>
						{/if}

						{#if ruleRows.length > 1}
							<Button variant="ghost" size="icon" class="h-8 w-8 shrink-0" onclick={() => removeRuleRow(i)}>
								<IconTrash class="h-3.5 w-3.5" />
							</Button>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Auto-refresh -->
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					id="auto-refresh"
					bind:checked={formAutoRefresh}
					class="rounded border-input"
				/>
				<label for="auto-refresh" class="text-sm">Auto-refresh customer count</label>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handlePreview} disabled={isPreviewing}>
				{#if isPreviewing}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				<IconEye class="mr-2 h-4 w-4" />
				Preview
			</Button>
			<Button onclick={handleCreate} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Segment
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Preview Dialog -->
<Dialog.Root bind:open={showPreviewDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Segment Preview</Dialog.Title>
			<Dialog.Description>
				{previewCount} customer{previewCount !== 1 ? 's' : ''} match your rules.
			</Dialog.Description>
		</Dialog.Header>

		<div class="py-4">
			<div class="mb-4 rounded-lg border bg-muted/30 p-4 text-center">
				<p class="text-3xl font-bold text-primary">{previewCount}</p>
				<p class="text-sm text-muted-foreground">Matching Customers</p>
			</div>

			{#if previewCustomers.length > 0}
				<div class="max-h-64 overflow-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Name</Table.Head>
								<Table.Head>Phone</Table.Head>
								<Table.Head>Status</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each previewCustomers as customer}
								<Table.Row>
									<Table.Cell class="font-medium">{customer.name}</Table.Cell>
									<Table.Cell>{customer.phone}</Table.Cell>
									<Table.Cell>
										<Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
											{customer.status}
										</Badge>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
				{#if previewCount > previewCustomers.length}
					<p class="mt-2 text-center text-xs text-muted-foreground">
						Showing {previewCustomers.length} of {previewCount} matching customers
					</p>
				{/if}
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showPreviewDialog = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Segment"
	description="Are you sure you want to delete this segment? Campaigns using this segment will lose their segment reference."
	confirmLabel="Delete"
	variant="destructive"
	onConfirm={handleDelete}
/>
