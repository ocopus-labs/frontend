<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		IconGavel,
		IconUser,
		IconBuilding,
		IconSettings,
		IconCreditCard
	} from '@tabler/icons-svelte';

	// Restaurant settings
	let restaurantName = $state('My Restaurant');
	let restaurantAddress = $state('123 Main St, City, State 12345');
	let restaurantPhone = $state('+1 (555) 123-4567');
	let restaurantEmail = $state('contact@myrestaurant.com');
	let taxRate = $state(8.5);
	let currency = $state('USD');

	// Owner settings
	let ownerName = $state('John Doe');
	let ownerEmail = $state('john.doe@example.com');
	let ownerPhone = $state('+1 (555) 987-6543');

	// Business hours
	let businessHours = $state([
		{ day: 'Monday', open: '09:00', close: '22:00', closed: false },
		{ day: 'Tuesday', open: '09:00', close: '22:00', closed: false },
		{ day: 'Wednesday', open: '09:00', close: '22:00', closed: false },
		{ day: 'Thursday', open: '09:00', close: '22:00', closed: false },
		{ day: 'Friday', open: '09:00', close: '23:00', closed: false },
		{ day: 'Saturday', open: '10:00', close: '23:00', closed: false },
		{ day: 'Sunday', open: '10:00', close: '21:00', closed: false }
	]);

	function saveSettings() {
		// TODO: Save settings to backend
		console.log('Settings saved');
	}

	function updateBusinessHour(index: number, field: string, value: string | boolean) {
		businessHours[index] = { ...businessHours[index], [field]: value };
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2">
				<h1 class="text-2xl font-bold">Settings</h1>
				<p class="text-muted-foreground">Manage your restaurant settings and preferences</p>
			</div>

			<Tabs.Root value="restaurant" class="w-full">
				<Tabs.List class="grid w-full grid-cols-4">
					<Tabs.Trigger value="restaurant">
						<IconBuilding class="mr-2 h-4 w-4" />
						Restaurant
					</Tabs.Trigger>
					<Tabs.Trigger value="owner">
						<IconUser class="mr-2 h-4 w-4" />
						Owner
					</Tabs.Trigger>
					<Tabs.Trigger value="business">
						<IconSettings class="mr-2 h-4 w-4" />
						Business
					</Tabs.Trigger>
					<Tabs.Trigger value="payment">
						<IconCreditCard class="mr-2 h-4 w-4" />
						Payment
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="restaurant" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Restaurant Information</Card.Title>
							<Card.Description>Basic information about your restaurant</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label for="restaurant-name" class="text-sm font-medium">Restaurant Name</label>
									<Input id="restaurant-name" bind:value={restaurantName} />
								</div>
								<div class="space-y-2">
									<label for="restaurant-phone" class="text-sm font-medium">Phone</label>
									<Input id="restaurant-phone" bind:value={restaurantPhone} />
								</div>
							</div>
							<div class="space-y-2">
								<label for="restaurant-address" class="text-sm font-medium">Address</label>
								<Input id="restaurant-address" bind:value={restaurantAddress} />
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label for="restaurant-email" class="text-sm font-medium">Email</label>
									<Input id="restaurant-email" type="email" bind:value={restaurantEmail} />
								</div>
								<div class="space-y-2">
									<label for="tax-rate" class="text-sm font-medium">Tax Rate (%)</label>
									<Input id="tax-rate" type="number" step="0.1" bind:value={taxRate} />
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="owner" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Owner Information</Card.Title>
							<Card.Description>Personal information for the restaurant owner</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label for="owner-name" class="text-sm font-medium">Full Name</label>
									<Input id="owner-name" bind:value={ownerName} />
								</div>
								<div class="space-y-2">
									<label for="owner-phone" class="text-sm font-medium">Phone</label>
									<Input id="owner-phone" bind:value={ownerPhone} />
								</div>
							</div>
							<div class="space-y-2">
								<label for="owner-email" class="text-sm font-medium">Email</label>
								<Input id="owner-email" type="email" bind:value={ownerEmail} />
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="business" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Business Hours</Card.Title>
							<Card.Description>Set your restaurant's operating hours</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-4">
								{#each businessHours as hour, index (hour.day)}
									<div class="flex items-center gap-4">
										<div class="w-20 text-sm font-medium">{hour.day}</div>
										<div class="flex items-center gap-2">
											<input
												type="checkbox"
												id="closed-{index}"
												bind:checked={hour.closed}
												onchange={(e) => updateBusinessHour(index, 'closed', e.target.checked)}
											/>
											<label for="closed-{index}" class="text-sm">Closed</label>
										</div>
										{#if !hour.closed}
											<div class="flex items-center gap-2">
												<Input
													type="time"
													value={hour.open}
													onchange={(e) => updateBusinessHour(index, 'open', e.target.value)}
													class="w-32"
												/>
												<span class="text-sm">to</span>
												<Input
													type="time"
													value={hour.close}
													onchange={(e) => updateBusinessHour(index, 'close', e.target.value)}
													class="w-32"
												/>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="payment" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Payment Settings</Card.Title>
							<Card.Description>Configure payment methods and currency</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label for="currency" class="text-sm font-medium">Currency</label>
									<select
										id="currency"
										bind:value={currency}
										class="w-full rounded-md border border-input bg-background px-3 py-2"
									>
										<option value="USD">USD ($)</option>
										<option value="EUR">EUR (€)</option>
										<option value="GBP">GBP (£)</option>
										<option value="CAD">CAD (C$)</option>
										<option value="AUD">AUD (A$)</option>
									</select>
								</div>
							</div>
							<div class="space-y-4">
								<h4 class="text-sm font-medium">Payment Methods</h4>
								<div class="space-y-2">
									<div class="flex items-center gap-2">
										<input type="checkbox" id="cash" checked />
										<label for="cash" class="text-sm">Cash</label>
									</div>
									<div class="flex items-center gap-2">
										<input type="checkbox" id="card" checked />
										<label for="card" class="text-sm">Credit/Debit Card</label>
									</div>
									<div class="flex items-center gap-2">
										<input type="checkbox" id="digital" />
										<label for="digital" class="text-sm">Digital Wallets</label>
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>

			<div class="flex justify-end">
				<Button onclick={saveSettings}>
					<IconGavel class="mr-2 h-4 w-4" />
					Save Settings
				</Button>
			</div>
		</div>
	</div>
</div>
