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
	import {
		IconArrowLeft,
		IconEdit,
		IconLoader2,
		IconStar,
		IconAdjustmentsHorizontal
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { StatusPill } from '$lib/components/data-display';
	import {
		updateCustomer,
		adjustLoyaltyPoints,
		type UpdateCustomerPayload,
		type LoyaltyAccount,
		type LoyaltyTransaction,
		type LoyaltySettings
	} from '$lib/api';
	import { currencyToRegion, createI18nUtils } from '$lib/utils/i18n';
	import { userFriendlyError } from '$lib/utils/error';

	let { data }: { data: PageData } = $props();

	const customer = $derived((data as any).customer);
	const orderStats = $derived((data as any).orderStats || { totalOrders: 0, totalSpent: 0, lastOrderDate: null });
	const orders = $derived(customer?.orders || []);
	const loyaltyAccount = $derived((data as any).loyaltyAccount as LoyaltyAccount | null);
	const loyaltyTransactions = $derived((data as any).loyaltyTransactions as LoyaltyTransaction[] || []);
	const loyaltySettings = $derived((data as any).loyaltySettings as LoyaltySettings | null);

	const region = $derived(currencyToRegion((data as any).business?.settings?.currency || 'USD'));
	const i18n = $derived(createI18nUtils(region));

	let showEditDialog = $state(false);
	let isSubmitting = $state(false);

	// Adjust Points Dialog
	let showAdjustDialog = $state(false);
	let adjustAmount = $state(0);
	let adjustReason = $state('');
	let isAdjusting = $state(false);

	// Form state
	let formName = $state('');
	let formPhone = $state('');
	let formEmail = $state('');
	let formNotes = $state('');
	let formTags = $state('');
	let formStatus = $state('active');
	let formAddressStreet = $state('');
	let formAddressCity = $state('');
	let formAddressState = $state('');
	let formAddressPostalCode = $state('');

	const TIER_COLORS: Record<string, string> = {
		bronze: 'bg-amber-700 text-white',
		silver: 'bg-gray-400 text-white',
		gold: 'bg-yellow-500 text-white',
		platinum: 'bg-purple-600 text-white'
	};

	function goBack() {
		const business = $page.params.business;
		const slug = $page.params.slug;
		goto(`/${business}/${slug}/customers`);
	}

	function openEditDialog() {
		if (!customer) return;
		formName = customer.name;
		formPhone = customer.phone;
		formEmail = customer.email || '';
		formNotes = customer.notes || '';
		formTags = customer.tags?.join(', ') || '';
		formStatus = customer.status;
		const addr = customer.address as any;
		formAddressStreet = addr?.street || '';
		formAddressCity = addr?.city || '';
		formAddressState = addr?.state || '';
		formAddressPostalCode = addr?.postalCode || '';
		showEditDialog = true;
	}

	async function handleUpdate() {
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
			const payload: UpdateCustomerPayload = {
				name: formName.trim(),
				phone: formPhone.trim(),
				email: formEmail.trim() || undefined,
				address,
				notes: formNotes.trim() || undefined,
				tags,
				status: formStatus as 'active' | 'inactive'
			};
			await updateCustomer(businessId, customer.id, payload);
			toast.success('Customer updated');
			showEditDialog = false;
			await invalidateAll();
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isSubmitting = false;
		}
	}

	function openAdjustDialog() {
		adjustAmount = 0;
		adjustReason = '';
		showAdjustDialog = true;
	}

	async function handleAdjustPoints() {
		if (adjustAmount === 0) {
			toast.error('Points amount cannot be zero');
			return;
		}
		if (!adjustReason.trim()) {
			toast.error('Please provide a reason');
			return;
		}

		isAdjusting = true;
		const businessId = (data as any).businessId;

		try {
			await adjustLoyaltyPoints(businessId, customer.id, adjustAmount, adjustReason.trim());
			toast.success(`Points ${adjustAmount > 0 ? 'added' : 'deducted'} successfully`);
			showAdjustDialog = false;
			await invalidateAll();
		} catch (error) {
			toast.error(userFriendlyError(error));
		} finally {
			isAdjusting = false;
		}
	}

	function viewOrder(orderId: string) {
		const business = $page.params.business;
		const slug = $page.params.slug;
		goto(`/${business}/${slug}/orders?orderId=${orderId}`);
	}
</script>

{#if !customer}
	<div class="flex flex-col items-center justify-center gap-4 p-12">
		<p class="text-muted-foreground">Customer not found</p>
		<Button variant="outline" onclick={goBack}>Back to Customers</Button>
	</div>
{:else}
	<div class="flex flex-col gap-6 p-6">
		<!-- Header -->
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={goBack}>
				<IconArrowLeft class="h-5 w-5" />
			</Button>
			<div class="flex-1">
				<h1 class="text-2xl font-bold">{customer.name}</h1>
				<p class="text-muted-foreground">{customer.phone}</p>
			</div>
			<Button variant="outline" size="sm" onclick={openEditDialog}>
				<IconEdit class="mr-2 h-4 w-4" />
				Edit
			</Button>
		</div>

		<!-- Profile Card + Order Stats -->
		<div class="grid gap-4 md:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Customer Info</Card.Title>
				</Card.Header>
				<Card.Content class="grid gap-3">
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Phone</span>
						<span class="text-sm font-medium">{customer.phone}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Email</span>
						<span class="text-sm font-medium">{customer.email || '-'}</span>
					</div>
					{#if customer.address}
						{@const addr = customer.address as any}
						<div class="flex justify-between">
							<span class="text-sm text-muted-foreground">Address</span>
							<span class="text-sm font-medium text-right">
								{[addr.street, addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ') || '-'}
							</span>
						</div>
					{/if}
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Status</span>
						<StatusPill label={customer.status} status={customer.status === 'active' ? 'success' : 'neutral'} />
					</div>
					{#if customer.notes}
						<div class="border-t pt-3">
							<span class="text-sm text-muted-foreground">Notes</span>
							<p class="mt-1 text-sm">{customer.notes}</p>
						</div>
					{/if}
					{#if customer.tags && customer.tags.length > 0}
						<div class="border-t pt-3">
							<span class="text-sm text-muted-foreground">Tags</span>
							<div class="mt-1 flex flex-wrap gap-1">
								{#each customer.tags as tag}
									<Badge variant="secondary">{tag}</Badge>
								{/each}
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Order Stats -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-base">Order Summary</Card.Title>
				</Card.Header>
				<Card.Content class="grid gap-3">
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Total Orders</span>
						<span class="text-sm font-bold">{orderStats.totalOrders}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Total Spent</span>
						<span class="text-sm font-bold">{i18n.formatCurrency(orderStats.totalSpent)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Last Order</span>
						<span class="text-sm font-medium">
							{orderStats.lastOrderDate
								? new Date(orderStats.lastOrderDate).toLocaleDateString()
								: 'No orders yet'}
						</span>
					</div>
					<div class="flex justify-between">
						<span class="text-sm text-muted-foreground">Member Since</span>
						<span class="text-sm font-medium">
							{new Date(customer.createdAt).toLocaleDateString()}
						</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Loyalty Card -->
		{#if loyaltySettings?.enabled && loyaltyAccount}
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<IconStar class="h-5 w-5 text-yellow-500" />
							<Card.Title class="text-base">Loyalty Rewards</Card.Title>
						</div>
						<Button variant="outline" size="sm" onclick={openAdjustDialog}>
							<IconAdjustmentsHorizontal class="mr-2 h-4 w-4" />
							Adjust Points
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-4 sm:grid-cols-3">
						<div class="text-center">
							<p class="text-3xl font-bold">{loyaltyAccount.points}</p>
							<p class="text-sm text-muted-foreground">Available Points</p>
						</div>
						<div class="text-center">
							<Badge class={TIER_COLORS[loyaltyAccount.tier] || ''}>
								{loyaltyAccount.tier.charAt(0).toUpperCase() + loyaltyAccount.tier.slice(1)}
							</Badge>
							<p class="mt-1 text-sm text-muted-foreground">Current Tier</p>
						</div>
						<div class="text-center">
							<p class="text-xl font-semibold">{loyaltyAccount.lifetimePoints}</p>
							<p class="text-sm text-muted-foreground">Lifetime Points</p>
						</div>
					</div>

					{#if loyaltyTransactions.length > 0}
						<div class="mt-4 border-t pt-4">
							<p class="mb-2 text-sm font-medium">Recent Transactions</p>
							<div class="space-y-2">
								{#each loyaltyTransactions as txn}
									<div class="flex items-center justify-between text-sm">
										<div>
											<span class="font-medium {txn.points > 0 ? 'text-green-600' : 'text-red-600'}">
												{txn.points > 0 ? '+' : ''}{txn.points}
											</span>
											<span class="ml-2 text-muted-foreground">{txn.description}</span>
										</div>
										<span class="text-xs text-muted-foreground">
											{new Date(txn.createdAt).toLocaleDateString()}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Order History -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Order History</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if orders.length === 0}
					<p class="py-8 text-center text-sm text-muted-foreground">No orders yet</p>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Order #</Table.Head>
								<Table.Head>Date</Table.Head>
								<Table.Head>Type</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Payment</Table.Head>
								<Table.Head class="text-right">Total</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each orders as order}
								{@const pricing = order.pricing as any}
								<Table.Row
									class="cursor-pointer hover:bg-muted/50"
									onclick={() => viewOrder(order.id)}
								>
									<Table.Cell class="font-medium">{order.orderNumber}</Table.Cell>
									<Table.Cell>{new Date(order.createdAt).toLocaleDateString()}</Table.Cell>
									<Table.Cell class="capitalize">{order.orderType.replace('_', ' ')}</Table.Cell>
									<Table.Cell>
										<StatusPill
											label={order.status}
											status={order.status === 'completed'
												? 'success'
												: order.status === 'cancelled'
													? 'error'
													: 'warning'}
										/>
									</Table.Cell>
									<Table.Cell>
										<StatusPill
											label={order.paymentStatus}
											status={order.paymentStatus === 'paid'
												? 'success'
												: order.paymentStatus === 'partial'
													? 'warning'
													: 'neutral'}
										/>
									</Table.Cell>
									<Table.Cell class="text-right font-medium">
										{i18n.formatCurrency(pricing?.total || 0)}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Edit Dialog -->
	<Dialog.Root bind:open={showEditDialog}>
		<Dialog.Content class="max-w-lg">
			<Dialog.Header>
				<Dialog.Title>Edit Customer</Dialog.Title>
				<Dialog.Description>Update customer information.</Dialog.Description>
			</Dialog.Header>

			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<label for="edit-name" class="text-sm font-medium">Name *</label>
					<Input id="edit-name" bind:value={formName} placeholder="Customer name" />
				</div>
				<div class="grid gap-2">
					<label for="edit-phone" class="text-sm font-medium">Phone *</label>
					<Input id="edit-phone" bind:value={formPhone} placeholder="Phone number" />
				</div>
				<div class="grid gap-2">
					<label for="edit-email" class="text-sm font-medium">Email</label>
					<Input id="edit-email" type="email" bind:value={formEmail} placeholder="Email address" />
				</div>

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
					<label for="edit-notes" class="text-sm font-medium">Notes</label>
					<Textarea id="edit-notes" bind:value={formNotes} placeholder="Customer notes..." rows={2} />
				</div>
				<div class="grid gap-2">
					<label for="edit-tags" class="text-sm font-medium">Tags</label>
					<Input id="edit-tags" bind:value={formTags} placeholder="VIP, Regular, etc. (comma-separated)" />
				</div>

				<div class="grid gap-2">
					<label for="edit-status" class="text-sm font-medium">Status</label>
					<select
						id="edit-status"
						bind:value={formStatus}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showEditDialog = false)}>Cancel</Button>
				<Button onclick={handleUpdate} disabled={isSubmitting}>
					{#if isSubmitting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Update
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Adjust Points Dialog -->
	<Dialog.Root bind:open={showAdjustDialog}>
		<Dialog.Content class="max-w-sm">
			<Dialog.Header>
				<Dialog.Title>Adjust Points</Dialog.Title>
				<Dialog.Description>Add or deduct loyalty points manually.</Dialog.Description>
			</Dialog.Header>

			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<label for="adjust-points" class="text-sm font-medium">Points (use negative to deduct)</label>
					<Input
						id="adjust-points"
						type="number"
						bind:value={adjustAmount}
						placeholder="e.g., 50 or -25"
					/>
				</div>
				<div class="grid gap-2">
					<label for="adjust-reason" class="text-sm font-medium">Reason *</label>
					<Input
						id="adjust-reason"
						bind:value={adjustReason}
						placeholder="e.g., Loyalty bonus, Correction..."
					/>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showAdjustDialog = false)}>Cancel</Button>
				<Button onclick={handleAdjustPoints} disabled={isAdjusting}>
					{#if isAdjusting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Adjust
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
