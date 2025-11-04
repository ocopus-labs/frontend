# Internationalization Utilities

This module provides comprehensive internationalization and multi-region support for the POS application, handling currency formatting, number formatting, date/time formatting, tax calculations, and measurement conversions.

## Features

- **Multi-Currency Support**: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, BRL
- **Regional Configurations**: Pre-configured settings for US, EU, UK, CA, AU, JP, CN, IN, BR
- **Flexible Formatting**: Currency, numbers, dates, times with locale-specific rules
- **Tax Calculations**: Support for inclusive and exclusive tax systems
- **Measurement Systems**: Metric and imperial unit conversions
- **Type Safety**: Full TypeScript support with proper type definitions

## Quick Start

```typescript
import { createI18nUtils, formatPrice, calculateOrderTotal } from '$lib/utils/i18n';

// Create region-specific utilities
const usUtils = createI18nUtils('us');
const euUtils = createI18nUtils('eu');

// Format currency
console.log(usUtils.formatCurrency(29.99)); // "$29.99"
console.log(euUtils.formatCurrency(29.99)); // "29,99 €"

// Format dates
console.log(usUtils.formatDate(new Date())); // "11/5/2025"
console.log(euUtils.formatDate(new Date())); // "05.11.2025"

// Calculate order totals with tax
const items = [
	{ price: 12.99, quantity: 2 },
	{ price: 4.99, quantity: 1 }
];

const total = calculateOrderTotal(items, 8.5, 'us');
console.log(total); // { subtotal: 30.97, tax: 2.63, total: 33.60 }
```

## API Reference

### InternationalizationUtils Class

Main class providing all internationalization utilities for a specific region.

#### Constructor

```typescript
const utils = new InternationalizationUtils(region?: string);
```

- `region`: Region code ('us', 'eu', 'uk', 'ca', 'au', 'jp', 'cn', 'in', 'br')

#### Currency Methods

```typescript
utils.formatCurrency(amount: number, options?: { showSymbol?: boolean; showCode?: boolean }): string
utils.getCurrencySymbol(): string
utils.getCurrencyCode(): string
```

#### Number Methods

```typescript
utils.formatNumber(number: number, options?: { decimals?: number; compact?: boolean }): string
utils.formatPercentage(value: number, decimals?: number): string
utils.parseNumber(value: string): number
```

#### Date/Time Methods

```typescript
utils.formatDate(date: Date, format?: 'short' | 'medium' | 'long' | 'full'): string
utils.formatTime(date: Date, format?: 'short' | 'medium' | 'long'): string
utils.formatDateTime(date: Date): string
utils.getRelativeTime(date: Date): string
```

#### Tax Methods

```typescript
utils.calculateTax(subtotal: number, taxRate: number): { tax: number; total: number }
utils.calculateTaxFromTotal(total: number, taxRate: number): { subtotal: number; tax: number }
```

#### Measurement Methods

```typescript
utils.formatTemperature(temp: number): string
utils.formatWeight(weight: number): string
```

### Convenience Functions

```typescript
// Quick currency formatting
formatPrice(amount: number, region?: string): string

// Quick date formatting
formatDate(date: Date, region?: string): string

// Order total calculation
calculateOrderTotal(
	items: Array<{ price: number; quantity: number }>,
	taxRate: number,
	region?: string
): { subtotal: number; tax: number; total: number }
```

### Factory Function

```typescript
// Create region-specific instance
const utils = createI18nUtils(region: string): InternationalizationUtils
```

## Supported Regions

| Region | Locale | Currency | Tax System | Measurements |
| ------ | ------ | -------- | ---------- | ------------ |
| us     | en-US  | USD      | Exclusive  | Imperial     |
| eu     | de-DE  | EUR      | Inclusive  | Metric       |
| uk     | en-GB  | GBP      | Inclusive  | Metric       |
| ca     | en-CA  | CAD      | Exclusive  | Metric       |
| au     | en-AU  | AUD      | Inclusive  | Metric       |
| jp     | ja-JP  | JPY      | Inclusive  | Metric       |
| cn     | zh-CN  | CNY      | Inclusive  | Metric       |
| in     | hi-IN  | INR      | Inclusive  | Metric       |
| br     | pt-BR  | BRL      | Inclusive  | Metric       |

## Tax Systems

### Exclusive Tax (US, CA)

- Tax is added to the subtotal
- Display: Subtotal $100 + Tax $8.50 = Total $108.50

### Inclusive Tax (EU, UK, AU, JP, CN, IN, BR)

- Tax is already included in the displayed prices
- Display: Total $108.50 (includes $8.50 tax)

## Usage in Components

```svelte
<script>
	import { createI18nUtils } from '$lib/utils/i18n';

	// Get region from store or props
	let region = 'us';
	$: i18n = createI18nUtils(region);
</script>

<!-- Currency display -->
<p>Price: {i18n.formatCurrency(29.99)}</p>

<!-- Date display -->
<p>Date: {i18n.formatDate(new Date())}</p>

<!-- Order total -->
<p>Total: {i18n.formatCurrency(orderTotal)}</p>
```

## Adding New Regions

To add support for a new region:

1. Add currency configuration to `CURRENCY_CONFIG`
2. Add region configuration to `REGION_CONFIGS`
3. Test formatting with the new locale

```typescript
// Example: Adding Mexican Peso support
CURRENCY_CONFIG.MXN = {
	code: 'MXN',
	symbol: '$',
	name: 'Mexican Peso',
	decimalPlaces: 2,
	symbolPosition: 'before'
};

REGION_CONFIGS.mx = {
	locale: 'es-MX',
	currency: 'MXN',
	timezone: 'America/Mexico_City',
	dateFormat: 'DD/MM/YYYY',
	timeFormat: '12h',
	numberFormat: { decimalSeparator: '.', thousandSeparator: ',' },
	taxSystem: 'inclusive',
	measurementSystem: 'metric'
};
```

## Best Practices

1. **Consistent Region Usage**: Use the same region throughout a user's session
2. **Store Region Preference**: Save user's region preference in local storage
3. **Fallback Handling**: Always provide fallbacks for unsupported locales
4. **Performance**: Create utils instances once and reuse them
5. **Testing**: Test with different regions to ensure proper formatting

## Examples

See `i18n-examples.ts` for comprehensive usage examples covering all features and edge cases.
