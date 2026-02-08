<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import {
		IconPlus,
		IconDownload,
		IconEdit,
		IconTrash,
		IconEye,
		IconLoader2
	} from '@tabler/icons-svelte';
	import { SearchInput, FilterDropdown } from '$lib/components/search';
	import { toast } from 'svelte-sonner';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import {
		createCustomer,
		updateCustomer,
		deleteCustomer,
		exportCustomers,
		type Customer,
		type CreateCustomerPayload,
		type UpdateCustomerPayload,
		type LoyaltySettings,
		type LoyaltyLeaderboardEntry
	} from '$lib/api';
	import { downloadBlob } from '$lib/utils/export';
	import { userFriendlyError } from '$lib/utils/error';

	let { data }: { data: PageData } = $props();

	let customers = $state<Customer[]>((data as any).customers || []);
	let searchQuery = $state((data as any).filters?.search || '');
	let statusFilter = $state<string>((data as any).filters?.status || 'all');
	let showAddDialog = $state(false);
	let editingCustomer = $state<Customer | null>(null);
	let isSubmitting = $state(false);

	// Delete dialog
	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state('');

	// Form state
	let formName = $state('');
	let formPhone = $state('');
	let formEmail = $state('');
	let formNotes = $state('');
	let formTags = $state('');
	let formStatus = $state('active');
	let formTaxId = $state('');
	let formAddressStreet = $state('');
	let formAddressCity = $state('');
	let formAddressState = $state('');
	let formAddressPostalCode = $state('');

	// Keep customers in sync with data
	$effect(() => {
		customers = (data as any).customers || [];
	});

	const loyaltySettings = $derived((data as any).loyaltySettings as LoyaltySettings | null);
	const loyaltyLeaderboard = $derived((data as any).loyaltyLeaderboard as LoyaltyLeaderboardEntry[] || []);
	const loyaltyEnabled = $derived(loyaltySettings?.enabled === true);

	// Build lookup map for loyalty data by customer ID
	const loyaltyMap = $derived(
		loyaltyLeaderboard.reduce<Record<string, LoyaltyLeaderboardEntry>>((map, entry) => {
			map[entry.customerId] = entry;
			return map;
		}, {})
	);

	const stats = $derived((data as any).stats || { total: 0, active: 0, inactive: 0, newThisMonth: 0 });
	const pagination = $derived((data as any).pagination || { limit: 25, offset: 0 });
	const total = $derived((data as any).total || 0);
	const totalPages = $derived(Math.max(1, Math.ceil(total / pagination.limit)));
	const currentPage = $derived(Math.floor(pagination.offset / pagination.limit) + 1);

	const statusOptions = [
		{ value: 'all', label: 'All' },
		{ value: 'active', label: 'Active' },
		{ value: 'inactive', label: 'Inactive' }
	];

	const taxSettings = $derived((data as any).business?.settings?.tax);
	const taxEnabled = $derived(taxSettings?.enabled === true);

	function resetForm() {
		formName = '';
		formPhone = '';
		formEmail = '';
		formTaxId = '';
		formNotes = '';
		formTags = '';
		formStatus = 'active';
		formAddressStreet = '';
		formAddressCity = '';
		formAddressState = '';
		formAddressPostalCode = '';
	}

	function openAddDialog() {
		resetForm();
		editingCustomer = null;
		showAddDialog = true;
	}

	function openEditDialog(customer: Customer) {
		editingCustomer = customer;
		formName = customer.name;
		formPhone = customer.phone;
		formEmail = customer.email || '';
		formTaxId = customer.taxId || '';
		formNotes = customer.notes || '';
		formTags = customer.tags?.join(', ') || '';
		formStatus = customer.status;
		const addr = customer.address as any;
		formAddressStreet = addr?.street || '';
		formAddressCity = addr?.city || '';
		formAddressState = addr?.state || '';
		formAddressPostalCode = addr?.postalCode || '';
		showAddDialog = true;
	}

	async function handleSubmit() {
		if (!formName.trim() || !formPhone.trim()) {
			toast.error('Name and phone are required');
			return;
		}

		isSubmitting = true;
		const businessId = (data as any).businessId;

		const hasAddress = formAddressStreet || formAddressCity || formAddressState || formAddressPostalCode;
		const address = hasAddress
			? {
					street: formAddressStreet || undefined,
					city: formAddressCity || undefined,
					state: formAddressState || undefined,
					postalCode: formAddressPostalCode || undefined
				}
			: undefined;

		const tags = formTags
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);

		try {
			if (editingCustomer) {
				const payload: UpdateCustomerPayload = {
					name: formName.trim(),
					phone: formPhone.trim(),
					email: formEmail.trim() || undefined,
					address,
					notes: formNotes.trim() || undefined,
					tags,
					taxId: formTaxId.trim() || undefined,
					status: formStatus as 'active' | 'inactive'
				};
				await updateCustomer(businessId, editingCustomer.id, payload);
				toast.success('Customer updated');
			} else {
				const payload: CreateCustomerPayload = {
					name: formName.trim(),
					phone: formPhone.trim(),
					email: formEmail.trim() || undefined,
					address,
					notes: formNotes.trim() || undefined,
					tags,
					taxId: formTaxId.trim() || undefined
				};
				await createCustomer(businessId, payload);
				toast.success('Customer created');
			}

			showAddDialog = false;
			resetForm();
			await invalidateAll();
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSubmitting = false;
		}
	}

	function confirmDelete(customerId: string) {
		deleteTargetId = customerId;
		deleteDialogOpen = true;
	}

	async function handleDelete() {
		const businessId = (data as any).businessId;
		try {
			await deleteCustomer(businessId, deleteTargetId);
			toast.success('Customer deleted');
			await invalidateAll();
		} catch (error) {
			toast.error(userFriendlyError(error));
		}
	}

	async function handleExport() {
		try {
			const businessId = (data as any).businessId;
			const blob = await exportCustomers(businessId, {
				status: statusFilter !== 'all' ? statusFilter : undefined,
				search: searchQuery || undefined
			});
			downloadBlob(blob, `customers-${new Date().toISOString().split('T')[0]}.csv`);
			toast.success('Export downloaded');
		} catch {
			toast.error('Export failed');
		}
	}

	function handleSearch(value: string) {
		searchQuery = value;
		const url = new URL($page.url);
		if (value) {
			url.searchParams.set('search', value);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('offset', '0');
		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}

	function handleStatusFilter(value: string) {
		statusFilter = value;
		const url = new URL($page.url);
		if (value && value !== 'all') {
			url.searchParams.set('status', value);
		} else {
			url.searchParams.delete('status');
		}
		url.searchParams.set('offset', '0');
		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}

	function goToPage(pageNum: number) {
		const url = new URL($page.url);
		url.searchParams.set('offset', String((pageNum - 1) * pagination.limit));
		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}

	function viewCustomer(customerId: string) {
		const business = $page.params.business;
		const slug = $page.params.slug;
		goto(`/${business}/${slug}/customers/${customerId}`);
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Page Header -->
	<PageHeader title="Customers" description="Manage your customer database">
		{#snippet actions()}
			<Button variant="outline" size="sm" onclick={handleExport}>
				<IconDownload class="mr-2 h-4 w-4" />
				Export
			</Button>
			<Button size="sm" onclick={openAddDialog}>
				<IconPlus class="mr-2 h-4 w-4" />
				Add Customer
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Total</p>
				<p class="text-2xl font-bold">{stats.total}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Active</p>
				<p class="text-2xl font-bold text-green-600">{stats.active}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">Inactive</p>
				<p class="text-2xl font-bold text-gray-500">{stats.inactive}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="p-4">
				<p class="text-sm text-muted-foreground">New This Month</p>
				<p class="text-2xl font-bold text-blue-600">{stats.newThisMonth}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Search & Filters -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
		<div class="flex-1 sm:max-w-sm">
			<SearchInput
				value={searchQuery}
				placeholder="Search by name, phone, email..."
				debounceMs={400}
				onClear={() => handleSearch('')}
				oninput={(e: Event) => handleSearch((e.target as HTMLInputElement).value)}
			/>
		</div>
		<FilterDropdown
			value={statusFilter}
			options={statusOptions}
			placeholder="Status"
			allOptionLabel="All"
			onValueChange={handleStatusFilter}
		/>
	</div>

	<!-- Customers Table -->
	{#if customers.length === 0}
		<EmptyState
			type="no-results"
			title={searchQuery || statusFilter !== 'all' ? 'No customers found' : 'No customers yet'}
			description={searchQuery || statusFilter !== 'all'
				? 'Try adjusting your search or filters.'
				: 'Add your first customer to get started.'}
		/>
	{:else}
		<Card.Root>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Phone</Table.Head>
						<Table.Head class="hidden md:table-cell">Email</Table.Head>
						{#if loyaltyEnabled}
							<Table.Head class="hidden lg:table-cell">Points</Table.Head>
							<Table.Head class="hidden lg:table-cell">Tier</Table.Head>
						{/if}
						<Table.Head class="hidden lg:table-cell">Tags</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="hidden sm:table-cell">Created</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each customers as customer}
						<Table.Row>
							<Table.Cell class="font-medium">{customer.name}</Table.Cell>
							<Table.Cell>{customer.phone}</Table.Cell>
							<Table.Cell class="hidden md:table-cell">{customer.email || '-'}</Table.Cell>
							{#if loyaltyEnabled}
								{@const loyalty = loyaltyMap[customer.id]}
								<Table.Cell class="hidden lg:table-cell">
									{loyalty ? loyalty.points : '-'}
								</Table.Cell>
								<Table.Cell class="hidden lg:table-cell">
									{#if loyalty}
										<Badge variant="secondary" class="text-xs capitalize">{loyalty.tier}</Badge>
									{:else}
										-
									{/if}
								</Table.Cell>
							{/if}
							<Table.Cell class="hidden lg:table-cell">
								{#if customer.tags && customer.tags.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each customer.tags.slice(0, 3) as tag}
											<Badge variant="secondary" class="text-xs">{tag}</Badge>
										{/each}
										{#if customer.tags.length > 3}
											<Badge variant="outline" class="text-xs">+{customer.tags.length - 3}</Badge>
										{/if}
									</div>
								{:else}
									-
								{/if}
							</Table.Cell>
							<Table.Cell>
								<StatusPill label={customer.status} status={customer.status === 'active' ? 'success' : 'neutral'} />
							</Table.Cell>
							<Table.Cell class="hidden sm:table-cell">
								{new Date(customer.createdAt).toLocaleDateString()}
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-1">
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										onclick={() => viewCustomer(customer.id)}
									>
										<IconEye class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										onclick={() => openEditDialog(customer)}
									>
										<IconEdit class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-destructive"
										onclick={() => confirmDelete(customer.id)}
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

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between">
				<p class="text-sm text-muted-foreground">
					Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, total)} of {total}
				</p>
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage <= 1}
						onclick={() => goToPage(currentPage - 1)}
					>
						Previous
					</Button>
					<span class="text-sm">Page {currentPage} of {totalPages}</span>
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage >= totalPages}
						onclick={() => goToPage(currentPage + 1)}
					>
						Next
					</Button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Add/Edit Customer Dialog -->
<Dialog.Root bind:open={showAddDialog}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</Dialog.Title>
			<Dialog.Description>
				{editingCustomer ? 'Update customer information.' : 'Add a new customer to your database.'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="name" class="text-sm font-medium">Name *</label>
				<Input id="name" bind:value={formName} placeholder="Customer name" />
			</div>
			<div class="grid gap-2">
				<label for="phone" class="text-sm font-medium">Phone *</label>
				<Input id="phone" bind:value={formPhone} placeholder="Phone number" />
			</div>
			<div class="grid gap-2">
				<label for="email" class="text-sm font-medium">Email</label>
				<Input id="email" type="email" bind:value={formEmail} placeholder="Email address" />
			</div>

			{#if taxEnabled}
				<div class="grid gap-2">
					<label for="taxId" class="text-sm font-medium">Tax ID</label>
					<Input id="taxId" bind:value={formTaxId} placeholder="GSTIN, VAT Number, etc." />
				</div>
			{/if}

			<div class="grid gap-2">
				<label class="text-sm font-medium">Address</label>
				<Input bind:value={formAddressStreet} placeholder="Street" />
				<div class="grid grid-cols-2 gap-2">
					<Input bind:value={formAddressCity} placeholder="City" />
					<Input bind:value={formAddressState} placeholder="State" />
				</div>
				<Input bind:value={formAddressPostalCode} placeholder="Postal code" class="w-1/2" />
			</div>

			<div class="grid gap-2">
				<label for="notes" class="text-sm font-medium">Notes</label>
				<Textarea id="notes" bind:value={formNotes} placeholder="Customer notes..." rows={2} />
			</div>
			<div class="grid gap-2">
				<label for="tags" class="text-sm font-medium">Tags</label>
				<Input id="tags" bind:value={formTags} placeholder="VIP, Regular, etc. (comma-separated)" />
			</div>

			{#if editingCustomer}
				<div class="grid gap-2">
					<label for="status" class="text-sm font-medium">Status</label>
					<select
						id="status"
						bind:value={formStatus}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showAddDialog = false)}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{editingCustomer ? 'Update' : 'Add Customer'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Customer"
	description="Are you sure you want to delete this customer? This cannot be undone. Customers with orders cannot be deleted."
	confirmLabel="Delete"
	variant="destructive"
	onConfirm={handleDelete}
/>
