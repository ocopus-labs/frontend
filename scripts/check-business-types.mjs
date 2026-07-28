#!/usr/bin/env node
/**
 * Business-type parity guardrail.
 *
 * The canonical business-type list lives in the backend repo:
 *   backend/src/modules/business/config/business-types.config.ts → BUSINESS_TYPES
 *
 * The frontend keeps its own copy in src/lib/types/business.ts because backend
 * and frontend are separate git repos — there is no import to share. This script
 * diffs the two so the copy cannot silently drift.
 *
 * It is not a hypothetical. The frontend list held four types
 * (restaurant/cafe/bar/retail) while the backend accepted nine. Onboarding
 * created salon, gym and clinic businesses successfully, and then
 * `(protected)/[business]/[slug]/+layout.server.ts` — which redirects any type
 * not in VALID_BUSINESS_TYPES — bounced their owners to `/` from every page of
 * their own tenant. Nothing failed; the businesses were simply unreachable.
 *
 * The backend side of the same contract is asserted by
 * backend/src/modules/business/config/business-types.spec.ts.
 *
 * Run: `node scripts/check-business-types.mjs`  (wired as `npm run lint:business-types`)
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const FRONTEND_FILE = join(ROOT, 'src', 'lib', 'types', 'business.ts');
const BACKEND_FILE = join(
	ROOT,
	'..',
	'backend',
	'src',
	'modules',
	'business',
	'config',
	'business-types.config.ts'
);

/** Pull the string literal values out of a `const X = { KEY: 'value', ... }` block. */
function extractObjectValues(source, constName) {
	const start = source.indexOf(`const ${constName} = {`);
	if (start === -1) return null;
	const end = source.indexOf('}', start);
	if (end === -1) return null;
	const body = source.slice(start, end);
	return [...body.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
}

/** Pull the string literal values out of a `const X = [ 'a', 'b' ] as const` block. */
function extractArrayValues(source, constName) {
	const start = source.indexOf(`const ${constName} = [`);
	if (start === -1) return null;
	const end = source.indexOf(']', start);
	if (end === -1) return null;
	const body = source.slice(start, end);
	return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const frontendTypes = extractArrayValues(
	readFileSync(FRONTEND_FILE, 'utf8'),
	'VALID_BUSINESS_TYPES'
);

if (!frontendTypes?.length) {
	console.error(
		`✗ Could not parse VALID_BUSINESS_TYPES from ${FRONTEND_FILE}.\n` +
			`  Expected a \`export const VALID_BUSINESS_TYPES = [ 'a', 'b' ] as const\` block.`
	);
	process.exit(1);
}

// The backend is a sibling repo, so in CI it may not be checked out. Skipping is
// correct there — but say so loudly rather than passing silently, because a
// guardrail that quietly does nothing is worse than no guardrail.
if (!existsSync(BACKEND_FILE)) {
	console.warn(
		`⚠ business-types parity NOT CHECKED — backend repo not found at ${BACKEND_FILE}.\n` +
			`  ${frontendTypes.length} frontend types left unverified against the backend.`
	);
	process.exit(0);
}

const backendTypes = extractObjectValues(readFileSync(BACKEND_FILE, 'utf8'), 'BUSINESS_TYPES');

if (!backendTypes?.length) {
	console.error(
		`✗ Could not parse BUSINESS_TYPES from ${BACKEND_FILE}.\n` +
			`  Expected a \`export const BUSINESS_TYPES = { KEY: 'value' } as const\` block.`
	);
	process.exit(1);
}

const missingInFrontend = backendTypes.filter((t) => !frontendTypes.includes(t));
const extraInFrontend = frontendTypes.filter((t) => !backendTypes.includes(t));

if (missingInFrontend.length || extraInFrontend.length) {
	console.error('✗ Business-type lists have drifted.\n');
	if (missingInFrontend.length) {
		console.error(
			`  Backend accepts these but the frontend does not list them:\n` +
				`    ${missingInFrontend.join(', ')}\n` +
				`  Businesses of these types can be created and will then be unreachable —\n` +
				`  the [business]/[slug] layout redirects unrecognised types to '/'.\n`
		);
	}
	if (extraInFrontend.length) {
		console.error(
			`  Frontend lists these but the backend rejects them:\n` +
				`    ${extraInFrontend.join(', ')}\n` +
				`  These appear in the signup picker and fail validation on submit.\n`
		);
	}
	console.error(`  Fix: reconcile src/lib/types/business.ts with ${BACKEND_FILE}`);
	process.exit(1);
}

console.log(`✓ business types in sync with backend (${backendTypes.length} types)`);
