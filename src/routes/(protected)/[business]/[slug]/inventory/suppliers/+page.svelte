<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		IconPlus,
		IconPencil,
		IconTrash,
		IconSearch,
		IconPhone,
		IconMail,
		IconMapPin,
		IconTruck
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import {
		createSupplier,
		updateSupplier,
		deleteSupplier as deleteSupplierApi,
		type Supplier,
		type SupplierStatus,
		type CreateSupplierPayload
	} from '$lib/api';
	import { userFriendlyError } from '$lib/utils/error';

	let { data }: { data: PageData } = $props();

	let suppliers = $state<Supplier[]>(data.suppliers || []);
	let searchQuery = $state('');
	let statusFilter = $state<'all' | SupplierStatus>('all');
	let showAddDialog = $state(false);
	let editingSupplier = $state<Supplier | null>(null);
	let viewingSupplier = $state<Supplier | null>(null);
	let isSubmitting = $state(false);
	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state('');

	let newSupplier = $state<{
		name: string;
		contactPerson: string;
		phone: string;
		email: string;
		address: string;
		categories: string[];
	}>({
		name: '',
		contactPerson: '',
		phone: '',
		email: '',
		address: '',
		categories: []
	});

	const allCategories = ['Dairy', 'Sauces', 'Oils', 'Dry Goods', 'Herbs', 'Vegetables', 'Meat', 'Seafood', 'Beverages'];

	const filteredSuppliers = $derived(
		suppliers.filter((supplier) => {
			const matchesSearch =
				supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(supplier.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
			const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	const stats = $derived({
		total: suppliers.length,
		active: suppliers.filter((s) => s.status === 'active').length,
		totalOrders: suppliers.reduce((sum, s) => sum + s.totalOrders, 0)
	});

	function formatDate(dateString?: string): string {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function addSupplier() {
		if (!newSupplier.name.trim()) {
			toast.error('Supplier name is required');
			return;
		}

		isSubmitting = true;
		try {
			const payload: CreateSupplierPayload = {
				name: newSupplier.name,
				contactPerson: newSupplier.contactPerson || undefined,
				phone: newSupplier.phone || undefined,
				email: newSupplier.email || undefined,
				address: newSupplier.address || undefined,
				categories: newSupplier.categories.length > 0 ? newSupplier.categories : undefined
			};

			const result = await createSupplier(data.businessId, payload);
			suppliers = [...suppliers, result.supplier];
			toast.success('Supplier added successfully');
			showAddDialog = false;
			newSupplier = { name: '', contactPerson: '', phone: '', email: '', address: '', categories: [] };
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to add supplier'));
		} finally {
			isSubmitting = false;
		}
	}

	function editSupplierFn(supplier: Supplier) {
		editingSupplier = { ...supplier };
	}

	async function saveSupplier() {
		if (!editingSupplier) return;

		isSubmitting = true;
		try {
			const result = await updateSupplier(data.businessId, editingSupplier.id, {
				name: editingSupplier.name,
				contactPerson: editingSupplier.contactPerson,
				phone: editingSupplier.phone,
				email: editingSupplier.email,
				address: editingSupplier.address,
				status: editingSupplier.status
			});
			suppliers = suppliers.map((s) => (s.id === editingSupplier!.id ? result.supplier : s));
			toast.success('Supplier updated successfully');
			editingSupplier = null;
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update supplier'));
		} finally {
			isSubmitting = false;
		}
	}

	function handleDelete(id: string) {
		deleteTargetId = id;
		deleteDialogOpen = true;
	}

	async function confirmDeleteSupplier() {
		try {
			await deleteSupplierApi(data.businessId, deleteTargetId);
			suppliers = suppliers.filter((s) => s.id !== deleteTargetId);
			toast.success('Supplier deleted successfully');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to delete supplier'));
		}
	}

	function viewSupplier(supplier: Supplier) {
		viewingSupplier = supplier;
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Suppliers</h1>
					<p class="text-muted-foreground">Manage your supplier relationships</p>
				</div>
				<Button onclick={() => (showAddDialog = true)}>
					<IconPlus class="mr-2 h-4 w-4" />
					Add Supplier
				</Button>
			</div>

			<!-- Stats -->
			<div class="grid grid-cols-1 gap-4 px-6 sm:grid-cols-3">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Suppliers</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconTruck class="h-5 w-5 text-muted-foreground" />
							<span class="text-2xl font-bold">{stats.total}</span>
						</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Active Suppliers</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-success">{stats.active}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Orders</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.totalOrders}</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Filters -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center">
				<div class="relative max-w-sm flex-1">
					<IconSearch
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input placeholder="Search suppliers..." bind:value={searchQuery} class="pl-9" />
				</div>

				<select
					bind:value={statusFilter}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm"
				>
					<option value="all">All Status</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
					<option value="pending">Pending</option>
					<option value="blacklisted">Blacklisted</option>
				</select>
			</div>

			<!-- Suppliers Grid -->
			{#if filteredSuppliers.length > 0}
				<div class="grid grid-cols-1 gap-4 px-6 md:grid-cols-2 lg:grid-cols-3">
					{#each filteredSuppliers as supplier (supplier.id)}
						<Card.Root class={supplier.status !== 'active' ? 'opacity-60' : ''}>
							<Card.Header>
								<div class="flex items-start justify-between">
									<div>
										<Card.Title class="text-lg">{supplier.name}</Card.Title>
										<Card.Description>{supplier.contactPerson || 'No contact'}</Card.Description>
									</div>
									<StatusPill
										label={supplier.status}
										status={supplier.status === 'active' ? 'success' : 'neutral'}
									/>
								</div>
							</Card.Header>
							<Card.Content class="space-y-2">
								{#if supplier.phone}
									<div class="flex items-center gap-2 text-sm">
										<IconPhone class="h-4 w-4 text-muted-foreground" />
										{supplier.phone}
									</div>
								{/if}
								{#if supplier.email}
									<div class="flex items-center gap-2 text-sm">
										<IconMail class="h-4 w-4 text-muted-foreground" />
										{supplier.email}
									</div>
								{/if}
								<div class="flex flex-wrap gap-1 pt-2">
									{#each supplier.categories as category}
										<Badge variant="outline" class="text-xs">{category}</Badge>
									{/each}
								</div>
								<div class="pt-2 text-sm text-muted-foreground">
									<span>{supplier.totalOrders} orders</span>
									<span class="mx-2">•</span>
									<span>Last: {formatDate(supplier.lastOrderDate)}</span>
								</div>
							</Card.Content>
							<Card.Footer class="flex justify-between">
								<Button variant="outline" size="sm" onclick={() => viewSupplier(supplier)}>
									View Details
								</Button>
								<div class="flex gap-1">
									<Button variant="ghost" size="icon" onclick={() => editSupplierFn(supplier)}>
										<IconPencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="text-destructive hover:text-destructive"
										onclick={() => handleDelete(supplier.id)}
									>
										<IconTrash class="h-4 w-4" />
									</Button>
								</div>
							</Card.Footer>
						</Card.Root>
					{/each}
				</div>
			{:else}
				<EmptyState
					type={suppliers.length === 0 ? 'empty' : 'no-results'}
					title={suppliers.length === 0 ? 'No suppliers yet' : 'No suppliers found'}
					description={suppliers.length === 0 ? 'Add your first supplier to get started.' : 'Try adjusting your search or filters.'}
					actionLabel="Add Supplier"
					onAction={() => (showAddDialog = true)}
				/>
			{/if}
			<div class="px-6">
						<div class="flex items-center justify-between border-t pt-4">
				<p class="text-sm text-muted-foreground">
					Showing {Math.min((data.page - 1) * data.limit + 1, data.total)} to {Math.min(data.page * data.limit, data.total)} of {data.total} results
				</p>
				<div class="flex gap-1">
					<Button size="sm" variant="outline" disabled={data.page <= 1}
						onclick={() => goto(`?page=${data.page - 1}&limit=${data.limit}`)}>Previous</Button>
					<Button size="sm" variant="outline" disabled={data.page >= data.totalPages}
						onclick={() => goto(`?page=${data.page + 1}&limit=${data.limit}`)}>Next</Button>
				</div>
			</div>
			</div>
		</div>
	</div>
</div>

<!-- Add Supplier Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Add Supplier</Dialog.Title>
			<Dialog.Description>Add a new supplier to your network</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="name" class="text-sm font-medium">Company Name *</label>
					<Input id="name" autofocus bind:value={newSupplier.name} placeholder="Supplier name" />
				</div>
				<div class="grid gap-2">
					<label for="contact" class="text-sm font-medium">Contact Person</label>
					<Input id="contact" bind:value={newSupplier.contactPerson} placeholder="Contact name" />
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<label for="phone" class="text-sm font-medium">Phone</label>
					<Input id="phone" bind:value={newSupplier.phone} placeholder="+1 555-0000" />
				</div>
				<div class="grid gap-2">
					<label for="email" class="text-sm font-medium">Email</label>
					<Input id="email" type="email" bind:value={newSupplier.email} placeholder="email@supplier.com" />
				</div>
			</div>
			<div class="grid gap-2">
				<label for="address" class="text-sm font-medium">Address</label>
				<Input id="address" bind:value={newSupplier.address} placeholder="Full address" />
			</div>
			<div class="grid gap-2">
				<label class="text-sm font-medium">Categories</label>
				<div class="flex flex-wrap gap-2">
					{#each allCategories as category}
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								checked={newSupplier.categories.includes(category)}
								onchange={(e) => {
									if ((e.target as HTMLInputElement).checked) {
										newSupplier.categories = [...newSupplier.categories, category];
									} else {
										newSupplier.categories = newSupplier.categories.filter((c) => c !== category);
									}
								}}
								class="rounded border-input"
							/>
							<span class="text-sm">{category}</span>
						</label>
					{/each}
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)} disabled={isSubmitting}>Cancel</Button>
			<Button onclick={addSupplier} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add Supplier
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Supplier Dialog -->
<Dialog.Root open={!!editingSupplier} onOpenChange={(open) => !open && (editingSupplier = null)}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Edit Supplier</Dialog.Title>
			<Dialog.Description>Update supplier information</Dialog.Description>
		</Dialog.Header>
		{#if editingSupplier}
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-name" class="text-sm font-medium">Company Name</label>
						<Input id="edit-name" autofocus bind:value={editingSupplier.name} />
					</div>
					<div class="grid gap-2">
						<label for="edit-contact" class="text-sm font-medium">Contact Person</label>
						<Input id="edit-contact" bind:value={editingSupplier.contactPerson} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<label for="edit-phone" class="text-sm font-medium">Phone</label>
						<Input id="edit-phone" bind:value={editingSupplier.phone} />
					</div>
					<div class="grid gap-2">
						<label for="edit-email" class="text-sm font-medium">Email</label>
						<Input id="edit-email" type="email" bind:value={editingSupplier.email} />
					</div>
				</div>
				<div class="grid gap-2">
					<label for="edit-address" class="text-sm font-medium">Address</label>
					<Input id="edit-address" bind:value={editingSupplier.address} />
				</div>
				<div class="grid gap-2">
					<label for="edit-status" class="text-sm font-medium">Status</label>
					<select
						id="edit-status"
						bind:value={editingSupplier.status}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
						<option value="pending">Pending</option>
						<option value="blacklisted">Blacklisted</option>
					</select>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingSupplier = null)} disabled={isSubmitting}>Cancel</Button>
				<Button onclick={saveSupplier} disabled={isSubmitting}>
					{#if isSubmitting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- View Supplier Dialog -->
<Dialog.Root open={!!viewingSupplier} onOpenChange={(open) => !open && (viewingSupplier = null)}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{viewingSupplier?.name}</Dialog.Title>
			<Dialog.Description>Supplier details</Dialog.Description>
		</Dialog.Header>
		{#if viewingSupplier}
			<div class="space-y-4 py-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Contact Person</p>
						<p>{viewingSupplier.contactPerson || '-'}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Status</p>
						<StatusPill
								label={viewingSupplier.status}
								status={viewingSupplier.status === 'active' ? 'success' : 'neutral'}
							/>
					</div>
				</div>
				{#if viewingSupplier.phone}
					<div>
						<p class="text-sm font-medium text-muted-foreground">Phone</p>
						<p class="flex items-center gap-2">
							<IconPhone class="h-4 w-4" />
							{viewingSupplier.phone}
						</p>
					</div>
				{/if}
				{#if viewingSupplier.email}
					<div>
						<p class="text-sm font-medium text-muted-foreground">Email</p>
						<p class="flex items-center gap-2">
							<IconMail class="h-4 w-4" />
							{viewingSupplier.email}
						</p>
					</div>
				{/if}
				{#if viewingSupplier.address}
					<div>
						<p class="text-sm font-medium text-muted-foreground">Address</p>
						<p class="flex items-center gap-2">
							<IconMapPin class="h-4 w-4" />
							{viewingSupplier.address}
						</p>
					</div>
				{/if}
				<div>
					<p class="text-sm font-medium text-muted-foreground">Categories</p>
					<div class="mt-1 flex flex-wrap gap-1">
						{#each viewingSupplier.categories as category}
							<Badge variant="outline">{category}</Badge>
						{/each}
						{#if viewingSupplier.categories.length === 0}
							<span class="text-sm text-muted-foreground">No categories</span>
						{/if}
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4 rounded-lg bg-muted p-3">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Orders</p>
						<p class="text-lg font-bold">{viewingSupplier.totalOrders}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Last Order</p>
						<p class="text-lg font-bold">{formatDate(viewingSupplier.lastOrderDate)}</p>
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (viewingSupplier = null)}>Close</Button>
				<Button onclick={() => { editSupplierFn(viewingSupplier!); viewingSupplier = null; }}>
					Edit Supplier
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Supplier"
	description="Are you sure you want to delete this supplier? This action cannot be undone."
	confirmLabel="Delete Supplier"
	variant="destructive"
	onConfirm={confirmDeleteSupplier}
/>
