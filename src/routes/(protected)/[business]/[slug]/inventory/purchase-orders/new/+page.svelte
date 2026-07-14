<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import {
		IconPlus,
		IconTrash,
		IconLoader2,
		IconArrowLeft,
		IconSearch
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		createPurchaseOrder,
		markPurchaseOrderSent,
		type InventoryItem,
		type Supplier,
		type CreatePurchaseOrderItemPayload
	} from '$lib/api';
	import { formatCurrency as i18nFormatCurrency } from '$lib/utils/i18n';
	import type { CurrencyCode } from '$lib/utils/i18n';
	import { userFriendlyError } from '$lib/utils/error';

	let { data }: { data: PageData } = $props();

	const currency = $derived(((data.business as any)?.settings?.currency || 'USD') as CurrencyCode);

	function formatCurrency(amount: number): string {
		return i18nFormatCurrency(amount, currency);
	}

	const inventoryItems = $derived<InventoryItem[]>((data as any).inventoryItems || []);
	const suppliers = $derived<Supplier[]>((data as any).suppliers || []);

	// Form state
	let supplierId = $state('');
	let orderDate = $state(new Date().toISOString().substring(0, 10));
	let expectedDate = $state('');
	let notes = $state('');
	let isSubmitting = $state(false);

	// Line items
	interface LineItem {
		id: string;
		inventoryItemId: string;
		itemName: string;
		itemSku: string;
		itemUnit: string;
		quantity: number;
		unitPrice: number;
	}

	let lineItems = $state<LineItem[]>([]);

	// Item search
	let itemSearchQuery = $state('');
	let showItemSearch = $state(false);

	const filteredSearchItems = $derived(
		inventoryItems
			.filter((item) => {
				if (!itemSearchQuery.trim()) return true;
				const q = itemSearchQuery.toLowerCase();
				return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
			})
			.filter((item) => !lineItems.some((li) => li.inventoryItemId === item.id))
	);

	const totalAmount = $derived(
		lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
	);

	function addLineItem(item: InventoryItem) {
		lineItems = [
			...lineItems,
			{
				id: crypto.randomUUID(),
				inventoryItemId: item.id,
				itemName: item.name,
				itemSku: item.sku,
				itemUnit: item.unit,
				quantity: 1,
				unitPrice: item.costPerUnit
			}
		];
		itemSearchQuery = '';
		showItemSearch = false;
	}

	function removeLineItem(id: string) {
		lineItems = lineItems.filter((li) => li.id !== id);
	}

	function updateLineItemQuantity(id: string, quantity: number) {
		lineItems = lineItems.map((li) =>
			li.id === id ? { ...li, quantity: Math.max(0.001, quantity) } : li
		);
	}

	function updateLineItemPrice(id: string, unitPrice: number) {
		lineItems = lineItems.map((li) =>
			li.id === id ? { ...li, unitPrice: Math.max(0, unitPrice) } : li
		);
	}

	function validate(): string | null {
		if (!supplierId) return 'Please select a supplier';
		if (!orderDate) return 'Please select an order date';
		if (lineItems.length === 0) return 'Please add at least one item';
		for (const item of lineItems) {
			if (item.quantity <= 0) return `Quantity for "${item.itemName}" must be greater than 0`;
			if (item.unitPrice < 0) return `Unit price for "${item.itemName}" cannot be negative`;
		}
		return null;
	}

	async function handleSave(sendAfterCreate: boolean) {
		const error = validate();
		if (error) {
			toast.error(error);
			return;
		}

		isSubmitting = true;
		try {
			const items: CreatePurchaseOrderItemPayload[] = lineItems.map((li) => ({
				inventoryItemId: li.inventoryItemId,
				quantity: li.quantity,
				unitPrice: li.unitPrice
			}));

			const result = await createPurchaseOrder(data.businessId, {
				supplierId,
				orderDate,
				expectedDate: expectedDate || undefined,
				notes: notes || undefined,
				items
			});

			if (sendAfterCreate && result.purchaseOrder) {
				try {
					await markPurchaseOrderSent(data.businessId, result.purchaseOrder.id);
					toast.success('Purchase order created and sent');
				} catch {
					toast.success('Purchase order created (failed to auto-send, please send manually)');
				}
			} else {
				toast.success('Purchase order saved as draft');
			}

			// Navigate back to list
			const base = $page.url.pathname.replace(/\/new$/, '');
			goto(base);
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to create purchase order'));
		} finally {
			isSubmitting = false;
		}
	}

	function navigateBack() {
		const base = $page.url.pathname.replace(/\/new$/, '');
		goto(base);
	}
</script>

<PageShell
	title="New Purchase Order"
	description="Create a new purchase order for inventory replenishment"
>
	{#snippet actions()}
		<Button variant="outline" onclick={navigateBack}>
			<IconArrowLeft class="mr-2 h-4 w-4" />
			Back
		</Button>
	{/snippet}

	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Order Details -->
		<div class="lg:col-span-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Order Details</Card.Title>
				</Card.Header>
				<Card.Content class="grid gap-4">
					<div class="grid gap-2">
						<label for="supplier" class="text-sm font-medium">Supplier *</label>
						<Select.Root type="single" bind:value={supplierId}>
							<Select.Trigger class="w-full">
								{suppliers.find((s) => s.id === supplierId)?.name || 'Select a supplier'}
							</Select.Trigger>
							<Select.Content>
								{#each suppliers as supplier (supplier.id)}
									<Select.Item value={supplier.id}>{supplier.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="grid gap-2">
							<label for="orderDate" class="text-sm font-medium">Order Date *</label>
							<Input id="orderDate" type="date" bind:value={orderDate} />
						</div>
						<div class="grid gap-2">
							<label for="expectedDate" class="text-sm font-medium">Expected Date</label>
							<Input id="expectedDate" type="date" bind:value={expectedDate} min={orderDate} />
						</div>
					</div>
					<div class="grid gap-2">
						<label for="notes" class="text-sm font-medium">Notes</label>
						<Textarea
							id="notes"
							bind:value={notes}
							placeholder="Add any notes for this order..."
							rows={3}
						/>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Line Items -->
			<Card.Root class="mt-6">
				<Card.Header>
					<Card.Title>Line Items</Card.Title>
				</Card.Header>
				<Card.Content>
					<!-- Item Search -->
					<div class="relative mb-4">
						<div class="relative">
							<IconSearch
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								placeholder="Search inventory items to add..."
								class="pl-9"
								bind:value={itemSearchQuery}
								onfocus={() => (showItemSearch = true)}
							/>
						</div>
						{#if showItemSearch && itemSearchQuery.trim()}
							<div class="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
								<div class="max-h-48 overflow-y-auto p-1">
									{#if filteredSearchItems.length > 0}
										{#each filteredSearchItems.slice(0, 10) as item (item.id)}
											<button
												class="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-accent"
												onclick={() => addLineItem(item)}
											>
												<div>
													<span class="font-medium">{item.name}</span>
													<span class="ml-2 text-muted-foreground">{item.sku}</span>
												</div>
												<span class="text-muted-foreground"
													>{formatCurrency(item.costPerUnit)} / {item.unit}</span
												>
											</button>
										{/each}
									{:else}
										<p class="px-3 py-2 text-sm text-muted-foreground">No items found</p>
									{/if}
								</div>
							</div>
						{/if}
					</div>

					<!-- Click outside to close search -->
					{#if showItemSearch}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="fixed inset-0 z-[5]"
							onclick={() => (showItemSearch = false)}
							onkeydown={() => {}}
						></div>
					{/if}

					{#if lineItems.length > 0}
						<!-- Mobile view -->
						<div class="flex flex-col gap-3 md:hidden">
							{#each lineItems as item (item.id)}
								<div class="rounded-lg border p-3">
									<div class="flex items-center justify-between">
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-medium">{item.itemName}</p>
											<p class="text-xs text-muted-foreground">
												{item.itemSku} | {item.itemUnit}
											</p>
										</div>
										<Button
											variant="ghost"
											size="icon"
											class="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
											onclick={() => removeLineItem(item.id)}
										>
											<IconTrash class="h-3.5 w-3.5" />
										</Button>
									</div>
									<div class="mt-2 grid grid-cols-2 gap-2">
										<div class="grid gap-1">
											<label for="qty-{item.id}" class="text-xs text-muted-foreground">Qty</label>
											<Input
												id="qty-{item.id}"
												type="number"
												min="0.001"
												step="0.01"
												value={item.quantity}
												oninput={(e) =>
													updateLineItemQuantity(
														item.id,
														parseFloat((e.target as HTMLInputElement).value) || 0
													)}
											/>
										</div>
										<div class="grid gap-1">
											<label for="price-{item.id}" class="text-xs text-muted-foreground"
												>Unit Price</label
											>
											<Input
												id="price-{item.id}"
												type="number"
												min="0"
												step="0.01"
												value={item.unitPrice}
												oninput={(e) =>
													updateLineItemPrice(
														item.id,
														parseFloat((e.target as HTMLInputElement).value) || 0
													)}
											/>
										</div>
									</div>
									<p class="mt-2 text-right text-sm font-medium">
										Line total: {formatCurrency(item.quantity * item.unitPrice)}
									</p>
								</div>
							{/each}
						</div>

						<!-- Desktop table -->
						<div class="hidden md:block">
							<div class="overflow-x-auto rounded-md border">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Item</Table.Head>
											<Table.Head>SKU</Table.Head>
											<Table.Head class="w-28">Quantity</Table.Head>
											<Table.Head class="w-32">Unit Price</Table.Head>
											<Table.Head class="text-right">Line Total</Table.Head>
											<Table.Head class="w-12"></Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each lineItems as item (item.id)}
											<Table.Row>
												<Table.Cell class="font-medium">{item.itemName}</Table.Cell>
												<Table.Cell class="text-muted-foreground">{item.itemSku}</Table.Cell>
												<Table.Cell>
													<Input
														type="number"
														min="0.001"
														step="0.01"
														class="h-8 w-24"
														value={item.quantity}
														oninput={(e) =>
															updateLineItemQuantity(
																item.id,
																parseFloat((e.target as HTMLInputElement).value) || 0
															)}
													/>
												</Table.Cell>
												<Table.Cell>
													<Input
														type="number"
														min="0"
														step="0.01"
														class="h-8 w-28"
														value={item.unitPrice}
														oninput={(e) =>
															updateLineItemPrice(
																item.id,
																parseFloat((e.target as HTMLInputElement).value) || 0
															)}
													/>
												</Table.Cell>
												<Table.Cell class="text-right font-medium">
													{formatCurrency(item.quantity * item.unitPrice)}
												</Table.Cell>
												<Table.Cell>
													<Button
														variant="ghost"
														size="icon"
														class="h-8 w-8 text-destructive hover:text-destructive"
														onclick={() => removeLineItem(item.id)}
													>
														<IconTrash class="h-4 w-4" />
													</Button>
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</div>
						</div>
					{:else}
						<div class="rounded-lg border border-dashed py-8 text-center text-muted-foreground">
							<IconPlus class="mx-auto mb-2 h-8 w-8" />
							<p>Search above to add inventory items to this order</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Order Summary Sidebar -->
		<div>
			<Card.Root class="sticky top-6">
				<Card.Header>
					<Card.Title>Order Summary</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid gap-3">
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Items</span>
							<span class="font-medium">{lineItems.length}</span>
						</div>
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Total Quantity</span>
							<span class="font-medium"
								>{lineItems.reduce((s, i) => s + i.quantity, 0).toFixed(2)}</span
							>
						</div>
						<hr />
						<div class="flex items-center justify-between">
							<span class="font-medium">Total Amount</span>
							<span class="text-lg font-bold">{formatCurrency(totalAmount)}</span>
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex flex-col gap-2">
					<Button
						class="w-full"
						variant="outline"
						onclick={() => handleSave(false)}
						disabled={isSubmitting}
					>
						{#if isSubmitting}
							<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Save as Draft
					</Button>
					<Button class="w-full" onclick={() => handleSave(true)} disabled={isSubmitting}>
						{#if isSubmitting}
							<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Save & Send
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	</div>
</PageShell>
