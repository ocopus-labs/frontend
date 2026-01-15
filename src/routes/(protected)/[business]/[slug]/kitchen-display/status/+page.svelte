<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		IconClock,
		IconCheck,
		IconFlame,
		IconChefHat,
		IconRefresh
	} from '@tabler/icons-svelte';

	// Status board data
	let stations = $state([
		{
			id: 1,
			name: 'Grill Station',
			icon: IconFlame,
			activeOrders: 3,
			avgTime: 12,
			status: 'busy',
			currentItems: [
				{ name: 'Grilled Salmon', orderId: 'ORD-202', elapsed: 8 },
				{ name: 'Ribeye Steak', orderId: 'ORD-206', elapsed: 5 },
				{ name: 'BBQ Chicken', orderId: 'ORD-207', elapsed: 3 }
			]
		},
		{
			id: 2,
			name: 'Pizza Station',
			icon: IconChefHat,
			activeOrders: 2,
			avgTime: 15,
			status: 'normal',
			currentItems: [
				{ name: 'Margherita Pizza', orderId: 'ORD-201', elapsed: 10 },
				{ name: 'Pepperoni Pizza x2', orderId: 'ORD-204', elapsed: 7 }
			]
		},
		{
			id: 3,
			name: 'Salad Station',
			icon: IconChefHat,
			activeOrders: 1,
			avgTime: 5,
			status: 'normal',
			currentItems: [{ name: 'Caesar Salad x2', orderId: 'ORD-201', elapsed: 3 }]
		},
		{
			id: 4,
			name: 'Fry Station',
			icon: IconFlame,
			activeOrders: 2,
			avgTime: 8,
			status: 'normal',
			currentItems: [
				{ name: 'French Fries x2', orderId: 'ORD-203', elapsed: 2 },
				{ name: 'Chicken Wings x2', orderId: 'ORD-203', elapsed: 4 }
			]
		},
		{
			id: 5,
			name: 'Pasta Station',
			icon: IconChefHat,
			activeOrders: 1,
			avgTime: 10,
			status: 'idle',
			currentItems: [{ name: 'Pasta Carbonara', orderId: 'ORD-205', elapsed: 1 }]
		},
		{
			id: 6,
			name: 'Dessert Station',
			icon: IconChefHat,
			activeOrders: 0,
			avgTime: 0,
			status: 'idle',
			currentItems: []
		}
	]);

	const recentlyCompleted = $state([
		{ orderId: 'ORD-199', items: 4, completedAt: '14:28', duration: 18 },
		{ orderId: 'ORD-198', items: 2, completedAt: '14:22', duration: 12 },
		{ orderId: 'ORD-197', items: 5, completedAt: '14:15', duration: 22 },
		{ orderId: 'ORD-196', items: 3, completedAt: '14:08', duration: 15 }
	]);

	const stats = $derived({
		activeOrders: stations.reduce((sum, s) => sum + s.activeOrders, 0),
		avgPrepTime: Math.round(
			stations.filter((s) => s.avgTime > 0).reduce((sum, s) => sum + s.avgTime, 0) /
				stations.filter((s) => s.avgTime > 0).length
		),
		busyStations: stations.filter((s) => s.status === 'busy').length,
		idleStations: stations.filter((s) => s.status === 'idle').length
	});

	function getStatusColor(status: string) {
		switch (status) {
			case 'busy':
				return 'border-red-500 bg-red-50 dark:bg-red-950';
			case 'normal':
				return 'border-green-500 bg-green-50 dark:bg-green-950';
			case 'idle':
				return 'border-gray-300 bg-gray-50 dark:bg-gray-900';
			default:
				return '';
		}
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'busy':
				return { variant: 'destructive' as const, text: 'Busy' };
			case 'normal':
				return { variant: 'default' as const, text: 'Active' };
			case 'idle':
				return { variant: 'secondary' as const, text: 'Idle' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	function refreshStatus() {
		console.log('Refresh status');
	}
</script>

<div class="flex flex-1 flex-col bg-muted/30">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Preparation Status</h1>
					<p class="text-muted-foreground">Real-time kitchen station overview</p>
				</div>
				<Button onclick={refreshStatus} variant="outline">
					<IconRefresh class="mr-2 h-4 w-4" />
					Refresh
				</Button>
			</div>

			<!-- Quick Stats -->
			<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Active Orders</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.activeOrders}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Avg Prep Time</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.avgPrepTime}m</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Busy Stations</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-red-600">{stats.busyStations}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Idle Stations</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-gray-500">{stats.idleStations}</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Stations Grid -->
			<div class="px-6">
				<h2 class="mb-4 text-lg font-semibold">Kitchen Stations</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each stations as station (station.id)}
						<Card.Root class="border-l-4 {getStatusColor(station.status)}">
							<Card.Header>
								<div class="flex items-center justify-between">
									<Card.Title class="flex items-center gap-2">
										<station.icon class="h-5 w-5" />
										{station.name}
									</Card.Title>
									<Badge variant={getStatusBadge(station.status).variant}>
										{getStatusBadge(station.status).text}
									</Badge>
								</div>
								<Card.Description>
									{station.activeOrders} active orders • Avg {station.avgTime}m
								</Card.Description>
							</Card.Header>
							<Card.Content>
								{#if station.currentItems.length > 0}
									<div class="space-y-2">
										{#each station.currentItems as item}
											<div class="flex items-center justify-between text-sm">
												<div>
													<span class="font-medium">{item.name}</span>
													<span class="text-muted-foreground"> ({item.orderId})</span>
												</div>
												<div class="flex items-center gap-1 text-muted-foreground">
													<IconClock class="h-3 w-3" />
													{item.elapsed}m
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<p class="text-sm text-muted-foreground">No active items</p>
								{/if}
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>

			<!-- Recently Completed -->
			<div class="px-6">
				<h2 class="mb-4 text-lg font-semibold">Recently Completed</h2>
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="space-y-3">
							{#each recentlyCompleted as order}
								<div class="flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-950">
									<div class="flex items-center gap-3">
										<IconCheck class="h-5 w-5 text-green-600" />
										<div>
											<span class="font-medium">{order.orderId}</span>
											<span class="text-sm text-muted-foreground">
												• {order.items} items
											</span>
										</div>
									</div>
									<div class="text-right text-sm">
										<div class="text-muted-foreground">{order.completedAt}</div>
										<div class="text-green-600">{order.duration}m prep time</div>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</div>
