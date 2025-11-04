/**
 * Examples of using the internationalization utilities
 */

import { createI18nUtils, formatPrice, formatDate, calculateOrderTotal } from '$lib/utils/i18n';

// Example 1: Basic usage with default US region
const usUtils = createI18nUtils('us');

console.log('US Currency:', usUtils.formatCurrency(29.99)); // $29.99
console.log('US Date:', usUtils.formatDate(new Date())); // 11/5/2025
console.log('US Temperature:', usUtils.formatTemperature(25)); // 77.0°F

// Example 2: European region
const euUtils = createI18nUtils('eu');

console.log('EU Currency:', euUtils.formatCurrency(29.99)); // 29,99 €
console.log('EU Date:', euUtils.formatDate(new Date())); // 05.11.2025
console.log('EU Temperature:', euUtils.formatTemperature(25)); // 25.0°C

// Example 3: Indian region
const inUtils = createI18nUtils('in');

console.log('IN Currency:', inUtils.formatCurrency(29.99)); // ₹29.99
console.log('IN Date:', inUtils.formatDate(new Date())); // 5/11/2025

// Example 4: Order calculation
const orderItems = [
	{ price: 12.99, quantity: 2 },
	{ price: 4.99, quantity: 1 },
	{ price: 2.5, quantity: 3 }
];

const orderTotal = calculateOrderTotal(orderItems, 8.5, 'us');
console.log('Order Total (US):', orderTotal);
// { subtotal: 40.97, tax: 3.48, total: 44.45 }

const orderTotalEU = calculateOrderTotal(orderItems, 19, 'eu');
console.log('Order Total (EU):', orderTotalEU);
// { subtotal: 40.97, tax: 7.78, total: 48.75 }

// Example 5: Using convenience functions
console.log('Quick price format:', formatPrice(99.99, 'jp')); // ¥100
console.log('Quick date format:', formatDate(new Date(), 'uk')); // 05/11/2025

// Example 6: Number formatting
console.log('US Number:', usUtils.formatNumber(1234.56)); // 1,234.56
console.log('EU Number:', euUtils.formatNumber(1234.56)); // 1.234,56

// Example 7: Tax system differences
const subtotal = 100;
const taxRate = 10;

const usTax = usUtils.calculateTax(subtotal, taxRate); // exclusive tax
console.log('US Tax (exclusive):', usTax); // { tax: 10, total: 110 }

const euTax = euUtils.calculateTax(subtotal, taxRate); // inclusive tax
console.log('EU Tax (inclusive):', euTax); // { tax: 10, total: 100 }
