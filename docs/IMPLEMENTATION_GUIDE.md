# Implementation Guidelines - Business Onboarding

## File Structure for Implementation

```
src/routes/
├── (protected)/
│   └── [business]/
│       ├── setup/
│       │   ├── quick-start/
│       │   │   ├── +page.svelte          # Step 1: Business Essentials
│       │   │   └── +page.server.ts       # Handle form submission
│       │   ├── store-creation/
│       │   │   ├── +page.svelte          # Step 2: First Store
│       │   │   └── +page.server.ts
│       │   └── +layout.svelte            # Setup wizard layout with progress
│       │
│       ├── dashboard/
│       │   ├── +page.svelte              # Main dashboard (after setup)
│       │   ├── +page.server.ts
│       │   └── components/
│       │       ├── quick-start-card.svelte    # "Complete setup" prompt
│       │       ├── setup-checklist.svelte     # Stage 2 tasks
│       │       └── onboarding-progress.svelte # Progress indicator
│       │
│       ├── team/
│       │   ├── +page.svelte              # Team management (Stage 2)
│       │   ├── [memberId]/
│       │   │   └── +page.svelte          # Edit member
│       │   └── add-member/
│       │       └── +page.svelte          # Add new member
│       │
│       ├── settings/
│       │   ├── payments/
│       │   │   ├── +page.svelte          # Payment configuration
│       │   │   └── [methodId]/+page.svelte
│       │   ├── business-hours/
│       │   │   └── +page.svelte          # Hours configuration
│       │   ├── locations/
│       │   │   ├── +page.svelte          # Multi-location management
│       │   │   ├── [locationId]/
│       │   │   │   └── +page.svelte
│       │   │   └── add/+page.svelte
│       │   └── general/
│       │       └── +page.svelte          # Business info
│       │
│       ├── products/
│       │   └── menu/
│       │       ├── +page.svelte          # Menu management hub
│       │       ├── categories/
│       │       │   ├── +page.svelte
│       │       │   └── [categoryId]/+page.svelte
│       │       ├── items/
│       │       │   ├── +page.svelte
│       │       │   ├── [itemId]/
│       │       │   │   ├── +page.svelte  # View/Edit item with modifiers
│       │       │   │   └── +page.server.ts
│       │       │   └── add/+page.svelte
│       │       └── modifiers/
│       │           ├── +page.svelte      # Reusable modifiers
│       │           └── [modifierId]/+page.svelte
│       │
│       └── pos/
│           └── new-order/
│               ├── +page.svelte
│               └── checkout/
│                   └── payment/
│                       └── +page.svelte  # First payment → contextual config
│
└── lib/
    ├── stores/
    │   ├── onboarding.ts                 # Onboarding state
    │   └── business.ts                   # Business configuration
    │
    ├── components/
    │   ├── onboarding/
    │   │   ├── progress-indicator.svelte
    │   │   ├── setup-wizard-layout.svelte
    │   │   ├── setup-checklist.svelte
    │   │   └── contextual-config.svelte  # Payment/tax config prompts
    │   │
    │   └── forms/
    │       ├── business-essentials-form.svelte
    │       ├── store-creation-form.svelte
    │       ├── team-member-form.svelte
    │       ├── payment-config-form.svelte
    │       └── business-hours-form.svelte
    │
    ├── services/
    │   ├── onboarding.service.ts         # Onboarding logic
    │   ├── business.service.ts           # Business config
    │   ├── payment.service.ts            # Payment config
    │   ├── menu.service.ts               # Menu/items/modifiers
    │   ├── team.service.ts               # Team management
    │   └── contextual-config.service.ts  # Contextual prompts
    │
    └── types/
        ├── onboarding.ts
        ├── business.ts
        ├── payment.ts
        ├── menu.ts
        └── team.ts
```

---

## Stage 1: Quick Start Implementation

### Components Needed

1. **Business Essentials Form**
   - Business name (text)
   - Business type (select dropdown)
   - Country (searchable select)
   - City/Region (text)
   - Timezone (select)
   - Currency (select)

2. **Store Creation Form**
   - Store name (text)
   - Address (text, optional)
   - Phone (tel, optional)
   - Tax rate (number)

### Logic Flow

```typescript
// src/routes/(protected)/[business]/setup/quick-start/+page.server.ts

export const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();

    // Validate business essentials
    const businessData = {
      name: formData.get('business-name'),
      type: formData.get('business-type'),
      country: formData.get('country'),
      city: formData.get('city'),
      timezone: formData.get('timezone'),
      currency: formData.get('currency')
    };

    // Validate input
    if (!businessData.name) {
      return { success: false, error: 'Business name required' };
    }

    // Create business
    const business = await createBusiness(businessData, locals.userId);

    // Store in session
    locals.currentBusiness = business.id;

    // Redirect to store creation
    throw redirect(307, `/[${business.id}]/setup/store-creation`);
  }
};
```

### State Management

```typescript
// src/lib/stores/onboarding.ts

import { writable } from 'svelte/store';

export const onboardingState = writable({
  stage: 'quick-start', // 'quick-start' | 'essential-ops' | 'optimization' | 'complete'
  completed: {
    quickStart: false,
    firstStore: false,
    teamAdded: false,
    paymentConfigured: false,
    businessHours: false
  },
  currentStep: 1, // 1-5 for quick-start
  startedAt: null,
  completedAt: null
});
```

---

## Stage 2: Essential Operations Implementation

### Payment Method Selection

```svelte
<!-- src/lib/components/forms/payment-config-form.svelte -->

<script lang="ts">
	import { enhance } from '$app/forms';
	import Checkbox from '$lib/components/ui/checkbox';
	import Select from '$lib/components/ui/select';
	import Button from '$lib/components/ui/button';

	let selectedMethods = {
		cash: true,
		cards: false,
		digitalWallets: false,
		other: false
	};

	let cardProvider = null;
</script>

<form method="POST" use:enhance>
	<div class="space-y-4">
		<!-- Cash Payment -->
		<div class="rounded-lg border p-4">
			<label class="flex items-center gap-2">
				<Checkbox bind:checked={selectedMethods.cash} name="payment-cash" />
				<span class="font-medium">Cash Payments</span>
			</label>
			<p class="text-sm text-muted-foreground">Accept physical cash</p>
		</div>

		<!-- Card Payment -->
		<div class="rounded-lg border p-4">
			<label class="flex items-center gap-2">
				<Checkbox bind:checked={selectedMethods.cards} name="payment-cards" />
				<span class="font-medium">Card Payments</span>
			</label>
			{#if selectedMethods.cards}
				<div class="mt-3 ml-6">
					<Select
						name="card-provider"
						bind:value={cardProvider}
						options={[
							{ label: 'Stripe', value: 'stripe' },
							{ label: 'Square', value: 'square' },
							{ label: 'PayPal', value: 'paypal' }
						]}
						placeholder="Select provider"
					/>
				</div>
			{/if}
		</div>

		<!-- Digital Wallets -->
		<div class="rounded-lg border p-4">
			<label class="flex items-center gap-2">
				<Checkbox
					bind:checked={selectedMethods.digitalWallets}
					disabled={!selectedMethods.cards}
					name="payment-digital-wallets"
				/>
				<span class="font-medium">Digital Wallets</span>
			</label>
			<p class="text-sm text-muted-foreground">
				{selectedMethods.cards ? 'Apple Pay, Google Pay, PayPal' : 'Enable card payments first'}
			</p>
		</div>
	</div>

	<div class="mt-6 flex gap-2">
		<Button type="submit" variant="primary">Continue</Button>
		<Button type="button" variant="outline" href="/dashboard">Skip for Now</Button>
	</div>
</form>
```

### Business Hours Form

```svelte
<!-- src/lib/components/forms/business-hours-form.svelte -->

<script lang="ts">
	let sameHoursEveryDay = true;
	let startTime = '09:00';
	let endTime = '23:00';

	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	let dayHours = {
		Monday: { start: '09:00', end: '23:00', closed: false },
		Tuesday: { start: '09:00', end: '23:00', closed: false }
		// ... etc
	};
</script>

<form method="POST">
	{#if sameHoursEveryDay}
		<div class="space-y-4">
			<div>
				<label>Open Time</label>
				<input type="time" bind:value={startTime} name="start-time" />
			</div>
			<div>
				<label>Close Time</label>
				<input type="time" bind:value={endTime} name="end-time" />
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			{#each days as day}
				<div class="flex items-center gap-2 border-b pb-2">
					<span class="w-24">{day}</span>
					<input type="time" bind:value={dayHours[day].start} />
					<span>-</span>
					<input type="time" bind:value={dayHours[day].end} />
					<label class="ml-auto">
						<input type="checkbox" bind:checked={dayHours[day].closed} />
						Closed
					</label>
				</div>
			{/each}
		</div>
	{/if}

	<div class="mt-4">
		<label>
			<input type="checkbox" bind:checked={sameHoursEveryDay} />
			Same hours every day
		</label>
	</div>
</form>
```

---

## Stage 3: Context-Driven Configuration

### Payment Configuration Trigger

```typescript
// src/lib/services/contextual-config.service.ts

export async function checkPaymentConfiguration(
  businessId: string,
  transactionType: 'cash' | 'card' | 'digital'
) {
  const business = await getBusinessConfig(businessId);
  const paymentConfigs = business.paymentConfiguration || {};

  const needs = [];

  if (transactionType === 'cash' && !paymentConfigs.cashBalanceTracking) {
    needs.push({
      type: 'CASH_BALANCE_TRACKING',
      title: 'Track Cash Balance?',
      description: 'Enable cash balance tracking for accurate shift reports',
      action: 'enableCashBalanceTracking'
    });
  }

  if (transactionType === 'card' && !paymentConfigs.tipping) {
    needs.push({
      type: 'CARD_TIPPING',
      title: 'Enable Tipping on Cards?',
      description: 'Let customers add tips to their card payments',
      action: 'enableTipping'
    });
  }

  return needs;
}
```

### Contextual Config Component

```svelte
<!-- src/lib/components/onboarding/contextual-config.svelte -->

<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button';
	import { checkPaymentConfiguration } from '$lib/services/contextual-config.service';

	export let transactionType;
	export let businessId;

	let configNeeds = [];
	let dismissed = [];

	onMount(async () => {
		configNeeds = await checkPaymentConfiguration(businessId, transactionType);
	});

	function dismissConfig(configType) {
		dismissed = [...dismissed, configType];
	}

	function handleConfigure(config) {
		// Show configuration modal/form
	}
</script>

{#if configNeeds.length > 0 && dismissed.length < configNeeds.length}
	<div class="fixed right-4 bottom-4 rounded-lg bg-primary p-4 text-primary-foreground shadow-lg">
		{#each configNeeds as config}
			{#if !dismissed.includes(config.type)}
				<div class="space-y-2">
					<h3 class="font-medium">{config.title}</h3>
					<p class="text-sm">{config.description}</p>
					<div class="flex gap-2">
						<Button size="sm" variant="secondary" on:click={() => handleConfigure(config)}>
							Configure Now
						</Button>
						<Button size="sm" variant="ghost" on:click={() => dismissConfig(config.type)}>
							Maybe Later
						</Button>
					</div>
				</div>
			{/if}
		{/each}
	</div>
{/if}
```

---

## Menu & Modifier Implementation

### Item Creation with Modifiers

```typescript
// src/lib/services/menu.service.ts

export interface MenuItemInput {
  name: string;
  categoryId: string;
  price: number;
  description?: string;
  image?: string;
  modifiers: {
    modifierId: string;
    isRequired: boolean;
  }[];
  taxCategoryId: string;
  availableAt: string[]; // location IDs
}

export async function createMenuItem(
  businessId: string,
  locationId: string,
  item: MenuItemInput
) {
  // Validate modifiers exist
  for (const modifier of item.modifiers) {
    const exists = await getModifier(businessId, modifier.modifierId);
    if (!exists) throw new Error(`Modifier ${modifier.modifierId} not found`);
  }

  // Create item
  const created = await db.menuItem.create({
    businessId,
    locationId,
    ...item
  });

  // Attach modifiers
  for (const modifier of item.modifiers) {
    await db.itemModifier.create({
      itemId: created.id,
      modifierId: modifier.modifierId,
      isRequired: modifier.isRequired,
      displayOrder: item.modifiers.indexOf(modifier)
    });
  }

  return created;
}

export async function createModifier(
  businessId: string,
  modifier: {
    name: string;
    type: 'single' | 'multiple'; // single choice or multiple choice
    options: {
      name: string;
      priceAdjustment: number;
      isDefault?: boolean;
    }[];
  }
) {
  return db.modifier.create({
    businessId,
    ...modifier
  });
}
```

### Modifier Reuse

```svelte
<!-- src/lib/components/forms/item-modifiers.svelte -->

<script lang="ts">
	import { getModifiers } from '$lib/services/menu.service';

	export let businessId;
	export let selectedModifiers = [];

	let availableModifiers = [];
	let showCreateNew = false;

	onMount(async () => {
		availableModifiers = await getModifiers(businessId);
	});

	function addModifier(modifierId) {
		selectedModifiers = [...selectedModifiers, { modifierId, isRequired: false }];
	}

	function removeModifier(index) {
		selectedModifiers = selectedModifiers.filter((_, i) => i !== index);
	}
</script>

<div class="space-y-4">
	<h3>Modifiers for this Item</h3>

	<!-- Selected Modifiers -->
	{#each selectedModifiers as modifier, index}
		<div class="flex items-center justify-between rounded border p-3">
			<span>{availableModifiers.find((m) => m.id === modifier.modifierId)?.name}</span>
			<button on:click={() => removeModifier(index)}>Remove</button>
		</div>
	{/each}

	<!-- Add Modifier -->
	{#if showCreateNew}
		<button on:click={() => (showCreateNew = false)}>← Back to Library</button>
		<!-- Show modifier creation form -->
	{:else}
		<div class="space-y-2">
			<p class="text-sm text-muted-foreground">Existing Modifiers</p>
			{#each availableModifiers as modifier}
				<button
					on:click={() => addModifier(modifier.id)}
					class="w-full rounded border p-2 text-left hover:bg-secondary"
				>
					{modifier.name}
					<span class="ml-2 text-xs text-muted-foreground">
						({modifier.options.length} options)
					</span>
				</button>
			{/each}
			<button
				on:click={() => (showCreateNew = true)}
				class="w-full rounded border-2 border-dashed p-2 text-primary"
			>
				+ Create New Modifier
			</button>
		</div>
	{/if}
</div>
```

---

## Data Models

```typescript
// src/lib/types/onboarding.ts

export interface OnboardingState {
  userId: string;
  businessId: string;
  stage: 'quick-start' | 'essential-ops' | 'optimization' | 'complete';
  startedAt: Date;
  completedAt?: Date;
  tasksCompleted: {
    businessEssentials: boolean;
    firstStore: boolean;
    teamAdded: boolean;
    paymentConfigured: boolean;
    businessHoursSet: boolean;
    menuCreated: boolean;
  };
}

export interface BusinessConfig {
  id: string;
  userId: string;
  name: string;
  type: string;
  country: string;
  city: string;
  timezone: string;
  currency: string;
  locations: Location[];
  payments: PaymentConfiguration;
  team: TeamMember[];
  menu?: MenuStructure;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  taxRate: number;
  businessHours: BusinessHours;
}

export interface PaymentConfiguration {
  methods: {
    cash?: { enabled: boolean };
    card?: { enabled: boolean; provider: string; apiKey: string };
    digitalWallets?: { enabled: boolean; methods: string[] };
    other?: { enabled: boolean };
  };
  // Advanced config (set later)
  tipping?: { enabled: boolean; percentages: number[] };
  splitPayments?: { enabled: boolean };
  surcharge?: { enabled: boolean; percentage: number };
}
```

---

## Key Implementation Principles

1. **Progressive Disclosure**: Only show configuration options when relevant
2. **Context Matters**: Modifiers are configured when creating items, not upfront
3. **Sensible Defaults**: Pre-populate common values (timezone based on country, etc.)
4. **Validation**: Validate only what's needed at each stage
5. **Non-blocking**: Can always skip to dashboard and come back later
6. **Guidance**: Help text explains why each field matters
7. **Modularity**: Each component is independent and reusable

---

## Testing Checklist

- [ ] Quick-start completes in < 5 minutes
- [ ] Can skip optional steps and still access dashboard
- [ ] Modifiers can be created inline or reused
- [ ] Payment config works without all details
- [ ] Contextual prompts appear at right time
- [ ] Multi-location works for all business types
- [ ] Team management respects permissions
- [ ] All form validation works properly
- [ ] Data persists across page refreshes
- [ ] Can edit configuration later without re-entry
