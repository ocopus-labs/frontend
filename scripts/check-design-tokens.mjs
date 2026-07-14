#!/usr/bin/env node
/**
 * Design-token guardrail (UI-consistency audit, Phase 4 lock-in).
 *
 * Fails if a .svelte file introduces:
 *   1. a raw hex color as a Tailwind arbitrary utility (e.g. `bg-[#abc123]`), or
 *   2. a neutral gray-scale utility (`bg/text/border/ring-gray-N`) — grays must
 *      go through semantic tokens (`muted` / `background` / `card` / `border` /
 *      `foreground`), never a hardcoded palette shade.
 *
 * This ratchets in the colour detox: it passes clean on the current tree (the
 * few legit cases below are whitelisted) and errors on any NEW violation.
 *
 * Run: `node scripts/check-design-tokens.mjs`  (wired as `npm run lint:tokens`)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

// Hex colours allowed as a Tailwind arbitrary value (third-party brand buttons).
const ALLOWED_HEX = new Set(['#5f259f']); // PhonePe brand purple

// Files with a legitimate reason to use raw gray-scale utilities.
//  - print/receipt surfaces (intentionally monochrome for thermal printers)
//  - the KDS status board (a deliberately always-dark TV display)
//  - categorical colour maps where the user/entity picks "gray" as one option
// Paths are forward-slash relative to src/ (matched against the normalized rel path).
const FILE_WHITELIST = new Set([
	'lib/components/pos/Receipt.svelte',
	'routes/(protected)/[business]/[slug]/kitchen-display/status/+page.svelte',
	'routes/(protected)/[business]/[slug]/team/schedule/+page.svelte',
	'routes/(protected)/[business]/[slug]/customers/[customerId]/+page.svelte',
	'routes/(protected)/dashboard/+page.svelte'
]);

const HEX_UTIL =
	/(?<![\w-])(?:bg|text|border|ring|from|to|via|fill|stroke|decoration|outline|shadow|accent|caret|divide)-\[#[0-9a-fA-F]{3,8}\]/g;
const GRAY_UTIL =
	/(?<![\w-])(?:bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder)-gray-\d{2,3}(?![\w-])/g;

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) {
			if (name === 'node_modules' || name === '.svelte-kit') continue;
			walk(full, out);
		} else if (name.endsWith('.svelte')) {
			out.push(full);
		}
	}
	return out;
}

function normalize(rel) {
	return rel.split('\\').join('/');
}

const violations = [];
for (const file of walk(SRC)) {
	const rel = normalize(relative(SRC, file));
	const whitelisted = FILE_WHITELIST.has(rel);
	const lines = readFileSync(file, 'utf8').split(/\r?\n/);
	lines.forEach((line, i) => {
		for (const m of line.matchAll(HEX_UTIL)) {
			const hex = m[0].slice(m[0].indexOf('#'), -1).toLowerCase();
			if (!ALLOWED_HEX.has(hex)) {
				violations.push({ rel, line: i + 1, tok: m[0], why: 'raw hex utility' });
			}
		}
		if (!whitelisted) {
			for (const m of line.matchAll(GRAY_UTIL)) {
				violations.push({ rel, line: i + 1, tok: m[0], why: 'gray-scale utility (use a semantic token)' });
			}
		}
	});
}

if (violations.length) {
	console.error(`\n✖ design-token guardrail: ${violations.length} violation(s)\n`);
	for (const v of violations) {
		console.error(`  ${v.rel}:${v.line}  ${v.tok}  — ${v.why}`);
	}
	console.error(
		'\nUse semantic tokens (bg-muted / bg-background / bg-card / border-border / text-foreground,\n' +
			'or bg-success / bg-warning / bg-destructive for status). If a raw value is genuinely\n' +
			'intentional (brand button, print surface, always-dark display), add it to the whitelist\n' +
			'in scripts/check-design-tokens.mjs with a comment explaining why.\n'
	);
	process.exit(1);
}

console.log('✓ design-token guardrail: no raw hex or gray-scale utilities outside the whitelist');
