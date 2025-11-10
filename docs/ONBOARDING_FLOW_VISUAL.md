# Business Onboarding Flow - Visual Guide

## User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER JOURNEY: FROM SIGNUP TO OPERATIONAL                                    │
└─────────────────────────────────────────────────────────────────────────────┘

STAGE 1: QUICK START (5 min)
│
├─ [User Authenticated]
│
├─ Step 1: Business Essentials
│  ├─ Business Name
│  ├─ Business Type (Restaurant, Retail, Salon, etc.)
│  ├─ Country
│  ├─ City/Region
│  ├─ Timezone
│  └─ Currency
│
├─ Step 2: First Store
│  ├─ Store/Location Name
│  ├─ Address (optional)
│  ├─ Phone (optional)
│  └─ Tax Rate
│
└─ [Onboarding Complete - Redirect to Dashboard]

───────────────────────────────────────────────────────────────────────────────

STAGE 2: ESSENTIAL OPERATIONS (First Week)
│
└─ From Dashboard, user can:
   │
   ├─ [1] Add Team Members
   │  ├─ Define roles (Owner, Manager, Cashier, Staff, Custom)
   │  ├─ Set permissions
   │  ├─ Assign to locations
   │  └─ Send invitations
   │
   ├─ [2] Configure Payment Methods
   │  ├─ Enable Cash
   │  ├─ Enable Cards (select provider)
   │  ├─ Enable Digital Wallets (optional)
   │  └─ Add other methods (optional)
   │
   ├─ [3] Set Business Hours
   │  ├─ Choose template (same hours all days OR per-day)
   │  └─ Apply to all locations OR per-location
   │
   └─ [Optional] Basic Customer Data
      ├─ Import customers (if migrating from another system)
      └─ Enable phone/email lookup for returning customers

───────────────────────────────────────────────────────────────────────────────

STAGE 3: OPTIMIZATION (When Ready)
│
└─ User can progressively enable:
   │
   ├─ Menu Management
   │  ├─ Create categories
   │  ├─ Add items
   │  └─ Configure modifiers PER ITEM (not upfront)
   │
   ├─ Advanced Payment Config
   │  ├─ Tipping settings
   │  ├─ Split payment rules
   │  ├─ Surcharge configuration
   │  ├─ Digital wallet setup
   │  └─ Receipt preferences
   │
   ├─ Tax Configuration
   │  ├─ Define tax categories
   │  ├─ Assign items to categories
   │  └─ Handle tax exemptions
   │
   ├─ Reporting Setup
   │  ├─ Choose KPIs to track
   │  ├─ Set reporting frequency
   │  └─ Configure alerts
   │
   ├─ Inventory Management
   │  ├─ Item-level tracking
   │  ├─ Stock thresholds
   │  ├─ Supplier management
   │  └─ Waste tracking
   │
   ├─ Team & Scheduling
   │  ├─ Schedule shifts
   │  ├─ Staff permissions
   │  ├─ Timesheet tracking
   │  └─ Commission tracking
   │
   ├─ Customer Loyalty
   │  ├─ Points program
   │  ├─ Rewards
   │  ├─ Customer segments
   │  └─ Promotions
   │
   └─ Integrations
      ├─ Accounting (QuickBooks, Xero)
      ├─ Delivery (DoorDash, Uber Eats)
      ├─ Email (Mailchimp, etc.)
      ├─ Analytics
      └─ Custom APIs

───────────────────────────────────────────────────────────────────────────────

KEY INSIGHT: Configuration happens at the point of need, not upfront
```

---

## Decision Flow: Payment Configuration

```
┌─ Payment Setup Flow ─────────────────────────────────────────┐
│                                                              │
│ Q: How do you accept payments?                              │
│                                                              │
├─ Cash? ─→ YES  ─→ [Enable]                                 │
│ │                  └─ (Later: Track balance? YES/NO)       │
│ └─ NO  ─→ [Skip]                                            │
│                                                              │
├─ Card? ─→ YES  ─→ [Select Provider: Stripe/Square/PayPal]│
│ │               └─ [Get API Key]                           │
│ │               └─ (Later: Config tipping, surcharge, etc.) │
│ │                                                            │
│ └─ NO  ─→ [Skip]                                            │
│                                                              │
├─ Digital Wallets? ─→ YES (only if Cards = YES)             │
│ │                   └─ [Apple Pay, Google Pay, PayPal]     │
│ └─ NO  ─→ [Skip]                                            │
│                                                              │
└─ Other? ─→ YES  ─→ [Bank Transfer, Checks, etc.]          │
    └─ NO  ─→ [Skip]                                         │
```

---

## Menu Creation with Modifiers

```
┌─ Add Menu Item ──────────────────────────────────────────────┐
│                                                               │
│ ITEM DETAILS                                                 │
│ ┌─ Item Info ─────────────────────────────────────────────┐  │
│ │ Item Name: Gourmet Burger                              │  │
│ │ Category: Main Course                                  │  │
│ │ Price: $12.99                                          │  │
│ │ Image: [Upload]                                        │  │
│ │ Description: Premium burger...                         │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                               │
│ MODIFIERS (Contextual - Choose what applies to THIS item)   │
│ ┌─ Apply Modifiers ───────────────────────────────────────┐  │
│ │ ☑ Size                                                 │  │
│ │   ○ Small    ($0)                                      │  │
│ │   ○ Medium   ($2)                                      │  │
│ │   ● Large    ($4)                                      │  │
│ │   ○ XL       ($6)                                      │  │
│ │                                                         │  │
│ │ ☑ Add-ons                                              │  │
│ │   ☐ Extra Cheese (+$1.50)                             │  │
│ │   ☐ Bacon      (+$2.00)                               │  │
│ │   ☐ Avocado    (+$1.75)                               │  │
│ │                                                         │  │
│ │ ☑ Special Instructions                                │  │
│ │   [Allow custom notes]                                │  │
│ │                                                         │  │
│ │ ☑ Tax Category: Food (8.875%)                         │  │
│ │                                                         │  │
│ │ [+ Add Another Modifier Group]                        │  │
│ │                                                         │  │
│ │ [Don't see what you need?]                            │  │
│ │ [Create Custom Modifier] ←────────────────────┐       │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                               │
│ LOCATION AVAILABILITY                                        │
│ ┌─ Availability ──────────────────────────────────────────┐  │
│ │ ☑ Available at Main Store                             │  │
│ │ ☐ Available at Downtown Location                      │  │
│ │ ☐ Available at Mall Location                          │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ [Save Item]  [Save & Add Another]  [Cancel]          │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘

KEY: Modifiers are created and configured in context, not as
     system-wide setup. Different items can have different modifiers.
```

---

## Context-Driven Configuration

```
EVENT: First Cash Transaction
└─ System: "You just processed a cash payment"
   └─ Prompt: "Would you like to track cash balance for shift?"
      ├─ YES ──→ [Enable cash balance tracking]
      │          └─ Enter starting cash: ___
      └─ NO  ──→ [Continue without tracking]

EVENT: First Card Transaction
└─ System: "Card payment successful"
   └─ Prompt: "Would you like to enable tipping on card payments?"
      ├─ YES ──→ Configure tipping
      │          ├─ Preset percentages: 10%, 15%, 20%, 25%
      │          └─ Allow custom amount: YES/NO
      └─ NO  ──→ [Skip]

EVENT: Customer Requests Email Receipt
└─ System: "Customer requested email receipt"
   └─ Prompt: "Enable email receipts?"
      ├─ YES ──→ [Collect customer email]
      │          └─ Configure email template
      └─ NO  ──→ [Print receipt instead]

EVENT: Customer Wants Split Payment
└─ System: "Customer cannot process as single payment"
   └─ Prompt: "Enable split payment for this order?"
      ├─ YES ──→ [Process as split payment]
      │          └─ Ask: "Enable split payments by default?"
      └─ NO  ──→ [Request single payment]

EVENT: Low Inventory Alert
└─ System: "Burger stock below threshold"
   └─ Prompt: "Set low stock alert?"
      ├─ YES ──→ Configure inventory thresholds
      └─ NO  ──→ [Continue]
```

---

## Business Type Adaptation

```
SAME CORE PLATFORM, DIFFERENT NEEDS

┌─ Restaurant ──────────────────────┐
│ Setup Emphasis:                   │
│ • Menu categories                 │
│ • Item modifiers (size, spice)    │
│ • Table management                │
│ • Kitchen display                 │
│ • Peak hour analytics             │
│                                   │
│ Key Metrics:                      │
│ • Average check                   │
│ • Table turnover                  │
│ • Item popularity                 │
│ • Peak hours                      │
└───────────────────────────────────┘

┌─ Retail Store ───────────────────┐
│ Setup Emphasis:                   │
│ • Product variants (size, color)  │
│ • SKU management                  │
│ • Barcode scanning                │
│ • Inventory levels                │
│ • Customer loyalty                │
│                                   │
│ Key Metrics:                      │
│ • Inventory turnover              │
│ • Items per transaction           │
│ • Stock levels                    │
│ • Repeat customers                │
└───────────────────────────────────┘

┌─ Salon/Spa ──────────────────────┐
│ Setup Emphasis:                   │
│ • Service listings                │
│ • Staff scheduling                │
│ • Appointment booking             │
│ • Service duration                │
│ • Therapist assignment            │
│                                   │
│ Key Metrics:                      │
│ • Therapist utilization           │
│ • Service popularity              │
│ • Client retention                │
│ • Repeat bookings                 │
└───────────────────────────────────┘

┌─ Coffee Shop ────────────────────┐
│ Setup Emphasis:                   │
│ • Quick service                   │
│ • Size variants                   │
│ • Customization options           │
│ • Combo deals                     │
│ • Mobile payments                 │
│                                   │
│ Key Metrics:                      │
│ • Items per minute                │
│ • Peak hour traffic               │
│ • Repeat customers                │
│ • Average transaction value       │
└───────────────────────────────────┘

ALL START WITH: Business name, type, location, currency, timezone
ALL GET: Team management, customer intel, inventory, integrations
ALL CAN: Configure modifiers, payments, tax based on their needs
```

---

## Checklist: What Makes This Unified

✅ **One setup flow** for all business types (business name, type, location, currency, timezone)

✅ **Progressive complexity** - users learn what they need as they use the system

✅ **Unified infrastructure** - team management, reporting, inventory, integrations work for all

✅ **Context-driven configuration** - modifiers, payments, tax configured where they matter (not upfront)

✅ **Scalability** - supports single location today, multiple locations tomorrow

✅ **Discovery** - users find features as they need them, not overwhelmed upfront

✅ **Data-informed** - infrastructure exists to support good decision-making

---

## Success Metrics

### Onboarding

- Time to first transaction: < 10 minutes
- Setup completion rate: > 80% in first session
- Feature discovery rate: Increasing over first month

### Retention

- Weekly active users: Growing
- Feature adoption: Progressive (users enable features as needed)
- Support tickets: Decreasing (fewer confused during setup)

### Satisfaction

- NPS on onboarding: > 50
- Time to productivity: < 1 hour
- User confidence: Assessed at key points
