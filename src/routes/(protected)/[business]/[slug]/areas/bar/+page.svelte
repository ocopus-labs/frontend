<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		IconGlass,
		IconUsers,
		IconClock,
		IconCash,
		IconBottle
	} from '@tabler/icons-svelte';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';

	let { data } = $props();

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	// Bar area data
	const barStats = {
		seatsOccupied: 12,
		totalSeats: 20,
		activeTab: 8,
		avgTicket: 34.5
	};

	const barPositions = [
		{ seat: 1, status: 'occupied', customer: 'Regular - Mike', tab: 42.5, drinks: 3 },
		{ seat: 2, status: 'occupied', customer: 'Walk-in', tab: 18.0, drinks: 2 },
		{ seat: 3, status: 'available', customer: null, tab: 0, drinks: 0 },
		{ seat: 4, status: 'occupied', customer: 'Regular - Sarah', tab: 65.0, drinks: 4 },
		{ seat: 5, status: 'available', customer: null, tab: 0, drinks: 0 },
		{ seat: 6, status: 'occupied', customer: 'Group Tab', tab: 125.0, drinks: 8 },
		{ seat: 7, status: 'occupied', customer: 'Group Tab', tab: 0, drinks: 0 },
		{ seat: 8, status: 'reserved', customer: 'VIP - Johnson', tab: 0, drinks: 0 },
		{ seat: 9, status: 'available', customer: null, tab: 0, drinks: 0 },
		{ seat: 10, status: 'occupied', customer: 'Walk-in', tab: 28.0, drinks: 2 }
	];

	const popularDrinks = [
		{ name: 'Margarita', sold: 24, revenue: 288 },
		{ name: 'Old Fashioned', sold: 18, revenue: 234 },
		{ name: 'Mojito', sold: 15, revenue: 180 },
		{ name: 'IPA Draft', sold: 32, revenue: 224 },
		{ name: 'Wine (House Red)', sold: 22, revenue: 198 }
	];

	const inventory = [
		{ item: 'Tequila (Patron)', level: 35, status: 'ok' },
		{ item: 'Whiskey (Buffalo Trace)', level: 20, status: 'low' },
		{ item: 'Vodka (Grey Goose)', level: 55, status: 'ok' },
		{ item: 'Rum (Bacardi)', level: 40, status: 'ok' },
		{ item: 'Draft Beer (Keg 1)', level: 15, status: 'critical' }
	];

	const openTabs = [
		{ customer: 'Mike', seat: 1, amount: 42.5, items: 3, duration: 45 },
		{ customer: 'Walk-in', seat: 2, amount: 18.0, items: 2, duration: 15 },
		{ customer: 'Sarah', seat: 4, amount: 65.0, items: 4, duration: 78 },
		{ customer: 'Group Tab', seat: '6-7', amount: 125.0, items: 8, duration: 62 },
		{ customer: 'Walk-in', seat: 10, amount: 28.0, items: 2, duration: 22 }
	];

	function getSeatStatus(status: string) {
		switch (status) {
			case 'occupied':
				return 'bg-green-500';
			case 'available':
				return 'bg-gray-300';
			case 'reserved':
				return 'bg-yellow-500';
			default:
				return 'bg-gray-300';
		}
	}

	function getInventoryStatus(status: string) {
		switch (status) {
			case 'ok':
				return { variant: 'default' as const, text: 'OK' };
			case 'low':
				return { variant: 'secondary' as const, text: 'Low' };
			case 'critical':
				return { variant: 'destructive' as const, text: 'Critical' };
			default:
				return { variant: 'outline' as const, text: status };
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2 px-6">
				<h1 class="text-2xl font-bold">Bar Area</h1>
				<p class="text-muted-foreground">Monitor bar operations and beverage service</p>
			</div>

			<!-- Quick Stats -->
			<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Seats Occupied</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconUsers class="h-5 w-5 text-blue-500" />
							<span class="text-2xl font-bold">{barStats.seatsOccupied}</span>
							<span class="text-muted-foreground">/ {barStats.totalSeats}</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Open Tabs</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconGlass class="h-5 w-5 text-purple-500" />
							<span class="text-2xl font-bold">{barStats.activeTab}</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Avg Tab</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconCash class="h-5 w-5 text-green-500" />
							<span class="text-2xl font-bold">{formatCurrency(barStats.avgTicket)}</span>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Open</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">
							{formatCurrency(openTabs.reduce((sum, t) => sum + t.amount, 0))}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Bar Counter Visualization -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Bar Counter</Card.Title>
						<Card.Description>Real-time seat status</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="flex flex-wrap gap-3">
							{#each barPositions as position}
								<div
									class="flex h-16 w-16 flex-col items-center justify-center rounded-lg border {position.status === 'occupied' ? 'bg-green-50 dark:bg-green-950' : position.status === 'reserved' ? 'bg-yellow-50 dark:bg-yellow-950' : 'bg-gray-50 dark:bg-gray-900'}"
								>
									<div class="flex items-center gap-1">
										<div class="h-2 w-2 rounded-full {getSeatStatus(position.status)}"></div>
										<span class="font-bold">#{position.seat}</span>
									</div>
									{#if position.tab > 0}
										<span class="text-xs text-green-600">{formatCurrency(position.tab)}</span>
									{:else if position.status === 'reserved'}
										<span class="text-xs text-yellow-600">Reserved</span>
									{:else}
										<span class="text-xs text-muted-foreground">Empty</span>
									{/if}
								</div>
							{/each}
						</div>
						<div class="mt-4 flex gap-4 text-sm">
							<div class="flex items-center gap-2">
								<div class="h-3 w-3 rounded-full bg-green-500"></div>
								<span>Occupied</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="h-3 w-3 rounded-full bg-yellow-500"></div>
								<span>Reserved</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="h-3 w-3 rounded-full bg-gray-300"></div>
								<span>Available</span>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Open Tabs and Popular Drinks -->
			<div class="grid grid-cols-1 gap-4 px-6 lg:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Open Tabs</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each openTabs as tab}
								<div class="flex items-center justify-between rounded-lg bg-muted/50 p-3">
									<div>
										<p class="font-medium">{tab.customer}</p>
										<p class="text-sm text-muted-foreground">
											Seat {tab.seat} • {tab.items} drinks • {tab.duration}m
										</p>
									</div>
									<div class="text-right">
										<p class="text-lg font-bold">{formatCurrency(tab.amount)}</p>
										<Button variant="outline" size="sm">Close Tab</Button>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Popular Drinks Tonight</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each popularDrinks as drink, i}
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold">
											{i + 1}
										</span>
										<div>
											<p class="font-medium">{drink.name}</p>
											<p class="text-sm text-muted-foreground">{drink.sold} sold</p>
										</div>
									</div>
									<span class="font-medium text-green-600">{formatCurrency(drink.revenue)}</span>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Bar Inventory -->
			<div class="px-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<IconBottle class="h-5 w-5" />
							Bar Inventory
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
							{#each inventory as item}
								<div class="rounded-lg border p-3">
									<div class="flex items-center justify-between">
										<p class="text-sm font-medium">{item.item}</p>
										<Badge variant={getInventoryStatus(item.status).variant}>
											{getInventoryStatus(item.status).text}
										</Badge>
									</div>
									<div class="mt-2">
										<div class="h-2 w-full rounded-full bg-muted">
											<div
												class="h-full rounded-full {item.level > 30 ? 'bg-green-500' : item.level > 15 ? 'bg-yellow-500' : 'bg-red-500'}"
												style="width: {item.level}%"
											></div>
										</div>
										<p class="mt-1 text-xs text-muted-foreground">{item.level}% remaining</p>
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
