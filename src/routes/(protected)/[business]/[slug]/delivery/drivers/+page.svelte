<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import { IconPlus, IconPencil, IconPhone, IconCar, IconMotorbike } from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import {
		createDriver,
		updateDriver,
		type DeliveryDriver,
		type DriverStatus,
		type CreateDriverPayload
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatDate } from '$lib/utils/formatting';
	import * as Select from '$lib/components/ui/select';
	import { canModify } from '$lib/utils/permissions';
	import { SearchInput } from '$lib/components/search';

	let { data }: { data: PageData } = $props();

	let drivers = $state<DeliveryDriver[]>(data.drivers || []);
	let searchQuery = $state('');
	let statusFilter = $state<'all' | DriverStatus>('all');
	let showAddDialog = $state(false);
	let editingDriver = $state<DeliveryDriver | null>(null);
	let isSubmitting = $state(false);

	let newDriver = $state<{
		name: string;
		phone: string;
		vehicleType: string;
	}>({
		name: '',
		phone: '',
		vehicleType: 'motorcycle'
	});

	const vehicleTypes = [
		{ value: 'motorcycle', label: 'Motorcycle' },
		{ value: 'bicycle', label: 'Bicycle' },
		{ value: 'car', label: 'Car' },
		{ value: 'van', label: 'Van' },
		{ value: 'scooter', label: 'Scooter' }
	];

	const filteredDrivers = $derived(
		drivers.filter((driver) => {
			const matchesSearch =
				driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				driver.phone.includes(searchQuery);
			const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	const stats = $derived({
		total: drivers.length,
		active: drivers.filter((d) => d.isActive).length,
		available: drivers.filter((d) => d.status === 'available').length,
		busy: drivers.filter((d) => d.status === 'busy').length,
		offline: drivers.filter((d) => d.status === 'offline').length
	});

	function getStatusInfo(status: DriverStatus) {
		switch (status) {
			case 'available':
				return { label: 'Available', status: 'success' as const };
			case 'busy':
				return { label: 'Busy', status: 'warning' as const };
			case 'offline':
				return { label: 'Offline', status: 'neutral' as const };
			default:
				return { label: status, status: 'info' as const };
		}
	}

	function getVehicleLabel(type?: string) {
		if (!type) return 'N/A';
		return vehicleTypes.find((v) => v.value === type)?.label || type;
	}

	async function addDriver() {
		if (!newDriver.name.trim()) {
			toast.error('Driver name is required');
			return;
		}
		if (!newDriver.phone.trim()) {
			toast.error('Phone number is required');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateDriverPayload = {
				name: newDriver.name,
				phone: newDriver.phone,
				vehicleType: newDriver.vehicleType || undefined
			};

			const result = await createDriver(data.businessId, payload);
			drivers = [...drivers, result.driver];
			toast.success('Driver added successfully');
			showAddDialog = false;
			newDriver = { name: '', phone: '', vehicleType: 'motorcycle' };
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to add driver'));
		} finally {
			isSubmitting = false;
		}
	}

	function editDriverFn(driver: DeliveryDriver) {
		editingDriver = { ...driver };
	}

	async function saveDriver() {
		if (!editingDriver) return;

		isSubmitting = true;
		try {
			const result = await updateDriver(data.businessId, editingDriver.id, {
				name: editingDriver.name,
				phone: editingDriver.phone,
				vehicleType: editingDriver.vehicleType,
				isActive: editingDriver.isActive
			});
			drivers = drivers.map((d) => (d.id === editingDriver!.id ? result.driver : d));
			toast.success('Driver updated successfully');
			editingDriver = null;
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update driver'));
		} finally {
			isSubmitting = false;
		}
	}

	async function toggleActive(driver: DeliveryDriver) {
		try {
			const result = await updateDriver(data.businessId, driver.id, {
				isActive: !driver.isActive
			});
			drivers = drivers.map((d) => (d.id === driver.id ? result.driver : d));
			toast.success(result.driver.isActive ? 'Driver activated' : 'Driver deactivated');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update driver'));
		}
	}
</script>

<PageShell title="Delivery Drivers" description="Manage your delivery drivers">
	{#snippet actions()}
		{#if canModify(data.userRole)}
			<Button onclick={() => (showAddDialog = true)}>
				<IconPlus class="mr-2 h-4 w-4" />
				Add Driver
			</Button>
		{/if}
	{/snippet}

	<!-- Stats -->
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Total</p>
			<p class="text-2xl font-bold">{stats.total}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Active</p>
			<p class="text-2xl font-bold text-success">{stats.active}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Available</p>
			<p class="text-2xl font-bold text-chart-3">{stats.available}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Busy</p>
			<p class="text-2xl font-bold text-chart-6">{stats.busy}</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">Offline</p>
			<p class="text-2xl font-bold text-muted-foreground">{stats.offline}</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
		<SearchInput
			bind:value={searchQuery}
			placeholder="Search drivers..."
			debounceMs={300}
			class="max-w-sm"
		/>
		<Select.Root type="single" bind:value={statusFilter}>
			<Select.Trigger class="w-[160px]">
				{statusFilter === 'all' ? 'All Status' : getStatusInfo(statusFilter).label}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All Status</Select.Item>
				<Select.Item value="available">Available</Select.Item>
				<Select.Item value="busy">Busy</Select.Item>
				<Select.Item value="offline">Offline</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Drivers Table -->
	{#if filteredDrivers.length > 0}
		<!-- Mobile: Card list -->
		<div class="flex flex-col gap-2 md:hidden">
			{#each filteredDrivers as driver (driver.id)}
				<div class="rounded-lg border bg-card p-3 {!driver.isActive ? 'opacity-60' : ''}">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2.5">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium"
							>
								{driver.name.charAt(0).toUpperCase()}
							</div>
							<div>
								<p class="text-sm font-medium">{driver.name}</p>
								<p class="text-xs text-muted-foreground">{driver.phone}</p>
							</div>
						</div>
						<StatusPill
							label={getStatusInfo(driver.status).label}
							status={getStatusInfo(driver.status).status}
						/>
					</div>
					<div class="mt-2 flex items-center justify-between">
						<Badge variant="outline" class="text-xs">{getVehicleLabel(driver.vehicleType)}</Badge>
						{#if canModify(data.userRole)}
							<div class="flex gap-1">
								<Button
									variant="ghost"
									size="sm"
									class="h-7 text-xs"
									onclick={() => editDriverFn(driver)}>Edit</Button
								>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 text-xs {driver.isActive ? 'text-destructive' : 'text-success'}"
									onclick={() => toggleActive(driver)}
								>
									{driver.isActive ? 'Deactivate' : 'Activate'}
								</Button>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop: Table -->
		<div class="hidden md:block">
			<div class="overflow-x-auto rounded-md border">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Driver</Table.Head>
							<Table.Head>Phone</Table.Head>
							<Table.Head>Vehicle Type</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Active</Table.Head>
							<Table.Head>Added</Table.Head>
							{#if canModify(data.userRole)}
								<Table.Head class="text-right">Actions</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredDrivers as driver (driver.id)}
							<Table.Row class={!driver.isActive ? 'opacity-60' : ''}>
								<Table.Cell>
									<div class="flex items-center gap-3">
										<div class="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
											<span class="text-sm font-medium">{driver.name.charAt(0).toUpperCase()}</span>
										</div>
										<span class="font-medium">{driver.name}</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-1.5 text-muted-foreground">
										<IconPhone class="h-3.5 w-3.5" />
										{driver.phone}
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{getVehicleLabel(driver.vehicleType)}</Badge>
								</Table.Cell>
								<Table.Cell>
									<StatusPill
										label={getStatusInfo(driver.status).label}
										status={getStatusInfo(driver.status).status}
									/>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={driver.isActive ? 'default' : 'secondary'}>
										{driver.isActive ? 'Active' : 'Inactive'}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(driver.createdAt)}
								</Table.Cell>
								{#if canModify(data.userRole)}
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-1">
											<Button variant="ghost" size="sm" onclick={() => editDriverFn(driver)}>
												<IconPencil class="mr-1.5 h-3.5 w-3.5" />
												Edit
											</Button>
											<Button
												variant="ghost"
												size="sm"
												class={driver.isActive
													? 'text-destructive hover:text-destructive'
													: 'text-success hover:text-success'}
												onclick={() => toggleActive(driver)}
											>
												{driver.isActive ? 'Deactivate' : 'Activate'}
											</Button>
										</div>
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
			type={drivers.length === 0 ? 'empty' : 'no-results'}
			title={drivers.length === 0 ? 'No drivers yet' : 'No drivers found'}
			description={drivers.length === 0
				? 'Add your first delivery driver to get started.'
				: 'Try adjusting your search or filters.'}
			actionLabel={canModify(data.userRole) ? 'Add Driver' : undefined}
			onAction={canModify(data.userRole) ? () => (showAddDialog = true) : undefined}
		/>
	{/if}
</PageShell>

<!-- Add Driver Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Add Driver</Dialog.Title>
			<Dialog.Description>Add a new delivery driver</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="name" class="text-sm font-medium">Name *</label>
				<Input id="name" autofocus bind:value={newDriver.name} placeholder="Driver name" />
			</div>
			<div class="grid gap-2">
				<label for="phone" class="text-sm font-medium">Phone *</label>
				<Input id="phone" bind:value={newDriver.phone} placeholder="+1 555-0000" />
			</div>
			<div class="grid gap-2">
				<label for="vehicle" class="text-sm font-medium">Vehicle Type</label>
				<Select.Root type="single" bind:value={newDriver.vehicleType}>
					<Select.Trigger class="w-full">
						{vehicleTypes.find((v) => v.value === newDriver.vehicleType)?.label || 'Select vehicle'}
					</Select.Trigger>
					<Select.Content>
						{#each vehicleTypes as vt}
							<Select.Item value={vt.value}>{vt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={addDriver} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add Driver
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Driver Dialog -->
<Dialog.Root open={!!editingDriver} onOpenChange={(open) => !open && (editingDriver = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Driver</Dialog.Title>
			<Dialog.Description>Update driver information</Dialog.Description>
		</Dialog.Header>
		{#if editingDriver}
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<label for="edit-name" class="text-sm font-medium">Name</label>
					<Input id="edit-name" autofocus bind:value={editingDriver.name} />
				</div>
				<div class="grid gap-2">
					<label for="edit-phone" class="text-sm font-medium">Phone</label>
					<Input id="edit-phone" bind:value={editingDriver.phone} />
				</div>
				<div class="grid gap-2">
					<label for="edit-vehicle" class="text-sm font-medium">Vehicle Type</label>
					<Select.Root type="single" bind:value={editingDriver.vehicleType}>
						<Select.Trigger class="w-full">
							{vehicleTypes.find((v) => v.value === editingDriver?.vehicleType)?.label ||
								'Select vehicle'}
						</Select.Trigger>
						<Select.Content>
							{#each vehicleTypes as vt}
								<Select.Item value={vt.value}>{vt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="edit-active"
						checked={editingDriver.isActive}
						onchange={(e) => {
							if (editingDriver) editingDriver.isActive = (e.target as HTMLInputElement).checked;
						}}
						class="rounded border-input"
					/>
					<label for="edit-active" class="text-sm font-medium">Active</label>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingDriver = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={saveDriver} disabled={isSubmitting}>
					{#if isSubmitting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
