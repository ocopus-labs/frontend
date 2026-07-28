# 🛠️ Frontend Implementation Guide - SvelteKit 5

**For Developers Building the POS Frontend**  
**Framework**: SvelteKit 5 with Svelte Runes  
**Last Updated**: November 10, 2025

---

## 📋 Table of Contents

1. [Project Setup](#project-setup)
2. [Architecture Overview](#architecture-overview)
3. [Component Library](#component-library)
4. [State Management](#state-management)
5. [API Integration](#api-integration)
6. [POS Implementation](#pos-implementation)
7. [Menu Management](#menu-management)
8. [Payment Flow](#payment-flow)
9. [Testing Strategy](#testing-strategy)
10. [Deployment](#deployment)

---

## 🚀 Project Setup

### Prerequisites

```bash
# Required
Node.js >= 20.0.0
npm >= 10.0.0 (or pnpm/bun)

# Recommended VS Code Extensions
- Svelte for VS Code
- Tailwind CSS IntelliSense
- ESLint
- Prettier
```

### Installation

```bash
# Clone and install
cd frontend
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create `.env` file:

```bash
# API Configuration
PUBLIC_API_URL=http://localhost:3000/api
PUBLIC_WS_URL=ws://localhost:3000

# Payment Gateway (Public Keys)
PUBLIC_STRIPE_KEY=pk_test_xxxxx
PUBLIC_DODO_PAYMENTS_KEY=dodo_test_xxxxx

# Feature Flags
PUBLIC_ENABLE_OFFLINE_MODE=true
PUBLIC_ENABLE_ANALYTICS=false
```

---

## 🏛️ Architecture Overview

### SvelteKit 5 Features Used

```typescript
// Runes (Reactive State)
let count = $state(0);
let doubled = $derived(count * 2);

$effect(() => {
  console.log(`Count is now ${count}`);
});

// Snippets (Reusable Templates)
{#snippet button(text, onClick)}
  <button onclick={onClick}>{text}</button>
{/snippet}

{@render button('Click me', () => count++)}

// Event Handlers (New Syntax)
<button onclick={() => count++}>Increment</button>
```

### File-Based Routing

```
src/routes/
├── +layout.svelte              # Root layout
├── +page.svelte                # Home page
│
├── (auth)/                     # Route group (no URL segment)
│   ├── +layout.svelte          # Auth layout (centered form)
│   ├── login/+page.svelte
│   ├── register/+page.svelte
│   └── forgot-password/+page.svelte
│
├── (protected)/                # Authenticated routes
│   ├── +layout.svelte          # Protected layout (sidebar)
│   ├── +layout.server.ts       # Auth check
│   │
│   └── [business]/             # Dynamic business ID
│       ├── +layout.svelte      # Business-specific layout
│       ├── +layout.server.ts   # Load business data
│       │
│       ├── dashboard/
│       │   └── +page.svelte
│       │
│       ├── pos/
│       │   ├── +page.svelte    # POS main screen
│       │   └── checkout/
│       │       └── +page.svelte
│       │
│       ├── menu/
│       │   ├── +page.svelte    # Menu list
│       │   ├── [itemId]/
│       │   │   └── +page.svelte # Edit item
│       │   └── new/
│       │       └── +page.svelte # Create item
│       │
│       └── settings/
│           ├── +page.svelte
│           ├── payments/+page.svelte
│           └── team/+page.svelte
│
└── (public)/                   # Public pages
    └── +page.svelte            # Landing page
```

---

## 🎨 Component Library

### Using shadcn-svelte

Already installed components (from `package.json`):

```bash
# UI Components
- bits-ui (headless components)
- shadcn-svelte components in src/lib/components/ui/

# Available Components:
- Button, Input, Card, Dialog, Dropdown
- Form, Checkbox, Radio, Select
- Table, Badge, Alert, Toast
- Accordion, Tabs, Drawer, Sheet
```

### Custom Components

#### 1. POS Components

```svelte
<!-- src/lib/components/pos/MenuItemCard.svelte -->
<script lang="ts">
	import type { MenuItem } from '$lib/types/menu';
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';

	interface Props {
		item: MenuItem;
		onSelect: (item: MenuItem) => void;
	}

	let { item, onSelect }: Props = $props();

	// Derived state
	let isAvailable = $derived(item.isAvailable);
	let hasDiscount = $derived(item.discount && item.discount > 0);
</script>

<Card.Root
	class="relative cursor-pointer transition hover:shadow-lg"
	class:opacity-50={!isAvailable}
	onclick={() => onSelect(item)}
>
	{#if item.image}
		<img src={item.image} alt={item.name} class="aspect-video w-full rounded-t-lg object-cover" />
	{/if}

	<Card.Header>
		<Card.Title class="flex items-center justify-between">
			{item.name}
			{#if hasDiscount}
				<Badge variant="destructive">-{item.discount}%</Badge>
			{/if}
		</Card.Title>
		<Card.Description>{item.description}</Card.Description>
	</Card.Header>

	<Card.Footer class="flex justify-between">
		<span class="text-lg font-bold">₹{item.price}</span>

		<div class="flex gap-1">
			{#if item.isVegetarian}
				<Badge variant="outline">🟢 Veg</Badge>
			{/if}
			{#if item.isVegan}
				<Badge variant="outline">🌱 Vegan</Badge>
			{/if}
		</div>
	</Card.Footer>

	{#if !isAvailable}
		<div class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
			<span class="font-bold text-white">Out of Stock</span>
		</div>
	{/if}
</Card.Root>
```

#### 2. Order Summary Component

```svelte
<!-- src/lib/components/pos/OrderSummary.svelte -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import type { OrderItem } from '$lib/types/order';

	interface Props {
		items: OrderItem[];
		onCheckout: () => void;
		onClear: () => void;
	}

	let { items, onCheckout, onClear }: Props = $props();

	// Calculated totals
	let subtotal = $derived(items.reduce((sum, item) => sum + item.price * item.quantity, 0));

	let tax = $derived(subtotal * 0.18); // 18% GST
	let total = $derived(subtotal + tax);

	let isEmpty = $derived(items.length === 0);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between p-4">
		<h2 class="text-lg font-bold">Current Order</h2>
		{#if !isEmpty}
			<Button variant="ghost" size="sm" onclick={onClear}>Clear All</Button>
		{/if}
	</div>

	<Separator />

	<!-- Items List -->
	<div class="flex-1 space-y-3 overflow-y-auto p-4">
		{#if isEmpty}
			<div class="flex h-full items-center justify-center text-muted-foreground">
				No items in order
			</div>
		{:else}
			{#each items as item (item.id)}
				<div class="flex items-start justify-between gap-2">
					<div class="flex-1">
						<p class="font-medium">{item.name}</p>
						{#if item.modifiers && item.modifiers.length > 0}
							<p class="text-sm text-muted-foreground">
								{item.modifiers.map((m) => m.name).join(', ')}
							</p>
						{/if}
					</div>

					<div class="text-right">
						<p class="font-medium">
							₹{(item.price * item.quantity).toFixed(2)}
						</p>
						<p class="text-sm text-muted-foreground">
							x{item.quantity}
						</p>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Totals -->
	<div class="space-y-2 border-t p-4">
		<div class="flex justify-between text-sm">
			<span>Subtotal</span>
			<span>₹{subtotal.toFixed(2)}</span>
		</div>

		<div class="flex justify-between text-sm">
			<span>GST (18%)</span>
			<span>₹{tax.toFixed(2)}</span>
		</div>

		<Separator />

		<div class="flex justify-between text-lg font-bold">
			<span>Total</span>
			<span>₹{total.toFixed(2)}</span>
		</div>

		<Button class="w-full" size="lg" disabled={isEmpty} onclick={onCheckout}>
			Proceed to Payment
		</Button>
	</div>
</div>
```

---

## 🗃️ State Management

### Using Svelte Stores

```typescript
// src/lib/stores/cart.svelte.ts

import type { OrderItem } from '$lib/types/order';

class CartStore {
	items = $state<OrderItem[]>([]);

	// Derived values
	get subtotal() {
		return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	}

	get tax() {
		return this.subtotal * 0.18;
	}

	get total() {
		return this.subtotal + this.tax;
	}

	get itemCount() {
		return this.items.reduce((sum, item) => sum + item.quantity, 0);
	}

	// Actions
	addItem(item: OrderItem) {
		const existing = this.items.find(
			(i) => i.id === item.id && JSON.stringify(i.modifiers) === JSON.stringify(item.modifiers)
		);

		if (existing) {
			existing.quantity++;
		} else {
			this.items = [...this.items, { ...item, quantity: 1 }];
		}
	}

	removeItem(itemId: string) {
		this.items = this.items.filter((i) => i.id !== itemId);
	}

	updateQuantity(itemId: string, quantity: number) {
		const item = this.items.find((i) => i.id === itemId);
		if (item) {
			if (quantity <= 0) {
				this.removeItem(itemId);
			} else {
				item.quantity = quantity;
			}
		}
	}

	clear() {
		this.items = [];
	}
}

export const cart = new CartStore();
```

### Usage in Components

```svelte
<script lang="ts">
	import { cart } from '$lib/stores/cart.svelte';

	// Reactive access
	let itemCount = $derived(cart.itemCount);
	let total = $derived(cart.total);
</script>

<div>
	<p>Items: {itemCount}</p>
	<p>Total: ₹{total.toFixed(2)}</p>

	<button onclick={() => cart.clear()}>Clear Cart</button>
</div>
```

### Business State Management

```typescript
// src/lib/stores/business.svelte.ts

import type { Business, Location } from '$lib/types/business';

class BusinessStore {
	current = $state<Business | null>(null);
	locations = $state<Location[]>([]);
	activeLocation = $state<Location | null>(null);

	setCurrentBusiness(business: Business) {
		this.current = business;
	}

	setLocations(locations: Location[]) {
		this.locations = locations;
		if (locations.length > 0 && !this.activeLocation) {
			this.activeLocation = locations[0];
		}
	}

	switchLocation(locationId: string) {
		const location = this.locations.find((l) => l.id === locationId);
		if (location) {
			this.activeLocation = location;
		}
	}
}

export const business = new BusinessStore();
```

---

## 🔌 API Integration

### API Client Setup

```typescript
// src/lib/api/client.ts

import { PUBLIC_API_URL } from '$env/static/public';

class ApiClient {
	private baseUrl = PUBLIC_API_URL;

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const token = localStorage.getItem('auth_token');

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` }),
				...options.headers
			}
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || 'Request failed');
		}

		return response.json();
	}

	get<T>(endpoint: string) {
		return this.request<T>(endpoint, { method: 'GET' });
	}

	post<T>(endpoint: string, data: unknown) {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: JSON.stringify(data)
		});
	}

	put<T>(endpoint: string, data: unknown) {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: JSON.stringify(data)
		});
	}

	delete<T>(endpoint: string) {
		return this.request<T>(endpoint, { method: 'DELETE' });
	}
}

export const api = new ApiClient();
```

### API Services

```typescript
// src/lib/api/menu.service.ts

import { api } from './client';
import type { MenuItem, MenuCategory } from '$lib/types/menu';

export const menuService = {
	async getMenu(businessId: string, locationId: string) {
		return api.get<{
			categories: MenuCategory[];
			items: MenuItem[];
		}>(`/businesses/${businessId}/locations/${locationId}/menu`);
	},

	async createItem(businessId: string, data: Partial<MenuItem>) {
		return api.post<MenuItem>(`/businesses/${businessId}/menu/items`, data);
	},

	async updateItem(businessId: string, itemId: string, data: Partial<MenuItem>) {
		return api.put<MenuItem>(`/businesses/${businessId}/menu/items/${itemId}`, data);
	},

	async deleteItem(businessId: string, itemId: string) {
		return api.delete(`/businesses/${businessId}/menu/items/${itemId}`);
	}
};
```

### Server Load Functions

```typescript
// src/routes/(protected)/[business]/menu/+page.server.ts

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		// locals.user from auth hook
		const businessId = params.business;

		// Fetch menu data server-side
		const menu = await fetch(`${process.env.API_URL}/businesses/${businessId}/menu`, {
			headers: {
				Authorization: `Bearer ${locals.session.token}`
			}
		}).then((res) => res.json());

		return {
			menu
		};
	} catch (err) {
		throw error(500, 'Failed to load menu');
	}
};
```

---

## 🏪 POS Implementation

### Main POS Page

```svelte
<!-- src/routes/(protected)/[business]/pos/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { cart } from '$lib/stores/cart.svelte';
	import MenuCategories from '$lib/components/pos/MenuCategories.svelte';
	import MenuItemCard from '$lib/components/pos/MenuItemCard.svelte';
	import OrderSummary from '$lib/components/pos/OrderSummary.svelte';
	import ItemCustomizationDialog from '$lib/components/pos/ItemCustomizationDialog.svelte';
	import type { MenuItem } from '$lib/types/menu';

	let { data } = $props();

	// State
	let selectedCategory = $state(data.menu.categories[0]?.id);
	let selectedItem = $state<MenuItem | null>(null);
	let showCustomization = $state(false);
	let searchQuery = $state('');

	// Filtered items
	let displayedItems = $derived.by(() => {
		let filtered = data.menu.items;

		if (selectedCategory) {
			filtered = filtered.filter((i) => i.categoryId === selectedCategory);
		}

		if (searchQuery) {
			filtered = filtered.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
		}

		return filtered;
	});

	function handleItemSelect(item: MenuItem) {
		if (item.modifiers && Object.keys(item.modifiers).length > 0) {
			selectedItem = item;
			showCustomization = true;
		} else {
			cart.addItem({
				id: item.id,
				name: item.name,
				price: item.price,
				quantity: 1
			});
		}
	}

	function handleCustomizationComplete(item: MenuItem, modifiers: any[]) {
		cart.addItem({
			id: item.id,
			name: item.name,
			price: item.price,
			quantity: 1,
			modifiers
		});
		showCustomization = false;
	}

	function handleCheckout() {
		// Navigate to checkout
		goto(`/${$page.params.business}/pos/checkout`);
	}
</script>

<div class="flex h-screen">
	<!-- Left: Menu Items (65%) -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Search Bar -->
		<div class="border-b p-4">
			<input
				type="text"
				placeholder="Search items..."
				bind:value={searchQuery}
				class="w-full rounded-lg border px-4 py-2"
			/>
		</div>

		<!-- Categories -->
		<MenuCategories
			categories={data.menu.categories}
			activeCategory={selectedCategory}
			onSelect={(id) => (selectedCategory = id)}
		/>

		<!-- Items Grid -->
		<div class="flex-1 overflow-y-auto p-4">
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
				{#each displayedItems as item (item.id)}
					<MenuItemCard {item} onSelect={handleItemSelect} />
				{/each}
			</div>
		</div>
	</div>

	<!-- Right: Order Summary (35%) -->
	<div class="w-96 border-l bg-muted/50">
		<OrderSummary items={cart.items} onCheckout={handleCheckout} onClear={() => cart.clear()} />
	</div>
</div>

<!-- Customization Dialog -->
{#if showCustomization && selectedItem}
	<ItemCustomizationDialog
		item={selectedItem}
		onConfirm={handleCustomizationComplete}
		onCancel={() => (showCustomization = false)}
	/>
{/if}
```

### Item Customization Dialog

```svelte
<!-- src/lib/components/pos/ItemCustomizationDialog.svelte -->
<script lang="ts">
	import { Dialog } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { RadioGroup, Radio } from '$lib/components/ui/radio-group';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { MenuItem, MenuItemModifier } from '$lib/types/menu';

	interface Props {
		item: MenuItem;
		onConfirm: (item: MenuItem, modifiers: any[]) => void;
		onCancel: () => void;
	}

	let { item, onConfirm, onCancel }: Props = $props();

	// Selected modifiers
	let selectedSize = $state<MenuItemModifier | null>(null);
	let selectedSpice = $state<MenuItemModifier | null>(null);
	let selectedAddOns = $state<MenuItemModifier[]>([]);
	let selectedRemovals = $state<string[]>([]);

	// Calculate price
	let totalPrice = $derived.by(() => {
		let price = item.price;
		if (selectedSize) price += selectedSize.price;
		if (selectedSpice) price += selectedSpice.price;
		selectedAddOns.forEach((addon) => (price += addon.price));
		return price;
	});

	function handleConfirm() {
		const modifiers = [selectedSize, selectedSpice, ...selectedAddOns].filter(Boolean);

		onConfirm(item, modifiers);
	}
</script>

<Dialog.Root open={true}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Customize {item.name}</Dialog.Title>
			<Dialog.Description>Select your preferences</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Size Selection -->
			{#if item.modifiers?.sizes}
				<div>
					<h3 class="mb-3 font-medium">Size</h3>
					<RadioGroup>
						{#each item.modifiers.sizes as size (size.id)}
							<div class="flex items-center justify-between">
								<label class="flex items-center gap-2">
									<Radio
										value={size.id}
										checked={selectedSize?.id === size.id}
										onchange={() => (selectedSize = size)}
									/>
									{size.name}
								</label>
								{#if size.price > 0}
									<span class="text-muted-foreground">
										+₹{size.price}
									</span>
								{/if}
							</div>
						{/each}
					</RadioGroup>
				</div>
			{/if}

			<!-- Spice Level -->
			{#if item.modifiers?.spiceLevels}
				<div>
					<h3 class="mb-3 font-medium">Spice Level</h3>
					<RadioGroup>
						{#each item.modifiers.spiceLevels as spice (spice.id)}
							<label class="flex items-center gap-2">
								<Radio
									value={spice.id}
									checked={selectedSpice?.id === spice.id}
									onchange={() => (selectedSpice = spice)}
								/>
								{spice.name}
							</label>
						{/each}
					</RadioGroup>
				</div>
			{/if}

			<!-- Add-ons -->
			{#if item.modifiers?.addOns}
				<div>
					<h3 class="mb-3 font-medium">Add-ons</h3>
					{#each item.modifiers.addOns as addon (addon.id)}
						<div class="flex items-center justify-between">
							<label class="flex items-center gap-2">
								<Checkbox
									checked={selectedAddOns.some((a) => a.id === addon.id)}
									onchange={(checked) => {
										if (checked) {
											selectedAddOns = [...selectedAddOns, addon];
										} else {
											selectedAddOns = selectedAddOns.filter((a) => a.id !== addon.id);
										}
									}}
								/>
								{addon.name}
							</label>
							<span class="text-muted-foreground">+₹{addon.price}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex justify-between">
			<Button variant="outline" onclick={onCancel}>Cancel</Button>
			<Button onclick={handleConfirm}>
				Add to Order · ₹{totalPrice.toFixed(2)}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
```

---

## 💳 Payment Flow

### Checkout Page

```svelte
<!-- src/routes/(protected)/[business]/pos/checkout/+page.svelte -->
<script lang="ts">
	import { cart } from '$lib/stores/cart.svelte';
	import { business } from '$lib/stores/business.svelte';
	import { paymentService } from '$lib/api/payment.service';
	import { Button } from '$lib/components/ui/button';
	import { RadioGroup, Radio } from '$lib/components/ui/radio-group';

	let paymentMethod = $state<'cash' | 'card' | 'upi'>('cash');
	let isProcessing = $state(false);
	let paymentStatus = $state<'idle' | 'processing' | 'success' | 'failed'>('idle');

	async function handlePayment() {
		isProcessing = true;
		paymentStatus = 'processing';

		try {
			const result = await paymentService.processPayment({
				businessId: business.current!.id,
				locationId: business.activeLocation!.id,
				amount: cart.total * 100, // Convert to paise
				currency: 'inr',
				method: paymentMethod,
				items: cart.items
			});

			if (result.status === 'COMPLETED') {
				paymentStatus = 'success';
				cart.clear();
				// Show receipt or redirect
			} else if (result.status === 'PENDING') {
				// Poll for status or wait for webhook
				await pollPaymentStatus(result.paymentIntentId);
			}
		} catch (error) {
			paymentStatus = 'failed';
			console.error('Payment failed:', error);
		} finally {
			isProcessing = false;
		}
	}

	async function pollPaymentStatus(paymentId: string) {
		const maxAttempts = 30;
		let attempts = 0;

		while (attempts < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, 2000));

			const status = await paymentService.getPaymentStatus(paymentId);

			if (status.status === 'COMPLETED') {
				paymentStatus = 'success';
				cart.clear();
				break;
			} else if (status.status === 'FAILED') {
				paymentStatus = 'failed';
				break;
			}

			attempts++;
		}
	}
</script>

<div class="container mx-auto max-w-2xl p-8">
	<h1 class="mb-8 text-3xl font-bold">Checkout</h1>

	<!-- Order Summary -->
	<div class="mb-8 rounded-lg border p-6">
		<h2 class="mb-4 font-bold">Order Summary</h2>
		{#each cart.items as item}
			<div class="mb-2 flex justify-between">
				<span>{item.name} x{item.quantity}</span>
				<span>₹{(item.price * item.quantity).toFixed(2)}</span>
			</div>
		{/each}
		<div class="mt-4 space-y-2 border-t pt-4">
			<div class="flex justify-between">
				<span>Subtotal</span>
				<span>₹{cart.subtotal.toFixed(2)}</span>
			</div>
			<div class="flex justify-between">
				<span>GST (18%)</span>
				<span>₹{cart.tax.toFixed(2)}</span>
			</div>
			<div class="flex justify-between text-xl font-bold">
				<span>Total</span>
				<span>₹{cart.total.toFixed(2)}</span>
			</div>
		</div>
	</div>

	<!-- Payment Method -->
	<div class="mb-8">
		<h2 class="mb-4 font-bold">Payment Method</h2>
		<RadioGroup bind:value={paymentMethod}>
			<label class="flex cursor-pointer items-center gap-3 rounded-lg border p-4">
				<Radio value="cash" />
				<div>
					<p class="font-medium">Cash</p>
					<p class="text-sm text-muted-foreground">Pay with physical currency</p>
				</div>
			</label>

			<label class="flex cursor-pointer items-center gap-3 rounded-lg border p-4">
				<Radio value="card" />
				<div>
					<p class="font-medium">Card / Terminal</p>
					<p class="text-sm text-muted-foreground">Debit/Credit card via POS terminal</p>
				</div>
			</label>

			<label class="flex cursor-pointer items-center gap-3 rounded-lg border p-4">
				<Radio value="upi" />
				<div>
					<p class="font-medium">UPI / Digital Wallet</p>
					<p class="text-sm text-muted-foreground">Google Pay, PhonePe, Paytm</p>
				</div>
			</label>
		</RadioGroup>
	</div>

	<!-- Payment Status -->
	{#if paymentStatus === 'processing'}
		<div class="p-8 text-center">
			<div
				class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
			></div>
			<p class="text-lg">Processing payment...</p>
		</div>
	{:else if paymentStatus === 'success'}
		<div class="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
			<p class="mb-4 text-2xl text-green-600">✓ Payment Successful!</p>
			<Button onclick={() => goto(`/${business.current!.id}/pos`)}>New Order</Button>
		</div>
	{:else if paymentStatus === 'failed'}
		<div class="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
			<p class="mb-4 text-2xl text-red-600">✗ Payment Failed</p>
			<Button onclick={() => (paymentStatus = 'idle')}>Try Again</Button>
		</div>
	{:else}
		<Button class="w-full" size="lg" disabled={isProcessing} onclick={handlePayment}>
			{isProcessing ? 'Processing...' : `Pay ₹${cart.total.toFixed(2)}`}
		</Button>
	{/if}
</div>
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

```typescript
// src/lib/stores/cart.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { cart } from './cart.svelte';

describe('Cart Store', () => {
	beforeEach(() => {
		cart.clear();
	});

	it('should add items to cart', () => {
		cart.addItem({
			id: '1',
			name: 'Test Item',
			price: 100,
			quantity: 1
		});

		expect(cart.items).toHaveLength(1);
		expect(cart.subtotal).toBe(100);
	});

	it('should increase quantity for duplicate items', () => {
		const item = { id: '1', name: 'Test', price: 100, quantity: 1 };

		cart.addItem(item);
		cart.addItem(item);

		expect(cart.items).toHaveLength(1);
		expect(cart.items[0].quantity).toBe(2);
	});

	it('should calculate tax correctly', () => {
		cart.addItem({ id: '1', name: 'Test', price: 100, quantity: 1 });

		expect(cart.tax).toBe(18); // 18% of 100
		expect(cart.total).toBe(118);
	});
});
```

### E2E Tests (Playwright)

```typescript
// e2e/pos.test.ts

import { test, expect } from '@playwright/test';

test.describe('POS Flow', () => {
	test('should complete a full order', async ({ page }) => {
		// Login
		await page.goto('/login');
		await page.fill('input[name="email"]', 'test@example.com');
		await page.fill('input[name="password"]', 'password');
		await page.click('button[type="submit"]');

		// Navigate to POS
		await page.goto('/test-business/pos');

		// Select item
		await page.click('text=Butter Chicken');

		// Verify it's in cart
		await expect(page.locator('text=Butter Chicken')).toBeVisible();

		// Checkout
		await page.click('text=Proceed to Payment');

		// Select payment method
		await page.click('text=Cash');

		// Complete payment
		await page.click('text=Pay');

		// Verify success
		await expect(page.locator('text=Payment Successful')).toBeVisible();
	});
});
```

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "build"]
```

---

## 📚 Additional Resources

- [SvelteKit Docs](https://kit.svelte.dev/)
- [Svelte 5 Runes](https://svelte-5-preview.vercel.app/docs/runes)
- [shadcn-svelte](https://www.shadcn-svelte.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Next Steps**: Implement menu management, then integrate with backend API
