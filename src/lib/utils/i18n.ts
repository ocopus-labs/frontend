/**
 * Internationalization and Multi-Region Utilities
 * Handles currency, number, date formatting, and regional preferences
 */

export type CurrencyCode =
	| 'USD'
	| 'EUR'
	| 'GBP'
	| 'JPY'
	| 'CAD'
	| 'AUD'
	| 'CHF'
	| 'CNY'
	| 'INR'
	| 'BRL';

export type Locale =
	| 'en-US'
	| 'en-GB'
	| 'en-CA'
	| 'en-AU'
	| 'de-DE'
	| 'fr-FR'
	| 'es-ES'
	| 'it-IT'
	| 'pt-BR'
	| 'ja-JP'
	| 'zh-CN'
	| 'hi-IN';

export interface CurrencyInfo {
	code: CurrencyCode;
	symbol: string;
	name: string;
	decimalPlaces: number;
	symbolPosition: 'before' | 'after';
}

export interface RegionConfig {
	locale: Locale;
	currency: CurrencyCode;
	timezone: string;
	dateFormat: string;
	timeFormat: '12h' | '24h';
	numberFormat: {
		decimalSeparator: string;
		thousandSeparator: string;
	};
	taxSystem: 'inclusive' | 'exclusive';
	measurementSystem: 'metric' | 'imperial';
}

// Currency configurations
export const CURRENCY_CONFIG: Record<CurrencyCode, CurrencyInfo> = {
	USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimalPlaces: 2, symbolPosition: 'before' },
	EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimalPlaces: 2, symbolPosition: 'after' },
	GBP: {
		code: 'GBP',
		symbol: '£',
		name: 'British Pound',
		decimalPlaces: 2,
		symbolPosition: 'before'
	},
	JPY: {
		code: 'JPY',
		symbol: '¥',
		name: 'Japanese Yen',
		decimalPlaces: 0,
		symbolPosition: 'before'
	},
	CAD: {
		code: 'CAD',
		symbol: 'C$',
		name: 'Canadian Dollar',
		decimalPlaces: 2,
		symbolPosition: 'before'
	},
	AUD: {
		code: 'AUD',
		symbol: 'A$',
		name: 'Australian Dollar',
		decimalPlaces: 2,
		symbolPosition: 'before'
	},
	CHF: {
		code: 'CHF',
		symbol: 'CHF',
		name: 'Swiss Franc',
		decimalPlaces: 2,
		symbolPosition: 'before'
	},
	CNY: {
		code: 'CNY',
		symbol: '¥',
		name: 'Chinese Yuan',
		decimalPlaces: 2,
		symbolPosition: 'before'
	},
	INR: {
		code: 'INR',
		symbol: '₹',
		name: 'Indian Rupee',
		decimalPlaces: 2,
		symbolPosition: 'before'
	},
	BRL: {
		code: 'BRL',
		symbol: 'R$',
		name: 'Brazilian Real',
		decimalPlaces: 2,
		symbolPosition: 'before'
	}
};

// Region configurations
export const REGION_CONFIGS: Record<string, RegionConfig> = {
	us: {
		locale: 'en-US',
		currency: 'USD',
		timezone: 'America/New_York',
		dateFormat: 'MM/DD/YYYY',
		timeFormat: '12h',
		numberFormat: { decimalSeparator: '.', thousandSeparator: ',' },
		taxSystem: 'exclusive',
		measurementSystem: 'imperial'
	},
	eu: {
		locale: 'de-DE',
		currency: 'EUR',
		timezone: 'Europe/Berlin',
		dateFormat: 'DD.MM.YYYY',
		timeFormat: '24h',
		numberFormat: { decimalSeparator: ',', thousandSeparator: '.' },
		taxSystem: 'inclusive',
		measurementSystem: 'metric'
	},
	uk: {
		locale: 'en-GB',
		currency: 'GBP',
		timezone: 'Europe/London',
		dateFormat: 'DD/MM/YYYY',
		timeFormat: '24h',
		numberFormat: { decimalSeparator: '.', thousandSeparator: ',' },
		taxSystem: 'inclusive',
		measurementSystem: 'metric'
	},
	ca: {
		locale: 'en-CA',
		currency: 'CAD',
		timezone: 'America/Toronto',
		dateFormat: 'YYYY-MM-DD',
		timeFormat: '12h',
		numberFormat: { decimalSeparator: '.', thousandSeparator: ',' },
		taxSystem: 'exclusive',
		measurementSystem: 'metric'
	},
	au: {
		locale: 'en-AU',
		currency: 'AUD',
		timezone: 'Australia/Sydney',
		dateFormat: 'DD/MM/YYYY',
		timeFormat: '12h',
		numberFormat: { decimalSeparator: '.', thousandSeparator: ',' },
		taxSystem: 'inclusive',
		measurementSystem: 'metric'
	},
	jp: {
		locale: 'ja-JP',
		currency: 'JPY',
		timezone: 'Asia/Tokyo',
		dateFormat: 'YYYY/MM/DD',
		timeFormat: '24h',
		numberFormat: { decimalSeparator: '.', thousandSeparator: ',' },
		taxSystem: 'inclusive',
		measurementSystem: 'metric'
	},
	cn: {
		locale: 'zh-CN',
		currency: 'CNY',
		timezone: 'Asia/Shanghai',
		dateFormat: 'YYYY-MM-DD',
		timeFormat: '24h',
		numberFormat: { decimalSeparator: '.', thousandSeparator: ',' },
		taxSystem: 'inclusive',
		measurementSystem: 'metric'
	},
	in: {
		locale: 'hi-IN',
		currency: 'INR',
		timezone: 'Asia/Kolkata',
		dateFormat: 'DD/MM/YYYY',
		timeFormat: '12h',
		numberFormat: { decimalSeparator: '.', thousandSeparator: ',' },
		taxSystem: 'inclusive',
		measurementSystem: 'metric'
	},
	br: {
		locale: 'pt-BR',
		currency: 'BRL',
		timezone: 'America/Sao_Paulo',
		dateFormat: 'DD/MM/YYYY',
		timeFormat: '24h',
		numberFormat: { decimalSeparator: ',', thousandSeparator: '.' },
		taxSystem: 'inclusive',
		measurementSystem: 'metric'
	}
};

/**
 * Currency formatting utilities
 */
export class CurrencyFormatter {
	private config: CurrencyInfo;
	private locale: Locale;

	constructor(currencyCode: CurrencyCode, locale: Locale = 'en-US') {
		this.config = CURRENCY_CONFIG[currencyCode];
		this.locale = locale;
	}

	format(amount: number, options: { showSymbol?: boolean; showCode?: boolean } = {}): string {
		const { showSymbol = true, showCode = false } = options;

		try {
			const formatted = new Intl.NumberFormat(this.locale, {
				style: 'decimal',
				minimumFractionDigits: this.config.decimalPlaces,
				maximumFractionDigits: this.config.decimalPlaces
			}).format(amount);

			let result = formatted;

			if (showSymbol) {
				if (this.config.symbolPosition === 'before') {
					result = `${this.config.symbol}${formatted}`;
				} else {
					result = `${formatted} ${this.config.symbol}`;
				}
			}

			if (showCode) {
				result = `${result} ${this.config.code}`;
			}

			return result;
		} catch (error) {
			// Fallback formatting
			const formatted = amount.toFixed(this.config.decimalPlaces);
			return showSymbol ? `${this.config.symbol}${formatted}` : formatted;
		}
	}

	getSymbol(): string {
		return this.config.symbol;
	}

	getCode(): string {
		return this.config.code;
	}

	getDecimalPlaces(): number {
		return this.config.decimalPlaces;
	}
}

/**
 * Number formatting utilities
 */
export class NumberFormatter {
	private locale: Locale;
	private config: RegionConfig;

	constructor(locale: Locale = 'en-US') {
		this.locale = locale;
		this.config =
			Object.values(REGION_CONFIGS).find((config) => config.locale === locale) || REGION_CONFIGS.us;
	}

	format(number: number, options: { decimals?: number; compact?: boolean } = {}): string {
		const { decimals, compact = false } = options;

		try {
			const formatOptions: Intl.NumberFormatOptions = {
				style: compact ? 'decimal' : 'decimal',
				minimumFractionDigits: decimals ?? 2,
				maximumFractionDigits: decimals ?? 2
			};

			if (compact) {
				formatOptions.notation = 'compact';
			}

			return new Intl.NumberFormat(this.locale, formatOptions).format(number);
		} catch (error) {
			return number.toFixed(decimals ?? 2);
		}
	}

	formatPercentage(value: number, decimals: number = 1): string {
		try {
			return new Intl.NumberFormat(this.locale, {
				style: 'percent',
				minimumFractionDigits: decimals,
				maximumFractionDigits: decimals
			}).format(value / 100);
		} catch (error) {
			return `${value.toFixed(decimals)}%`;
		}
	}

	parseLocalizedNumber(value: string): number {
		// Remove thousand separators and convert decimal separator
		const normalized = value
			.replace(new RegExp(`\\${this.config.numberFormat.thousandSeparator}`, 'g'), '')
			.replace(new RegExp(`\\${this.config.numberFormat.decimalSeparator}`), '.');

		return parseFloat(normalized) || 0;
	}
}

/**
 * Date and time formatting utilities
 */
export class DateTimeFormatter {
	private locale: Locale;
	private config: RegionConfig;

	constructor(locale: Locale = 'en-US') {
		this.locale = locale;
		this.config =
			Object.values(REGION_CONFIGS).find((config) => config.locale === locale) || REGION_CONFIGS.us;
	}

	formatDate(date: Date, format: 'short' | 'medium' | 'long' | 'full' = 'medium'): string {
		try {
			return new Intl.DateTimeFormat(this.locale, {
				dateStyle: format
			}).format(date);
		} catch (error) {
			return date.toLocaleDateString(this.locale);
		}
	}

	formatTime(date: Date, format: 'short' | 'medium' | 'long' = 'short'): string {
		try {
			return new Intl.DateTimeFormat(this.locale, {
				timeStyle: format
			}).format(date);
		} catch (error) {
			return date.toLocaleTimeString(this.locale);
		}
	}

	formatDateTime(date: Date): string {
		try {
			return new Intl.DateTimeFormat(this.locale, {
				dateStyle: 'medium',
				timeStyle: 'short'
			}).format(date);
		} catch (error) {
			return `${this.formatDate(date)} ${this.formatTime(date)}`;
		}
	}

	getRelativeTime(date: Date): string {
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		const intervals = [
			{ label: 'year', seconds: 31536000 },
			{ label: 'month', seconds: 2592000 },
			{ label: 'week', seconds: 604800 },
			{ label: 'day', seconds: 86400 },
			{ label: 'hour', seconds: 3600 },
			{ label: 'minute', seconds: 60 },
			{ label: 'second', seconds: 1 }
		];

		for (const interval of intervals) {
			const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
			if (count >= 1) {
				const suffix = diffInSeconds < 0 ? 'from now' : 'ago';
				return `${count} ${interval.label}${count > 1 ? 's' : ''} ${suffix}`;
			}
		}

		return 'just now';
	}
}

/**
 * Tax calculation utilities
 */
export class TaxCalculator {
	private config: RegionConfig;

	constructor(region: string = 'us') {
		this.config = REGION_CONFIGS[region] || REGION_CONFIGS.us;
	}

	calculateTax(subtotal: number, taxRate: number): { tax: number; total: number } {
		const tax = subtotal * (taxRate / 100);

		if (this.config.taxSystem === 'inclusive') {
			// Tax is already included in the price
			return {
				tax,
				total: subtotal
			};
		} else {
			// Tax is added to the subtotal
			return {
				tax,
				total: subtotal + tax
			};
		}
	}

	calculateTaxFromTotal(total: number, taxRate: number): { subtotal: number; tax: number } {
		if (this.config.taxSystem === 'inclusive') {
			const subtotal = total / (1 + taxRate / 100);
			const tax = total - subtotal;
			return { subtotal, tax };
		} else {
			const tax = total * (taxRate / (100 + taxRate));
			const subtotal = total - tax;
			return { subtotal, tax };
		}
	}
}

/**
 * Measurement conversion utilities
 */
export class MeasurementConverter {
	private system: 'metric' | 'imperial';

	constructor(system: 'metric' | 'imperial' = 'metric') {
		this.system = system;
	}

	// Temperature conversions
	celsiusToFahrenheit(celsius: number): number {
		return (celsius * 9) / 5 + 32;
	}

	fahrenheitToCelsius(fahrenheit: number): number {
		return ((fahrenheit - 32) * 5) / 9;
	}

	// Weight conversions
	kilogramsToPounds(kg: number): number {
		return kg * 2.20462;
	}

	poundsToKilograms(lbs: number): number {
		return lbs / 2.20462;
	}

	// Length conversions
	metersToFeet(meters: number): number {
		return meters * 3.28084;
	}

	feetToMeters(feet: number): number {
		return feet / 3.28084;
	}

	// Volume conversions
	litersToGallons(liters: number): number {
		return liters * 0.264172;
	}

	gallonsToLiters(gallons: number): number {
		return gallons / 0.264172;
	}

	formatTemperature(temp: number): string {
		if (this.system === 'metric') {
			return `${temp.toFixed(1)}°C`;
		} else {
			return `${this.celsiusToFahrenheit(temp).toFixed(1)}°F`;
		}
	}

	formatWeight(weight: number): string {
		if (this.system === 'metric') {
			return `${weight.toFixed(2)} kg`;
		} else {
			return `${this.kilogramsToPounds(weight).toFixed(2)} lbs`;
		}
	}
}

/**
 * Global utilities instance - can be configured per region
 */
export class InternationalizationUtils {
	private region: string;
	private config: RegionConfig;
	private currencyFormatter: CurrencyFormatter;
	private numberFormatter: NumberFormatter;
	private dateTimeFormatter: DateTimeFormatter;
	private taxCalculator: TaxCalculator;
	private measurementConverter: MeasurementConverter;

	constructor(region: string = 'us') {
		this.region = region;
		this.config = REGION_CONFIGS[region] || REGION_CONFIGS.us;
		this.currencyFormatter = new CurrencyFormatter(this.config.currency, this.config.locale);
		this.numberFormatter = new NumberFormatter(this.config.locale);
		this.dateTimeFormatter = new DateTimeFormatter(this.config.locale);
		this.taxCalculator = new TaxCalculator(region);
		this.measurementConverter = new MeasurementConverter(this.config.measurementSystem);
	}

	// Currency methods
	formatCurrency(amount: number, options?: { showSymbol?: boolean; showCode?: boolean }): string {
		return this.currencyFormatter.format(amount, options);
	}

	getCurrencySymbol(): string {
		return this.currencyFormatter.getSymbol();
	}

	getCurrencyCode(): string {
		return this.currencyFormatter.getCode();
	}

	// Number methods
	formatNumber(number: number, options?: { decimals?: number; compact?: boolean }): string {
		return this.numberFormatter.format(number, options);
	}

	formatPercentage(value: number, decimals?: number): string {
		return this.numberFormatter.formatPercentage(value, decimals);
	}

	parseNumber(value: string): number {
		return this.numberFormatter.parseLocalizedNumber(value);
	}

	// Date/Time methods
	formatDate(date: Date, format?: 'short' | 'medium' | 'long' | 'full'): string {
		return this.dateTimeFormatter.formatDate(date, format);
	}

	formatTime(date: Date, format?: 'short' | 'medium' | 'long'): string {
		return this.dateTimeFormatter.formatTime(date, format);
	}

	formatDateTime(date: Date): string {
		return this.dateTimeFormatter.formatDateTime(date);
	}

	getRelativeTime(date: Date): string {
		return this.dateTimeFormatter.getRelativeTime(date);
	}

	// Tax methods
	calculateTax(subtotal: number, taxRate: number): { tax: number; total: number } {
		return this.taxCalculator.calculateTax(subtotal, taxRate);
	}

	calculateTaxFromTotal(total: number, taxRate: number): { subtotal: number; tax: number } {
		return this.taxCalculator.calculateTaxFromTotal(total, taxRate);
	}

	// Measurement methods
	formatTemperature(temp: number): string {
		return this.measurementConverter.formatTemperature(temp);
	}

	formatWeight(weight: number): string {
		return this.measurementConverter.formatWeight(weight);
	}

	// Configuration getters
	getConfig(): RegionConfig {
		return { ...this.config };
	}

	getRegion(): string {
		return this.region;
	}

	getLocale(): Locale {
		return this.config.locale;
	}

	getTimezone(): string {
		return this.config.timezone;
	}

	getTaxSystem(): 'inclusive' | 'exclusive' {
		return this.config.taxSystem;
	}

	getMeasurementSystem(): 'metric' | 'imperial' {
		return this.config.measurementSystem;
	}
}

// Default instance
export const i18n = new InternationalizationUtils();

// Factory function for creating region-specific instances
export function createI18nUtils(region: string): InternationalizationUtils {
	return new InternationalizationUtils(region);
}

// Utility functions for common use cases
export function formatPrice(amount: number, region: string = 'us'): string {
	const utils = createI18nUtils(region);
	return utils.formatCurrency(amount);
}

export function formatDate(date: Date, region: string = 'us'): string {
	const utils = createI18nUtils(region);
	return utils.formatDate(date);
}

export function calculateOrderTotal(
	items: Array<{ price: number; quantity: number }>,
	taxRate: number,
	region: string = 'us'
): {
	subtotal: number;
	tax: number;
	total: number;
} {
	const utils = createI18nUtils(region);
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const { tax, total } = utils.calculateTax(subtotal, taxRate);

	return {
		subtotal: parseFloat(subtotal.toFixed(2)),
		tax: parseFloat(tax.toFixed(2)),
		total: parseFloat(total.toFixed(2))
	};
}

/**
 * Simple currency formatting function using Indian Rupee by default
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
	const formatter = new CurrencyFormatter(currency, 'hi-IN');
	return formatter.format(amount);
}
