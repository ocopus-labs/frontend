<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
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

	// Dummy suppliers data
	let suppliers = $state([
		{
			id: 1,
			name: 'Fresh Dairy Co.',
			contact: 'John Miller',
			phone: '+1 555-0123',
			email: 'orders@freshdairy.com',
			address: '123 Farm Road, Dairy Valley, CA 90210',
			categories: ['Dairy'],
			status: 'active',
			totalOrders: 45,
			lastOrder: '2024-11-05'
		},
		{
			id: 2,
			name: 'Italian Imports',
			contact: 'Maria Romano',
			phone: '+1 555-0456',
			email: 'supply@italimports.com',
			address: '456 Olive Street, Little Italy, NY 10001',
			categories: ['Sauces', 'Oils', 'Dairy'],
			status: 'active',
			totalOrders: 78,
			lastOrder: '2024-11-06'
		},
		{
			id: 3,
			name: 'Baker Supplies',
			contact: 'Tom Baker',
			phone: '+1 555-0789',
			email: 'sales@bakersupplies.com',
			address: '789 Flour Mill Way, Baking Town, TX 75001',
			categories: ['Dry Goods'],
			status: 'active',
			totalOrders: 32,
			lastOrder: '2024-11-03'
		},
		{
			id: 4,
			name: 'Local Farms',
			contact: 'Sarah Green',
			phone: '+1 555-0111',
			email: 'produce@localfarms.com',
			address: '321 Organic Lane, Farmville, OR 97001',
			categories: ['Herbs', 'Vegetables'],
			status: 'active',
			totalOrders: 156,
			lastOrder: '2024-11-06'
		},
		{
			id: 5,
			name: 'Premium Meats',
			contact: 'Bob Butcher',
			phone: '+1 555-0222',
			email: 'orders@premiummeats.com',
			address: '555 Stockyard Blvd, Meat City, NE 68001',
			categories: ['Meat'],
			status: 'active',
			totalOrders: 89,
			lastOrder: '2024-11-06'
		},
		{
			id: 6,
			name: 'Ocean Fresh',
			contact: 'Captain Fish',
			phone: '+1 555-0333',
			email: 'catch@oceanfresh.com',
			address: '777 Harbor Drive, Seafood Bay, WA 98001',
			categories: ['Seafood'],
			status: 'active',
			totalOrders: 67,
			lastOrder: '2024-11-05'
		},
		{
			id: 7,
			name: 'Global Beverages',
			contact: 'Dave Drinks',
			phone: '+1 555-0444',
			email: 'wholesale@globalbev.com',
			address: '999 Bottling Plant Rd, Beverage City, FL 33001',
			categories: ['Beverages'],
			status: 'inactive',
			totalOrders: 23,
			lastOrder: '2024-10-15'
		}
	]);

	let searchQuery = $state('');
	let statusFilter = $state('all');
	let showAddDialog = $state(false);
	let editingSupplier = $state<(typeof suppliers)[0] | null>(null);
	let viewingSupplier = $state<(typeof suppliers)[0] | null>(null);

	let newSupplier = $state({
		name: '',
		contact: '',
		phone: '',
		email: '',
		address: '',
		categories: [] as string[]
	});

	const allCategories = ['Dairy', 'Sauces', 'Oils', 'Dry Goods', 'Herbs', 'Vegetables', 'Meat', 'Seafood', 'Beverages'];

	const filteredSuppliers = $derived(
		suppliers.filter((supplier) => {
			const matchesSearch =
				supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				supplier.contact.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);

	const stats = $derived({
		total: suppliers.length,
		active: suppliers.filter((s) => s.status === 'active').length,
		totalOrders: suppliers.reduce((sum, s) => sum + s.totalOrders, 0)
	});

	function addSupplier() {
		if (!newSupplier.name.trim()) {
			toast.error('Supplier name is required');
			return;
		}

		suppliers = [
			...suppliers,
			{
				id: Math.max(...suppliers.map((s) => s.id)) + 1,
				...newSupplier,
				status: 'active',
				totalOrders: 0,
				lastOrder: '-'
			}
		];

		toast.success('Supplier added successfully');
		showAddDialog = false;
		newSupplier = { name: '', contact: '', phone: '', email: '', address: '', categories: [] };
	}

	function editSupplier(supplier: (typeof suppliers)[0]) {
		editingSupplier = { ...supplier };
	}

	function saveSupplier() {
		if (!editingSupplier) return;

		suppliers = suppliers.map((s) => (s.id === editingSupplier!.id ? editingSupplier! : s));
		toast.success('Supplier updated successfully');
		editingSupplier = null;
	}

	function deleteSupplier(id: number) {
		suppliers = suppliers.filter((s) => s.id !== id);
		toast.success('Supplier deleted successfully');
	}

	function toggleSupplierStatus(id: number) {
		suppliers = suppliers.map((s) =>
			s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s
		);
	}

	function viewSupplier(supplier: (typeof suppliers)[0]) {
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
						<div class="text-2xl font-bold text-green-600">{stats.active}</div>
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
				</select>
			</div>

			<!-- Suppliers Grid -->
			<div class="grid grid-cols-1 gap-4 px-6 md:grid-cols-2 lg:grid-cols-3">
				{#each filteredSuppliers as supplier (supplier.id)}
					<Card.Root class={supplier.status === 'inactive' ? 'opacity-60' : ''}>
						<Card.Header>
							<div class="flex items-start justify-between">
								<div>
									<Card.Title class="text-lg">{supplier.name}</Card.Title>
									<Card.Description>{supplier.contact}</Card.Description>
								</div>
								<Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
									{supplier.status}
								</Badge>
							</div>
						</Card.Header>
						<Card.Content class="space-y-2">
							<div class="flex items-center gap-2 text-sm">
								<IconPhone class="h-4 w-4 text-muted-foreground" />
								{supplier.phone}
							</div>
							<div class="flex items-center gap-2 text-sm">
								<IconMail class="h-4 w-4 text-muted-foreground" />
								{supplier.email}
							</div>
							<div class="flex flex-wrap gap-1 pt-2">
								{#each supplier.categories as category}
									<Badge variant="outline" class="text-xs">{category}</Badge>
								{/each}
							</div>
							<div class="pt-2 text-sm text-muted-foreground">
								<span>{supplier.totalOrders} orders</span>
								<span class="mx-2">•</span>
								<span>Last: {supplier.lastOrder}</span>
							</div>
						</Card.Content>
						<Card.Footer class="flex justify-between">
							<Button variant="outline" size="sm" onclick={() => viewSupplier(supplier)}>
								View Details
							</Button>
							<div class="flex gap-1">
								<Button variant="ghost" size="sm" onclick={() => editSupplier(supplier)}>
									<IconPencil class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="text-destructive hover:text-destructive"
									onclick={() => deleteSupplier(supplier.id)}
								>
									<IconTrash class="h-4 w-4" />
								</Button>
							</div>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>

			{#if filteredSuppliers.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconTruck class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No suppliers found</h3>
					<p class="text-muted-foreground">Try adjusting your search or add a new supplier.</p>
				</div>
			{/if}
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
					<Input id="name" bind:value={newSupplier.name} placeholder="Supplier name" />
				</div>
				<div class="grid gap-2">
					<label for="contact" class="text-sm font-medium">Contact Person</label>
					<Input id="contact" bind:value={newSupplier.contact} placeholder="Contact name" />
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
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={addSupplier}>Add Supplier</Button>
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
						<Input id="edit-name" bind:value={editingSupplier.name} />
					</div>
					<div class="grid gap-2">
						<label for="edit-contact" class="text-sm font-medium">Contact Person</label>
						<Input id="edit-contact" bind:value={editingSupplier.contact} />
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
					</select>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingSupplier = null)}>Cancel</Button>
				<Button onclick={saveSupplier}>Save Changes</Button>
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
						<p>{viewingSupplier.contact}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Status</p>
						<Badge variant={viewingSupplier.status === 'active' ? 'default' : 'secondary'}>
							{viewingSupplier.status}
						</Badge>
					</div>
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Phone</p>
					<p class="flex items-center gap-2">
						<IconPhone class="h-4 w-4" />
						{viewingSupplier.phone}
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Email</p>
					<p class="flex items-center gap-2">
						<IconMail class="h-4 w-4" />
						{viewingSupplier.email}
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Address</p>
					<p class="flex items-center gap-2">
						<IconMapPin class="h-4 w-4" />
						{viewingSupplier.address}
					</p>
				</div>
				<div>
					<p class="text-sm font-medium text-muted-foreground">Categories</p>
					<div class="mt-1 flex flex-wrap gap-1">
						{#each viewingSupplier.categories as category}
							<Badge variant="outline">{category}</Badge>
						{/each}
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4 rounded-lg bg-muted p-3">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Total Orders</p>
						<p class="text-lg font-bold">{viewingSupplier.totalOrders}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-muted-foreground">Last Order</p>
						<p class="text-lg font-bold">{viewingSupplier.lastOrder}</p>
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (viewingSupplier = null)}>Close</Button>
				<Button onclick={() => { editSupplier(viewingSupplier!); viewingSupplier = null; }}>
					Edit Supplier
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
