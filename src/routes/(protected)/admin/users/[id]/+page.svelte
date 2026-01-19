<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { PageData } from './$types';

	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Shield from '@lucide/svelte/icons/shield';
	import Mail from '@lucide/svelte/icons/mail';
	import MailCheck from '@lucide/svelte/icons/mail-check';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';

	let { data }: { data: PageData } = $props();

	const user = data.user;

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function getInitials(name: string | null, email: string): string {
		if (name) {
			return name
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2);
		}
		return email[0].toUpperCase();
	}

	function getRoleBadgeVariant(role: string | null): 'default' | 'destructive' | 'secondary' {
		if (role === 'super_admin') return 'destructive';
		if (role === 'franchise_owner') return 'default';
		return 'secondary';
	}
</script>

<svelte:head>
	<title>{user.name || user.email} | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/admin/users">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">User Details</h1>
			<p class="text-muted-foreground">View user information and activity</p>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-3">
		<!-- Profile Card -->
		<Card.Root class="md:col-span-1">
			<Card.Content class="pt-6">
				<div class="flex flex-col items-center text-center">
					<Avatar.Root class="h-24 w-24 mb-4">
						<Avatar.Image src={user.image || undefined} alt={user.name || user.email} />
						<Avatar.Fallback class="text-2xl">{getInitials(user.name, user.email)}</Avatar.Fallback>
					</Avatar.Root>
					<h2 class="text-xl font-semibold">{user.name || 'Unnamed User'}</h2>
					<p class="text-muted-foreground text-sm">{user.email}</p>
					<div class="flex gap-2 mt-4">
						{#if user.role}
							<Badge variant={getRoleBadgeVariant(user.role)} class="capitalize">
								{#if user.role === 'super_admin'}
									<Shield class="h-3 w-3 mr-1" />
								{/if}
								{user.role.replace('_', ' ')}
							</Badge>
						{/if}
						{#if user.banned}
							<Badge variant="destructive">Banned</Badge>
						{:else}
							<Badge variant="outline">Active</Badge>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Info Cards -->
		<Card.Root class="md:col-span-2">
			<Card.Header>
				<Card.Title>Account Information</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex items-center gap-3">
						{#if user.emailVerified}
							<MailCheck class="h-5 w-5 text-green-600" />
							<div>
								<p class="text-sm font-medium">Email Verified</p>
								<p class="text-xs text-muted-foreground">Email has been confirmed</p>
							</div>
						{:else}
							<Mail class="h-5 w-5 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium">Email Not Verified</p>
								<p class="text-xs text-muted-foreground">Pending verification</p>
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<Calendar class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Member Since</p>
							<p class="text-xs text-muted-foreground">{formatDate(user.createdAt)}</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<Building2 class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Businesses</p>
							<p class="text-xs text-muted-foreground">{user._count.businessUsers} business memberships</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<ShoppingCart class="h-5 w-5 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">Orders</p>
							<p class="text-xs text-muted-foreground">{user._count.orders} total orders</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Activity Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Statistics</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-lg border p-4 text-center">
					<p class="text-3xl font-bold">{user._count.businessUsers}</p>
					<p class="text-sm text-muted-foreground">Business Memberships</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<p class="text-3xl font-bold">{user._count.ownedRestaurants}</p>
					<p class="text-sm text-muted-foreground">Owned Businesses</p>
				</div>
				<div class="rounded-lg border p-4 text-center">
					<p class="text-3xl font-bold">{user._count.orders}</p>
					<p class="text-sm text-muted-foreground">Total Orders</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
