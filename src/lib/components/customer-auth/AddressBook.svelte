<script lang="ts">
	import {
		listAddresses,
		createAddress,
		updateAddress,
		deleteAddress,
		setDefaultAddress,
		type CustomerAddress,
		type AddressInput
	} from '$lib/api/customer-me';
	import { toast } from 'svelte-sonner';
	import { Shimmer } from '@shimmer-from-structure/svelte';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import StarIcon from '@lucide/svelte/icons/star';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	let addresses = $state<CustomerAddress[]>([]);
	let loading = $state(true);
	let error = $state('');

	// Placeholder rows give <Shimmer> a real layout to measure while loading.
	const placeholders: CustomerAddress[] = Array.from({ length: 2 }, (_, i) => ({
		id: `skeleton-${i}`,
		label: 'Home',
		contactName: null,
		contactPhone: null,
		line1: '000 Placeholder Street, Area',
		line2: null,
		landmark: null,
		city: 'City',
		state: null,
		pincode: '000000',
		latitude: null,
		longitude: null,
		isDefault: i === 0,
		createdAt: new Date(0).toISOString(),
		updatedAt: new Date(0).toISOString()
	}));

	const LABEL_PRESETS = ['Home', 'Work', 'Other'];
	const EMPTY_FORM: AddressInput = {
		label: 'Home',
		line1: '',
		line2: '',
		landmark: '',
		city: '',
		state: '',
		pincode: '',
		contactPhone: '',
		isDefault: false
	};

	let formOpen = $state(false);
	let editingId = $state<string | null>(null);
	let form = $state<AddressInput>({ ...EMPTY_FORM });
	let saving = $state(false);
	let busyId = $state<string | null>(null);

	async function load() {
		loading = true;
		error = '';
		try {
			const res = await listAddresses();
			addresses = res.addresses;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to load addresses.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void load();
	});

	function openAdd() {
		editingId = null;
		form = { ...EMPTY_FORM, isDefault: addresses.length === 0 };
		formOpen = true;
	}

	function openEdit(a: CustomerAddress) {
		editingId = a.id;
		form = {
			label: a.label,
			line1: a.line1,
			line2: a.line2 ?? '',
			landmark: a.landmark ?? '',
			city: a.city,
			state: a.state ?? '',
			pincode: a.pincode,
			contactPhone: a.contactPhone ?? '',
			isDefault: a.isDefault
		};
		formOpen = true;
	}

	function cancelForm() {
		formOpen = false;
		editingId = null;
	}

	async function save() {
		if (!form.line1.trim() || !form.city.trim() || !form.pincode.trim()) {
			toast.error('Address, city and pincode are required.');
			return;
		}
		saving = true;
		try {
			if (editingId) {
				await updateAddress(editingId, form);
				toast.success('Address updated');
			} else {
				await createAddress(form);
				toast.success('Address added');
			}
			formOpen = false;
			editingId = null;
			await load();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to save address');
		} finally {
			saving = false;
		}
	}

	async function remove(a: CustomerAddress) {
		if (!confirm('Delete this address?')) return;
		busyId = a.id;
		try {
			await deleteAddress(a.id);
			toast.success('Address deleted');
			await load();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to delete address');
		} finally {
			busyId = null;
		}
	}

	async function makeDefault(a: CustomerAddress) {
		if (a.isDefault) return;
		busyId = a.id;
		try {
			await setDefaultAddress(a.id);
			await load();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Failed to set default');
		} finally {
			busyId = null;
		}
	}

	function formatLine(a: CustomerAddress): string {
		return [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ');
	}
</script>

{#if error}
	<p class="text-sm text-destructive">{error}</p>
{:else}
	{#if !loading && addresses.length === 0 && !formOpen}
		<p class="mb-3 text-sm text-muted-foreground">No saved addresses yet.</p>
	{:else}
		<Shimmer {loading}>
			<div class="space-y-3">
				{#each loading ? placeholders : addresses as a (a.id)}
					<div
						class="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3"
					>
						<div class="flex min-w-0 flex-1 items-start gap-3">
							<div class="mt-0.5 shrink-0 text-muted-foreground">
								<MapPinIcon class="h-4 w-4" />
							</div>
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-1.5">
									<span class="text-sm font-semibold">{a.label}</span>
									{#if a.isDefault}
										<span
											class="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success"
										>
											Default
										</span>
									{/if}
								</div>
								<p class="mt-0.5 text-xs text-muted-foreground">{formatLine(a)}</p>
								{#if a.contactPhone}
									<p class="mt-0.5 text-xs text-muted-foreground">{a.contactPhone}</p>
								{/if}
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-1">
							{#if !a.isDefault}
								<button
									class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-warning disabled:opacity-40"
									onclick={() => makeDefault(a)}
									disabled={busyId === a.id}
									title="Set as default"
									aria-label="Set as default"
								>
									{#if busyId === a.id}
										<Loader2Icon class="h-3.5 w-3.5 animate-spin" />
									{:else}
										<StarIcon class="h-3.5 w-3.5" />
									{/if}
								</button>
							{/if}
							<button
								class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								onclick={() => openEdit(a)}
								title="Edit"
								aria-label="Edit address"
							>
								<PencilIcon class="h-3.5 w-3.5" />
							</button>
							<button
								class="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
								onclick={() => remove(a)}
								disabled={busyId === a.id}
								title="Delete"
								aria-label="Delete address"
							>
								<Trash2Icon class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</Shimmer>
	{/if}

	{#if formOpen}
		<div class="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
			<div class="flex flex-wrap gap-2">
				{#each LABEL_PRESETS as preset (preset)}
					<button
						type="button"
						class="rounded-full px-3 py-1 text-xs font-medium transition-all {form.label === preset
							? 'bg-primary text-primary-foreground'
							: 'bg-muted text-muted-foreground hover:bg-muted'}"
						onclick={() => (form.label = preset)}
					>
						{preset}
					</button>
				{/each}
			</div>

			<input
				class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
				placeholder="Flat / House no, Building, Street *"
				bind:value={form.line1}
				maxlength="200"
			/>
			<input
				class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
				placeholder="Area / Locality"
				bind:value={form.line2}
				maxlength="200"
			/>
			<input
				class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
				placeholder="Landmark (optional)"
				bind:value={form.landmark}
				maxlength="120"
			/>
			<div class="flex gap-2">
				<input
					class="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
					placeholder="City *"
					bind:value={form.city}
					maxlength="100"
				/>
				<input
					class="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
					placeholder="Pincode *"
					bind:value={form.pincode}
					inputmode="numeric"
					maxlength="12"
				/>
			</div>
			<input
				class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
				placeholder="Contact phone (optional)"
				bind:value={form.contactPhone}
				inputmode="tel"
				maxlength="20"
			/>

			<label class="flex items-center gap-2 text-sm text-muted-foreground">
				<input
					type="checkbox"
					bind:checked={form.isDefault}
					class="h-4 w-4 rounded border-border"
				/>
				Set as default address
			</label>

			<div class="flex gap-2 pt-1">
				<button
					class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
					onclick={save}
					disabled={saving}
				>
					{#if saving}
						<Loader2Icon class="h-4 w-4 animate-spin" />
					{/if}
					{editingId ? 'Save changes' : 'Add address'}
				</button>
				<button
					class="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
					onclick={cancelForm}
					disabled={saving}
				>
					Cancel
				</button>
			</div>
		</div>
	{:else}
		<button
			class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
			onclick={openAdd}
		>
			<PlusIcon class="h-4 w-4" />
			Add new address
		</button>
	{/if}
{/if}
