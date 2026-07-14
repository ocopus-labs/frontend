<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		updateAdminBusinessStatus,
		adminTransferOwnership,
		adminGetBusinessOrders,
		adminGetBusinessPayments,
		adminGetBusinessAuditLogs,
		adminUpdateBusiness,
		adminDeleteBusiness,
		impersonateUser
	} from '$lib/api/admin';
	import { toast } from 'svelte-sonner';
	import { invalidate, goto } from '$app/navigation';
	import { formatCurrency } from '$lib/utils/i18n';
	import { formatDate, formatDateTime, getStatusBadgeVariant } from '$lib/utils/formatting';
	import type { PageData } from './$types';

	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Building2 from '@lucide/svelte/icons/building-2';
	import User from '@lucide/svelte/icons/user';
	import Users from '@lucide/svelte/icons/users';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Ban from '@lucide/svelte/icons/ban';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pencil from '@lucide/svelte/icons/pencil';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import Globe from '@lucide/svelte/icons/globe';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import Activity from '@lucide/svelte/icons/activity';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let { data }: { data: PageData } = $props();
	let business = $derived(data.business);

	let suspendDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let transferDialogOpen = $state(false);
	let editDialogOpen = $state(false);
	let isActioning = $state(false);
	let newOwnerId = $state('');

	// Edit form
	let editName = $state('');
	let editDescription = $state('');
	let editStreet = $state('');
	let editCity = $state('');
	let editCountry = $state('');
	let editPhone = $state('');
	let editEmail = $state('');

	// Lazy-loaded tab data
	let orders = $state<any[]>([]);
	let ordersTotal = $state(0);
	let ordersPage = $state(1);
	let ordersLoaded = $state(false);

	let payments = $state<any[]>([]);
	let paymentsTotal = $state(0);
	let paymentsPage = $state(1);
	let paymentsLoaded = $state(false);

	let auditLogs = $state<any[]>([]);
	let auditTotal = $state(0);
	let auditPage = $state(1);
	let auditLoaded = $state(false);

	function fmt(amount: number): string {
		return formatCurrency(amount, ((business as any).settings?.currency || 'USD') as any);
	}

	const address = $derived((business as any).address || {});
	const contact = $derived((business as any).contact || {});
	const settings = $derived((business as any).settings || {});

	function openEdit() {
		editName = business.name || '';
		editDescription = (business as any).description || '';
		editStreet = address.street || '';
		editCity = address.city || '';
		editCountry = address.country || '';
		editPhone = contact.phone || '';
		editEmail = contact.email || '';
		editDialogOpen = true;
	}

	async function saveEdit() {
		isActioning = true;
		try {
			await adminUpdateBusiness(business.id, {
				name: editName,
				description: editDescription,
				address: { street: editStreet, city: editCity, country: editCountry },
				contact: { phone: editPhone, email: editEmail }
			});
			toast.success('Business updated');
			editDialogOpen = false;
			await invalidate('app:admin-businesses');
		} catch (e: any) {
			toast.error(e?.message || 'Failed to update');
		} finally {
			isActioning = false;
		}
	}

	async function loadOrders(page = 1) {
		try {
			const res = await adminGetBusinessOrders(business.id, page, 20);
			orders = res.data;
			ordersTotal = res.total;
			ordersPage = page;
			ordersLoaded = true;
		} catch {
			toast.error('Failed to load orders');
		}
	}
	async function loadPayments(page = 1) {
		try {
			const res = await adminGetBusinessPayments(business.id, page, 20);
			payments = res.data;
			paymentsTotal = res.total;
			paymentsPage = page;
			paymentsLoaded = true;
		} catch {
			toast.error('Failed to load payments');
		}
	}
	async function loadAudit(page = 1) {
		try {
			const res = await adminGetBusinessAuditLogs(business.id, page, 20);
			auditLogs = res.data;
			auditTotal = res.total;
			auditPage = page;
			auditLoaded = true;
		} catch {
			toast.error('Failed to load audit logs');
		}
	}

	async function confirmSuspend() {
		isActioning = true;
		try {
			await updateAdminBusinessStatus(business.id, 'suspended');
			toast.success('Business suspended');
			await invalidate('app:admin-businesses');
		} catch {
			toast.error('Failed to suspend');
		} finally {
			isActioning = false;
		}
	}
	async function handleActivate() {
		isActioning = true;
		try {
			await updateAdminBusinessStatus(business.id, 'active');
			toast.success('Business activated');
			await invalidate('app:admin-businesses');
		} catch {
			toast.error('Failed to activate');
		} finally {
			isActioning = false;
		}
	}
	async function handleDelete() {
		isActioning = true;
		try {
			await adminDeleteBusiness(business.id);
			toast.success('Business deleted');
			goto('/admin/businesses');
		} catch (e: any) {
			toast.error(e?.message || 'Failed to delete');
		} finally {
			isActioning = false;
		}
	}
	async function handleTransfer() {
		if (!newOwnerId.trim()) {
			toast.error('Enter a user ID or email');
			return;
		}
		isActioning = true;
		try {
			await adminTransferOwnership(business.id, newOwnerId.trim());
			toast.success('Ownership transferred');
			newOwnerId = '';
			transferDialogOpen = false;
			await invalidate('app:admin-businesses');
		} catch (err: any) {
			toast.error(err?.message || 'Failed to transfer');
		} finally {
			isActioning = false;
		}
	}
	async function handleImpersonateOwner() {
		try {
			await impersonateUser(business.owner?.id);
			toast.success(`Now impersonating ${business.owner?.name || business.owner?.email}`);
			goto(`/${business.type}/${business.slug}/dashboard`);
		} catch {
			toast.error('Failed to impersonate');
		}
	}
</script>

<svelte:head>
	<title>{business.name} | Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" href="/admin/businesses" aria-label="Back">
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">{business.name}</h1>
				<p class="text-muted-foreground">
					/{business.slug} &middot; <span class="capitalize">{business.type}</span>
				</p>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Button variant="outline" size="sm" onclick={openEdit}>
				<Pencil class="mr-2 h-4 w-4" />Edit
			</Button>
			<Button variant="outline" size="sm" onclick={handleImpersonateOwner}>
				<UserCog class="mr-2 h-4 w-4" />Login as Owner
			</Button>
			<Button variant="outline" size="sm" onclick={() => (transferDialogOpen = true)}>
				<ArrowRightLeft class="mr-2 h-4 w-4" />Transfer
			</Button>
			{#if business.status === 'suspended'}
				<Button variant="outline" size="sm" onclick={handleActivate} disabled={isActioning}>
					<CheckCircle class="mr-2 h-4 w-4" />Activate
				</Button>
			{:else}
				<Button
					variant="destructive"
					size="sm"
					onclick={() => (suspendDialogOpen = true)}
					disabled={isActioning}
				>
					<Ban class="mr-2 h-4 w-4" />Suspend
				</Button>
			{/if}
			<Button
				variant="destructive"
				size="sm"
				onclick={() => (deleteDialogOpen = true)}
				disabled={isActioning}
			>
				<Trash2 class="mr-2 h-4 w-4" />Delete
			</Button>
		</div>
	</div>

	<!-- Profile + Stats -->
	<div class="grid gap-6 md:grid-cols-3">
		<!-- Profile Card -->
		<Card.Root class="md:col-span-1">
			<Card.Content class="pt-6">
				<div class="flex flex-col items-center text-center">
					<div class="mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
						{#if business.logo}
							<img
								src={business.logo}
								alt={business.name}
								class="h-20 w-20 rounded-xl object-cover"
							/>
						{:else}
							<Building2 class="h-10 w-10 text-muted-foreground" />
						{/if}
					</div>
					<div class="mb-2 flex gap-2">
						<Badge variant="outline" class="capitalize">{business.type}</Badge>
						<Badge variant={getStatusBadgeVariant(business.status)} class="capitalize"
							>{business.status}</Badge
						>
					</div>

					<Separator class="my-4" />

					<!-- Owner -->
					<div class="w-full space-y-3 text-left text-sm">
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Owner</span>
							<a
								href="/admin/users/{business.owner?.id}"
								class="flex items-center gap-1 text-primary hover:underline"
							>
								{business.owner?.name || business.owner?.email}
								<ExternalLink class="h-3 w-3" />
							</a>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Created</span>
							<span>{formatDate(business.createdAt)}</span>
						</div>

						<!-- Contact Info -->
						{#if contact.phone}
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground"><Phone class="mr-1 inline h-3 w-3" />Phone</span
								>
								<span>{contact.phone}</span>
							</div>
						{/if}
						{#if contact.email}
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground"><Mail class="mr-1 inline h-3 w-3" />Email</span>
								<span class="max-w-[60%] truncate">{contact.email}</span>
							</div>
						{/if}
						{#if address.street || address.city}
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground"
									><MapPin class="mr-1 inline h-3 w-3" />Location</span
								>
								<span class="max-w-[60%] text-right">
									{[address.street, address.city, address.country].filter(Boolean).join(', ')}
								</span>
							</div>
						{/if}

						<!-- Settings -->
						{#if settings.currency}
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Currency</span>
								<span>{settings.currency}</span>
							</div>
						{/if}
						{#if settings.timezone}
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Timezone</span>
								<span class="text-xs">{settings.timezone}</span>
							</div>
						{/if}
						{#if settings.taxRate && settings.taxRate !== '0'}
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">Tax Rate</span>
								<span>{settings.taxRate}%</span>
							</div>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Stats -->
		<Card.Root class="md:col-span-2">
			<Card.Header>
				<Card.Title>Overview</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
					<div class="rounded-lg border p-3 text-center">
						<p class="text-2xl font-bold">{business._count?.orders ?? 0}</p>
						<p class="text-xs text-muted-foreground">Orders</p>
					</div>
					<div class="rounded-lg border p-3 text-center">
						<p class="text-2xl font-bold">{fmt(business.totalRevenue || 0)}</p>
						<p class="text-xs text-muted-foreground">Revenue</p>
					</div>
					<div class="rounded-lg border p-3 text-center">
						<p class="text-2xl font-bold">{business._count?.payments ?? 0}</p>
						<p class="text-xs text-muted-foreground">Payments</p>
					</div>
					<div class="rounded-lg border p-3 text-center">
						<p class="text-2xl font-bold">{business._count?.businessUsers ?? 0}</p>
						<p class="text-xs text-muted-foreground">Team</p>
					</div>
					<div class="rounded-lg border p-3 text-center">
						<p class="text-2xl font-bold">{business._count?.menuItems ?? 0}</p>
						<p class="text-xs text-muted-foreground">Menu Items</p>
					</div>
					<div class="rounded-lg border p-3 text-center">
						<p class="text-2xl font-bold">{business._count?.tables ?? 0}</p>
						<p class="text-xs text-muted-foreground">Tables</p>
					</div>
				</div>

				<!-- Subscription -->
				{#if business.subscriptions?.length > 0}
					<Separator class="my-4" />
					<div>
						<p class="mb-2 text-sm font-medium">Subscription</p>
						{#each business.subscriptions as sub}
							<div class="flex items-center justify-between rounded-lg border p-3">
								<div>
									<p class="text-sm font-medium">
										{sub.plan?.displayName || sub.plan?.name || 'Unknown'}
									</p>
									<p class="text-xs text-muted-foreground">
										{formatDate(sub.currentPeriodStart)} — {formatDate(sub.currentPeriodEnd)}
									</p>
								</div>
								<Badge variant={getStatusBadgeVariant(sub.status)} class="capitalize"
									>{sub.status}</Badge
								>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Tabs -->
	<Tabs.Root value="team">
		<Tabs.List>
			<Tabs.Trigger value="team">Team ({business.businessUsers?.length || 0})</Tabs.Trigger>
			<Tabs.Trigger
				value="orders"
				onclick={() => {
					if (!ordersLoaded) loadOrders();
				}}>Orders</Tabs.Trigger
			>
			<Tabs.Trigger
				value="payments"
				onclick={() => {
					if (!paymentsLoaded) loadPayments();
				}}>Payments</Tabs.Trigger
			>
			<Tabs.Trigger
				value="audit"
				onclick={() => {
					if (!auditLoaded) loadAudit();
				}}>Audit Log</Tabs.Trigger
			>
		</Tabs.List>

		<!-- Team -->
		<Tabs.Content value="team">
			<Card.Root>
				<Card.Header><Card.Title>Team Members</Card.Title></Card.Header>
				<Card.Content>
					{#if business.businessUsers?.length > 0}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Name</Table.Head>
									<Table.Head>Email</Table.Head>
									<Table.Head>Role</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each business.businessUsers as bu}
									<Table.Row>
										<Table.Cell>
											<a href="/admin/users/{bu.user?.id}" class="font-medium hover:underline"
												>{bu.user?.name || 'Unnamed'}</a
											>
										</Table.Cell>
										<Table.Cell class="text-sm text-muted-foreground">{bu.user?.email}</Table.Cell>
										<Table.Cell
											><Badge variant="outline" class="capitalize"
												>{bu.role?.replace(/_/g, ' ')}</Badge
											></Table.Cell
										>
										<Table.Cell
											><Badge
												variant={getStatusBadgeVariant(bu.status || 'active')}
												class="capitalize">{bu.status || 'active'}</Badge
											></Table.Cell
										>
										<Table.Cell>
											<a
												href="/admin/users/{bu.user?.id}"
												class="text-xs text-primary hover:underline">View</a
											>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{:else}
						<p class="py-4 text-center text-sm text-muted-foreground">No team members</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Orders -->
		<Tabs.Content value="orders">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Orders ({ordersTotal})</Card.Title>
						<div class="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={ordersPage <= 1}
								onclick={() => loadOrders(ordersPage - 1)}>Prev</Button
							>
							<Button
								variant="outline"
								size="sm"
								disabled={orders.length < 20}
								onclick={() => loadOrders(ordersPage + 1)}>Next</Button
							>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					{#if !ordersLoaded}
						<p class="py-4 text-center text-sm text-muted-foreground">Loading...</p>
					{:else if orders.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No orders</p>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Order #</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Payment</Table.Head>
									<Table.Head class="text-right">Total</Table.Head>
									<Table.Head>Date</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each orders as order}
									<Table.Row>
										<Table.Cell class="font-mono text-sm"
											>{order.orderNumber || order.id?.slice(0, 8)}</Table.Cell
										>
										<Table.Cell
											><Badge variant={getStatusBadgeVariant(order.status)} class="capitalize"
												>{order.status}</Badge
											></Table.Cell
										>
										<Table.Cell
											><Badge
												variant={getStatusBadgeVariant(order.paymentStatus)}
												class="capitalize">{order.paymentStatus}</Badge
											></Table.Cell
										>
										<Table.Cell class="text-right font-medium"
											>{fmt(Number(order.pricing?.total || 0))}</Table.Cell
										>
										<Table.Cell class="text-sm text-muted-foreground"
											>{formatDateTime(order.createdAt)}</Table.Cell
										>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Payments -->
		<Tabs.Content value="payments">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Payments ({paymentsTotal})</Card.Title>
						<div class="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={paymentsPage <= 1}
								onclick={() => loadPayments(paymentsPage - 1)}>Prev</Button
							>
							<Button
								variant="outline"
								size="sm"
								disabled={payments.length < 20}
								onclick={() => loadPayments(paymentsPage + 1)}>Next</Button
							>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					{#if !paymentsLoaded}
						<p class="py-4 text-center text-sm text-muted-foreground">Loading...</p>
					{:else if payments.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No payments</p>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Payment #</Table.Head>
									<Table.Head>Order</Table.Head>
									<Table.Head>Method</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head class="text-right">Amount</Table.Head>
									<Table.Head>Date</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each payments as payment}
									<Table.Row>
										<Table.Cell class="font-mono text-sm">{payment.paymentNumber}</Table.Cell>
										<Table.Cell class="text-sm">{payment.order?.orderNumber || '-'}</Table.Cell>
										<Table.Cell
											><Badge variant="outline" class="capitalize">{payment.method}</Badge
											></Table.Cell
										>
										<Table.Cell
											><Badge variant={getStatusBadgeVariant(payment.status)} class="capitalize"
												>{payment.status}</Badge
											></Table.Cell
										>
										<Table.Cell class="text-right font-medium"
											>{fmt(Number(payment.amount))}</Table.Cell
										>
										<Table.Cell class="text-sm text-muted-foreground"
											>{formatDateTime(payment.createdAt)}</Table.Cell
										>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Audit Log -->
		<Tabs.Content value="audit">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Audit Log ({auditTotal})</Card.Title>
						<div class="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={auditPage <= 1}
								onclick={() => loadAudit(auditPage - 1)}>Prev</Button
							>
							<Button
								variant="outline"
								size="sm"
								disabled={auditLogs.length < 20}
								onclick={() => loadAudit(auditPage + 1)}>Next</Button
							>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					{#if !auditLoaded}
						<p class="py-4 text-center text-sm text-muted-foreground">Loading...</p>
					{:else if auditLogs.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">No audit logs</p>
					{:else}
						<div class="space-y-2">
							{#each auditLogs as log}
								<div class="flex items-start gap-3 rounded-lg border p-3">
									<Activity class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
									<div class="min-w-0 flex-1">
										<p class="text-sm font-medium">{log.action}</p>
										<p class="text-xs text-muted-foreground">
											{log.user?.name || log.user?.email || 'System'} &middot; {log.resource}
											{#if log.ipAddress}&middot; {log.ipAddress}{/if}
										</p>
									</div>
									<span class="shrink-0 text-xs text-muted-foreground"
										>{formatDateTime(log.createdAt)}</span
									>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Edit Business Dialog -->
<Dialog.Root bind:open={editDialogOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Edit Business</Dialog.Title>
			<Dialog.Description>Update business details.</Dialog.Description>
		</Dialog.Header>
		<Field.Group class="py-4">
			<Field.Field>
				<Field.Label for="edit-name">Business Name</Field.Label>
				<Input id="edit-name" bind:value={editName} />
			</Field.Field>
			<Field.Field>
				<Field.Label for="edit-desc">Description</Field.Label>
				<Textarea id="edit-desc" bind:value={editDescription} rows={2} />
			</Field.Field>
			<Separator />
			<p class="text-sm font-medium">Contact</p>
			<div class="grid grid-cols-2 gap-3">
				<Field.Field>
					<Field.Label for="edit-phone">Phone</Field.Label>
					<Input id="edit-phone" bind:value={editPhone} />
				</Field.Field>
				<Field.Field>
					<Field.Label for="edit-email">Email</Field.Label>
					<Input id="edit-email" bind:value={editEmail} />
				</Field.Field>
			</div>
			<Separator />
			<p class="text-sm font-medium">Address</p>
			<div class="space-y-3">
				<Field.Field>
					<Field.Label for="edit-street">Street</Field.Label>
					<Input id="edit-street" bind:value={editStreet} />
				</Field.Field>
				<div class="grid grid-cols-2 gap-3">
					<Field.Field>
						<Field.Label for="edit-city">City</Field.Label>
						<Input id="edit-city" bind:value={editCity} />
					</Field.Field>
					<Field.Field>
						<Field.Label for="edit-country">Country</Field.Label>
						<Input id="edit-country" bind:value={editCountry} />
					</Field.Field>
				</div>
			</div>
		</Field.Group>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (editDialogOpen = false)}>Cancel</Button>
			<Button onclick={saveEdit} disabled={isActioning}>{isActioning ? 'Saving...' : 'Save'}</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Transfer Ownership Dialog -->
<Dialog.Root bind:open={transferDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Transfer Ownership</Dialog.Title>
			<Dialog.Description
				>Enter the user ID of the new owner. The current owner will be downgraded to manager.</Dialog.Description
			>
		</Dialog.Header>
		<Field.Field class="py-4">
			<Field.Label for="new-owner">New Owner User ID</Field.Label>
			<Input id="new-owner" bind:value={newOwnerId} placeholder="User ID" />
		</Field.Field>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (transferDialogOpen = false)}>Cancel</Button>
			<Button onclick={handleTransfer} disabled={isActioning}
				>{isActioning ? 'Transferring...' : 'Transfer'}</Button
			>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Confirm Dialogs -->
<ConfirmDialog
	bind:open={suspendDialogOpen}
	title="Suspend Business"
	description="Suspend {business.name}? They will be unable to process orders."
	confirmLabel="Suspend"
	variant="destructive"
	onConfirm={confirmSuspend}
/>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Business"
	description="Permanently delete {business.name}? This will remove all orders, payments, and data. This cannot be undone."
	confirmLabel="Delete Permanently"
	variant="destructive"
	onConfirm={handleDelete}
/>
