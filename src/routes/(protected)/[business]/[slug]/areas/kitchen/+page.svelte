<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconFlame,
		IconClock,
		IconUsers,
		IconChefHat,
		IconAlertTriangle,
		IconCheck
	} from '@tabler/icons-svelte';

	// Kitchen area data
	const kitchenStats = {
		activeOrders: 8,
		avgPrepTime: 14,
		staffOnDuty: 4,
		temperature: 72
	};

	const stations = [
		{
			id: 1,
			name: 'Grill Station',
			status: 'active',
			chef: 'Marcus Johnson',
			currentOrders: 3,
			equipment: ['Main Grill', 'Char Grill', 'Salamander']
		},
		{
			id: 2,
			name: 'Pizza Station',
			status: 'active',
			chef: 'Luigi Romano',
			currentOrders: 2,
			equipment: ['Pizza Oven 1', 'Pizza Oven 2', 'Prep Counter']
		},
		{
			id: 3,
			name: 'Salad Station',
			status: 'active',
			chef: 'Emma Wilson',
			currentOrders: 1,
			equipment: ['Prep Table', 'Refrigerator', 'Salad Spinner']
		},
		{
			id: 4,
			name: 'Fry Station',
			status: 'active',
			chef: 'James Chen',
			currentOrders: 2,
			equipment: ['Deep Fryer 1', 'Deep Fryer 2', 'Warming Station']
		},
		{
			id: 5,
			name: 'Dessert Station',
			status: 'idle',
			chef: 'Sophie Martin',
			currentOrders: 0,
			equipment: ['Pastry Counter', 'Refrigerated Display', 'Ice Cream Freezer']
		}
	];

	const recentAlerts = [
		{ type: 'warning', message: 'Walk-in cooler temperature slightly high', time: '10 mins ago' },
		{ type: 'info', message: 'Pizza oven 2 scheduled for maintenance', time: '1 hour ago' },
		{ type: 'success', message: 'Health inspection passed', time: 'Yesterday' }
	];

	const equipmentStatus = [
		{ name: 'Main Oven', status: 'operational', temp: '425°F' },
		{ name: 'Walk-in Cooler', status: 'warning', temp: '42°F' },
		{ name: 'Freezer', status: 'operational', temp: '-10°F' },
		{ name: 'Dishwasher', status: 'operational', temp: '180°F' },
		{ name: 'Hood Ventilation', status: 'operational', temp: '-' }
	];

	function getStationStatusColor(status: string) {
		return status === 'active' ? 'bg-green-500' : 'bg-gray-400';
	}

	function getEquipmentStatusBadge(status: string) {
		switch (status) {
			case 'operational':
				return { variant: 'default' as const, text: 'Operational' };
			case 'warning':
				return { variant: 'secondary' as const, text: 'Warning' };
			case 'error':
				return { variant: 'destructive' as const, text: 'Error' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2 px-6">
				<h1 class="text-2xl font-bold">Kitchen Area</h1>
				<p class="text-muted-foreground">Monitor kitchen operations and equipment status</p>
			</div>

			<!-- Quick Stats -->
			<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Active Orders</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconFlame class="h-5 w-5 text-orange-500" />
							<span class="text-2xl font-bold">{kitchenStats.activeOrders}</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Avg Prep Time</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconClock class="h-5 w-5 text-blue-500" />
							<span class="text-2xl font-bold">{kitchenStats.avgPrepTime}m</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Staff on Duty</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconUsers class="h-5 w-5 text-green-500" />
							<span class="text-2xl font-bold">{kitchenStats.staffOnDuty}</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Temperature</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{kitchenStats.temperature}°F</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Stations Grid -->
			<div class="px-6">
				<h2 class="mb-4 text-lg font-semibold">Cooking Stations</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each stations as station (station.id)}
						<Card.Root>
							<Card.Header>
								<div class="flex items-center justify-between">
									<Card.Title class="flex items-center gap-2">
										<div class="h-3 w-3 rounded-full {getStationStatusColor(station.status)}"></div>
										{station.name}
									</Card.Title>
									<Badge variant={station.status === 'active' ? 'default' : 'secondary'}>
										{station.currentOrders} orders
									</Badge>
								</div>
								<Card.Description class="flex items-center gap-1">
									<IconChefHat class="h-4 w-4" />
									{station.chef}
								</Card.Description>
							</Card.Header>
							<Card.Content>
								<p class="mb-2 text-sm font-medium text-muted-foreground">Equipment:</p>
								<div class="flex flex-wrap gap-1">
									{#each station.equipment as equip}
										<Badge variant="outline" class="text-xs">{equip}</Badge>
									{/each}
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>

			<!-- Equipment Status and Alerts -->
			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Equipment Status</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each equipmentStatus as equipment}
								<div class="flex items-center justify-between rounded-lg bg-muted/50 p-3">
									<div>
										<p class="font-medium">{equipment.name}</p>
										{#if equipment.temp !== '-'}
											<p class="text-sm text-muted-foreground">{equipment.temp}</p>
										{/if}
									</div>
									<Badge variant={getEquipmentStatusBadge(equipment.status).variant}>
										{getEquipmentStatusBadge(equipment.status).text}
									</Badge>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Recent Alerts</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each recentAlerts as alert}
								<div class="flex items-start gap-3 rounded-lg p-3 {alert.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950' : alert.type === 'success' ? 'bg-green-50 dark:bg-green-950' : 'bg-blue-50 dark:bg-blue-950'}">
									{#if alert.type === 'warning'}
										<IconAlertTriangle class="h-5 w-5 text-yellow-600" />
									{:else if alert.type === 'success'}
										<IconCheck class="h-5 w-5 text-green-600" />
									{:else}
										<IconClock class="h-5 w-5 text-blue-600" />
									{/if}
									<div class="flex-1">
										<p class="text-sm">{alert.message}</p>
										<p class="text-xs text-muted-foreground">{alert.time}</p>
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
