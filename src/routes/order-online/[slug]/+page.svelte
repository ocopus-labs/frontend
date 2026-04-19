<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import StoreIcon from '@lucide/svelte/icons/store';
	import LeafIcon from '@lucide/svelte/icons/leaf';
	import XIcon from '@lucide/svelte/icons/x';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import NotepadTextIcon from '@lucide/svelte/icons/notepad-text';
	import PackageIcon from '@lucide/svelte/icons/package';
	import TruckIcon from '@lucide/svelte/icons/truck';
	import type { OnlineBusinessConfig, OnlineMenuCategory } from '$lib/api';

	let { data }: { data: PageData } = $props();

	const config = $derived(data.config as OnlineBusinessConfig);
	const business = $derived(config.business);
	const onlineOrdering = $derived(config.onlineOrdering);
	const categories = $derived(data.categories as OnlineMenuCategory[]);
	const slug = $derived(page.params.slug ?? '');
	const currency = $derived(business.currency || 'INR');

	// ── Types ──
	interface CartModifiers {
		size?: { id: string; name: string; price: number };
		spiceLevel?: { id: string; name: string; price: number };
		addOns?: Array<{ id: string; name: string; price: number }>;
		specialInstructions?: string;
	}

	interface CartItem {
		cartId: string;
		menuItemId: string;
		name: string;
		image?: string;
		quantity: number;
		basePrice: number;
		modifiers?: CartModifiers;
		unitPrice: number;
	}

	// ── Order type ──
	let orderType = $state<'takeaway' | 'delivery'>(
		onlineOrdering.acceptsTakeaway ? 'takeaway' : 'delivery'
	);

	// ── Cart state ──
	let cart = $state<CartItem[]>([]);
	let searchQuery = $state('');

	// Load cart from sessionStorage
	$effect(() => {
		if (typeof window !== 'undefined') {
			const key = `online-cart:${slug}`;
			const saved = sessionStorage.getItem(key);
			if (saved) {
				try {
					cart = JSON.parse(saved);
				} catch {
					/* ignore */
				}
			}
			// Restore order type
			const savedType = sessionStorage.getItem(`online-order-type:${slug}`);
			if (savedType === 'takeaway' || savedType === 'delivery') {
				orderType = savedType;
			}
		}
	});

	// Save cart to sessionStorage
	$effect(() => {
		if (typeof window !== 'undefined' && slug) {
			const key = `online-cart:${slug}`;
			sessionStorage.setItem(key, JSON.stringify(cart));
		}
	});

	// Save config + order type for checkout page
	$effect(() => {
		if (typeof window !== 'undefined' && slug) {
			sessionStorage.setItem(`online-config:${slug}`, JSON.stringify(config));
			sessionStorage.setItem(`online-order-type:${slug}`, orderType);
		}
	});

	// ── Category & search ──
	let activeCategory = $state<string | null>(null);

	const filteredCategories = $derived(() => {
		let cats = activeCategory
			? categories.filter((c) => c.id === activeCategory)
			: categories;

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			cats = cats
				.map((cat) => ({
					...cat,
					items: cat.items.filter(
						(item) =>
							item.name.toLowerCase().includes(q) ||
							(item.description && item.description.toLowerCase().includes(q))
					)
				}))
				.filter((cat) => cat.items.length > 0);
		}

		return cats;
	});

	const cartTotal = $derived(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
	const cartItemCount = $derived(cart.reduce((sum, item) => sum + item.quantity, 0));

	function formatPrice(amount: number) {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency,
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount);
	}

	// ── Modifier drawer state ──
	let modDrawerOpen = $state(false);
	let selectedMenuItem = $state<any>(null);
	let modQty = $state(1);
	let modSize = $state<{ id: string; name: string; price: number } | null>(null);
	let modSpice = $state<{ id: string; name: string; price: number } | null>(null);
	let modAddOns = $state<Array<{ id: string; name: string; price: number }>>([]);
	let modInstructions = $state('');

	function itemHasModifiers(item: any): boolean {
		if (!item.modifiers) return false;
		const m = item.modifiers;
		return (
			(m.sizes && m.sizes.length > 0) ||
			(m.spiceLevels && m.spiceLevels.length > 0) ||
			(m.addOns && m.addOns.length > 0)
		);
	}

	function openModifierDrawer(item: any) {
		selectedMenuItem = item;
		modQty = 1;
		modSize =
			item.modifiers?.sizes?.find((s: any) => s.isDefault) || item.modifiers?.sizes?.[0] || null;
		modSpice =
			item.modifiers?.spiceLevels?.find((s: any) => s.isDefault) ||
			item.modifiers?.spiceLevels?.[0] ||
			null;
		modAddOns = [];
		modInstructions = '';
		modDrawerOpen = true;
	}

	const modUnitPrice = $derived(() => {
		if (!selectedMenuItem) return 0;
		let price = selectedMenuItem.price;
		if (modSize) price += modSize.price;
		if (modSpice) price += modSpice.price;
		for (const ao of modAddOns) price += ao.price;
		return price;
	});

	function confirmModItem() {
		if (!selectedMenuItem) return;
		const mods: CartModifiers = {};
		if (modSize) mods.size = modSize;
		if (modSpice) mods.spiceLevel = modSpice;
		if (modAddOns.length > 0) mods.addOns = [...modAddOns];
		if (modInstructions.trim()) mods.specialInstructions = modInstructions.trim();

		const newItem: CartItem = {
			cartId: crypto.randomUUID(),
			menuItemId: selectedMenuItem.id,
			name: selectedMenuItem.name,
			image: selectedMenuItem.image,
			quantity: modQty,
			basePrice: selectedMenuItem.price,
			modifiers: Object.keys(mods).length > 0 ? mods : undefined,
			unitPrice: modUnitPrice()
		};

		cart = [...cart, newItem];
		modDrawerOpen = false;
	}

	function toggleAddOn(addOn: { id: string; name: string; price: number }) {
		const idx = modAddOns.findIndex((a) => a.id === addOn.id);
		if (idx >= 0) {
			modAddOns = modAddOns.filter((a) => a.id !== addOn.id);
		} else {
			modAddOns = [...modAddOns, addOn];
		}
	}

	// ── Quick add (no modifiers) ──
	function quickAdd(item: any) {
		const existing = cart.find((c) => c.menuItemId === item.id && !c.modifiers);
		if (existing) {
			existing.quantity += 1;
			cart = [...cart];
		} else {
			cart = [
				...cart,
				{
					cartId: crypto.randomUUID(),
					menuItemId: item.id,
					name: item.name,
					image: item.image,
					quantity: 1,
					basePrice: item.price,
					unitPrice: item.price
				}
			];
		}
	}

	function handleAddItem(item: any) {
		if (itemHasModifiers(item)) {
			openModifierDrawer(item);
		} else {
			quickAdd(item);
		}
	}

	// ── Cart operations ──
	function updateCartQuantity(cartId: string, delta: number) {
		const idx = cart.findIndex((c) => c.cartId === cartId);
		if (idx === -1) return;
		const newQty = cart[idx].quantity + delta;
		if (newQty <= 0) {
			cart = cart.filter((c) => c.cartId !== cartId);
		} else {
			cart[idx].quantity = newQty;
			cart = [...cart];
		}
	}

	function removeCartItem(cartId: string) {
		cart = cart.filter((c) => c.cartId !== cartId);
	}

	function getItemCartCount(menuItemId: string): number {
		return cart.filter((c) => c.menuItemId === menuItemId).reduce((sum, c) => sum + c.quantity, 0);
	}

	// ── Navigation ──
	function goToCheckout() {
		goto(`${slug}/checkout`);
	}

	let showCart = $state(false);
	let showSearch = $state(false);

	// Minimum order check
	const meetsMinOrder = $derived(
		onlineOrdering.minOrderAmount <= 0 || cartTotal >= onlineOrdering.minOrderAmount
	);
</script>

<div class="flex min-h-svh flex-col bg-gray-50 pb-24 dark:bg-background">
	<!-- Header -->
	<header
		class="sticky top-0 z-30 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-background/95"
	>
		<div class="flex items-center gap-3 px-4 py-3">
			{#if business.logo}
				<img
					src={business.logo}
					alt={business.name}
					class="h-11 w-11 rounded-xl object-cover shadow-sm"
				/>
			{:else}
				<div
					class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5"
				>
					<StoreIcon class="h-5 w-5 text-primary" />
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				<h1 class="truncate text-base font-bold">{business.name}</h1>
				{#if business.description}
					<p class="truncate text-xs text-muted-foreground">{business.description}</p>
				{/if}
			</div>
			<button
				class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-muted"
				onclick={() => (showSearch = !showSearch)}
				aria-label="Search menu"
			>
				<SearchIcon class="h-4 w-4" />
			</button>
		</div>

		<!-- Order Type Toggle -->
		{#if onlineOrdering.acceptsTakeaway && onlineOrdering.acceptsDelivery}
			<div class="flex gap-2 px-4 py-2">
				<button
					class="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-all {orderType === 'takeaway'
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-muted dark:text-muted-foreground'}"
					onclick={() => (orderType = 'takeaway')}
				>
					<PackageIcon class="h-4 w-4" />
					Takeaway
				</button>
				<button
					class="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-all {orderType === 'delivery'
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-muted dark:text-muted-foreground'}"
					onclick={() => (orderType = 'delivery')}
				>
					<TruckIcon class="h-4 w-4" />
					Delivery
				</button>
			</div>
		{:else}
			<div class="flex items-center gap-1.5 px-4 pb-2">
				{#if onlineOrdering.acceptsTakeaway}
					<span class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
						<PackageIcon class="h-3 w-3" />
						Takeaway Only
					</span>
				{:else}
					<span class="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
						<TruckIcon class="h-3 w-3" />
						Delivery Only
					</span>
				{/if}
				{#if onlineOrdering.estimatedPrepTime}
					<span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
						<ClockIcon class="h-3 w-3" />
						~{onlineOrdering.estimatedPrepTime} min
					</span>
				{/if}
			</div>
		{/if}

		<!-- Search Bar (collapsible) -->
		{#if showSearch}
			<div class="border-t px-4 py-2">
				<div class="relative">
					<SearchIcon
						class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search for items..."
						class="h-9 w-full rounded-lg border bg-gray-50 pl-9 pr-8 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-muted"
					/>
					{#if searchQuery}
						<button
							class="absolute right-2 top-1/2 -translate-y-1/2"
							onclick={() => (searchQuery = '')}
						>
							<XIcon class="h-4 w-4 text-muted-foreground" />
						</button>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Category Pills -->
		{#if categories.length > 1}
			<div class="no-scrollbar overflow-x-auto px-4 py-2">
				<div class="flex gap-2">
					<button
						class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all {!activeCategory
							? 'bg-primary text-primary-foreground shadow-sm'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-muted dark:text-muted-foreground'}"
						onclick={() => (activeCategory = null)}
					>
						All
					</button>
					{#each categories as cat}
						<button
							class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all {activeCategory ===
							cat.id
								? 'bg-primary text-primary-foreground shadow-sm'
								: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-muted dark:text-muted-foreground'}"
							onclick={() => (activeCategory = cat.id)}
						>
							{cat.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</header>

	<!-- Menu Items -->
	<div class="flex-1 space-y-5 px-4 py-4">
		{#each filteredCategories() as category}
			<section>
				<div class="mb-3 flex items-center gap-2">
					<h2 class="text-base font-bold text-gray-900 dark:text-foreground">{category.name}</h2>
					<span class="text-xs text-muted-foreground">({category.items.length})</span>
				</div>
				{#if category.description}
					<p class="mb-3 text-xs text-muted-foreground">{category.description}</p>
				{/if}

				<div class="space-y-3">
					{#each category.items as item}
						{@const count = getItemCartCount(item.id)}
						{@const hasModifiers = itemHasModifiers(item)}
						<div
							class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-border dark:bg-card"
						>
							<div class="flex">
								<!-- Item Info -->
								<div class="flex min-w-0 flex-1 flex-col justify-between p-3.5">
									<div>
										<!-- Veg / Non-Veg / Dietary badges -->
										<div class="mb-1.5 flex items-center gap-2">
											{#if item.isVeg}
												<span
													class="inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 border-green-600"
												>
													<span class="h-2 w-2 rounded-full bg-green-600"></span>
												</span>
											{:else if item.isVeg === false}
												<span
													class="inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 border-red-600"
												>
													<span
														class="h-0 w-0 border-x-[4px] border-b-[8px] border-x-transparent border-b-red-600"
													></span>
												</span>
											{/if}
											{#if item.tags?.includes('vegan')}
												<span
													class="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
												>
													<LeafIcon class="h-2.5 w-2.5" />
													Vegan
												</span>
											{/if}
											{#if item.tags?.includes('gluten-free')}
												<span
													class="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
												>
													GF
												</span>
											{/if}
										</div>

										<h3 class="text-sm font-semibold leading-tight text-gray-900 dark:text-foreground">
											{item.name}
										</h3>
										{#if item.description}
											<p class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-muted-foreground">
												{item.description}
											</p>
										{/if}

										<!-- Modifiers hint -->
										<div class="mt-1.5 flex flex-wrap items-center gap-2">
											{#if hasModifiers}
												<span
													class="inline-flex items-center gap-0.5 text-[10px] text-gray-400"
												>
													<SparklesIcon class="h-3 w-3" />
													Customisable
												</span>
											{/if}
										</div>
									</div>

									<!-- Price + Add Button -->
									<div class="mt-2.5 flex items-center justify-between">
										<span class="text-sm font-bold text-gray-900 dark:text-foreground">
											{formatPrice(item.price)}
										</span>
										{#if count > 0 && !hasModifiers}
											<div
												class="flex items-center overflow-hidden rounded-lg border-2 border-primary bg-white shadow-sm dark:bg-card"
											>
												<button
													class="flex h-8 w-8 items-center justify-center text-primary transition-colors hover:bg-primary/10"
													onclick={() => {
														const ci = cart.find(
															(c) => c.menuItemId === item.id && !c.modifiers
														);
														if (ci) updateCartQuantity(ci.cartId, -1);
													}}
												>
													<MinusIcon class="h-3.5 w-3.5" />
												</button>
												<span class="w-8 text-center text-sm font-bold text-primary">
													{count}
												</span>
												<button
													class="flex h-8 w-8 items-center justify-center text-primary transition-colors hover:bg-primary/10"
													onclick={() => handleAddItem(item)}
												>
													<PlusIcon class="h-3.5 w-3.5" />
												</button>
											</div>
										{:else}
											<button
												class="relative flex h-8 items-center gap-1 rounded-lg border-2 border-primary bg-white px-4 text-sm font-bold text-primary shadow-sm transition-all hover:bg-primary/5 active:scale-95 dark:bg-card"
												onclick={() => handleAddItem(item)}
											>
												ADD
												<PlusIcon class="h-3.5 w-3.5" />
												{#if count > 0}
													<span
														class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
													>
														{count}
													</span>
												{/if}
											</button>
										{/if}
									</div>
								</div>

								<!-- Item Image -->
								{#if item.image}
									<div class="relative m-3 ml-0 h-28 w-28 shrink-0 overflow-hidden rounded-xl">
										<img
											src={item.image}
											alt={item.name}
											class="h-full w-full object-cover"
											loading="lazy"
										/>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/each}

		{#if categories.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div
					class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-muted"
				>
					<StoreIcon class="h-8 w-8 text-gray-400" />
				</div>
				<h2 class="text-lg font-semibold text-gray-600 dark:text-muted-foreground">
					No menu available
				</h2>
				<p class="mt-1 text-sm text-gray-400">
					This business hasn't published their menu yet.
				</p>
			</div>
		{:else if filteredCategories().length === 0 && searchQuery}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<SearchIcon class="mb-3 h-10 w-10 text-gray-300" />
				<p class="text-sm text-gray-500">No items found for "{searchQuery}"</p>
			</div>
		{/if}
	</div>

	<!-- Modifier Bottom Drawer -->
	<Drawer.Root bind:open={modDrawerOpen}>
		<Drawer.Content class="max-h-[85vh]">
			{#if selectedMenuItem}
				<div class="overflow-y-auto px-4 pb-4">
					<!-- Item header -->
					<div class="flex gap-3 py-4">
						{#if selectedMenuItem.image}
							<img
								src={selectedMenuItem.image}
								alt={selectedMenuItem.name}
								class="h-20 w-20 shrink-0 rounded-xl object-cover"
							/>
						{/if}
						<div class="min-w-0 flex-1">
							<div class="mb-1 flex items-center gap-2">
								{#if selectedMenuItem.isVeg}
									<span
										class="inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 border-green-600"
									>
										<span class="h-2 w-2 rounded-full bg-green-600"></span>
									</span>
								{:else if selectedMenuItem.isVeg === false}
									<span
										class="inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 border-red-600"
									>
										<span
											class="h-0 w-0 border-x-[4px] border-b-[8px] border-x-transparent border-b-red-600"
										></span>
									</span>
								{/if}
							</div>
							<h3 class="text-lg font-bold">{selectedMenuItem.name}</h3>
							<p class="text-sm font-semibold text-primary">{formatPrice(selectedMenuItem.price)}</p>
							{#if selectedMenuItem.description}
								<p class="mt-0.5 text-xs text-muted-foreground">{selectedMenuItem.description}</p>
							{/if}
						</div>
					</div>

					<div class="space-y-5">
						<!-- Size selector -->
						{#if selectedMenuItem.modifiers?.sizes?.length > 0}
							<div>
								<div class="mb-2 flex items-center justify-between">
									<h4 class="text-sm font-bold">Size</h4>
									<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-muted dark:text-muted-foreground">
										Required
									</span>
								</div>
								<div class="flex flex-wrap gap-2">
									{#each selectedMenuItem.modifiers.sizes as size}
										{@const selected = modSize?.id === size.id}
										<button
											class="rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all {selected
												? 'border-primary bg-primary/5 text-primary'
												: 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-border dark:text-foreground'}"
											onclick={() => (modSize = size)}
										>
											<span>{size.name}</span>
											{#if size.price > 0}
												<span class="ml-1 text-xs opacity-70">+{formatPrice(size.price)}</span>
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Spice Level selector -->
						{#if selectedMenuItem.modifiers?.spiceLevels?.length > 0}
							<div>
								<div class="mb-2 flex items-center justify-between">
									<h4 class="text-sm font-bold">Spice Level</h4>
									<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-muted dark:text-muted-foreground">
										Required
									</span>
								</div>
								<div class="flex flex-wrap gap-2">
									{#each selectedMenuItem.modifiers.spiceLevels as spice}
										{@const selected = modSpice?.id === spice.id}
										<button
											class="rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all {selected
												? 'border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-400 dark:bg-orange-900/20 dark:text-orange-300'
												: 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-border dark:text-foreground'}"
											onclick={() => (modSpice = spice)}
										>
											<span>{spice.name}</span>
											{#if spice.price > 0}
												<span class="ml-1 text-xs opacity-70">+{formatPrice(spice.price)}</span>
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Add-ons -->
						{#if selectedMenuItem.modifiers?.addOns?.length > 0}
							<div>
								<div class="mb-2 flex items-center justify-between">
									<h4 class="text-sm font-bold">Add-ons</h4>
									<span class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-muted dark:text-muted-foreground">
										Optional
									</span>
								</div>
								<div class="space-y-1">
									{#each selectedMenuItem.modifiers.addOns as addOn}
										{@const checked = modAddOns.some((a) => a.id === addOn.id)}
										<button
											class="flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition-all {checked
												? 'border-primary bg-primary/5'
												: 'border-gray-100 hover:border-gray-200 dark:border-border'}"
											onclick={() => toggleAddOn(addOn)}
										>
											<div class="flex items-center gap-3">
												<div
													class="flex h-5 w-5 items-center justify-center rounded-md border-2 {checked
														? 'border-primary bg-primary'
														: 'border-gray-300 dark:border-muted-foreground'}"
												>
													{#if checked}
														<svg
															class="h-3 w-3 text-primary-foreground"
															viewBox="0 0 12 12"
															fill="none"
														>
															<path
																d="M2 6L5 9L10 3"
																stroke="currentColor"
																stroke-width="2"
																stroke-linecap="round"
																stroke-linejoin="round"
															/>
														</svg>
													{/if}
												</div>
												<span class="text-sm font-medium">{addOn.name}</span>
											</div>
											<span class="text-sm font-semibold text-primary">
												+{formatPrice(addOn.price)}
											</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Special Instructions -->
						<div>
							<div class="mb-2 flex items-center gap-1.5">
								<NotepadTextIcon class="h-3.5 w-3.5 text-muted-foreground" />
								<h4 class="text-sm font-bold">Special Instructions</h4>
							</div>
							<textarea
								bind:value={modInstructions}
								placeholder="E.g. less oil, extra spicy, no onion..."
								rows="2"
								class="w-full resize-none rounded-xl border-2 border-gray-100 bg-gray-50 p-3 text-sm outline-none transition-colors focus:border-primary focus:bg-white dark:border-border dark:bg-muted dark:focus:bg-background"
							></textarea>
						</div>
					</div>
				</div>

				<!-- Sticky footer -->
				<div class="sticky bottom-0 border-t bg-white px-4 py-3 dark:bg-background">
					<!-- Quantity selector -->
					<div class="mb-3 flex items-center justify-center gap-4">
						<button
							class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-200 transition-colors hover:border-gray-300 disabled:opacity-40 dark:border-border"
							onclick={() => (modQty = Math.max(1, modQty - 1))}
							disabled={modQty <= 1}
						>
							<MinusIcon class="h-4 w-4" />
						</button>
						<span class="w-8 text-center text-lg font-bold">{modQty}</span>
						<button
							class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-200 transition-colors hover:border-gray-300 dark:border-border"
							onclick={() => (modQty += 1)}
						>
							<PlusIcon class="h-4 w-4" />
						</button>
					</div>

					<button
						class="flex w-full items-center justify-between rounded-xl bg-primary px-5 py-3.5 text-primary-foreground shadow-lg transition-all active:scale-[0.98]"
						onclick={confirmModItem}
					>
						<span class="font-semibold">Add to cart</span>
						<span class="font-bold">{formatPrice(modUnitPrice() * modQty)}</span>
					</button>
				</div>
			{/if}
		</Drawer.Content>
	</Drawer.Root>

	<!-- Cart Drawer -->
	<Drawer.Root bind:open={showCart}>
		<Drawer.Content class="max-h-[80vh]">
			<Drawer.Header>
				<Drawer.Title class="text-base font-bold">Your Cart</Drawer.Title>
			</Drawer.Header>
			<div class="flex-1 overflow-y-auto px-4 pb-2">
				{#if cart.length === 0}
					<div class="py-8 text-center">
						<ShoppingCartIcon class="mx-auto mb-2 h-10 w-10 text-gray-300" />
						<p class="text-sm text-muted-foreground">Your cart is empty</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each cart as item (item.cartId)}
							<div class="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-border dark:bg-muted/30">
								<div class="flex items-start gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex items-start justify-between gap-2">
											<h4 class="text-sm font-semibold leading-tight">{item.name}</h4>
											<button
												class="shrink-0 text-gray-400 hover:text-destructive"
												onclick={() => removeCartItem(item.cartId)}
												aria-label="Remove item"
											>
												<Trash2Icon class="h-3.5 w-3.5" />
											</button>
										</div>

										<!-- Modifier details -->
										{#if item.modifiers}
											<div class="mt-1 space-y-0.5">
												{#if item.modifiers.size}
													<p class="text-[11px] text-muted-foreground">
														Size: {item.modifiers.size.name}
														{#if item.modifiers.size.price > 0}
															<span class="text-primary">(+{formatPrice(item.modifiers.size.price)})</span>
														{/if}
													</p>
												{/if}
												{#if item.modifiers.spiceLevel}
													<p class="text-[11px] text-muted-foreground">
														Spice: {item.modifiers.spiceLevel.name}
													</p>
												{/if}
												{#if item.modifiers.addOns?.length}
													<p class="text-[11px] text-muted-foreground">
														Add-ons: {item.modifiers.addOns.map((a) => a.name).join(', ')}
													</p>
												{/if}
												{#if item.modifiers.specialInstructions}
													<p class="text-[11px] italic text-muted-foreground">
														"{item.modifiers.specialInstructions}"
													</p>
												{/if}
											</div>
										{/if}

										<!-- Quantity & price -->
										<div class="mt-2 flex items-center justify-between">
											<div
												class="flex items-center overflow-hidden rounded-lg border border-gray-200 dark:border-border"
											>
												<button
													class="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-muted"
													onclick={() => updateCartQuantity(item.cartId, -1)}
												>
													<MinusIcon class="h-3 w-3" />
												</button>
												<span class="w-7 text-center text-xs font-bold">{item.quantity}</span>
												<button
													class="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-muted"
													onclick={() => updateCartQuantity(item.cartId, 1)}
												>
													<PlusIcon class="h-3 w-3" />
												</button>
											</div>
											<span class="text-sm font-bold">
												{formatPrice(item.unitPrice * item.quantity)}
											</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			{#if cart.length > 0}
				<Drawer.Footer class="border-t">
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Subtotal ({cartItemCount} items)</span>
						<span class="text-base font-bold">{formatPrice(cartTotal)}</span>
					</div>
					{#if onlineOrdering.minOrderAmount > 0 && !meetsMinOrder}
						<p class="mb-2 text-xs text-destructive">
							Minimum order: {formatPrice(onlineOrdering.minOrderAmount)}. Add {formatPrice(onlineOrdering.minOrderAmount - cartTotal)} more.
						</p>
					{/if}
					<p class="mb-3 text-[11px] text-muted-foreground">Taxes calculated at checkout</p>
					<button
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
						onclick={goToCheckout}
						disabled={!meetsMinOrder}
					>
						Proceed to Checkout
						<ChevronRightIcon class="h-4 w-4" />
					</button>
				</Drawer.Footer>
			{/if}
		</Drawer.Content>
	</Drawer.Root>

	<!-- Sticky Bottom Cart Bar -->
	{#if cart.length > 0 && !showCart && !modDrawerOpen}
		<div class="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2">
			<button
				class="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-xl transition-all active:scale-[0.98]"
				onclick={() => (showCart = true)}
			>
				<div class="flex items-center gap-3">
					<div class="relative">
						<ShoppingCartIcon class="h-5 w-5" />
						<span
							class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-primary"
						>
							{cartItemCount}
						</span>
					</div>
					<span class="font-medium">
						{cartItemCount} item{cartItemCount > 1 ? 's' : ''}
					</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-lg font-bold">{formatPrice(cartTotal)}</span>
					<ChevronRightIcon class="h-4 w-4" />
				</div>
			</button>
		</div>
	{/if}
</div>

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
