# Business Onboarding Flow Documentation - Redesigned

## Overview

This document outlines the strategic business onboarding experience for a unified platform designed to support all business types. The focus is on streamlining the setup process while creating infrastructure that supports horizontal growth and operational excellence.

### Design Philosophy

For a truly unified platform serving diverse business types, we move beyond traditional setup wizards to focus on:

- **Progressive Onboarding**: Start with essentials, expand capabilities on-demand
- **Business-First**: All decisions centered on operational reality, not technical constraints
- **Data-Driven Configuration**: Every setting has measurable impact on operations
- **Extensibility**: Modifiers, tax, and payments are managed during actual business operations (menu/transaction level), not upfront

> **Note**: Authentication (login/register/forgot password) is handled separately in the auth layer. This document focuses solely on post-authentication business setup and operations.

---

## Table of Contents

1. [Strategic Additions for Unified Platform](#strategic-additions-for-unified-platform)
2. [Business Onboarding Stages](#business-onboarding-stages)
3. [Core Setup (What Matters)](#core-setup-what-matters)
4. [Payment Strategy Rethought](#payment-strategy-rethought)
5. [Menu & Modifier Management](#menu--modifier-management)
6. [UI Components & Forms](#ui-components--forms)
7. [Business Configuration Options](#business-configuration-options)

---

## Strategic Additions for Unified Platform

### Why These Additions Matter

For a truly unified platform across restaurant, retail, salon, and service businesses, we need foundational infrastructure that goes beyond basic transactional tools:

#### 1. **Multi-Location Support** 
- **Why**: Most SMBs either operate multiple locations or plan to expand. Treating single-location as the default creates technical debt and poor UX.
- **Impact**: Unified dashboard view, centralized reporting, per-location customization
- **Implementation**: Location selector in header, location-specific settings, consolidated analytics

#### 2. **Team & Permissions Management**
- **Why**: Different team members need different access levels (manager vs cashier vs owner). Security and operational efficiency depend on this.
- **What to include**:
  - Role-based access control (RBAC)
  - Granular permissions (view reports, manage inventory, process refunds, etc.)
  - Audit logs for compliance
  - Shift management and staff scheduling

#### 3. **Customer Intelligence & CRM**
- **Why**: Every business type benefits from understanding customer behavior. Restaurants track reservations, retail tracks purchases, salons track appointments.
- **What to include**:
  - Customer profile with transaction history
  - Automatic customer recognition (email/phone lookup)
  - Purchase frequency and average order value
  - Customer segmentation for targeted promotions
  - Customer lifetime value metrics

#### 4. **Operational Metrics & Reporting**
- **Why**: Business decisions need data. What's selling? What's slow? What's profitable?
- **What to include**:
  - Real-time dashboard with KPIs (revenue, transactions, avg order value)
  - Category performance analysis
  - Peak hours/days analysis
  - Inventory turnover rates
  - Staff productivity metrics (for service businesses)
  - Time-series data for trend analysis

#### 5. **Inventory Management**
- **Why**: From restaurant ingredients to retail stock to salon services—all need tracking.
- **What to include**:
  - Item-level inventory tracking
  - Low stock alerts
  - Supplier management
  - Cost tracking and profitability analysis
  - Waste/loss tracking
  - Expiry date management (for perishables)

#### 6. **Integration Ecosystem**
- **Why**: Businesses don't work in isolation. They use accounting software, delivery platforms, loyalty systems, email marketing, etc.
- **What to include**:
  - Webhook infrastructure for external integrations
  - Accounting software connectors (QuickBooks, Xero)
  - Delivery platform APIs (DoorDash, Uber Eats, etc.)
  - Email marketing integration
  - Analytics platform connections
  - Custom API access for power users

#### 7. **Compliance & Reporting Infrastructure**
- **Why**: Businesses face tax, labor, and regulatory requirements that vary by jurisdiction.
- **What to include**:
  - Tax calculations and category management
  - Labor law compliance (time tracking, break management)
  - Regulatory reporting (sales tax, income tax summaries)
  - Data retention policies
  - PCI compliance for payment data

#### 8. **Customer Communication**
- **Why**: Businesses need to reach customers (receipts, promotions, reminders).
- **What to include**:
  - Email receipt option
  - SMS notifications
  - Loyalty program promotions
  - Appointment reminders (for service businesses)
  - Order status updates

---

## Business Onboarding Stages

```
Stage 1: Quick Start (5 min)
├── Business name, type, location
├── Currency & timezone
└── Create first store/location

Stage 2: Essential Operations (10-15 min) - Do in first week
├── Add team members & permissions
├── Configure basic payment method
├── Add business hours
└── Initial customer setup

Stage 3: Optimization - Do when ready
├── Menu setup with modifiers
├── Advanced payment configuration
├── Tax category setup
├── Reporting preferences
├── Integration setup
└── Loyalty program configuration
```

---

## Core Setup (What Matters)

### Stage 1: Quick Start Onboarding

**Route**: `/(protected)/business/setup/quick-start`  
**State**: Authenticated, First-time user  
**Purpose**: Get business operational in 5 minutes

#### Step 1: Business Essentials

```
┌─ Business Setup ────────────────────────────┐
│                                             │
│ Let's set up your business                  │
│ Just a few essentials to get started        │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ Business Name *                     │    │
│ │ [Bella Vista Restaurant_________]  │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ What type of business? *            │    │
│ │ [Select ▼]                         │    │
│ │ • Restaurant                        │    │
│ │ • Retail Store                      │    │
│ │ • Salon/Spa                         │    │
│ │ • Coffee Shop                       │    │
│ │ • Fitness Center                    │    │
│ │ • Service (Other)                   │    │
│ │ • Other                             │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─ Location ──────────────────────────┐    │
│ │ Country *                           │    │
│ │ [United States____________]         │    │
│ │                                    │    │
│ │ City/Region *                       │    │
│ │ [New York_____________________]   │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─ Store Timezone ────────────────────┐    │
│ │ Timezone *                          │    │
│ │ [America/New_York__________▼]      │    │
│ │ (Used for reporting and business    │    │
│ │  hours calculation)                 │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─ Currency ──────────────────────────┐    │
│ │ Currency *                          │    │
│ │ [USD - United States Dollar ▼]     │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │    [Continue]                       │    │
│ └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

#### Form Fields - Business Essentials

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Business Name | Text Input | 2-100 chars, unique | Yes |
| Business Type | Select Dropdown | Predefined options | Yes |
| Country | Select Dropdown | ISO 3166-1 codes | Yes |
| City/Region | Text Input | 2-50 chars | Yes |
| Timezone | Select Dropdown | IANA timezone database | Yes |
| Currency | Select Dropdown | ISO 4217 codes | Yes |

**Why these fields only?**
- Everything else can be configured or refined later
- These are fundamental to how the system operates
- Changing these later is more disruptive, so we get them right upfront

---

#### Step 2: First Store/Location

```
┌─ Business Setup ────────────────────────────┐
│                                             │
│ Create your first store                    │
│ You can add more locations later            │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ Store/Location Name *               │    │
│ │ [Main Store____________________]   │    │
│ │ (e.g., "Times Square", "Downtown") │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ Store Address (Optional)            │    │
│ │ [123 Main Street___________________]│    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ Phone Number (Optional)             │    │
│ │ [+1 (555) 000-0000________________]│    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ Tax Rate for this location (%) *    │    │
│ │ [8.875____________________________] │    │
│ │ (Standard tax rate for transactions)│    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │    [Create Store]  [Skip]           │    │
│ └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

### Stage 2: Essential Operations

Done in first week based on business readiness.

#### Step 1: Add Team Members

```
┌─ Team Setup ────────────────────────────────┐
│                                             │
│ Build your team                            │
│ Add staff and set permissions               │
│                                             │
│ ┌─ Your Current Team ─────────────────┐    │
│ │ You (Owner)                         │    │
│ │ owner@business.com                  │    │
│ │ [Full Access]                       │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─ Add Team Member ───────────────────┐    │
│ │ Email *                             │    │
│ │ [____________________________]      │    │
│ │                                    │    │
│ │ Role *                              │    │
│ │ ○ Manager (full access)            │    │
│ │ ○ Cashier (POS only)               │    │
│ │ ○ Staff (limited access)           │    │
│ │ ○ Custom Permissions               │    │
│ │                                    │    │
│ │ Store Access *                      │    │
│ │ ☑ Main Store                       │    │
│ │ ☐ [Other locations...]            │    │
│ │                                    │    │
│ │ [Send Invite]  [Cancel]            │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │    [Continue]  [Skip for Now]       │    │
│ └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

#### Step 2: Payment Method Setup

**Key Insight**: Don't overwhelm with "split payments," "tipping configuration," etc. upfront.
- Just ask: "How do you accept payments?"
- Everything else is configured when actually processing transactions

```
┌─ Payment Setup ─────────────────────────────┐
│                                             │
│ How do you accept payments?                 │
│ (You can add more methods later)            │
│                                             │
│ ☑ Cash                                      │
│   Accept physical cash payment              │
│   [Help setting up]                         │
│                                             │
│ ☑ Card Payments                            │
│   Accept credit/debit cards                 │
│   Provider: [Select ▼]                     │
│   • Stripe                                  │
│   • Square                                  │
│   • PayPal                                  │
│   [Configure Details]                       │
│                                             │
│ ☐ Digital Wallet                           │
│   Apple Pay, Google Pay, PayPal             │
│   (Requires card payments)                  │
│                                             │
│ ☐ Other Methods                            │
│   (Bank transfer, checks, etc.)            │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │    [Continue]  [Skip for Now]       │    │
│ └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

#### Step 3: Business Hours

```
┌─ Business Hours ────────────────────────────┐
│                                             │
│ When are you open?                          │
│                                             │
│ ☑ Same hours every day                     │
│   [09:00] - [23:00]                       │
│                                             │
│ OR                                          │
│                                             │
│ ☐ Different hours by day                   │
│   Monday    [09:00] - [23:00] [Closed]    │
│   Tuesday   [09:00] - [23:00] [Closed]    │
│   Wednesday [09:00] - [23:00] [Closed]    │
│   Thursday  [09:00] - [23:00] [Closed]    │
│   Friday    [09:00] - [01:00] [Closed]    │
│   Saturday  [10:00] - [02:00] [Closed]    │
│   Sunday    [10:00] - [23:00] [Closed]    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │    [Save]  [Skip for Now]           │    │
│ └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

### Stage 3: Optimization Features

Set up when business is ready to go deeper.

---

## Payment Strategy Rethought

### Problem with Traditional Approach

Traditional POS systems ask about payment configuration upfront:
- "Enable split payments? Tipping? Gift cards? Digital wallets?"

**Users don't know** what they need until they start using the system. This creates:
1. Analysis paralysis during onboarding
2. Incorrect decisions made upfront
3. Poor configuration discovery

### New Approach: Progressive Payment Configuration

**At Onboarding**: Ask "What payment methods do you accept?"
- Cash: Yes/No
- Cards: Which provider? (Stripe, Square, PayPal)
- Digital Wallets: Yes/No (only if cards enabled)
- Other: Any additional methods?

**During First Transaction**: Present configuration options contextually
- **First cash transaction** → "Do you want to track cash balance?"
- **First card transaction** → "Configure tipping now?"
- **Customer requests split payment** → "Enable split payments?"
- **Customer wants digital receipt** → "Enable email receipts?"

**In Settings**: All payment configurations grouped logically
```
Payment Methods
├── Cash
│   └── [Settings: Balance tracking, denominations]
├── Card (Stripe)
│   └── [Settings: Fees, surcharge, tipping, receipt preferences]
├── Digital Wallets
│   └── [Settings: Which wallets enabled]
└── Other Methods
    └── [Custom configuration]
```

---

## Menu & Modifier Management

### Why Modifiers Are NOT in Setup

**Problem**: Asking about modifiers during setup assumes you know what modifiers you need before you've created any products.

**Solution**: Modifiers are created **during menu creation**, where they make sense contextually.

### Menu Structure

```
Routes:
├── /(protected)/[business]/products/menu
│   ├── Categories (CRUD)
│   ├── Items (CRUD)
│   └── Modifiers (CRUD)
│
└── /(protected)/[business]/products/menu/items/[itemId]/edit
    └── Modifiers attached to this item
```

### Creating Menu Items with Modifiers

```
┌─ Add Menu Item ─────────────────────────────┐
│                                             │
│ Item Details                                │
│ ┌────────────────────────────────────────┐  │
│ │ Item Name *                            │  │
│ │ [Gourmet Burger___________________]   │  │
│ │                                       │  │
│ │ Category *                             │  │
│ │ [Select: Main Course ▼]               │  │
│ │                                       │  │
│ │ Description                            │  │
│ │ [Premium beef patty with...________] │  │
│ │                                       │  │
│ │ Price *                                │  │
│ │ [$12.99__________________________]   │  │
│ │                                       │  │
│ │ Image                                  │  │
│ │ [Upload Image] or [Select from...]   │  │
│ └────────────────────────────────────────┘  │
│                                             │
│ Modifiers for this Item                    │
│ ┌────────────────────────────────────────┐  │
│ │ ☑ Size                                │  │
│ │   ○ Small    (+$0.00)                │  │
│ │   ○ Medium   (+$2.00)                │  │
│ │   ● Large    (+$4.00)                │  │
│ │   ○ XL       (+$6.00)                │  │
│ │   [Default: Large]                   │  │
│ │                                       │  │
│ │ ☑ Add-ons                            │  │
│ │   ☐ Extra Cheese  (+$1.50)          │  │
│ │   ☐ Bacon         (+$2.00)          │  │
│ │   ☐ Avocado       (+$1.75)          │  │
│ │   [Allow multiple selections]        │  │
│ │                                       │  │
│ │ ☑ Special Instructions               │  │
│ │   [Allow custom notes from customer] │  │
│ │                                       │  │
│ │ [+ Add Another Modifier Group]       │  │
│ └────────────────────────────────────────┘  │
│                                             │
│ Availability                               │
│ ┌────────────────────────────────────────┐  │
│ │ ☑ Available at Main Store             │  │
│ │ ☑ Available at [Other locations...]  │  │
│ │                                       │  │
│ │ Tax Category *                        │  │
│ │ [Select ▼]                           │  │
│ │ • Food                                 │  │
│ │ • Beverages                            │  │
│ │ • Non-taxable                          │  │
│ └────────────────────────────────────────┘  │
│                                             │
│ ┌────────────────────────────────────────┐  │
│ │ [Save Item]  [Save & Add Another]  │  │
│ │ [Cancel]                              │  │
│ └────────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### Modifier Management

Modifiers can be:
1. **Managed inline** while creating items (simple cases)
2. **Reused across items** (most common)
3. **Standardized** for the entire business

```
Modifiers Management Interface

┌─ Size (Reusable Modifier) ──────────┐
│ Used by: 12 items                   │
│ Selection Type: Single Choice       │
│                                     │
│ ☐ Small    ($0.00)                 │
│ ☐ Medium   ($2.00)  [Default]      │
│ ☑ Large    ($4.00)                 │
│ ☐ XL       ($6.00)                 │
│                                     │
│ [Edit] [Duplicate] [Delete]        │
└─────────────────────────────────────┘
```

---

## UI Components & Forms

### Form Components Overview

#### 1. Field Component
```svelte
<Field.Group>
  <Field.Field>
    <Field.Label for="business-name">Business Name</Field.Label>
    <Input id="business-name" type="text" placeholder="Your business" />
    <Field.Description>This is how customers will see you</Field.Description>
  </Field.Field>
</Field.Group>
```

#### 2. Select Component
```svelte
<Select.Root bind:value={selected}>
  <Select.Trigger>
    <Select.Value placeholder="Select option" />
  </Select.Trigger>
  <Select.Content>
    <Select.Item value="option1">Option 1</Select.Item>
    <Select.Item value="option2">Option 2</Select.Item>
  </Select.Content>
</Select.Root>
```

#### 3. Radio Group Component
```svelte
<RadioGroup.Root bind:value={selection}>
  <div class="flex items-center gap-2">
    <RadioGroupItem value="small" id="small" />
    <Label for="small">Small</Label>
  </div>
</RadioGroup.Root>
```

#### 4. Checkbox Component
```svelte
<div class="flex items-center gap-2">
  <Checkbox id="terms" bind:checked={accepted} />
  <Label for="terms">I agree to terms</Label>
</div>
```

---

## Business Configuration Options

### Industry Type Presets

Each business type has different operational needs:

#### Restaurant
- **Default Features**: Table management, kitchen display, course ordering
- **Setup Emphasis**: Menu categories, modifiers for food customization
- **Payment**: Split payments common, tipping expected
- **Key Metrics**: Table turnover, average check size, peak hours

#### Retail Store
- **Default Features**: Barcode scanning, inventory tracking, customer loyalty
- **Setup Emphasis**: Product variants (size, color), SKU management
- **Payment**: Card/cash split, gift cards, returns processing
- **Key Metrics**: Inventory turnover, items per transaction, stock levels

#### Salon/Spa
- **Default Features**: Appointment booking, staff scheduling, service assignment
- **Setup Emphasis**: Service listings with duration and pricing
- **Payment**: Tipping expected, service packages, staff commissions
- **Key Metrics**: Therapist utilization, service popularity, client retention

#### Coffee Shop
- **Default Features**: Quick service, size variants, combo deals
- **Setup Emphasis**: Customization options (milk, temperature, add-ons)
- **Payment**: Mobile payments preferred, loyalty programs
- **Key Metrics**: Items per minute served, peak hour traffic, repeat customers

---

## Summary: Why This Approach Works

✅ **Lower Barrier to Entry**: Get operational in 5 minutes, not 45

✅ **Context-Driven Configuration**: Users set things up when they understand why

✅ **Less Decision Fatigue**: Progressive disclosure vs overwhelming form

✅ **Unified for All Business Types**: Same core platform, different configurations

✅ **Scalable**: Features can be added as business grows

✅ **Data-Informed**: Infrastructure exists to make good decisions later

✅ **Extensible**: Modifiers, payment options, integrations tied to operations, not setup

---

## Implementation Priority

**Phase 1 (MVP)**: 
- Quick-start onboarding (business essentials + first store)
- Basic payment setup (cash + one card provider)
- Menu + simple modifiers
- Basic reporting

**Phase 2**:
- Team management
- Multi-location support
- Advanced payment configuration
- Customer management

**Phase 3**:
- Loyalty programs
- Advanced analytics
- Integration ecosystem
- Compliance reporting
