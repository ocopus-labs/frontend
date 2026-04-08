<script lang="ts">
	import type { PageData } from './$types';
	import { invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		IconRefresh,
		IconTruckDelivery,
		IconUser,
		IconMapPin,
		IconClock,
		IconCheck
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { EmptyState } from '$lib/components/data-display';
	import {
		assignDelivery,
		updateDeliveryStatus,
		type Delivery,
		type DeliveryDriver,
		type DeliveryStatus
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { canModify } from '$lib/utils/permissions';
	import * as Select from '$lib/components/ui/select';

	let { data }: { data: PageData } = $props();

	let deliveries = $state<Delivery[]>(data.deliveries || []);
	let availableDrivers = $state<DeliveryDriver[]>(data.availableDrivers || []);
	let isRefreshing = $state(false);
	let isSubmitting = $state(false);

	// Assign dialog state
	let assignDialogOpen = $state(false);
	let assignTargetDelivery = $state<Delivery | null>(null);
	let selectedDriverId = $state('');

	const columns: { status: DeliveryStatus; label: string; color: string }[] = [
		{ status: 'pending', label: 'Pending', color: 'bg-gray-100 dark:bg-gray-800' },
		{ status: 'assigned', label: 'Assigned', color: 'bg-blue-50 dark:bg-blue-950' },
		{ status: 'picked_up', label: 'Picked Up', color: 'bg-amber-50 dark:bg-amber-950' },
		{ status: 'in_transit', label: 'In Transit', color: 'bg-purple-50 dark:bg-purple-950' }
	];

	const deliveriesByStatus = $derived(
		columns.map((col) => ({
			...col,
			items: deliveries.filter((d) => d.status === col.status)
		}))
	);

	const totalActive = $derived(deliveries.length);

	function getElapsedTime(createdAt: string): string {
		const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
		if (mins < 60) return `${mins}m`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}

	function getStatusBadgeColor(status: DeliveryStatus) {
		switch (status) {
			case 'pending':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
			case 'assigned':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'picked_up':
				return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
			case 'in_transit':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
			default:
				return '';
		}
	}

	async function handleRefresh() {
		isRefreshing = true;
		try {
			await invalidate('app:deliveries');
			// Re-fetch via page data would be ideal but we manually refresh state from data
			toast.success('Refreshed');
		} catch {
			toast.error('Failed to refresh');
		} finally {
			isRefreshing = false;
		}
	}

	function openAssignDialog(delivery: Delivery) {
		assignTargetDelivery = delivery;
		selectedDriverId = '';
		assignDialogOpen = true;
	}

	async function confirmAssign() {
		if (!assignTargetDelivery || !selectedDriverId) {
			toast.error('Please select a driver');
			return;
		}

		isSubmitting = true;
		try {
			const result = await assignDelivery(data.businessId, {
				orderId: assignTargetDelivery.orderId,
				driverId: selectedDriverId
			});
			deliveries = deliveries.map((d) =>
				d.id === assignTargetDelivery!.id ? result.delivery : d
			);
			toast.success('Delivery assigned successfully');
			assignDialogOpen = false;
			assignTargetDelivery = null;
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to assign delivery'));
		} finally {
			isSubmitting = false;
		}
	}

	async function advanceStatus(delivery: Delivery) {
		const nextStatusMap: Record<string, DeliveryStatus> = {
			assigned: 'picked_up',
			picked_up: 'in_transit',
			in_transit: 'delivered'
		};

		const nextStatus = nextStatusMap[delivery.status];
		if (!nextStatus) return;

		try {
			const result = await updateDeliveryStatus(data.businessId, delivery.id, {
				status: nextStatus
			});

			if (nextStatus === 'delivered') {
				// Remove from active list
				deliveries = deliveries.filter((d) => d.id !== delivery.id);
				toast.success('Delivery completed!');
			} else {
				deliveries = deliveries.map((d) =>
					d.id === delivery.id ? result.delivery : d
				);
				toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`);
			}
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update status'));
		}
	}

	function getNextActionLabel(status: DeliveryStatus): string | null {
		switch (status) {
			case 'assigned':
				return 'Mark Picked Up';
			case 'picked_up':
				return 'Mark In Transit';
			case 'in_transit':
				return 'Mark Delivered';
			default:
				return null;
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="Active Deliveries" description="Track and manage ongoing deliveries">
				{#snippet actions()}
					<Button variant="outline" onclick={handleRefresh} disabled={isRefreshing}>
						{#if isRefreshing}
							<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<IconRefresh class="mr-2 h-4 w-4" />
						{/if}
						Refresh
					</Button>
				{/snippet}
			</PageHeader>

			<!-- Summary -->
			<div class="px-6">
				<div class="flex items-center gap-4 rounded-lg border bg-card p-4">
					<IconTruckDelivery class="h-6 w-6 text-muted-foreground" />
					<div>
						<p class="text-sm text-muted-foreground">Active Deliveries</p>
						<p class="text-2xl font-bold">{totalActive}</p>
					</div>
					<div class="ml-auto flex gap-3">
						{#each deliveriesByStatus as col}
							<div class="text-center">
								<p class="text-xs text-muted-foreground">{col.label}</p>
								<p class="text-lg font-semibold">{col.items.length}</p>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Kanban Board -->
			{#if deliveries.length > 0}
				<div class="overflow-x-auto px-6">
					<div class="flex gap-4" style="min-width: 900px;">
						{#each deliveriesByStatus as column}
							<div class="flex min-w-[220px] flex-1 flex-col gap-3">
								<!-- Column Header -->
								<div class="flex items-center justify-between rounded-lg {column.color} px-3 py-2">
									<h3 class="text-sm font-semibold">{column.label}</h3>
									<Badge variant="secondary" class="text-xs">{column.items.length}</Badge>
								</div>

								<!-- Column Cards -->
								<div class="flex flex-col gap-2">
									{#each column.items as delivery (delivery.id)}
										<div class="rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
											<!-- Order number -->
											<div class="flex items-center justify-between">
												<p class="text-sm font-semibold">
													#{delivery.order?.orderNumber || delivery.orderId.slice(0, 8)}
												</p>
												<div class="flex items-center gap-1 text-xs text-muted-foreground">
													<IconClock class="h-3 w-3" />
													{getElapsedTime(delivery.createdAt)}
												</div>
											</div>

											<!-- Driver -->
											{#if delivery.driver}
												<div class="mt-2 flex items-center gap-1.5 text-sm">
													<IconUser class="h-3.5 w-3.5 text-muted-foreground" />
													<span>{delivery.driver.name}</span>
												</div>
											{:else}
												<div class="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
													<IconUser class="h-3.5 w-3.5" />
													<span class="italic">No driver assigned</span>
												</div>
											{/if}

											<!-- Address -->
											<div class="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
												<IconMapPin class="mt-0.5 h-3 w-3 shrink-0" />
												<span class="line-clamp-2">{delivery.customerAddress || 'No address'}</span>
											</div>

											<!-- Customer name -->
											{#if delivery.customerName}
												<p class="mt-1 text-xs text-muted-foreground">{delivery.customerName}</p>
											{/if}

											<!-- Actions -->
											{#if canModify(data.userRole)}
												<div class="mt-3 flex gap-1">
													{#if delivery.status === 'pending'}
														<Button
															variant="default"
															size="sm"
															class="h-7 w-full text-xs"
															onclick={() => openAssignDialog(delivery)}
														>
															Assign Driver
														</Button>
													{:else}
														{@const nextAction = getNextActionLabel(delivery.status)}
														{#if nextAction}
															<Button
																variant="outline"
																size="sm"
																class="h-7 w-full text-xs"
																onclick={() => advanceStatus(delivery)}
															>
																<IconCheck class="mr-1 h-3 w-3" />
																{nextAction}
															</Button>
														{/if}
													{/if}
												</div>
											{/if}
										</div>
									{/each}

									{#if column.items.length === 0}
										<div class="rounded-lg border border-dashed bg-muted/30 py-8 text-center">
											<p class="text-xs text-muted-foreground">No deliveries</p>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<EmptyState
					type="empty"
					title="No active deliveries"
					description="When deliveries are assigned, they will appear here in a pipeline view."
				/>
			{/if}
		</div>
	</div>
</div>

<!-- Assign Driver Dialog -->
<Dialog.Root bind:open={assignDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Assign Driver</Dialog.Title>
			<Dialog.Description>
				Select a driver for order #{assignTargetDelivery?.order?.orderNumber || assignTargetDelivery?.orderId.slice(0, 8)}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			{#if availableDrivers.length > 0}
				<div class="grid gap-2">
					<label for="driver-select" class="text-sm font-medium">Available Drivers</label>
					<Select.Root type="single" bind:value={selectedDriverId}>
						<Select.Trigger class="w-full">
							{availableDrivers.find((d) => d.id === selectedDriverId)?.name || 'Select a driver'}
						</Select.Trigger>
						<Select.Content>
							{#each availableDrivers as driver}
								<Select.Item value={driver.id}>
									{driver.name} ({driver.vehicleType || 'N/A'})
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{:else}
				<div class="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
					<p class="text-sm text-muted-foreground">No available drivers at the moment</p>
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (assignDialogOpen = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={confirmAssign} disabled={isSubmitting || !selectedDriverId}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Assign
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
