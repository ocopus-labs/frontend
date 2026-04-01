<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Drawer from '$lib/components/ui/drawer';
	import {
		IconSearch,
		IconRefresh,
		IconEdit,
		IconCalendar,
		IconClock,
		IconUser,
		IconLoader2
	} from '@tabler/icons-svelte';

	import {
		MenuCategories,
		MenuItemCard,
		OrderSummary,
		ItemCustomizationDialog,
		PaymentDialog,
		TableSelectorDialog,
		ReceiptDialog,
		CustomerPicker,
		type OrderItemType
	} from '$lib/components/pos';

	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { EmptyState } from '$lib/components/data-display';
	import type { Table } from '$lib/api/table';

	import { createOrder, createPayment, createSplitPayment, startTableSession, getLoyaltyAccount, getLoyaltySettings, redeemLoyaltyPoints, type CreateOrderPayload, type CreateOrderItemPayload, type PaymentMethod, type Customer, type LoyaltyAccount, type LoyaltySettings } from '$lib/api';
	import { currencyToRegion, createI18nUtils } from '$lib/utils/i18n';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import PosTour from '$lib/components/pos/pos-tour.svelte';
	import confetti from 'canvas-confetti';

	// Get data from load function
	let { data } = $props();

	// Derive region from business currency settings
	const region = $derived(currencyToRegion((data.business as any)?.settings?.currency || 'USD'));
	const i18n = $derived(createI18nUtils(region));

	import type { ExtendedOrderItem, POSMenuItem } from '$lib/types/pos';

	// State variables
	let selectedCategory = $state('All Items');
	let searchQuery = $state('');
	let debouncedSearchQuery = $state('');
	let orderType = $state<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
	let selectedTable = $state<Table | null>(null);
	let showOrderSummary = $state(false);
	let isSubmitting = $state(false);
	let showTableSelector = $state(false);
	let selectedCustomer = $state<Customer | null>(null);

	// Loyalty state
	let customerLoyalty = $state<LoyaltyAccount | null>(null);
	let loyaltySettings = $state<LoyaltySettings | null>(null);
	let showRedeemDialog = $state(false);
	let redeemAmount = $state(0);
	let isRedeeming = $state(false);
	let loyaltyDiscount = $state(0);

	// Load loyalty settings on mount
	$effect(() => {
		const businessId = (data.business as any)?.id;
		if (businessId) {
			getLoyaltySettings(businessId).then((r) => {
				loyaltySettings = r.settings;
			}).catch(() => {
				// Loyalty settings not available, ignore
			});
		}
	});

	// Fetch loyalty account when customer is selected
	$effect(() => {
		const customer = selectedCustomer;
		const businessId = (data.business as any)?.id;
		if (customer && businessId && loyaltySettings?.enabled) {
			getLoyaltyAccount(businessId, customer.id).then((r) => {
				customerLoyalty = r.account;
			}).catch(() => {
				customerLoyalty = null;
			});
		} else {
			customerLoyalty = null;
			loyaltyDiscount = 0;
		}
	});

	// Order confirmation dialog state (1.6)
	let showOrderConfirmation = $state(false);

	// Search debounce (1.14)
	let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		const q = searchQuery;
		clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			debouncedSearchQuery = q;
		}, 300);
		return () => clearTimeout(searchDebounceTimer);
	});

	// Auto-select table from URL param (Issue 3.1)
	$effect(() => {
		const tableId = $page.url.searchParams.get('table');
		if (tableId && data.tables && !selectedTable) {
			const match = data.tables.find((t: Table) => t.id === tableId);
			if (match) {
				selectedTable = match;
				orderType = 'dine_in';
			}
		}
	});

	// Cart persistence to sessionStorage (1.11)
	let isCartInitialized = $state(false);
	let cartSaveTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (isCartInitialized) return;
		const businessId = (data.business as any)?.id;
		if (!businessId) return;
		try {
			const saved = sessionStorage.getItem(`pos-cart-${businessId}`);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) {
					orderItems = parsed;
				}
			}
		} catch {
			// ignore parse errors
		}
		isCartInitialized = true;
	});

	$effect(() => {
		if (!isCartInitialized) return;
		const businessId = (data.business as any)?.id;
		if (!businessId) return;
		const items = orderItems;
		clearTimeout(cartSaveTimer);
		cartSaveTimer = setTimeout(() => {
			try {
				if (items.length > 0) {
					sessionStorage.setItem(`pos-cart-${businessId}`, JSON.stringify(items));
				} else {
					sessionStorage.removeItem(`pos-cart-${businessId}`);
				}
			} catch {
				// ignore storage errors
			}
		}, 500);
		return () => clearTimeout(cartSaveTimer);
	});

	function clearCartStorage() {
		const businessId = (data.business as any)?.id;
		if (businessId) {
			try { sessionStorage.removeItem(`pos-cart-${businessId}`); } catch {}
		}
	}

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
	let taxRate = $state(parseFloat((data.business as any)?.settings?.taxRate) || 0);
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

	// Filter menu items by selected category and search (uses debounced search)
	const filteredMenuItems = $derived(() => {
		let items = data.menuItems as POSMenuItem[];

		// Filter by category
		if (selectedCategory !== 'All Items') {
			const category = data.categories.find((c: { name: string }) => c.name === selectedCategory);
			if (category && category.id !== 'all') {
				items = items.filter((item) => item.categoryId === category.id);
			}
		}

		// Filter by debounced search (1.14)
		if (debouncedSearchQuery) {
			const query = debouncedSearchQuery.toLowerCase();
			items = items.filter((item) =>
				item.name.toLowerCase().includes(query) ||
				item.description?.toLowerCase().includes(query)
			);
		}

		return items;
	});

	let orderItems = $state<ExtendedOrderItem[]>([]);

	// Cart quantity map for MenuItemCard badges (1.19)
	const cartQuantityMap = $derived(
		orderItems.reduce<Record<string, number>>((map, item) => {
			map[item.menuItemId] = (map[item.menuItemId] || 0) + item.quantity;
			return map;
		}, {})
	);

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

	// Check if item has any modifiers (1.15)
	function itemHasModifiers(item: POSMenuItem): boolean {
		if (!item.modifiers) return false;
		const m = item.modifiers;
		return !!(
			(m.sizes && m.sizes.length > 0) ||
			(m.spiceLevels && m.spiceLevels.length > 0) ||
			(m.preparation && m.preparation.length > 0) ||
			(m.addOns && m.addOns.length > 0) ||
			(m.removals && m.removals.length > 0)
		);
	}

	function addToOrder(item: POSMenuItem) {
		// Quick-add for items without modifiers (1.15)
		if (!itemHasModifiers(item)) {
			const newOrderItem: ExtendedOrderItem = {
				id: crypto.randomUUID(),
				name: item.name,
				price: item.price,
				quantity: 1,
				image: item.image,
				modifiers: {},
				menuItemId: item.menuItemId,
				basePrice: item.price
			};
			orderItems = [...orderItems, newOrderItem];
			// toast.success(`${item.name} added to cart`, { duration: 1500 });
			return;
		}

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
		let sizePrice = 0;
		let spiceLevelPrice = 0;
		const addOnPrices: Record<string, number> = {};

		if (selectedSize && selectedItem.modifiers?.sizes) {
			const sizeOption = selectedItem.modifiers.sizes.find((s) => s.name === selectedSize);
			if (sizeOption) {
				sizePrice = sizeOption.price;
				totalPrice += sizePrice;
			}
		}

		if (selectedSpiceLevel && selectedItem.modifiers?.spiceLevels) {
			const spiceOption = selectedItem.modifiers.spiceLevels.find(
				(s) => s.name === selectedSpiceLevel
			);
			if (spiceOption) {
				spiceLevelPrice = spiceOption.price;
				totalPrice += spiceLevelPrice;
			}
		}

		if (selectedItem.modifiers?.addOns) {
			selectedAddOns.forEach((addOn) => {
				const addOnOption = selectedItem?.modifiers!.addOns!.find((a) => a.name === addOn);
				if (addOnOption) {
					addOnPrices[addOn] = addOnOption.price;
					totalPrice += addOnOption.price;
				}
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
			basePrice: selectedItem.price,
			_modifierPrices: {
				sizePrice: sizePrice || undefined,
				spiceLevelPrice: spiceLevelPrice || undefined,
				addOnPrices: Object.keys(addOnPrices).length > 0 ? addOnPrices : undefined
			}
		};

		orderItems = [...orderItems, newOrderItem];
		showCustomizationDialog = false;
		selectedItem = null;
	}

	// Undo for removed items (1.9)
	function removeFromOrder(id: string) {
		const removedItem = orderItems.find((item) => item.id === id);
		if (!removedItem) return;

		orderItems = orderItems.filter((item) => item.id !== id);

		toast(`${removedItem.name} removed`, {
			duration: 5000,
			action: {
				label: 'Undo',
				onClick: () => {
					orderItems = [...orderItems, removedItem];
				}
			}
		});
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

	function openRedeemDialog() {
		redeemAmount = 0;
		showRedeemDialog = true;
	}

	async function handleRedeemPoints() {
		if (!selectedCustomer || !loyaltySettings || redeemAmount <= 0) return;

		if (redeemAmount < loyaltySettings.minimumRedemption) {
			toast.error(`Minimum redemption is ${loyaltySettings.minimumRedemption} points`);
			return;
		}

		if (customerLoyalty && redeemAmount > customerLoyalty.points) {
			toast.error(`Customer only has ${customerLoyalty.points} points`);
			return;
		}

		isRedeeming = true;
		const businessId = (data.business as any)?.id;

		try {
			const result = await redeemLoyaltyPoints(businessId, selectedCustomer.id, redeemAmount);
			loyaltyDiscount = result.discountAmount;

			// Apply as fixed discount
			showDiscount = true;
			discountType = 'fixed';
			discountValue = result.discountAmount;

			// Update local loyalty balance
			if (customerLoyalty) {
				customerLoyalty = { ...customerLoyalty, points: result.newBalance };
			}

			toast.success(`Redeemed ${redeemAmount} points for ${i18n.formatCurrency(result.discountAmount)} discount`);
			showRedeemDialog = false;
		} catch (error: any) {
			toast.error(error?.message || 'Failed to redeem points');
		} finally {
			isRedeeming = false;
		}
	}

	// Order confirmation dialog handler (1.6)
	function handlePlaceOrder() {
		if (orderItems.length === 0) {
			toast.error('Please add items to the order');
			return;
		}

		if (orderType === 'dine_in' && data.supportsTable && !selectedTable) {
			toast.error('Please select a table for dine-in orders');
			showTableSelector = true;
			return;
		}

		showOrderConfirmation = true;
	}

	async function submitOrder() {
		// Double-submit guard (1.2)
		if (isSubmitting) return;

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

		try {
			const businessId = $page.data.business.id;

			const items: CreateOrderItemPayload[] = orderItems.map((item) => ({
				menuItemId: (item as any).menuItemId || item.id,
				name: item.name,
				quantity: item.quantity,
				basePrice: (item as any).basePrice || item.price,
				modifiers: item.modifiers ? {
					size: item.modifiers.size ? {
						id: crypto.randomUUID(),
						name: item.modifiers.size,
						price: item._modifierPrices?.sizePrice ?? 0
					} : undefined,
					spiceLevel: item.modifiers.spiceLevel ? {
						id: crypto.randomUUID(),
						name: item.modifiers.spiceLevel,
						price: item._modifierPrices?.spiceLevelPrice ?? 0
					} : undefined,
					preparation: item.modifiers.preparation,
					addOns: item.modifiers.addOns?.map((name) => ({
						id: crypto.randomUUID(),
						name,
						price: item._modifierPrices?.addOnPrices?.[name] ?? 0
					})),
					removals: item.modifiers.removals,
					specialInstructions: item.modifiers.specialInstructions
				} : undefined
			}));

			const orderPayload: CreateOrderPayload = {
				orderType,
				customerId: selectedCustomer?.id,
				tableId: orderType === 'dine_in' && selectedTable ? selectedTable.id : undefined,
				tableNumber: orderType === 'dine_in' && selectedTable ? selectedTable.tableNumber : undefined,
				customerInfo: selectedCustomer
					? {
							name: selectedCustomer.name,
							phone: selectedCustomer.phone,
							email: selectedCustomer.email || undefined
						}
					: undefined,
				items,
				taxRate: showTaxes ? taxRate : 0,
				discount: showDiscount && discountValue > 0 ? {
					type: discountType,
					value: discountValue
				} : undefined
			};

			const result = await createOrder(businessId, orderPayload);
			toast.success(`Order ${result.order.orderNumber} created successfully!`);

			// First order celebration
			const firstOrderKey = `first-order:${businessId}`;
			if (typeof window !== 'undefined' && !localStorage.getItem(firstOrderKey)) {
				localStorage.setItem(firstOrderKey, 'true');
				confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
				setTimeout(() => toast.success('Your first order is live!', { duration: 5000 }), 500);
			}

			// Auto-start table session for dine-in orders (Issue 3.2)
			if (orderType === 'dine_in' && selectedTable) {
				try {
					await startTableSession(businessId, selectedTable.id, {
						orderId: result.order.id,
						orderNumber: result.order.orderNumber
					});
				} catch (err) {
					// Don't fail order creation if table session start fails
					console.warn('Failed to start table session:', err);
				}
			}

			// Show payment dialog
			currentOrderId = result.order.id;
			currentOrderNumber = result.order.orderNumber;
			currentOrderTotal = result.order.pricing.total;
			currentBalanceDue = Number(result.order.balanceDue);
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
		isProcessingPayment = true;

		try {
			const businessId = $page.data.business.id;

			const paymentResult = await createPayment(businessId, {
				orderId: currentOrderId,
				amount: result.amount,
				method: result.paymentMethod,
				cashReceived: result.paymentMethod === 'cash' ? result.amount + (result.change || 0) : undefined
			});

			if (result.change && result.change > 0) {
				toast.success(`Payment complete! Change: ${i18n.formatCurrency(result.change)}`, {
					duration: 10000,
					closeButton: true
				});
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
				toast.info(`Remaining balance: ${i18n.formatCurrency(paymentResult.remainingBalance)}`);
			}

		} catch (error) {
			console.error('Failed to process payment:', error);
			toast.error('Failed to process payment. Please try again.');
		} finally {
			isProcessingPayment = false;
		}
	}

	async function handleSplitPaymentComplete(result: {
		payments: { method: PaymentMethod; amount: number; cashReceived?: number }[];
		remainingBalance: number;
	}) {
		isProcessingPayment = true;

		try {
			const businessId = $page.data.business.id;

			const paymentResult = await createSplitPayment(businessId, {
				orderId: currentOrderId,
				payments: result.payments.map((p) => ({
					amount: p.amount,
					method: p.method,
					cashReceived: p.cashReceived
				}))
			});

			toast.success('Split payment processed successfully!');

			if (paymentResult.remainingBalance <= 0) {
				// Show receipt for the first payment
				currentPaymentId = paymentResult.payments[0]?.id || '';
				currentPaymentChange = undefined;
				showPaymentDialog = false;
				showReceiptDialog = true;
			} else {
				currentBalanceDue = paymentResult.remainingBalance;
				toast.info(`Remaining balance: ${i18n.formatCurrency(paymentResult.remainingBalance)}`);
			}
		} catch (error) {
			console.error('Failed to process split payment:', error);
			toast.error('Failed to process split payment. Please try again.');
		} finally {
			isProcessingPayment = false;
		}
	}

	function handlePaymentCancel() {
		showPaymentDialog = false;
		// Order is created but not paid - notify user
		toast.info(`Order ${currentOrderNumber} saved. You can pay later from the orders list.`);
		orderItems = [];
		clearCartStorage();
		selectedCustomer = null;
		customerLoyalty = null;
		loyaltyDiscount = 0;
		currentOrderId = '';
		currentOrderNumber = '';
	}

	function handleReceiptClose() {
		showReceiptDialog = false;
		// Clear order state after receipt is closed
		orderItems = [];
		clearCartStorage();
		selectedCustomer = null;
		customerLoyalty = null;
		loyaltyDiscount = 0;
		currentOrderId = '';
		currentOrderNumber = '';
		currentPaymentId = '';
		currentPaymentChange = undefined;
	}

	// Transform for legacy MenuItem type expected by components
	const legacyMenuItem = $derived(selectedItem ? {
		id: selectedItem.id,
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

	// Transform menu items for MenuItemCard component (1.19 — includes menuItemId for cart qty)
	const displayMenuItems = $derived(filteredMenuItems().map(item => ({
		id: item.id,
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
		_original: item,
		_menuItemId: item.menuItemId
	})));

	function handleAddToOrderFromCard(item: any) {
		addToOrder(item._original);
	}
</script>

<div class="flex h-[100dvh] overflow-hidden bg-background">
	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col">
		<!-- Header -->
		<div class="flex flex-1 flex-col overflow-hidden lg:flex-row">
			<!-- Menu Section -->
			<div class="flex flex-1 flex-col overflow-hidden lg:min-w-0" data-tour="menu-grid">
				<!-- Category Tabs & Search -->
				<div class="border-b border-border p-2 md:p-4 lg:p-6">
					<div class="mb-2 md:mb-3 lg:mb-4">
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
								class="h-8 pl-9 text-sm md:h-10"
							/>
						</div>
					</div>
				</div>

				<!-- Menu Grid -->
				<div class="flex-1 overflow-y-auto pb-24 lg:pb-0">
					{#if displayMenuItems.length === 0}
						<EmptyState type="no-results" title="No items found" description="Try a different search term." size="sm" />
					{:else}
						<div
							class="flex flex-col gap-1.5 p-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:p-3 md:grid-cols-3 md:gap-4 md:p-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
						>
							{#each displayMenuItems as item}
								<MenuItemCard
									{item}
									onAddToOrder={handleAddToOrderFromCard}
									{region}
									cartQuantity={cartQuantityMap[item._menuItemId] || 0}
								/>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Order Summary Section - Desktop: Sidebar -->
			<div
				class="hidden lg:flex lg:w-[380px] lg:shrink-0 lg:flex-col lg:border-l lg:border-border xl:w-[420px]"
				data-tour="table-selector"
			>
				<div class="border-b border-border p-4">
					<CustomerPicker businessId={(data.business as any)?.id} bind:selectedCustomer />
					{#if selectedCustomer && customerLoyalty && loyaltySettings?.enabled}
						<div class="mt-2 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
							<div class="flex items-center gap-2 text-sm">
								<span class="font-medium">{customerLoyalty.points} pts</span>
								<Badge variant="secondary" class="text-xs capitalize">{customerLoyalty.tier}</Badge>
							</div>
							{#if customerLoyalty.points >= loyaltySettings.minimumRedemption}
								<Button variant="outline" size="sm" class="h-7 text-xs" onclick={openRedeemDialog}>
									Redeem Points
								</Button>
							{/if}
						</div>
					{/if}
				</div>
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
					{region}
				/>
				</div>
				<div class="shrink-0 border-t border-border p-4" data-tour="send-order">
					<Button
						class="w-full"
						size="lg"
						onclick={handlePlaceOrder}
						disabled={orderItems.length === 0 || isSubmitting}
					>
						{isSubmitting ? 'Creating Order...' : 'Place Order'}
					</Button>
				</div>
			</div>
		</div>

		<!-- Mobile: Order Summary Drawer -->
		{#if orderItems.length > 0}
		<Drawer.Root bind:open={showOrderSummary}>
			<div
				class="safe-bottom fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-background/95 p-2.5 backdrop-blur-sm lg:hidden"
			>
				<Drawer.Trigger class="w-full">
					<Button class="h-12 w-full gap-3 text-base" size="lg">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/20 text-sm font-bold">
							{orderItems.length}
						</div>
						<span class="flex-1 text-left">View Order</span>
						<span class="font-bold">{i18n.formatCurrency(totalPayment)}</span>
					</Button>
				</Drawer.Trigger>
			</div>

			<Drawer.Portal>
				<Drawer.Overlay class="fixed inset-0 z-50 bg-black/40" />
				<Drawer.Content
					class="fixed inset-x-0 bottom-0 z-50 mt-10 flex max-h-[90dvh] flex-col rounded-t-xl border bg-background"
				>
					<!-- Drag Handle -->
					<div class="flex justify-center py-3">
						<div class="h-1.5 w-12 rounded-full bg-muted-foreground/30"></div>
					</div>
					<!-- Customer Picker (mobile only) -->
					<div class="border-b border-border px-4 pb-3">
						<CustomerPicker businessId={(data.business as any)?.id} bind:selectedCustomer />
						{#if selectedCustomer && customerLoyalty && loyaltySettings?.enabled}
							<div class="mt-2 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
								<div class="flex items-center gap-2 text-sm">
									<span class="font-medium">{customerLoyalty.points} pts</span>
									<Badge variant="secondary" class="text-xs capitalize">{customerLoyalty.tier}</Badge>
								</div>
								{#if customerLoyalty.points >= loyaltySettings.minimumRedemption}
									<Button variant="outline" size="sm" class="h-7 text-xs" onclick={openRedeemDialog}>
										Redeem Points
									</Button>
								{/if}
							</div>
						{/if}
					</div>
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
							{region}
						/>
					</div>
					<div class="safe-bottom border-t border-border p-3">
						<Button
							class="h-12 w-full text-base"
							size="lg"
							onclick={handlePlaceOrder}
							disabled={orderItems.length === 0 || isSubmitting}
						>
							{isSubmitting ? 'Creating Order...' : 'Place Order'}
						</Button>
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
		{/if}
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
	{region}
/>

<!-- Order Confirmation Dialog (1.6) -->
<ConfirmDialog
	bind:open={showOrderConfirmation}
	title="Confirm Order"
	description="{orderItems.length} item{orderItems.length !== 1 ? 's' : ''} - Total: {i18n.formatCurrency(totalPayment)}"
	confirmLabel="Place Order"
	onConfirm={() => submitOrder()}
/>

<!-- Payment Dialog -->
<PaymentDialog
	open={showPaymentDialog}
	orderId={currentOrderId}
	orderNumber={currentOrderNumber}
	totalAmount={currentOrderTotal}
	balanceDue={currentBalanceDue}
	onPaymentComplete={handlePaymentComplete}
	onSplitPaymentComplete={handleSplitPaymentComplete}
	onCancel={handlePaymentCancel}
	isProcessing={isProcessingPayment}
	{region}
	businessId={(data.business as any)?.id}
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

<!-- Redeem Points Dialog -->
<Dialog.Root bind:open={showRedeemDialog}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Redeem Loyalty Points</Dialog.Title>
			<Dialog.Description>
				{#if customerLoyalty}
					{customerLoyalty.points} points available.
					{#if loyaltySettings}
						Min: {loyaltySettings.minimumRedemption} pts.
						Rate: {loyaltySettings.redemptionRate} per point.
					{/if}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="redeem-points" class="text-sm font-medium">Points to redeem</label>
				<Input
					id="redeem-points"
					type="number"
					min={loyaltySettings?.minimumRedemption || 1}
					max={customerLoyalty?.points || 0}
					bind:value={redeemAmount}
				/>
			</div>
			{#if redeemAmount > 0 && loyaltySettings}
				<p class="text-sm text-muted-foreground">
					Discount: <span class="font-medium">{i18n.formatCurrency(redeemAmount * loyaltySettings.redemptionRate)}</span>
				</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showRedeemDialog = false)}>Cancel</Button>
			<Button onclick={handleRedeemPoints} disabled={isRedeeming || redeemAmount <= 0}>
				{#if isRedeeming}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Redeem
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Receipt Dialog -->
<ReceiptDialog
	open={showReceiptDialog}
	paymentId={currentPaymentId}
	change={currentPaymentChange}
	onClose={handleReceiptClose}
	{region}
/>

<PosTour businessId={(data.business as any)?.id} hasTables={data.supportsTable} />
