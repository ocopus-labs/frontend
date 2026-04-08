/**
 * i18n — Internationalization for UI strings
 *
 * A lightweight, reactive i18n system using Svelte 5 runes.
 * Reads flat key-value JSON message files from /messages/{locale}.json.
 *
 * Usage in components:
 *   import { t, locale, setLocale, SUPPORTED_LOCALES } from '$lib/i18n.svelte';
 *   <h1>{t('nav.dashboard')}</h1>
 *   <button onclick={() => setLocale('hi')}>Hindi</button>
 *
 * Interpolation:
 *   t('greeting', { name: 'Rohit' })  // "Hello, {name}!" -> "Hello, Rohit!"
 */

import { browser } from '$app/environment';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LocaleCode = 'en' | 'hi';

export interface LocaleInfo {
	code: LocaleCode;
	/** Native-script label shown in locale switcher */
	label: string;
	/** English name for accessibility / tooltips */
	english: string;
	/** Text direction */
	dir: 'ltr' | 'rtl';
}

type Messages = Record<string, string>;

// ---------------------------------------------------------------------------
// Supported locales
// ---------------------------------------------------------------------------

export const SUPPORTED_LOCALES: LocaleInfo[] = [
	{ code: 'en', label: 'English', english: 'English', dir: 'ltr' },
	{ code: 'hi', label: 'हिन्दी', english: 'Hindi', dir: 'ltr' }
];

export const DEFAULT_LOCALE: LocaleCode = 'en';

const STORAGE_KEY = 'app:locale';

// ---------------------------------------------------------------------------
// Message loading
// ---------------------------------------------------------------------------

// Vite's import.meta.glob for static JSON message files.
// eager: true  — bundles them at build time so there is no async waterfall.
const messageModules = import.meta.glob<Messages>('../../messages/*.json', {
	eager: true,
	import: 'default'
});

function loadMessages(code: LocaleCode): Messages {
	// The glob keys look like "../../messages/en.json"
	const key = `../../messages/${code}.json`;
	return messageModules[key] ?? {};
}

// Pre-load all locale messages at module init so switching is synchronous.
const allMessages: Record<LocaleCode, Messages> = {
	en: loadMessages('en'),
	hi: loadMessages('hi')
};

// ---------------------------------------------------------------------------
// Reactive state (Svelte 5 runes)
// ---------------------------------------------------------------------------

function getInitialLocale(): LocaleCode {
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && isValidLocale(stored)) {
			return stored;
		}
		// Detect browser language preference
		const browserLang = navigator.language.split('-')[0];
		if (isValidLocale(browserLang)) {
			return browserLang;
		}
	}
	return DEFAULT_LOCALE;
}

function isValidLocale(code: string): code is LocaleCode {
	return SUPPORTED_LOCALES.some((l) => l.code === code);
}

let _locale = $state<LocaleCode>(getInitialLocale());
let _messages: Messages = $derived(allMessages[_locale]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read-only reactive locale value. Use `setLocale()` to change.
 */
export const locale = {
	get current(): LocaleCode {
		return _locale;
	}
};

/**
 * Get the LocaleInfo object for the current locale.
 */
export function currentLocaleInfo(): LocaleInfo {
	return SUPPORTED_LOCALES.find((l) => l.code === _locale) ?? SUPPORTED_LOCALES[0];
}

/**
 * Switch locale. Persists choice to localStorage.
 */
export function setLocale(code: LocaleCode): void {
	if (!isValidLocale(code)) {
		console.warn(`[i18n] Unknown locale "${code}". Falling back to "${DEFAULT_LOCALE}".`);
		code = DEFAULT_LOCALE;
	}
	_locale = code;

	if (browser) {
		localStorage.setItem(STORAGE_KEY, code);
		// Update <html lang="..."> for accessibility / SEO
		document.documentElement.lang = code;
		document.documentElement.dir = currentLocaleInfo().dir;
	}
}

/**
 * Translate a key, with optional interpolation.
 *
 * @param key   Dot-separated message key, e.g. "common.save"
 * @param vars  Optional interpolation variables, e.g. { name: "Rohit" }
 * @returns     Translated string, or the key itself as fallback
 *
 * @example
 *   t('common.save')                     // "Save"
 *   t('greeting', { name: 'Rohit' })     // "Hello, {name}!" -> "Hello, Rohit!"
 */
export function t(key: string, vars?: Record<string, string | number>): string {
	let message = _messages[key];

	// Fallback to English if the key is missing in current locale
	if (message === undefined) {
		message = allMessages.en[key];
	}

	// If still missing, return the key itself (makes missing keys visible in UI)
	if (message === undefined) {
		if (browser) {
			console.warn(`[i18n] Missing translation key: "${key}"`);
		}
		return key;
	}

	// Interpolate {variable} placeholders
	if (vars) {
		for (const [varKey, varValue] of Object.entries(vars)) {
			message = message.replaceAll(`{${varKey}}`, String(varValue));
		}
	}

	return message;
}

/**
 * Check whether a translation key exists in the current locale.
 */
export function hasKey(key: string): boolean {
	return key in _messages;
}

/**
 * Get all keys for the current locale (useful for debugging).
 */
export function allKeys(): string[] {
	return Object.keys(_messages);
}
