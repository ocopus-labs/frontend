<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		updateAdminBusinessStatus,
		adminTransferOwnership,
		adminGetBusinessOrders,
		adminGetBusinessPayments,
		adminGetBusinessAuditLogs
	} from '$lib/api/admin';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import { formatCurrency } from '$lib/utils/i18n';
	import { formatDate, formatDateTime, getStatusBadgeVariant } from '$lib/utils/formatting';
	import type { PageData } from './$types';

	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Building2 from '@lucide/svelte/icons/building-2';
	import User from '@lucide/svelte/icons/user';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Users from '@lucide/svelte/icons/users';
	import Calendar from '@lucide/svelte/icons/calendar';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import Ban from '@lucide/svelte/icons/ban';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
	import Package from '@lucide/svelte/icons/package';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import ScrollText from '@lucide/svelte/icons/scroll-text';

	let { data }: { data: PageData } = $props();
	let business = $derived(data.business);

	let suspendDialogOpen = $state(false);
	let transferDialogOpen = $state(false);
	let isActioning = $state(false);
	let newOwnerId = $state('');

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

	async function loadOrders(page = 1) {
		try {
			const res = await adminGetBusinessOrders(business.id, page, 20);
			orders = res.data; ordersTotal = res.total; ordersPage = page; ordersLoaded = true;
		} catch { toast.error('Failed to load orders'); }
	}
	async function loadPayments(page = 1) {
		try {
			const res = await adminGetBusinessPayments(business.id, page, 20);
			payments = res.data; paymentsTotal = res.total; paymentsPage = page; paymentsLoaded = true;
		} catch { toast.error('Failed to load payments'); }
	}
	async function loadAudit(page = 1) {
		try {
			const res = await adminGetBusinessAuditLogs(business.id, page, 20);
			auditLogs = res.data; auditTotal = res.total; auditPage = page; auditLoaded = true;
		} catch { toast.error('Failed to load audit logs'); }
	}

	async function confirmSuspend() {
		isActioning = true;
		try {
			await updateAdminBusinessStatus(business.id, 'suspended');
			toast.success('Business suspended');
			await invalidate('app:admin-businesses');
		} catch { toast.error('Failed to suspend'); }
		finally { isActioning = false; }
	}
	async function handleActivate() {
		isActioning = true;
		try {
			await updateAdminBusinessStatus(business.id, 'active');
			toast.success('Business activated');
			await invalidate('app:admin-businesses');
		} catch { toast.error('Failed to activate'); }
		finally { isActioning = false; }
	}
	async function handleTransfer() {
		if (!newOwnerId.trim()) { toast.error('Enter a user ID'); return; }
		isActioning = true;
		try {
			await adminTransferOwnership(business.id, newOwnerId.trim());
			toast.success('Ownership transferred');
			newOwnerId = '';
			transferDialogOpen = false;
			await invalidate('app:admin-businesses');
		} catch (err: any) { toast.error(err?.message || 'Failed to transfer'); }
		finally { isActioning = false; }
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
				<p class="text-muted-foreground">/{business.slug} &middot; {business.type}</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={() => (transferDialogOpen = true)}>
				<ArrowRightLeft class="mr-2 h-4 w-4" />Transfer Ownership
			</Button>
			{#if business.status === 'suspended'}
				<Button variant="outline" size="sm" onclick={handleActivate} disabled={isActioning}>
					<CheckCircle class="mr-2 h-4 w-4" />Activate
				</Button>
			{:else}
				<Button variant="destructive" size="sm" onclick={() => (suspendDialogOpen = true)} disabled={isActioning}>
					<Ban class="mr-2 h-4 w-4" />Suspend
				</Button>
			{/if}
		</div>
	</div>

	<!-- Profile + Stats -->
	<div class="grid gap-6 md:grid-cols-3">
		<Card.Root class="md:col-span-1">
			<Card.Content class="pt-6">
				<div class="flex flex-col items-center text-center">
					<div class="flex h-20 w-20 items-center justify-center rounded-xl bg-muted mb-4">
						{#if business.logo}
							<img src={business.logo} alt={business.name} class="h-20 w-20 rounded-xl object-cover" />
						{:else}
							<Building2 class="h-10 w-10 text-muted-foreground" />
						{/if}
					</div>
					<div class="flex gap-2 mb-2">
						<Badge variant="outline" class="capitalize">{business.type}</Badge>
						<Badge variant={getStatusBadgeVariant(business.status)} class="capitalize">{business.status}</Badge>
					</div>
					<a href="/admin/users/{business.owner?.id}" class="text-sm text-primary hover:underline mt-2">
						<User class="h-3 w-3 inline mr-1" />{business.owner?.name || business.owner?.email}
					</a>
					<p class="text-xs text-muted-foreground mt-1">
						<Calendar class="h-3 w-3 inline mr-1" />Created {formatDate(business.createdAt)}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="md:col-span-2">
			<Card.Content class="pt-6">
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
						<p class="text-2xl font-bold">{business._count?.inventoryItems ?? 0}</p>
						<p class="text-xs text-muted-foreground">Inventory</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Tabs -->
	<Tabs.Root value="team">
		<Tabs.List>
			<Tabs.Trigger value="team">Team</Tabs.Trigger>
			<Tabs.Trigger value="orders" onclick={() => { if (!ordersLoaded) loadOrders(); }}>Orders</Tabs.Trigger>
			<Tabs.Trigger value="payments" onclick={() => { if (!paymentsLoaded) loadPayments(); }}>Payments</Tabs.Trigger>
			<Tabs.Trigger value="audit" onclick={() => { if (!auditLoaded) loadAudit(); }}>Audit Log</Tabs.Trigger>
		</Tabs.List>

		<!-- Team -->
		<Tabs.Content value="team">
			<Card.Root>
				<Card.Header><Card.Title>Team Members ({business.businessUsers?.length || 0})</Card.Title></Card.Header>
				<Card.Content>
					{#if business.businessUsers?.length > 0}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Name</Table.Head>
									<Table.Head>Email</Table.Head>
									<Table.Head>Role</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each business.businessUsers as bu}
									<Table.Row>
										<Table.Cell>
											<a href="/admin/users/{bu.user?.id}" class="font-medium hover:underline">{bu.user?.name || 'Unnamed'}</a>
										</Table.Cell>
										<Table.Cell class="text-sm text-muted-foreground">{bu.user?.email}</Table.Cell>
										<Table.Cell><Badge variant="outline" class="capitalize">{bu.role?.replace(/_/g, ' ')}</Badge></Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{:else}
						<p class="text-sm text-muted-foreground text-center py-4">No team members</p>
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
							<Button variant="outline" size="sm" disabled={ordersPage <= 1} onclick={() => loadOrders(ordersPage - 1)}>Prev</Button>
							<Button variant="outline" size="sm" disabled={orders.length < 20} onclick={() => loadOrders(ordersPage + 1)}>Next</Button>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					{#if !ordersLoaded}
						<p class="text-muted-foreground text-sm text-center py-4">Loading...</p>
					{:else if orders.length === 0}
						<p class="text-muted-foreground text-sm text-center py-4">No orders</p>
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
										<Table.Cell class="font-mono text-sm">{order.orderNumber || order.id?.slice(0, 8)}</Table.Cell>
										<Table.Cell><Badge variant={getStatusBadgeVariant(order.status)} class="capitalize">{order.status}</Badge></Table.Cell>
										<Table.Cell><Badge variant={getStatusBadgeVariant(order.paymentStatus)} class="capitalize">{order.paymentStatus}</Badge></Table.Cell>
										<Table.Cell class="text-right font-medium">{fmt(Number(order.pricing?.total || 0))}</Table.Cell>
										<Table.Cell class="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</Table.Cell>
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
							<Button variant="outline" size="sm" disabled={paymentsPage <= 1} onclick={() => loadPayments(paymentsPage - 1)}>Prev</Button>
							<Button variant="outline" size="sm" disabled={payments.length < 20} onclick={() => loadPayments(paymentsPage + 1)}>Next</Button>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					{#if !paymentsLoaded}
						<p class="text-muted-foreground text-sm text-center py-4">Loading...</p>
					{:else if payments.length === 0}
						<p class="text-muted-foreground text-sm text-center py-4">No payments</p>
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
										<Table.Cell><Badge variant="outline" class="capitalize">{payment.method}</Badge></Table.Cell>
										<Table.Cell><Badge variant={getStatusBadgeVariant(payment.status)} class="capitalize">{payment.status}</Badge></Table.Cell>
										<Table.Cell class="text-right font-medium">{fmt(Number(payment.amount))}</Table.Cell>
										<Table.Cell class="text-sm text-muted-foreground">{formatDateTime(payment.createdAt)}</Table.Cell>
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
							<Button variant="outline" size="sm" disabled={auditPage <= 1} onclick={() => loadAudit(auditPage - 1)}>Prev</Button>
							<Button variant="outline" size="sm" disabled={auditLogs.length < 20} onclick={() => loadAudit(auditPage + 1)}>Next</Button>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					{#if !auditLoaded}
						<p class="text-muted-foreground text-sm text-center py-4">Loading...</p>
					{:else if auditLogs.length === 0}
						<p class="text-muted-foreground text-sm text-center py-4">No audit logs</p>
					{:else}
						<div class="space-y-2">
							{#each auditLogs as log}
								<div class="flex items-start justify-between rounded-lg border p-3">
									<div>
										<p class="text-sm font-medium">{log.action}</p>
										<p class="text-xs text-muted-foreground">
											{log.user?.name || log.user?.email || 'System'} &middot; {log.resource}
											{#if log.ipAddress}&middot; {log.ipAddress}{/if}
										</p>
									</div>
									<p class="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</p>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Dialogs -->
<ConfirmDialog
	bind:open={suspendDialogOpen}
	title="Suspend Business"
	description="Suspend {business.name}? They will be unable to process orders."
	confirmLabel="Suspend"
	variant="destructive"
	onConfirm={confirmSuspend}
/>

{#if transferDialogOpen}
	<ConfirmDialog
		bind:open={transferDialogOpen}
		title="Transfer Ownership"
		description="Enter the user ID of the new owner. The current owner will be downgraded to manager."
		confirmLabel="Transfer"
		onConfirm={handleTransfer}
	>
		{#snippet children()}
			<div class="grid gap-2 py-2">
				<Label for="new-owner">New Owner User ID</Label>
				<Input id="new-owner" bind:value={newOwnerId} placeholder="User ID" />
			</div>
		{/snippet}
	</ConfirmDialog>
{/if}
