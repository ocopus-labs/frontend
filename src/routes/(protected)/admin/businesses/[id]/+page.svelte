<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { updateAdminBusinessStatus } from '$lib/api/admin';
	import { toast } from 'svelte-sonner';
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';

	import { formatCurrency } from '$lib/utils/i18n';

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

	function getOrderStatusBadge(status: string): 'default' | 'destructive' | 'secondary' | 'outline' {
		if (status === 'completed') return 'default';
		if (status === 'cancelled') return 'destructive';
		if (status === 'active' || status === 'pending') return 'secondary';
		return 'outline';
	}

	let { data }: { data: PageData } = $props();

	let business = $derived(data.business);

	let suspendDialogOpen = $state(false);
	let isActioning = $state(false);

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatCurrencyValue(amount: number): string {
		return formatCurrency(amount, ((business as any).settings?.currency || 'USD') as any);
	}

	function getStatusBadgeVariant(status: string): 'default' | 'destructive' | 'secondary' {
		if (status === 'active') return 'default';
		if (status === 'suspended') return 'destructive';
		return 'secondary';
	}

	function triggerSuspend() {
		suspendDialogOpen = true;
	}

	async function confirmSuspend() {
		isActioning = true;
		try {
			await updateAdminBusinessStatus(business.id, 'suspended');
			toast.success('Business has been suspended');
			await invalidate('app:admin-businesses');
		} catch (error) {
			toast.error('Failed to suspend business');
		} finally {
			isActioning = false;
		}
	}

	async function handleActivate() {
		isActioning = true;
		try {
			await updateAdminBusinessStatus(business.id, 'active');
			toast.success('Business has been activated');
			await invalidate('app:admin-businesses');
		} catch (error) {
			toast.error('Failed to activate business');
		} finally {
			isActioning = false;
		}
	}
</script>

<svelte:head>
	<title>{business.name} | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" href="/admin/businesses" aria-label="Back to businesses">
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Business Details</h1>
				<p class="text-muted-foreground">View business information and statistics</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if business.status === 'suspended'}
				<Button variant="outline" onclick={handleActivate} disabled={isActioning}>
					<CheckCircle class="mr-2 h-4 w-4" />
					Activate
				</Button>
			{:else}
				<Button variant="destructive" onclick={triggerSuspend} disabled={isActioning}>
					<Ban class="mr-2 h-4 w-4" />
					Suspend
				</Button>
			{/if}
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-3">
		<!-- Profile Card -->
		<Card.Root class="md:col-span-1">
			<Card.Content class="pt-6">
				<div class="flex flex-col items-center text-center">
					<div class="flex h-24 w-24 items-center justify-center rounded-xl bg-muted mb-4">
						{#if business.logo}
							<img src={business.logo} alt={business.name} loading="lazy" class="h-24 w-24 rounded-xl object-cover" />
						{:else}
							<Building2 class="h-12 w-12 text-muted-foreground" />
						{/if}
					</div>
					<h2 class="text-xl font-semibold">{business.name}</h2>
					<p class="text-muted-foreground text-sm">/{business.slug}</p>
					<div class="flex gap-2 mt-4">
						<Badge variant="outline" class="capitalize">{business.type}</Badge>
						<Badge variant={getStatusBadgeVariant(business.status)} class="capitalize">
							{business.status}
						</Badge>
					</div>
					{#if business.description}
						<p class="text-sm text-muted-foreground mt-4">{business.description}</p>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Info Cards -->
		<Card.Root class="md:col-span-2">
			<Card.Header>
				<Card.Title>Business Information</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex items-center gap-3">
						<User class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Owner</p>
							<p class="text-xs text-muted-foreground">
								{business.owner.name || 'Unnamed'} ({business.owner.email})
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<Calendar class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Created</p>
							<p class="text-xs text-muted-foreground">{formatDate(business.createdAt)}</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<Users class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Team Members</p>
							<p class="text-xs text-muted-foreground">{business._count.businessUsers} members</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<LayoutGrid class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Tables</p>
							<p class="text-xs text-muted-foreground">{business._count.tables} tables</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Statistics Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Statistics</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-4">
				<div class="rounded-lg border p-4 text-center">
					<ShoppingCart class="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
					<p class="text-3xl font-bold">{business._count.orders}</p>
					<p class="text-sm text-muted-foreground">Total Orders</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<DollarSign class="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
					<p class="text-3xl font-bold">{formatCurrencyValue(business.totalRevenue || 0)}</p>
					<p class="text-sm text-muted-foreground">Total Revenue</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<Users class="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
					<p class="text-3xl font-bold">{business._count.businessUsers}</p>
					<p class="text-sm text-muted-foreground">Team Members</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<LayoutGrid class="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
					<p class="text-3xl font-bold">{business._count.tables}</p>
					<p class="text-sm text-muted-foreground">Tables</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Recent Orders -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<ShoppingCart class="h-4 w-4" />
					Recent Orders
				</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if business.recentOrders && business.recentOrders.length > 0}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Order #</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head class="text-right">Total</Table.Head>
								<Table.Head>Date</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each business.recentOrders as order}
								<Table.Row>
									<Table.Cell class="font-mono text-sm">{order.orderNumber || order.id.slice(0, 8)}</Table.Cell>
									<Table.Cell>
										<Badge variant={getOrderStatusBadge(order.status)} class="capitalize">
											{order.status}
										</Badge>
									</Table.Cell>
									<Table.Cell class="text-right font-medium">
										{formatCurrencyValue(Number((order as any).pricing?.total || 0))}
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">
										{formatDate(order.createdAt)}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-4">No orders yet</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Team Members -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Users class="h-4 w-4" />
					Team Members
				</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if business.businessUsers && business.businessUsers.length > 0}
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
										<a href="/admin/users/{bu.user.id}" class="font-medium hover:underline">
											{bu.user.name || 'Unnamed'}
										</a>
									</Table.Cell>
									<Table.Cell class="text-sm text-muted-foreground">{bu.user.email}</Table.Cell>
									<Table.Cell>
										<Badge variant="outline" class="capitalize">{bu.role?.replace('_', ' ') || 'member'}</Badge>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{:else}
					<p class="text-sm text-muted-foreground text-center py-4">No team members</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>

<ConfirmDialog
	bind:open={suspendDialogOpen}
	title="Suspend Business"
	description="Are you sure you want to suspend {business.name}? The business will be unable to process orders."
	confirmLabel="Suspend"
	variant="destructive"
	onConfirm={confirmSuspend}
/>
