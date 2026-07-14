<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import * as Field from '$lib/components/ui/field';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import { toast } from 'svelte-sonner';
	import { canModify } from '$lib/utils/permissions';
	import { userFriendlyError } from '$lib/utils/error';
	import {
		createCoupon,
		updateCoupon,
		deleteCoupon,
		type Coupon,
		type CouponInput,
		type CouponDiscountType
	} from '$lib/api';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import TicketPercentIcon from '@lucide/svelte/icons/ticket-percent';

	let { data }: { data: PageData } = $props();

	let coupons = $state<Coupon[]>(data.coupons || []);
	const canEdit = $derived(canModify(data.userRole));

	// ── Form state (shared by create + edit) ──
	type FormState = {
		code: string;
		description: string;
		discountType: CouponDiscountType;
		discountValue: string;
		maxDiscount: string;
		minOrderValue: string;
		firstOrderOnly: boolean;
		totalRedemptionLimit: string;
		perCustomerLimit: string;
		validFrom: string;
		validUntil: string;
		active: boolean;
	};

	const EMPTY_FORM: FormState = {
		code: '',
		description: '',
		discountType: 'flat',
		discountValue: '',
		maxDiscount: '',
		minOrderValue: '',
		firstOrderOnly: false,
		totalRedemptionLimit: '',
		perCustomerLimit: '',
		validFrom: '',
		validUntil: '',
		active: true
	};

	let dialogOpen = $state(false);
	let editingId = $state<string | null>(null);
	let form = $state<FormState>({ ...EMPTY_FORM });
	let saving = $state(false);
	let deletingId = $state<string | null>(null);

	function openCreate() {
		editingId = null;
		form = { ...EMPTY_FORM };
		dialogOpen = true;
	}

	function openEdit(c: Coupon) {
		editingId = c.id;
		form = {
			code: c.code,
			description: c.description ?? '',
			discountType: c.discountType,
			discountValue: c.discountValue ? String(c.discountValue) : '',
			maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : '',
			minOrderValue: c.minOrderValue ? String(c.minOrderValue) : '',
			firstOrderOnly: c.firstOrderOnly,
			totalRedemptionLimit: c.totalRedemptionLimit != null ? String(c.totalRedemptionLimit) : '',
			perCustomerLimit: c.perCustomerLimit != null ? String(c.perCustomerLimit) : '',
			validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
			validUntil: c.validUntil ? c.validUntil.slice(0, 10) : '',
			active: c.active
		};
		dialogOpen = true;
	}

	function numOrUndef(v: string): number | undefined {
		const n = parseFloat(v);
		return Number.isFinite(n) ? n : undefined;
	}

	function buildPayload(): CouponInput | null {
		const code = form.code.trim().toUpperCase();
		if (!code) {
			toast.error('Coupon code is required');
			return null;
		}
		if (form.discountType !== 'free_delivery') {
			const dv = numOrUndef(form.discountValue);
			if (!dv || dv <= 0) {
				toast.error('Enter a discount value greater than 0');
				return null;
			}
			if (form.discountType === 'percent' && dv > 100) {
				toast.error('Percentage discount cannot exceed 100%');
				return null;
			}
		}
		return {
			code,
			description: form.description.trim() || undefined,
			discountType: form.discountType,
			discountValue:
				form.discountType === 'free_delivery' ? undefined : numOrUndef(form.discountValue),
			maxDiscount: form.discountType === 'percent' ? numOrUndef(form.maxDiscount) : undefined,
			minOrderValue: numOrUndef(form.minOrderValue),
			firstOrderOnly: form.firstOrderOnly,
			totalRedemptionLimit: numOrUndef(form.totalRedemptionLimit),
			perCustomerLimit: numOrUndef(form.perCustomerLimit),
			validFrom: form.validFrom || undefined,
			validUntil: form.validUntil || undefined,
			active: form.active
		};
	}

	async function save() {
		const payload = buildPayload();
		if (!payload) return;
		saving = true;
		try {
			if (editingId) {
				const updated = await updateCoupon(data.businessId, editingId, payload);
				coupons = coupons.map((c) => (c.id === editingId ? updated : c));
				toast.success('Coupon updated');
			} else {
				const created = await createCoupon(data.businessId, payload);
				coupons = [created, ...coupons];
				toast.success('Coupon created');
			}
			dialogOpen = false;
			editingId = null;
		} catch (e) {
			toast.error(userFriendlyError(e, 'Failed to save coupon'));
		} finally {
			saving = false;
		}
	}

	async function remove(c: Coupon) {
		if (!confirm(`Delete coupon ${c.code}?`)) return;
		deletingId = c.id;
		try {
			await deleteCoupon(data.businessId, c.id);
			coupons = coupons.filter((x) => x.id !== c.id);
			toast.success('Coupon deleted');
		} catch (e) {
			toast.error(userFriendlyError(e, 'Failed to delete coupon'));
		} finally {
			deletingId = null;
		}
	}

	function discountLabel(c: Coupon): string {
		if (c.discountType === 'free_delivery') return 'Free delivery';
		if (c.discountType === 'percent') {
			return `${c.discountValue}% off${c.maxDiscount ? ` (max ${c.maxDiscount})` : ''}`;
		}
		return `${c.discountValue} off`;
	}

	function conditions(c: Coupon): string[] {
		const out: string[] = [];
		if (c.minOrderValue > 0) out.push(`Min order ${c.minOrderValue}`);
		if (c.firstOrderOnly) out.push('First order only');
		if (c.perCustomerLimit != null) out.push(`${c.perCustomerLimit}/customer`);
		if (c.validUntil) out.push(`Until ${c.validUntil.slice(0, 10)}`);
		return out;
	}

	function isExpired(c: Coupon): boolean {
		return !!c.validUntil && new Date(c.validUntil) < new Date();
	}
</script>

<PageShell title="Coupons" description="Create and manage promo codes for online orders">
	{#snippet actions()}
		{#if canEdit}
			<Button onclick={openCreate}>
				<PlusIcon class="mr-2 h-4 w-4" />
				New Coupon
			</Button>
		{/if}
	{/snippet}

	{#if coupons.length > 0}
		<div class="rounded-xl border border-border bg-card">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Code</Table.Head>
						<Table.Head>Discount</Table.Head>
						<Table.Head>Conditions</Table.Head>
						<Table.Head>Usage</Table.Head>
						<Table.Head>Status</Table.Head>
						{#if canEdit}
							<Table.Head class="text-right">Actions</Table.Head>
						{/if}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each coupons as c (c.id)}
						<Table.Row>
							<Table.Cell class="font-semibold">{c.code}</Table.Cell>
							<Table.Cell>{discountLabel(c)}</Table.Cell>
							<Table.Cell>
								<div class="flex flex-wrap gap-1">
									{#each conditions(c) as cond}
										<Badge variant="secondary" class="font-normal">{cond}</Badge>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/each}
								</div>
							</Table.Cell>
							<Table.Cell>
								{c.redemptionCount}{c.totalRedemptionLimit != null
									? ` / ${c.totalRedemptionLimit}`
									: ''}
							</Table.Cell>
							<Table.Cell>
								{#if isExpired(c)}
									<Badge variant="outline" class="text-muted-foreground">Expired</Badge>
								{:else if c.active}
									<Badge class="bg-success/15 text-success">Active</Badge>
								{:else}
									<Badge variant="outline">Inactive</Badge>
								{/if}
							</Table.Cell>
							{#if canEdit}
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											onclick={() => openEdit(c)}
											aria-label="Edit coupon"
										>
											<PencilIcon />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											class="text-muted-foreground hover:text-destructive"
											onclick={() => remove(c)}
											disabled={deletingId === c.id}
											aria-label="Delete coupon"
										>
											{#if deletingId === c.id}
												<Loader2Icon class="animate-spin" />
											{:else}
												<Trash2Icon />
											{/if}
										</Button>
									</div>
								</Table.Cell>
							{/if}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<EmptyState
			type="empty"
			icon={TicketPercentIcon}
			title="No coupons yet"
			description="Create a promo code to offer discounts at online checkout."
			actionLabel={canEdit ? 'New Coupon' : undefined}
			onAction={canEdit ? openCreate : undefined}
		/>
	{/if}
</PageShell>

<!-- Create / Edit dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{editingId ? 'Edit coupon' : 'New coupon'}</Dialog.Title>
			<Dialog.Description>
				Discounts apply to the order subtotal at online checkout.
			</Dialog.Description>
		</Dialog.Header>

		<Field.Group>
			<div class="flex gap-3">
				<Field.Field class="flex-1">
					<Field.Label for="c-code">Code *</Field.Label>
					<Input
						id="c-code"
						bind:value={form.code}
						class="uppercase"
						placeholder="SAVE20"
						maxlength={40}
					/>
				</Field.Field>
				<Field.Field class="flex-1">
					<Field.Label for="c-type">Discount type</Field.Label>
					<NativeSelect id="c-type" class="w-full" bind:value={form.discountType}>
						<NativeSelectOption value="flat">Flat amount off</NativeSelectOption>
						<NativeSelectOption value="percent">Percentage off</NativeSelectOption>
						<NativeSelectOption value="free_delivery">Free delivery</NativeSelectOption>
					</NativeSelect>
				</Field.Field>
			</div>

			<Field.Field>
				<Field.Label for="c-desc">Description</Field.Label>
				<Input
					id="c-desc"
					bind:value={form.description}
					placeholder="Shown to customers when applied"
					maxlength={160}
				/>
			</Field.Field>

			{#if form.discountType !== 'free_delivery'}
				<div class="flex gap-3">
					<Field.Field class="flex-1">
						<Field.Label for="c-value">
							{form.discountType === 'percent' ? 'Percentage *' : 'Amount off *'}
						</Field.Label>
						<Input
							id="c-value"
							type="number"
							inputmode="decimal"
							min="0"
							bind:value={form.discountValue}
						/>
					</Field.Field>
					{#if form.discountType === 'percent'}
						<Field.Field class="flex-1">
							<Field.Label for="c-max">Max discount</Field.Label>
							<Input
								id="c-max"
								type="number"
								inputmode="decimal"
								min="0"
								bind:value={form.maxDiscount}
							/>
						</Field.Field>
					{/if}
				</div>
			{/if}

			<div class="flex gap-3">
				<Field.Field class="flex-1">
					<Field.Label for="c-min">Min order value</Field.Label>
					<Input
						id="c-min"
						type="number"
						inputmode="decimal"
						min="0"
						bind:value={form.minOrderValue}
					/>
				</Field.Field>
				<Field.Field class="flex-1">
					<Field.Label for="c-percustomer">Per-customer limit</Field.Label>
					<Input
						id="c-percustomer"
						type="number"
						inputmode="numeric"
						min="1"
						bind:value={form.perCustomerLimit}
					/>
				</Field.Field>
				<Field.Field class="flex-1">
					<Field.Label for="c-total">Total cap</Field.Label>
					<Input
						id="c-total"
						type="number"
						inputmode="numeric"
						min="1"
						bind:value={form.totalRedemptionLimit}
					/>
				</Field.Field>
			</div>

			<div class="flex gap-3">
				<Field.Field class="flex-1">
					<Field.Label for="c-from">Valid from</Field.Label>
					<Input id="c-from" type="date" bind:value={form.validFrom} />
				</Field.Field>
				<Field.Field class="flex-1">
					<Field.Label for="c-until">Valid until</Field.Label>
					<Input id="c-until" type="date" bind:value={form.validUntil} />
				</Field.Field>
			</div>

			<Field.Field orientation="horizontal">
				<Switch id="c-first" bind:checked={form.firstOrderOnly} />
				<Field.Label for="c-first" class="text-muted-foreground">First order only</Field.Label>
			</Field.Field>

			<Field.Field orientation="horizontal">
				<Switch id="c-active" bind:checked={form.active} />
				<Field.Label for="c-active" class="text-muted-foreground">Active</Field.Label>
			</Field.Field>
		</Field.Group>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (dialogOpen = false)} disabled={saving}>
				Cancel
			</Button>
			<Button onclick={save} disabled={saving}>
				{#if saving}
					<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{editingId ? 'Save changes' : 'Create coupon'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
