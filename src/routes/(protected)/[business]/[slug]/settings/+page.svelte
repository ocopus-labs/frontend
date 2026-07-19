<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Field from '$lib/components/ui/field';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import SettingsSection from '$lib/components/global/settings-section.svelte';
	import { toast } from 'svelte-sonner';
	import IconDeviceFloppy from '@lucide/svelte/icons/save';
	import { updateBusiness } from '$lib/api/business';
	import { invalidate } from '$app/navigation';
	import { useSession } from '$lib/auth';
	import type { Business } from '$lib/api/types';

	let { data } = $props();

	const business = data.business as Partial<Business> & { name: string };
	const settings = business.settings ?? ({} as Partial<Business['settings']>);
	const contact = business.contact ?? ({} as Partial<Business['contact']>);
	const address = business.address ?? ({} as Partial<Business['address']>);

	const session = useSession();
	const user = $derived($session.data?.user);

	let businessName = $state(business.name ?? '');
	let description = $state(business.description ?? '');

	// Address is edited as discrete fields. It used to be one comma-joined input
	// that was split back apart on save, which mangled any address containing a
	// comma of its own ("12 Main St, Apt 4" lost "Apt 4" into the city slot).
	let street = $state(address.street ?? '');
	let city = $state(address.city ?? '');
	let stateRegion = $state(address.state ?? '');
	let postalCode = $state(address.postalCode ?? '');
	let country = $state(address.country ?? '');

	let businessPhone = $state(contact.phone ?? '');
	let businessEmail = $state(contact.email ?? '');
	let taxRate = $state(parseFloat(settings.taxRate ?? '0') || 0);
	let timezone = $state(settings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);

	// Owner name/email belong to the auth account, not the business — read-only
	// here so the page doesn't imply it can change them.
	const ownerName = $derived(user?.name ?? '');
	const ownerEmail = $derived(user?.email ?? '');

	let saving = $state(false);

	async function saveSettings() {
		saving = true;
		try {
			await updateBusiness(data.businessId, {
				name: businessName,
				description: description || undefined,
				address: { street, city, state: stateRegion, postalCode, country },
				contact: {
					email: businessEmail || undefined,
					phone: businessPhone || undefined,
					website: contact.website
				},
				// The backend merges `settings` into the stored blob, so sending only
				// these leaves payment credentials, loyalty and tax config intact.
				settings: {
					timezone,
					currency: settings.currency ?? 'INR',
					taxRate: String(taxRate)
				}
			});

			await invalidate('app:settings');
			await invalidate('app:business-data');
			toast.success('Settings saved.');
		} catch (err: unknown) {
			console.error('Failed to save settings:', err);
			const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
			toast.error(`Failed to save settings: ${message}`);
		} finally {
			saving = false;
		}
	}
</script>

<PageShell title="General" description="Your business's name, contact details and defaults">
	<div>
		<SettingsSection
			title="Business information"
			description="Shown on receipts, invoices and your online ordering page."
		>
			<Field.Field>
				<Field.Label for="business-name">Business name</Field.Label>
				<Input id="business-name" bind:value={businessName} class="max-w-sm" />
			</Field.Field>

			<Field.Field>
				<Field.Label for="business-description">Description</Field.Label>
				<Textarea
					id="business-description"
					bind:value={description}
					rows={3}
					placeholder="A short line about what you serve — shown to customers ordering online."
				/>
				<Field.Description>Optional.</Field.Description>
			</Field.Field>
		</SettingsSection>

		<SettingsSection
			title="Contact"
			description="How customers and delivery partners reach this outlet."
		>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="business-phone">Phone</Field.Label>
					<Input id="business-phone" type="tel" bind:value={businessPhone} />
				</Field.Field>
				<Field.Field>
					<Field.Label for="business-email">Email</Field.Label>
					<Input id="business-email" type="email" bind:value={businessEmail} />
				</Field.Field>
			</div>
		</SettingsSection>

		<SettingsSection title="Address" description="Where this outlet physically operates.">
			<Field.Field>
				<Field.Label for="street">Street</Field.Label>
				<Textarea id="street" bind:value={street} rows={2} />
			</Field.Field>

			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="city">City</Field.Label>
					<Input id="city" bind:value={city} />
				</Field.Field>
				<Field.Field>
					<Field.Label for="state-region">State / region</Field.Label>
					<Input id="state-region" bind:value={stateRegion} />
				</Field.Field>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="postal-code">Postal code</Field.Label>
					<Input id="postal-code" bind:value={postalCode} class="max-w-[10rem]" />
				</Field.Field>
				<Field.Field>
					<Field.Label for="country">Country</Field.Label>
					<Input id="country" bind:value={country} />
				</Field.Field>
			</div>
		</SettingsSection>

		<SettingsSection title="Defaults" description="Applied when nothing more specific is set.">
			<Field.Field>
				<Field.Label for="tax-rate">Default tax rate (%)</Field.Label>
				<Input
					id="tax-rate"
					type="number"
					step="0.1"
					min="0"
					bind:value={taxRate}
					class="max-w-[8rem]"
				/>
				<Field.Description>Per-item and regional rules override this — see Tax.</Field.Description>
			</Field.Field>

			<Field.Field>
				<Field.Label for="timezone">Timezone</Field.Label>
				<Input id="timezone" bind:value={timezone} class="max-w-sm" />
				<Field.Description>Used for reporting periods and business hours.</Field.Description>
			</Field.Field>
		</SettingsSection>

		<SettingsSection
			title="Owner"
			description="From your account. Change these in Account Settings."
		>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Field.Label for="owner-name">Full name</Field.Label>
					<Input id="owner-name" value={ownerName} disabled />
				</Field.Field>
				<Field.Field>
					<Field.Label for="owner-email">Email</Field.Label>
					<Input id="owner-email" type="email" value={ownerEmail} disabled />
				</Field.Field>
			</div>
		</SettingsSection>
	</div>

	<div class="flex justify-end">
		<Button onclick={saveSettings} disabled={saving}>
			<IconDeviceFloppy class="mr-2 size-4" />
			{saving ? 'Saving…' : 'Save changes'}
		</Button>
	</div>
</PageShell>
