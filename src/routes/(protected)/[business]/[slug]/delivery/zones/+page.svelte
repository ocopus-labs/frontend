<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		IconPlus,
		IconPencil,
		IconMapPin,
		IconClock,
		IconCurrencyDollar
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { EmptyState } from '$lib/components/data-display';
	import {
		createZone,
		updateZone,
		type DeliveryZone,
		type CreateZonePayload
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { canModify } from '$lib/utils/permissions';
	import { SearchInput } from '$lib/components/search';

	let { data }: { data: PageData } = $props();

	let zones = $state<DeliveryZone[]>(data.zones || []);
	let searchQuery = $state('');
	let showAddDialog = $state(false);
	let editingZone = $state<DeliveryZone | null>(null);
	let isSubmitting = $state(false);

	let newZone = $state<{
		name: string;
		deliveryFee: string;
		minOrderAmount: string;
		estimatedMinutes: string;
		polygonText: string;
	}>({
		name: '',
		deliveryFee: '',
		minOrderAmount: '',
		estimatedMinutes: '',
		polygonText: ''
	});

	let editPolygonText = $state('');

	const filteredZones = $derived(
		zones.filter((zone) =>
			zone.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	const stats = $derived({
		total: zones.length,
		active: zones.filter((z) => z.isActive).length,
		avgFee: zones.length > 0
			? (zones.reduce((sum, z) => sum + Number(z.deliveryFee), 0) / zones.length).toFixed(2)
			: '0.00'
	});

	function parsePolygon(text: string): [number, number][] | null {
		try {
			const parsed = JSON.parse(text);
			if (Array.isArray(parsed) && parsed.length >= 3) {
				const valid = parsed.every(
					(p: unknown) => Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number'
				);
				if (valid) return parsed;
			}
			return null;
		} catch {
			return null;
		}
	}

	function formatPolygon(polygon: [number, number][]): string {
		return JSON.stringify(polygon, null, 2);
	}

	async function addZoneFn() {
		if (!newZone.name.trim()) {
			toast.error('Zone name is required');
			return;
		}

		const fee = parseFloat(newZone.deliveryFee);
		const min = parseFloat(newZone.minOrderAmount);
		const est = parseInt(newZone.estimatedMinutes, 10);

		if (isNaN(fee) || fee < 0) {
			toast.error('Valid delivery fee is required');
			return;
		}
		if (isNaN(min) || min < 0) {
			toast.error('Valid minimum order amount is required');
			return;
		}
		if (isNaN(est) || est < 1) {
			toast.error('Valid estimated time (in minutes) is required');
			return;
		}

		const polygon = parsePolygon(newZone.polygonText);
		if (!polygon) {
			toast.error('Valid polygon coordinates required (JSON array of [lat, lng] pairs, minimum 3 points)');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateZonePayload = {
				name: newZone.name,
				polygon,
				deliveryFee: fee,
				minOrderAmount: min,
				estimatedMinutes: est
			};

			const result = await createZone(data.businessId, payload);
			zones = [...zones, result.zone];
			toast.success('Delivery zone created successfully');
			showAddDialog = false;
			newZone = { name: '', deliveryFee: '', minOrderAmount: '', estimatedMinutes: '', polygonText: '' };
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to create zone'));
		} finally {
			isSubmitting = false;
		}
	}

	function editZoneFn(zone: DeliveryZone) {
		editingZone = { ...zone };
		editPolygonText = formatPolygon(zone.polygon);
	}

	async function saveZone() {
		if (!editingZone) return;

		const polygon = parsePolygon(editPolygonText);
		if (!polygon) {
			toast.error('Valid polygon coordinates required');
			return;
		}

		isSubmitting = true;
		try {
			const result = await updateZone(data.businessId, editingZone.id, {
				name: editingZone.name,
				polygon,
				deliveryFee: Number(editingZone.deliveryFee),
				minOrderAmount: Number(editingZone.minOrderAmount),
				estimatedMinutes: editingZone.estimatedMinutes
			});
			zones = zones.map((z) => (z.id === editingZone!.id ? result.zone : z));
			toast.success('Delivery zone updated successfully');
			editingZone = null;
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update zone'));
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="Delivery Zones" description="Manage delivery zones, fees, and estimated times">
				{#snippet actions()}
					{#if canModify(data.userRole)}
						<Button onclick={() => (showAddDialog = true)}>
							<IconPlus class="mr-2 h-4 w-4" />
							Add Zone
						</Button>
					{/if}
				{/snippet}
			</PageHeader>

			<!-- Stats -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-3">
				<div class="rounded-lg border bg-card p-4">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<IconMapPin class="h-4 w-4" />
						Total Zones
					</div>
					<p class="mt-1 text-2xl font-bold">{stats.total}</p>
				</div>
				<div class="rounded-lg border bg-card p-4">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						Active Zones
					</div>
					<p class="mt-1 text-2xl font-bold text-success">{stats.active}</p>
				</div>
				<div class="rounded-lg border bg-card p-4">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<IconCurrencyDollar class="h-4 w-4" />
						Avg Delivery Fee
					</div>
					<p class="mt-1 text-2xl font-bold">{stats.avgFee}</p>
				</div>
			</div>

			<!-- Search -->
			<div class="px-6">
				<SearchInput
					bind:value={searchQuery}
					placeholder="Search zones..."
					debounceMs={300}
					class="max-w-sm"
				/>
			</div>

			<!-- Zones Table -->
			{#if filteredZones.length > 0}
				<!-- Mobile: Card list -->
				<div class="flex flex-col gap-2 px-4 md:hidden">
					{#each filteredZones as zone (zone.id)}
						<div class="rounded-lg border bg-card p-3 {!zone.isActive ? 'opacity-60' : ''}">
							<div class="flex items-center justify-between">
								<p class="font-medium">{zone.name}</p>
								<Badge variant={zone.isActive ? 'default' : 'secondary'}>
									{zone.isActive ? 'Active' : 'Inactive'}
								</Badge>
							</div>
							<div class="mt-2 grid grid-cols-3 gap-2 text-sm">
								<div>
									<p class="text-xs text-muted-foreground">Fee</p>
									<p class="font-medium">{Number(zone.deliveryFee).toFixed(2)}</p>
								</div>
								<div>
									<p class="text-xs text-muted-foreground">Min Order</p>
									<p class="font-medium">{Number(zone.minOrderAmount).toFixed(2)}</p>
								</div>
								<div>
									<p class="text-xs text-muted-foreground">Est. Time</p>
									<p class="font-medium">{zone.estimatedMinutes} min</p>
								</div>
							</div>
							{#if canModify(data.userRole)}
								<div class="mt-2 flex justify-end">
									<Button variant="ghost" size="sm" class="h-7 text-xs" onclick={() => editZoneFn(zone)}>
										<IconPencil class="mr-1 h-3 w-3" /> Edit
									</Button>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Desktop: Table -->
				<div class="hidden px-6 md:block">
					<div class="overflow-x-auto rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Zone Name</Table.Head>
									<Table.Head>Delivery Fee</Table.Head>
									<Table.Head>Min Order</Table.Head>
									<Table.Head>Est. Time</Table.Head>
									<Table.Head>Points</Table.Head>
									<Table.Head>Status</Table.Head>
									{#if canModify(data.userRole)}
										<Table.Head class="text-right">Actions</Table.Head>
									{/if}
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each filteredZones as zone (zone.id)}
									<Table.Row class={!zone.isActive ? 'opacity-60' : ''}>
										<Table.Cell>
											<div class="flex items-center gap-2">
												<IconMapPin class="h-4 w-4 text-muted-foreground" />
												<span class="font-medium">{zone.name}</span>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="flex items-center gap-1">
												<IconCurrencyDollar class="h-3.5 w-3.5 text-muted-foreground" />
												{Number(zone.deliveryFee).toFixed(2)}
											</div>
										</Table.Cell>
										<Table.Cell>{Number(zone.minOrderAmount).toFixed(2)}</Table.Cell>
										<Table.Cell>
											<div class="flex items-center gap-1">
												<IconClock class="h-3.5 w-3.5 text-muted-foreground" />
												{zone.estimatedMinutes} min
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge variant="outline">{zone.polygon.length} pts</Badge>
										</Table.Cell>
										<Table.Cell>
											<Badge variant={zone.isActive ? 'default' : 'secondary'}>
												{zone.isActive ? 'Active' : 'Inactive'}
											</Badge>
										</Table.Cell>
										{#if canModify(data.userRole)}
											<Table.Cell class="text-right">
												<Button variant="ghost" size="sm" onclick={() => editZoneFn(zone)}>
													<IconPencil class="mr-1.5 h-3.5 w-3.5" />
													Edit
												</Button>
											</Table.Cell>
										{/if}
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>
			{:else}
				<EmptyState
					type={zones.length === 0 ? 'empty' : 'no-results'}
					title={zones.length === 0 ? 'No delivery zones yet' : 'No zones found'}
					description={zones.length === 0 ? 'Create your first delivery zone to define coverage areas.' : 'Try adjusting your search.'}
					actionLabel={canModify(data.userRole) ? 'Add Zone' : undefined}
					onAction={canModify(data.userRole) ? () => (showAddDialog = true) : undefined}
				/>
			{/if}
		</div>
	</div>
</div>

<!-- Add Zone Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Delivery Zone</Dialog.Title>
			<Dialog.Description>Define a new delivery area with fee and estimated time</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="zone-name" class="text-sm font-medium">Zone Name *</label>
				<Input id="zone-name" autofocus bind:value={newZone.name} placeholder="e.g., Downtown Area" />
			</div>
			<div class="grid grid-cols-3 gap-4">
				<div class="grid gap-2">
					<label for="zone-fee" class="text-sm font-medium">Delivery Fee *</label>
					<Input id="zone-fee" type="number" step="0.01" min="0" bind:value={newZone.deliveryFee} placeholder="0.00" />
				</div>
				<div class="grid gap-2">
					<label for="zone-min" class="text-sm font-medium">Min Order *</label>
					<Input id="zone-min" type="number" step="0.01" min="0" bind:value={newZone.minOrderAmount} placeholder="0.00" />
				</div>
				<div class="grid gap-2">
					<label for="zone-time" class="text-sm font-medium">Est. Minutes *</label>
					<Input id="zone-time" type="number" min="1" bind:value={newZone.estimatedMinutes} placeholder="30" />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="zone-polygon" class="text-sm font-medium">Polygon Coordinates *</label>
				<textarea
					id="zone-polygon"
					bind:value={newZone.polygonText}
					placeholder={'[\n  [28.6139, 77.2090],\n  [28.6200, 77.2150],\n  [28.6100, 77.2200]\n]'}
					rows="5"
					class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
				></textarea>
				<p class="text-xs text-muted-foreground">
					JSON array of [latitude, longitude] pairs. Minimum 3 points to form a polygon.
				</p>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={addZoneFn} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Zone
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Zone Dialog -->
<Dialog.Root open={!!editingZone} onOpenChange={(open) => !open && (editingZone = null)}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Edit Delivery Zone</Dialog.Title>
			<Dialog.Description>Update zone configuration</Dialog.Description>
		</Dialog.Header>
		{#if editingZone}
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<label for="edit-zone-name" class="text-sm font-medium">Zone Name</label>
					<Input id="edit-zone-name" autofocus bind:value={editingZone.name} />
				</div>
				<div class="grid grid-cols-3 gap-4">
					<div class="grid gap-2">
						<label for="edit-zone-fee" class="text-sm font-medium">Delivery Fee</label>
						<Input id="edit-zone-fee" type="number" step="0.01" min="0" bind:value={editingZone.deliveryFee} />
					</div>
					<div class="grid gap-2">
						<label for="edit-zone-min" class="text-sm font-medium">Min Order</label>
						<Input id="edit-zone-min" type="number" step="0.01" min="0" bind:value={editingZone.minOrderAmount} />
					</div>
					<div class="grid gap-2">
						<label for="edit-zone-time" class="text-sm font-medium">Est. Minutes</label>
						<Input id="edit-zone-time" type="number" min="1" bind:value={editingZone.estimatedMinutes} />
					</div>
				</div>
				<div class="grid gap-2">
					<label for="edit-zone-polygon" class="text-sm font-medium">Polygon Coordinates</label>
					<textarea
						id="edit-zone-polygon"
						bind:value={editPolygonText}
						rows="5"
						class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
					></textarea>
					<p class="text-xs text-muted-foreground">
						JSON array of [latitude, longitude] pairs. Minimum 3 points.
					</p>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingZone = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={saveZone} disabled={isSubmitting}>
					{#if isSubmitting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
