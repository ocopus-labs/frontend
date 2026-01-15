<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconUsers,
		IconArmchair,
		IconClock,
		IconCheck,
		IconX
	} from '@tabler/icons-svelte';

	// Dining area data
	const diningStats = {
		totalCapacity: 80,
		currentGuests: 45,
		availableTables: 8,
		avgTurnover: 52
	};

	const sections = [
		{
			id: 1,
			name: 'Main Dining Hall',
			tables: 12,
			capacity: 48,
			occupied: 8,
			server: 'Jessica Miller'
		},
		{
			id: 2,
			name: 'Window Seating',
			tables: 6,
			capacity: 16,
			occupied: 4,
			server: 'David Brown'
		},
		{
			id: 3,
			name: 'Booth Section',
			tables: 4,
			capacity: 16,
			occupied: 3,
			server: 'Sarah Johnson'
		}
	];

	const currentTables = [
		{ table: 'T-02', guests: 4, server: 'Jessica', status: 'dining', elapsed: 45 },
		{ table: 'T-05', guests: 2, server: 'Jessica', status: 'ordering', elapsed: 5 },
		{ table: 'T-07', guests: 6, server: 'David', status: 'dining', elapsed: 32 },
		{ table: 'T-10', guests: 4, server: 'David', status: 'dessert', elapsed: 58 },
		{ table: 'B-01', guests: 4, server: 'Sarah', status: 'dining', elapsed: 25 },
		{ table: 'B-03', guests: 4, server: 'Sarah', status: 'waiting-food', elapsed: 18 }
	];

	const recentActivity = [
		{ action: 'Table T-04 cleared', time: '2 mins ago' },
		{ action: 'New party seated at T-12', time: '5 mins ago' },
		{ action: 'Bill requested at B-02', time: '8 mins ago' },
		{ action: 'Reservation arrived: Smith Party', time: '10 mins ago' }
	];

	function getStatusBadge(status: string) {
		switch (status) {
			case 'ordering':
				return { variant: 'secondary' as const, text: 'Ordering' };
			case 'waiting-food':
				return { variant: 'outline' as const, text: 'Waiting for Food' };
			case 'dining':
				return { variant: 'default' as const, text: 'Dining' };
			case 'dessert':
				return { variant: 'default' as const, text: 'Dessert' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}

	function getElapsedColor(elapsed: number) {
		if (elapsed > 50) return 'text-red-500';
		if (elapsed > 30) return 'text-yellow-500';
		return 'text-green-500';
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2 px-6">
				<h1 class="text-2xl font-bold">Dining Area</h1>
				<p class="text-muted-foreground">Monitor floor activity and guest seating</p>
			</div>

			<!-- Quick Stats -->
			<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Current Guests</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconUsers class="h-5 w-5 text-blue-500" />
							<span class="text-2xl font-bold">{diningStats.currentGuests}</span>
							<span class="text-muted-foreground">/ {diningStats.totalCapacity}</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Available Tables</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconArmchair class="h-5 w-5 text-green-500" />
							<span class="text-2xl font-bold">{diningStats.availableTables}</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Avg Turnover</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconClock class="h-5 w-5 text-orange-500" />
							<span class="text-2xl font-bold">{diningStats.avgTurnover}m</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Occupancy</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">
							{Math.round((diningStats.currentGuests / diningStats.totalCapacity) * 100)}%
						</div>
						<div class="mt-1 h-2 w-full rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-blue-500"
								style="width: {(diningStats.currentGuests / diningStats.totalCapacity) * 100}%"
							></div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Sections Overview -->
			<div class="px-6">
				<h2 class="mb-4 text-lg font-semibold">Sections</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
					{#each sections as section (section.id)}
						<Card.Root>
							<Card.Header>
								<Card.Title>{section.name}</Card.Title>
								<Card.Description>Server: {section.server}</Card.Description>
							</Card.Header>
							<Card.Content>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<p class="text-sm text-muted-foreground">Tables</p>
										<p class="text-lg font-semibold">
											{section.occupied} / {section.tables}
										</p>
									</div>
									<div>
										<p class="text-sm text-muted-foreground">Capacity</p>
										<p class="text-lg font-semibold">{section.capacity} seats</p>
									</div>
								</div>
								<div class="mt-3 h-2 w-full rounded-full bg-muted">
									<div
										class="h-full rounded-full bg-green-500"
										style="width: {(section.occupied / section.tables) * 100}%"
									></div>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</div>

			<!-- Active Tables and Activity -->
			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Active Tables</Card.Title>
						<Card.Description>Currently occupied tables</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each currentTables as table}
								<div class="flex items-center justify-between rounded-lg bg-muted/50 p-3">
									<div class="flex items-center gap-3">
										<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-bold">
											{table.table}
										</div>
										<div>
											<p class="font-medium">{table.guests} guests</p>
											<p class="text-sm text-muted-foreground">{table.server}</p>
										</div>
									</div>
									<div class="text-right">
										<Badge variant={getStatusBadge(table.status).variant}>
											{getStatusBadge(table.status).text}
										</Badge>
										<p class="mt-1 text-sm {getElapsedColor(table.elapsed)}">
											{table.elapsed}m
										</p>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Recent Activity</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each recentActivity as activity}
								<div class="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
										<IconCheck class="h-4 w-4 text-blue-600" />
									</div>
									<div class="flex-1">
										<p class="text-sm font-medium">{activity.action}</p>
										<p class="text-xs text-muted-foreground">{activity.time}</p>
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
