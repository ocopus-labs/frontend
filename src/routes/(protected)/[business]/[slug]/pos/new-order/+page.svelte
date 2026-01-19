<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Drawer from '$lib/components/ui/drawer';
	import {
		IconSearch,
		IconRefresh,
		IconEdit,
		IconCalendar,
		IconClock,
		IconUser
	} from '@tabler/icons-svelte';

	import {
		MenuCategories,
		MenuItemCard,
		OrderSummary,
		ItemCustomizationDialog,
		PaymentDialog,
		TableSelectorDialog,
		ReceiptDialog,
		type OrderItemType
	} from '$lib/components/pos';

	import type { Table } from '$lib/api/table';

	import { createOrder, createPayment, type CreateOrderPayload, type CreateOrderItemPayload, type PaymentMethod } from '$lib/api';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	// Get data from load function
	let { data } = $props();

	// Extended order item type with API fields
	interface ExtendedOrderItem extends OrderItemType {
		menuItemId: string;
		basePrice: number;
	}

	interface POSMenuItem {
		id: string;
		menuItemId: string;
		categoryId: string;
		name: string;
		description?: string;
		price: number;
		image: string;
		available: boolean;
		isVegetarian?: boolean;
		isVegan?: boolean;
		isGlutenFree?: boolean;
		preparationTime?: number;
		modifiers?: {
			sizes?: { id: string; name: string; price: number }[];
			spiceLevels?: { id: string; name: string; price: number }[];
			preparation?: string[];
			addOns?: { id: string; name: string; price: number }[];
			removals?: string[];
		};
	}

	// State variables
	let selectedCategory = $state('All Items');
	let searchQuery = $state('');
	let orderType = $state<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
	let selectedTable = $state<Table | null>(null);
	let showOrderSummary = $state(false);
	let isSubmitting = $state(false);
	let showTableSelector = $state(false);

	// Customization dialog state
	let showCustomizationDialog = $state(false);
	let selectedItem = $state<POSMenuItem | null>(null);
	let customizationQuantity = $state(1);
	let selectedSize = $state('');
	let selectedSpiceLevel = $state('');
	let selectedPreparation = $state<string[]>([]);
	let selectedAddOns = $state<string[]>([]);
	let selectedRemovals = $state<string[]>([]);
	let specialInstructions = $state('');

	// Optional fields
	let showTaxes = $state(true);
	let taxRate = $state(10);
	let showDiscount = $state(false);
	let discountType = $state<'percentage' | 'fixed'>('percentage');
	let discountValue = $state(0);

	// Payment state
	let showPaymentDialog = $state(false);
	let currentOrderId = $state('');
	let currentOrderNumber = $state('');
	let currentOrderTotal = $state(0);
	let currentBalanceDue = $state(0);
	let isProcessingPayment = $state(false);

	// Receipt state
	let showReceiptDialog = $state(false);
	let currentPaymentId = $state('');
	let currentPaymentChange = $state<number | undefined>(undefined);

	// Filter menu items by selected category and search
	const filteredMenuItems = $derived(() => {
		let items = data.menuItems as POSMenuItem[];

		// Filter by category
		if (selectedCategory !== 'All Items') {
			const category = data.categories.find((c: { name: string }) => c.name === selectedCategory);
			if (category && category.id !== 'all') {
				items = items.filter((item) => item.categoryId === category.id);
			}
		}

		// Filter by search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			items = items.filter((item) =>
				item.name.toLowerCase().includes(query) ||
				item.description?.toLowerCase().includes(query)
			);
		}

		return items;
	});

	let orderItems = $state<ExtendedOrderItem[]>([]);

	const subtotal = $derived(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
	const taxes = $derived(showTaxes ? (subtotal * taxRate) / 100 : 0);
	const discount = $derived(
		showDiscount
			? discountType === 'percentage'
				? (subtotal * discountValue) / 100
				: discountValue
			: 0
	);
	const totalPayment = $derived(subtotal + taxes - discount);

	function handleCategorySelect(categoryName: string) {
		selectedCategory = categoryName;
	}

	function addToOrder(item: POSMenuItem) {
		selectedItem = item;
		customizationQuantity = 1;
		selectedSize = item.modifiers?.sizes?.[0]?.name || '';
		selectedSpiceLevel = item.modifiers?.spiceLevels?.[0]?.name || '';
		selectedPreparation = [];
		selectedAddOns = [];
		selectedRemovals = [];
		specialInstructions = '';
		showCustomizationDialog = true;
	}

	function confirmAddToOrder() {
		if (!selectedItem) return;

		let totalPrice = selectedItem.price;

		if (selectedSize && selectedItem.modifiers?.sizes) {
			const sizeOption = selectedItem.modifiers.sizes.find((s) => s.name === selectedSize);
			if (sizeOption) totalPrice += sizeOption.price;
		}

		if (selectedSpiceLevel && selectedItem.modifiers?.spiceLevels) {
			const spiceOption = selectedItem.modifiers.spiceLevels.find(
				(s) => s.name === selectedSpiceLevel
			);
			if (spiceOption) totalPrice += spiceOption.price;
		}

		if (selectedItem.modifiers?.addOns) {
			selectedAddOns.forEach((addOn) => {
				const addOnOption = selectedItem?.modifiers!.addOns!.find((a) => a.name === addOn);
				if (addOnOption) totalPrice += addOnOption.price;
			});
		}

		const newOrderItem: ExtendedOrderItem = {
			id: crypto.randomUUID(),
			name: selectedItem.name,
			price: totalPrice,
			quantity: customizationQuantity,
			image: selectedItem.image,
			modifiers: {
				size: selectedSize,
				spiceLevel: selectedSpiceLevel,
				preparation: selectedPreparation,
				addOns: selectedAddOns,
				removals: selectedRemovals,
				specialInstructions: specialInstructions
			},
			// Store menu item ID for API submission
			menuItemId: selectedItem.menuItemId,
			basePrice: selectedItem.price
		};

		orderItems = [...orderItems, newOrderItem];
		showCustomizationDialog = false;
		selectedItem = null;
	}

	function removeFromOrder(id: string) {
		orderItems = orderItems.filter((item) => item.id !== id);
	}

	function updateQuantity(id: string, delta: number) {
		orderItems = orderItems.map((item) => {
			if (item.id === id) {
				return { ...item, quantity: Math.max(1, item.quantity + delta) };
			}
			return item;
		});
	}

	function togglePreparation(prep: string) {
		if (selectedPreparation.includes(prep)) {
			selectedPreparation = selectedPreparation.filter((p) => p !== prep);
		} else {
			selectedPreparation = [...selectedPreparation, prep];
		}
	}

	function toggleAddOn(addOn: string) {
		if (selectedAddOns.includes(addOn)) {
			selectedAddOns = selectedAddOns.filter((a) => a !== addOn);
		} else {
			selectedAddOns = [...selectedAddOns, addOn];
		}
	}

	function toggleRemoval(removal: string) {
		if (selectedRemovals.includes(removal)) {
			selectedRemovals = selectedRemovals.filter((r) => r !== removal);
		} else {
			selectedRemovals = [...selectedRemovals, removal];
		}
	}

	function handleOrderTypeChange(type: string) {
		// Map UI values to API values
		const typeMap: Record<string, 'dine_in' | 'takeaway' | 'delivery'> = {
			'Dine-In': 'dine_in',
			'Takeaway': 'takeaway',
			'Delivery': 'delivery'
		};
		orderType = typeMap[type] || 'dine_in';
	}

	function toggleTaxes() {
		showTaxes = !showTaxes;
	}

	function toggleDiscount() {
		showDiscount = !showDiscount;
	}

	async function submitOrder() {
		if (orderItems.length === 0) {
			toast.error('Please add items to the order');
			return;
		}

		// Validate table selection for dine-in orders when business supports tables
		if (orderType === 'dine_in' && data.supportsTable && !selectedTable) {
			toast.error('Please select a table for dine-in orders');
			showTableSelector = true;
			return;
		}

		isSubmitting = true;
		console.log('Submitting order...');

		try {
			const businessId = $page.data.business.id;
			console.log('Business ID:', businessId);

			const items: CreateOrderItemPayload[] = orderItems.map((item) => ({
				menuItemId: (item as any).menuItemId || item.id,
				name: item.name,
				quantity: item.quantity,
				basePrice: (item as any).basePrice || item.price,
				modifiers: item.modifiers ? {
					size: item.modifiers.size ? {
						id: crypto.randomUUID(),
						name: item.modifiers.size,
						price: 0
					} : undefined,
					spiceLevel: item.modifiers.spiceLevel ? {
						id: crypto.randomUUID(),
						name: item.modifiers.spiceLevel,
						price: 0
					} : undefined,
					preparation: item.modifiers.preparation,
					addOns: item.modifiers.addOns?.map((name) => ({
						id: crypto.randomUUID(),
						name,
						price: 0
					})),
					removals: item.modifiers.removals,
					specialInstructions: item.modifiers.specialInstructions
				} : undefined
			}));

			const orderPayload: CreateOrderPayload = {
				orderType,
				tableNumber: orderType === 'dine_in' && selectedTable ? selectedTable.tableNumber : undefined,
				items,
				taxRate: showTaxes ? taxRate : 0,
				discount: showDiscount && discountValue > 0 ? {
					type: discountType,
					value: discountValue
				} : undefined
			};

			console.log('Order payload:', orderPayload);
			const result = await createOrder(businessId, orderPayload);
			console.log('Order created:', result);
			toast.success(`Order ${result.order.orderNumber} created successfully!`);

			// Show payment dialog
			currentOrderId = result.order.id;
			currentOrderNumber = result.order.orderNumber;
			currentOrderTotal = result.order.pricing.total;
			currentBalanceDue = Number(result.order.balanceDue);
			console.log('Opening payment dialog with balance:', currentBalanceDue);
			showPaymentDialog = true;
			showOrderSummary = false;

		} catch (error) {
			console.error('Failed to create order:', error);
			toast.error('Failed to create order. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleTableSelect(table: Table) {
		selectedTable = table;
		showTableSelector = false;
	}

	async function handlePaymentComplete(result: {
		paymentMethod: PaymentMethod;
		amount: number;
		change?: number;
		remainingBalance: number;
	}) {
		console.log('Payment complete callback:', result);
		isProcessingPayment = true;

		try {
			const businessId = $page.data.business.id;
			console.log('Processing payment for order:', currentOrderId);

			const paymentResult = await createPayment(businessId, {
				orderId: currentOrderId,
				amount: result.amount,
				method: result.paymentMethod,
				cashReceived: result.paymentMethod === 'cash' ? result.amount + (result.change || 0) : undefined
			});

			console.log('Payment result:', paymentResult);

			if (result.change && result.change > 0) {
				toast.success(`Payment complete! Change: ₹${result.change.toFixed(2)}`);
			} else {
				toast.success('Payment processed successfully!');
			}

			if (paymentResult.remainingBalance <= 0) {
				// Order fully paid - show receipt dialog
				currentPaymentId = paymentResult.payment.id;
				currentPaymentChange = result.change;
				showPaymentDialog = false;
				showReceiptDialog = true;
			} else {
				// Partial payment - update balance
				currentBalanceDue = paymentResult.remainingBalance;
				toast.info(`Remaining balance: ₹${paymentResult.remainingBalance.toFixed(2)}`);
			}

		} catch (error) {
			console.error('Failed to process payment:', error);
			toast.error('Failed to process payment. Please try again.');
		} finally {
			isProcessingPayment = false;
		}
	}

	function handlePaymentCancel() {
		showPaymentDialog = false;
		// Order is created but not paid - notify user
		toast.info(`Order ${currentOrderNumber} saved. You can pay later from the orders list.`);
		orderItems = [];
		currentOrderId = '';
		currentOrderNumber = '';
	}

	function handleReceiptClose() {
		showReceiptDialog = false;
		// Clear order state after receipt is closed
		orderItems = [];
		currentOrderId = '';
		currentOrderNumber = '';
		currentPaymentId = '';
		currentPaymentChange = undefined;
	}

	// Transform for legacy MenuItem type expected by components
	const legacyMenuItem = $derived(selectedItem ? {
		id: parseInt(selectedItem.id.replace(/\D/g, '').slice(0, 8)) || 1,
		name: selectedItem.name,
		price: selectedItem.price,
		image: selectedItem.image,
		available: selectedItem.available,
		modifiers: selectedItem.modifiers ? {
			sizes: selectedItem.modifiers.sizes?.map(s => ({ name: s.name, price: s.price })),
			spiceLevels: selectedItem.modifiers.spiceLevels?.map(s => ({ name: s.name, price: s.price })),
			preparation: selectedItem.modifiers.preparation,
			addOns: selectedItem.modifiers.addOns?.map(a => ({ name: a.name, price: a.price })),
			removals: selectedItem.modifiers.removals
		} : undefined
	} : null);

	// Transform menu items for MenuItemCard component
	const displayMenuItems = $derived(filteredMenuItems().map(item => ({
		id: parseInt(item.id.replace(/\D/g, '').slice(0, 8)) || 1,
		name: item.name,
		price: item.price,
		image: item.image,
		available: item.available,
		modifiers: item.modifiers ? {
			sizes: item.modifiers.sizes?.map(s => ({ name: s.name, price: s.price })),
			spiceLevels: item.modifiers.spiceLevels?.map(s => ({ name: s.name, price: s.price })),
			preparation: item.modifiers.preparation,
			addOns: item.modifiers.addOns?.map(a => ({ name: a.name, price: a.price })),
			removals: item.modifiers.removals
		} : undefined,
		_original: item
	})));

	function handleAddToOrderFromCard(item: any) {
		addToOrder(item._original);
	}
</script>

<div class="flex h-screen overflow-hidden bg-background">
	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col">
		<!-- Header -->
		<div class="flex flex-1 flex-col overflow-hidden lg:flex-row">
			<!-- Menu Section -->
			<div class="flex flex-1 flex-col overflow-hidden lg:min-w-0">
				<!-- Category Tabs & Search -->
				<div class="border-b border-border p-2.5 md:p-4 lg:p-6">
					<div class="mb-2.5 md:mb-3 lg:mb-4">
						<MenuCategories
							categories={data.categories.map((c: { id: string; name: string; count: number }) => ({
								name: c.name,
								count: c.count,
								active: c.name === selectedCategory
							}))}
							{selectedCategory}
							onCategorySelect={handleCategorySelect}
						/>
					</div>
					<div class="flex items-center gap-2">
						<div class="relative flex-1 md:max-w-md">
							<IconSearch
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								type="text"
								placeholder="Search menu items..."
								bind:value={searchQuery}
								class="h-9 pl-9 text-sm md:h-10"
							/>
						</div>
					</div>
				</div>

				<!-- Menu Grid -->
				<div class="flex-1 overflow-y-auto pb-20 lg:pb-0">
					{#if displayMenuItems.length === 0}
						<div class="flex h-64 items-center justify-center text-muted-foreground">
							<p>No menu items found. {data.menuItems.length === 0 ? 'Add items to your menu first.' : 'Try a different search or category.'}</p>
						</div>
					{:else}
						<div
							class="grid grid-cols-1 gap-2.5 p-2.5 min-[400px]:grid-cols-2 sm:gap-3 sm:p-3 md:gap-4 md:p-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
						>
							{#each displayMenuItems as item}
								<MenuItemCard {item} onAddToOrder={handleAddToOrderFromCard} />
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Order Summary Section - Desktop: Sidebar -->
			<div
				class="hidden lg:flex lg:w-[380px] lg:shrink-0 lg:flex-col lg:border-l lg:border-border xl:w-[420px]"
			>
				<div class="min-h-0 flex-1 overflow-hidden">
					<OrderSummary
					{orderItems}
					orderType={orderType === 'dine_in' ? 'Dine-In' : orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
					selectedTableDisplay={selectedTable?.displayName || null}
					showTableSelection={data.supportsTable}
					{subtotal}
					{showTaxes}
					{taxRate}
					{taxes}
					{showDiscount}
					{discountType}
					{discountValue}
					{discount}
					{totalPayment}
					onOrderTypeChange={handleOrderTypeChange}
					onRemoveItem={removeFromOrder}
					onUpdateQuantity={updateQuantity}
					onToggleTaxes={toggleTaxes}
					onToggleDiscount={toggleDiscount}
					onTableSelectClick={() => showTableSelector = true}
				/>
				</div>
				<div class="shrink-0 border-t border-border p-4">
					<Button
						class="w-full"
						size="lg"
						onclick={submitOrder}
						disabled={orderItems.length === 0 || isSubmitting}
					>
						{isSubmitting ? 'Creating Order...' : 'Place Order'}
					</Button>
				</div>
			</div>
		</div>

		<!-- Mobile: Order Summary Drawer -->
		<Drawer.Root bind:open={showOrderSummary}>
			<div
				class="fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-background p-3 lg:hidden"
			>
				<Drawer.Trigger class="w-full">
					<Button class="w-full" size="lg">
						<span class="flex-1 text-left">View Order ({orderItems.length} items)</span>
						<span class="font-bold">${totalPayment.toFixed(2)}</span>
					</Button>
				</Drawer.Trigger>
			</div>

			<Drawer.Portal>
				<Drawer.Overlay class="fixed inset-0 z-50 bg-black/40" />
				<Drawer.Content
					class="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[85vh] flex-col rounded-t-[10px] border bg-background"
				>
					<div class="flex-1 overflow-hidden">
						<OrderSummary
							{orderItems}
							orderType={orderType === 'dine_in' ? 'Dine-In' : orderType === 'takeaway' ? 'Takeaway' : 'Delivery'}
							selectedTableDisplay={selectedTable?.displayName || null}
							showTableSelection={data.supportsTable}
							{subtotal}
							{showTaxes}
							{taxRate}
							{taxes}
							{showDiscount}
							{discountType}
							{discountValue}
							{discount}
							{totalPayment}
							onOrderTypeChange={handleOrderTypeChange}
							onRemoveItem={removeFromOrder}
							onUpdateQuantity={updateQuantity}
							onToggleTaxes={toggleTaxes}
							onToggleDiscount={toggleDiscount}
							onTableSelectClick={() => showTableSelector = true}
						/>
					</div>
					<div class="border-t border-border p-4">
						<Button
							class="w-full"
							size="lg"
							onclick={submitOrder}
							disabled={orderItems.length === 0 || isSubmitting}
						>
							{isSubmitting ? 'Creating Order...' : 'Place Order'}
						</Button>
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	</div>
</div>

<!-- Item Customization Dialog -->
<ItemCustomizationDialog
	open={showCustomizationDialog}
	selectedItem={legacyMenuItem}
	{selectedSize}
	{selectedSpiceLevel}
	{selectedPreparation}
	{selectedAddOns}
	{selectedRemovals}
	{specialInstructions}
	{customizationQuantity}
	onSizeChange={(size) => (selectedSize = size)}
	onSpiceLevelChange={(spice) => (selectedSpiceLevel = spice)}
	onPreparationToggle={togglePreparation}
	onAddOnToggle={toggleAddOn}
	onRemovalToggle={toggleRemoval}
	onSpecialInstructionsChange={(instructions) => (specialInstructions = instructions)}
	onQuantityChange={(delta) => (customizationQuantity = Math.max(1, customizationQuantity + delta))}
	onConfirm={confirmAddToOrder}
	onCancel={() => (showCustomizationDialog = false)}
/>

<!-- Payment Dialog -->
<PaymentDialog
	open={showPaymentDialog}
	orderId={currentOrderId}
	orderNumber={currentOrderNumber}
	totalAmount={currentOrderTotal}
	balanceDue={currentBalanceDue}
	onPaymentComplete={handlePaymentComplete}
	onCancel={handlePaymentCancel}
	isProcessing={isProcessingPayment}
/>

<!-- Table Selector Dialog -->
{#if data.supportsTable}
	<TableSelectorDialog
		open={showTableSelector}
		tables={data.tables}
		selectedTableId={selectedTable?.id || null}
		onSelect={handleTableSelect}
		onCancel={() => showTableSelector = false}
	/>
{/if}

<!-- Receipt Dialog -->
<ReceiptDialog
	open={showReceiptDialog}
	paymentId={currentPaymentId}
	change={currentPaymentChange}
	onClose={handleReceiptClose}
/>
