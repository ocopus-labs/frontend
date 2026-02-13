<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toast } from 'svelte-sonner';
	import {
		IconDeviceFloppy,
		IconUser,
		IconBuilding,
		IconSettings,
		IconCreditCard
	} from '@tabler/icons-svelte';
	import { updateBusiness } from '$lib/api/business';
	import { invalidateAll } from '$app/navigation';
	import { useSession } from '$lib/auth';
	import type { Business } from '$lib/api/types';
	import { CURRENCY_CONFIG } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import * as Select from '$lib/components/ui/select';
import { Checkbox } from '$lib/components/ui/checkbox';

	let { data } = $props();

	// Cast to Business since fallback mock data may not have all fields
	const business = data.business as Partial<Business> & { name: string };
	const settings = business.settings ?? ({} as Partial<Business['settings']>);
	const contact = business.contact ?? ({} as Partial<Business['contact']>);
	const address = business.address ?? ({} as Partial<Business['address']>);

	// Get user info from session
	const session = useSession();
	const user = $derived($session.data?.user);

	const DEFAULT_BUSINESS_HOURS: Record<
		string,
		{ open: string; close: string; isClosed?: boolean }
	> = {
		Monday: { open: '09:00', close: '22:00', isClosed: false },
		Tuesday: { open: '09:00', close: '22:00', isClosed: false },
		Wednesday: { open: '09:00', close: '22:00', isClosed: false },
		Thursday: { open: '09:00', close: '22:00', isClosed: false },
		Friday: { open: '09:00', close: '23:00', isClosed: false },
		Saturday: { open: '10:00', close: '23:00', isClosed: false },
		Sunday: { open: '10:00', close: '21:00', isClosed: false }
	};

	// Business info
	let restaurantName = $state(business.name ?? '');
	let restaurantAddress = $state(
		[address.street, address.city, address.state, address.postalCode, address.country]
			.filter(Boolean)
			.join(', ')
	);
	let restaurantPhone = $state(contact.phone ?? '');
	let restaurantEmail = $state(contact.email ?? '');
	let taxRate = $state(parseFloat(settings.taxRate ?? '0') || 0);
	let currency = $state(settings.currency ?? 'USD');
	let timezone = $state(settings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);

	// Owner settings from session
	let ownerName = $state('');
	let ownerEmail = $state('');
	let ownerPhone = $state('');

	// Sync owner fields when session loads
	$effect(() => {
		if (user) {
			ownerName = user.name || '';
			ownerEmail = user.email || '';
		}
	});

	// Business hours - build from saved data or defaults
	const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	let businessHours = $state(
		DAYS.map((day) => {
			const saved = settings.businessHours?.[day];
			const defaults = DEFAULT_BUSINESS_HOURS[day];
			return {
				day,
				open: saved?.open ?? defaults.open,
				close: saved?.close ?? defaults.close,
				closed: saved?.isClosed ?? defaults.isClosed ?? false
			};
		})
	);

	// Payment methods state
	const rawPaymentMethods = settings.paymentMethods;
	const savedPaymentMethods: string[] | undefined = Array.isArray(rawPaymentMethods)
		? rawPaymentMethods
		: typeof rawPaymentMethods === 'string'
			? JSON.parse(rawPaymentMethods)
			: undefined;
	let paymentMethodCash = $state(savedPaymentMethods ? savedPaymentMethods.includes('cash') : true);
	let paymentMethodCard = $state(savedPaymentMethods ? savedPaymentMethods.includes('card') : true);
	let paymentMethodDigital = $state(
		savedPaymentMethods ? savedPaymentMethods.includes('digital') : false
	);

	let saving = $state(false);

	async function saveSettings() {
		saving = true;
		try {
			// Parse the address string back into components
			const addressParts = restaurantAddress.split(',').map((s) => s.trim());

			const businessHoursRecord: Record<
				string,
				{ open: string; close: string; isClosed?: boolean }
			> = {};
			for (const hour of businessHours) {
				businessHoursRecord[hour.day] = {
					open: hour.open,
					close: hour.close,
					isClosed: hour.closed
				};
			}

			const paymentMethods: string[] = [];
			if (paymentMethodCash) paymentMethods.push('cash');
			if (paymentMethodCard) paymentMethods.push('card');
			if (paymentMethodDigital) paymentMethods.push('digital');

			await updateBusiness(data.businessId, {
				name: restaurantName,
				address: {
					street: addressParts[0] ?? '',
					city: addressParts[1] ?? address.city ?? '',
					state: addressParts[2] ?? address.state ?? '',
					postalCode: addressParts[3] ?? address.postalCode ?? '',
					country: addressParts[4] ?? address.country ?? ''
				},
				contact: {
					email: restaurantEmail || undefined,
					phone: restaurantPhone || undefined,
					website: contact.website
				},
				settings: {
					timezone,
					currency,
					taxRate: String(taxRate),
					businessHours: businessHoursRecord,
					paymentMethods
				}
			});

			await invalidateAll();
			toast.success('Settings saved successfully.');
		} catch (err: unknown) {
			console.error('Failed to save settings:', err);
			const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
			toast.error(`Failed to save settings: ${message}`);
		} finally {
			saving = false;
		}
	}

	function updateBusinessHour(index: number, field: string, value: string | boolean) {
		businessHours[index] = { ...businessHours[index], [field]: value };
	}
</script>

<div class="flex flex-1 flex-col p-2 sm:p-6 md:p-4">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-2">
				<h1 class="text-2xl font-bold">Settings</h1>
				<p class="text-muted-foreground">Manage your business settings and preferences</p>
			</div>

			<Tabs.Root value="restaurant" class="w-full">
				<Tabs.List class="grid w-full grid-cols-4">
					<Tabs.Trigger value="restaurant">
						<IconBuilding class="mr-2 h-4 w-4" />
						Business Info
					</Tabs.Trigger>
					<Tabs.Trigger value="owner">
						<IconUser class="mr-2 h-4 w-4" />
						Owner
					</Tabs.Trigger>
					<Tabs.Trigger value="business">
						<IconSettings class="mr-2 h-4 w-4" />
						Hours
					</Tabs.Trigger>
					<Tabs.Trigger value="payment">
						<IconCreditCard class="mr-2 h-4 w-4" />
						Payment
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="restaurant" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Business Information</Card.Title>
							<Card.Description>Basic information about your business</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label for="restaurant-name" class="text-sm font-medium">Business Name</label>
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
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label for="timezone" class="text-sm font-medium">Timezone</label>
									<Input id="timezone" bind:value={timezone} />
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="owner" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Owner Information</Card.Title>
							<Card.Description>Personal information for the business owner</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-4">
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<label for="owner-name" class="text-sm font-medium">Full Name</label>
									<Input id="owner-name" bind:value={ownerName} disabled />
								</div>
								<div class="space-y-2">
									<label for="owner-phone" class="text-sm font-medium">Phone</label>
									<Input id="owner-phone" bind:value={ownerPhone} />
								</div>
							</div>
							<div class="space-y-2">
								<label for="owner-email" class="text-sm font-medium">Email</label>
								<Input id="owner-email" type="email" bind:value={ownerEmail} disabled />
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="business" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Business Hours</Card.Title>
							<Card.Description>Set your business's operating hours</Card.Description>
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
												onchange={(e) =>
													updateBusinessHour(
														index,
														'closed',
														(e.target as HTMLInputElement).checked
													)}
											/>
											<label for="closed-{index}" class="text-sm">Closed</label>
										</div>
										{#if !hour.closed}
											<div class="flex items-center gap-2">
												<Input
													type="time"
													value={hour.open}
													onchange={(e) =>
														updateBusinessHour(index, 'open', (e.target as HTMLInputElement).value)}
													class="w-32"
												/>
												<span class="text-sm">to</span>
												<Input
													type="time"
													value={hour.close}
													onchange={(e) =>
														updateBusinessHour(
															index,
															'close',
															(e.target as HTMLInputElement).value
														)}
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
									<Select.Root type="single" bind:value={currency}>
										<Select.Trigger class="w-full">
											{currency} ({CURRENCY_CONFIG[currency as CurrencyCode]?.symbol || ''}) - {CURRENCY_CONFIG[
												currency as CurrencyCode
											]?.name || ''}
										</Select.Trigger>
										<Select.Content>
											{#each Object.values(CURRENCY_CONFIG) as curr (curr.code)}
												<Select.Item value={curr.code}
													>{curr.code} ({curr.symbol}) - {curr.name}</Select.Item
												>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							</div>
							<div class="space-y-4">
								<h4 class="text-sm font-medium">Payment Methods</h4>
								<div class="space-y-2">
									<div class="flex items-center gap-2">
										<Checkbox id="cash" bind:checked={paymentMethodCash} />
										<label for="cash" class="text-sm">Cash</label>
									</div>
									<div class="flex items-center gap-2">
										<Checkbox id="card" bind:checked={paymentMethodCard} />
										<label for="card" class="text-sm">Credit/Debit Card</label>
									</div>
									<div class="flex items-center gap-2">
										<Checkbox id="digital" bind:checked={paymentMethodDigital} />
										<label for="digital" class="text-sm">Digital Wallets</label>
									</div>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>

			<div class="flex justify-end">
				<Button onclick={saveSettings} disabled={saving}>
					<IconDeviceFloppy class="mr-2 h-4 w-4" />
					{saving ? 'Saving...' : 'Save Settings'}
				</Button>
			</div>
		</div>
	</div>
</div>
