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
		type MenuItem,
		type OrderItemType,
		type Category
	} from '$lib/components/pos';

	// Sample menu data - In real app, this would come from API
	const categories: Category[] = [
		{ name: 'Dish Menu', count: 43 },
		{ name: 'Main Course', count: 18, active: true },
		{ name: 'Beverages', count: 11 },
		{ name: 'Dessert', count: 9 },
		{ name: 'Appetizer', count: 6 }
	];

	const menuItems: MenuItem[] = [
		{
			id: 1,
			name: 'Butter Chicken',
			price: 12.84,
			image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',
			available: true,
			modifiers: {
				sizes: [
					{ name: 'Regular', price: 0 },
					{ name: 'Large', price: 3.0 }
				],
				spiceLevels: [
					{ name: 'Mild', price: 0 },
					{ name: 'Medium', price: 0 },
					{ name: 'Spicy', price: 0 },
					{ name: 'Extra Spicy', price: 1.0 }
				],
				addOns: [
					{ name: 'Extra Naan', price: 2.0 },
					{ name: 'Raita', price: 1.5 }
				],
				removals: ['Onions', 'Tomatoes']
			}
		},
		{
			id: 2,
			name: 'French Fries',
			price: 7.5,
			image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
			available: true,
			modifiers: {
				sizes: [
					{ name: 'Small', price: 0 },
					{ name: 'Medium', price: 1.5 },
					{ name: 'Large', price: 3.0 }
				],
				addOns: [
					{ name: 'Cheese', price: 1.5 },
					{ name: 'Bacon', price: 2.0 }
				]
			}
		},
		{
			id: 3,
			name: 'Roast Beef',
			price: 29.0,
			image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400',
			available: true,
			modifiers: {
				sizes: [
					{ name: '6oz', price: 0 },
					{ name: '8oz', price: 5.0 },
					{ name: '12oz', price: 10.0 }
				],
				preparation: ['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done'],
				addOns: [
					{ name: 'Garlic Butter', price: 2.0 },
					{ name: 'Bearnaise Sauce', price: 3.0 }
				]
			}
		},
		{
			id: 4,
			name: 'Sauerkraut',
			price: 11.55,
			image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
			available: true
		},
		{
			id: 5,
			name: 'Beef Kebab',
			price: 14.95,
			image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400',
			available: false,
			modifiers: {
				spiceLevels: [
					{ name: 'Mild', price: 0 },
					{ name: 'Medium', price: 0 },
					{ name: 'Spicy', price: 0 }
				],
				addOns: [{ name: 'Extra Yogurt', price: 1.0 }]
			}
		},
		{
			id: 6,
			name: 'Fish and Chips',
			price: 23.05,
			image: 'https://images.unsplash.com/photo-1579208570378-8c970854bc23?w=400',
			available: true,
			modifiers: {
				sizes: [
					{ name: 'Regular', price: 0 },
					{ name: 'Large', price: 4.0 }
				],
				addOns: [{ name: 'Extra Tartar Sauce', price: 0.5 }]
			}
		},
		{
			id: 7,
			name: 'Wagyu Steak',
			price: 31.17,
			image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400',
			available: true,
			modifiers: {
				sizes: [
					{ name: '6oz', price: 0 },
					{ name: '8oz', price: 8.0 },
					{ name: '12oz', price: 15.0 }
				],
				preparation: ['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done'],
				addOns: [
					{ name: 'Truffle Oil', price: 5.0 },
					{ name: 'Compound Butter', price: 3.0 }
				]
			}
		},
		{
			id: 8,
			name: 'Chicken Ramen',
			price: 17.7,
			image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
			available: true,
			modifiers: {
				sizes: [
					{ name: 'Regular', price: 0 },
					{ name: 'Large', price: 3.0 }
				],
				spiceLevels: [
					{ name: 'Mild', price: 0 },
					{ name: 'Medium', price: 0 },
					{ name: 'Spicy', price: 1.0 }
				],
				addOns: [
					{ name: 'Extra Egg', price: 2.0 },
					{ name: 'Extra Noodles', price: 1.5 }
				],
				removals: ['Green Onions', 'Corn']
			}
		},
		{
			id: 9,
			name: 'Pasta Bolognese',
			price: 23.5,
			image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
			available: true,
			modifiers: {
				sizes: [
					{ name: 'Regular', price: 0 },
					{ name: 'Large', price: 4.0 }
				],
				addOns: [
					{ name: 'Extra Parmesan', price: 1.0 },
					{ name: 'Meatballs', price: 3.0 }
				]
			}
		},
		{
			id: 10,
			name: 'Vegetable Salad',
			price: 15.41,
			image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
			available: true,
			modifiers: {
				sizes: [
					{ name: 'Small', price: 0 },
					{ name: 'Large', price: 3.0 }
				],
				addOns: [
					{ name: 'Grilled Chicken', price: 4.0 },
					{ name: 'Feta Cheese', price: 2.0 }
				],
				removals: ['Tomatoes', 'Cucumbers', 'Olives']
			}
		},
		{
			id: 11,
			name: 'Grilled Skewers',
			price: 17.25,
			image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
			available: false,
			modifiers: {
				spiceLevels: [
					{ name: 'Mild', price: 0 },
					{ name: 'Medium', price: 0 },
					{ name: 'Spicy', price: 0 }
				]
			}
		},
		{
			id: 12,
			name: 'Fried Rice',
			price: 19.5,
			image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
			available: true,
			modifiers: {
				sizes: [
					{ name: 'Regular', price: 0 },
					{ name: 'Large', price: 3.0 }
				],
				addOns: [
					{ name: 'Egg', price: 1.0 },
					{ name: 'Chicken', price: 3.0 }
				]
			}
		}
	];

	// State variables
	let selectedCategory = $state('Main Course');
	let searchQuery = $state('');
	let orderType = $state('Dine-In');
	let selectedTable = $state(1);
	let showOrderSummary = $state(false); // For mobile toggle

	// Customization dialog state
	let showCustomizationDialog = $state(false);
	let selectedItem = $state<MenuItem | null>(null);
	let customizationQuantity = $state(1);
	let selectedSize = $state('');
	let selectedSpiceLevel = $state('');
	let selectedPreparation = $state<string[]>([]);
	let selectedAddOns = $state<string[]>([]);
	let selectedRemovals = $state<string[]>([]);
	let specialInstructions = $state('');

	// Optional fields
	let showTaxes = $state(true);
	let taxRate = $state(10); // percentage
	let showDiscount = $state(true);
	let discountType = $state<'percentage' | 'fixed'>('percentage');
	let discountValue = $state(10); // 10% or $10

	// Filter menu items by selected category
	const filteredMenuItems = $derived(
		menuItems.filter(
			(item) =>
				selectedCategory === 'Dish Menu' ||
				item.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	let orderItems = $state<OrderItemType[]>([
		{
			id: '1',
			name: 'French Fries',
			price: 7.5,
			quantity: 1,
			modifiers: { specialInstructions: 'None' }
		},
		{
			id: '2',
			name: 'Wagyu Steak',
			price: 31.17,
			quantity: 1,
			modifiers: { size: 'Small', specialInstructions: 'Well Done' }
		},
		{
			id: '3',
			name: 'Chicken Ramen',
			price: 17.7,
			quantity: 1,
			modifiers: { size: 'Medium', specialInstructions: 'Normal' }
		}
	]);

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

	function addToOrder(item: MenuItem) {
		selectedItem = item;
		// Reset customization state
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

		// Calculate total price with modifiers
		let totalPrice = selectedItem.price;

		// Add size price
		if (selectedSize && selectedItem.modifiers?.sizes) {
			const sizeOption = selectedItem.modifiers.sizes.find((s) => s.name === selectedSize);
			if (sizeOption) totalPrice += sizeOption.price;
		}

		// Add spice level price
		if (selectedSpiceLevel && selectedItem.modifiers?.spiceLevels) {
			const spiceOption = selectedItem.modifiers.spiceLevels.find(
				(s) => s.name === selectedSpiceLevel
			);
			if (spiceOption) totalPrice += spiceOption.price;
		}

		// Add add-ons prices
		if (selectedItem.modifiers?.addOns) {
			selectedAddOns.forEach((addOn) => {
				const addOnOption = selectedItem?.modifiers!.addOns!.find((a) => a.name === addOn);
				if (addOnOption) totalPrice += addOnOption.price;
			});
		}

		const newOrderItem: OrderItemType = {
			id: Date.now().toString(),
			name: selectedItem.name,
			price: totalPrice,
			quantity: customizationQuantity,
			modifiers: {
				size: selectedSize,
				spiceLevel: selectedSpiceLevel,
				preparation: selectedPreparation,
				addOns: selectedAddOns,
				removals: selectedRemovals,
				specialInstructions: specialInstructions
			}
		};

		orderItems.push(newOrderItem);
		showCustomizationDialog = false;
		selectedItem = null;
	}

	function removeFromOrder(id: string) {
		orderItems = orderItems.filter((item) => item.id !== id);
	}

	function updateQuantity(id: string, delta: number) {
		const item = orderItems.find((item) => item.id === id);
		if (item) {
			item.quantity = Math.max(1, item.quantity + delta);
		}
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
		orderType = type;
	}

	function toggleTaxes() {
		showTaxes = !showTaxes;
	}

	function toggleDiscount() {
		showDiscount = !showDiscount;
	}
</script>

<div class="flex h-screen overflow-hidden bg-background">
	<!-- Main Content Area -->
	<div class="flex flex-1 flex-col">
		<!-- Header -->
		<div class="w-full border-b border-border p-3 md:p-4">
			<div class="flex w-full justify-between gap-3">
				<div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
					<h1 class="text-xl font-bold md:text-2xl">POS System</h1>
					<div
						class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:text-sm"
					>
						<div class="flex items-center gap-1">
							<IconCalendar class="h-3 w-3 md:h-4 md:w-4" />
							<span class="hidden sm:inline">{new Date().toLocaleDateString()}</span>
							<span class="sm:hidden"
								>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span
							>
						</div>
						<div class="flex items-center gap-1">
							<IconClock class="h-3 w-3 md:h-4 md:w-4" />
							<span
								>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span
							>
						</div>
						<div class="flex items-center gap-1">
							<IconUser class="h-3 w-3 md:h-4 md:w-4" />
							<span class="hidden sm:inline">Staff Name</span>
							<span class="sm:hidden">Staff</span>
						</div>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" class="">
						<IconEdit class="mr-2 h-4 w-4" />
						Edit Menu
					</Button>
					<Button variant="outline" size="sm" class="">
						<IconRefresh class="mr-2 h-4 w-4" />
						<span class="hidden md:inline">Refresh</span>
					</Button>
					<!-- Mobile: Show icon buttons only -->
					<!-- <Button variant="outline" size="icon" class="md:hidden">
						<IconEdit class="h-4 w-4" />
					</Button>
					<Button variant="outline" size="icon" class="sm:hidden">
						<IconRefresh class="h-4 w-4" />
					</Button> -->
				</div>
			</div>
		</div>

		<div class="flex flex-1 flex-col overflow-hidden lg:flex-row">
			<!-- Menu Section -->
			<div class="flex flex-1 flex-col overflow-hidden lg:min-w-0">
				<!-- Category Tabs & Search -->
				<div class="border-b border-border p-2.5 md:p-4 lg:p-6">
					<div class="mb-2.5 md:mb-3 lg:mb-4">
						<MenuCategories
							{categories}
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
					<div
						class="grid grid-cols-1 gap-2.5 p-2.5 min-[400px]:grid-cols-2 sm:gap-3 sm:p-3 md:gap-4 md:p-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
					>
						{#each filteredMenuItems as item}
							<MenuItemCard {item} onAddToOrder={addToOrder} />
						{/each}
					</div>
				</div>
			</div>

			<!-- Order Summary Section - Desktop: Sidebar -->
			<div
				class="hidden lg:block lg:w-[380px] lg:shrink-0 lg:border-l lg:border-border xl:w-[420px]"
			>
				<OrderSummary
					{orderItems}
					{orderType}
					{selectedTable}
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
				/>
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
							{orderType}
							{selectedTable}
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
						/>
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	</div>
</div>

<!-- Item Customization Dialog -->
<ItemCustomizationDialog
	open={showCustomizationDialog}
	{selectedItem}
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
