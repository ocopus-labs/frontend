/**
 * CSV, PDF, and Blob export utilities for report pages.
 */

/**
 * Downloads a Blob as a file by creating a temporary anchor element.
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Builds a CSV string from headers and rows, creates a Blob, and triggers a
 * browser download via a temporary anchor element.
 */
export function downloadCsv(
	filename: string,
	headers: string[],
	rows: (string | number)[][]
): void {
	const escapeCsvCell = (value: string | number): string => {
		const str = String(value);
		// Wrap in quotes if the value contains commas, quotes, or newlines
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	};

	const csvLines: string[] = [];
	csvLines.push(headers.map(escapeCsvCell).join(','));

	for (const row of rows) {
		csvLines.push(row.map(escapeCsvCell).join(','));
	}

	const csvString = csvLines.join('\n');
	const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);

	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
	anchor.style.display = 'none';
	document.body.appendChild(anchor);
	anchor.click();

	// Clean up
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

/**
 * Resolves any CSS color (including oklch/lab/lch/color-mix) to rgb by using a
 * temporary DOM element — the browser's computed style for `color` always
 * serializes to rgb.
 */
function colorToRgb(value: string): string {
	const probe = document.createElement('div');
	probe.style.color = value;
	probe.style.display = 'none';
	document.body.appendChild(probe);
	const resolved = getComputedStyle(probe).color;
	document.body.removeChild(probe);
	return resolved;
}

/**
 * Finds the index of the closing parenthesis that matches the opening one at
 * `openIndex`. Returns -1 if unmatched.
 */
function findMatchingParen(text: string, openIndex: number): number {
	let depth = 1;
	for (let i = openIndex + 1; i < text.length; i++) {
		if (text[i] === '(') depth++;
		else if (text[i] === ')') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/**
 * Replaces all oklch(...) and color-mix(...oklch...) expressions in a CSS
 * string with browser-resolved rgb equivalents. Handles nested parentheses
 * correctly (e.g. color-mix(in oklch, oklch(L C H) 50%, transparent)).
 */
function replaceOklchInCssText(css: string): string {
	let result = '';
	let i = 0;

	while (i < css.length) {
		// Check for color-mix( containing oklch
		if (css.startsWith('color-mix(', i)) {
			const openIdx = i + 9; // index of '('
			const closeIdx = findMatchingParen(css, openIdx);
			if (closeIdx !== -1) {
				const expr = css.slice(i, closeIdx + 1);
				if (expr.includes('oklch')) {
					result += colorToRgb(expr);
				} else {
					result += expr;
				}
				i = closeIdx + 1;
				continue;
			}
		}

		// Check for oklch(
		if (css.startsWith('oklch(', i)) {
			const openIdx = i + 5; // index of '('
			const closeIdx = findMatchingParen(css, openIdx);
			if (closeIdx !== -1) {
				const expr = css.slice(i, closeIdx + 1);
				result += colorToRgb(expr);
				i = closeIdx + 1;
				continue;
			}
		}

		result += css[i];
		i++;
	}

	return result;
}

/** CSS properties that can carry color values html2canvas will try to parse. */
const COLOR_PROPS = [
	'color',
	'background-color',
	'border-color',
	'border-top-color',
	'border-right-color',
	'border-bottom-color',
	'border-left-color',
	'outline-color',
	'text-decoration-color',
	'caret-color',
	'accent-color',
	'fill',
	'stroke',
	'box-shadow',
	'text-shadow',
	'background',
	'background-image'
];

/**
 * Converts oklch() colors (unsupported by html2canvas) to rgb() on an element
 * and all its descendants by reading computed styles and overriding with rgb.
 */
export function convertOklchColors(element: HTMLElement): void {
	function processElement(el: HTMLElement) {
		const computed = getComputedStyle(el);

		// Convert standard color properties
		for (const prop of COLOR_PROPS) {
			const value = computed.getPropertyValue(prop);
			if (value && value.includes('oklch')) {
				el.style.setProperty(prop, replaceOklchInCssText(value));
			}
		}
	}

	processElement(element);
	element.querySelectorAll<HTMLElement>('*').forEach(processElement);
}

/**
 * Replaces oklch values inside all <style> elements of a document.
 * This is needed because html2canvas clones the entire document including
 * stylesheets and tries to parse CSS color values itself — it doesn't support
 * oklch, so we must convert them to rgb in the stylesheet text.
 */
export function sanitizeStylesheets(doc: Document): void {
	doc.querySelectorAll('style').forEach((style) => {
		if (style.textContent && style.textContent.includes('oklch')) {
			style.textContent = replaceOklchInCssText(style.textContent);
		}
	});
}

/**
 * Clones an element, converts oklch colors to rgb, renders to PDF, then
 * cleans up the clone. This avoids mutating the original DOM.
 */
export async function downloadPdf(element: HTMLElement, filename: string): Promise<void> {
	const html2pdf = (await import('html2pdf.js')).default;

	const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

	await html2pdf()
		.set({
			margin: [10, 10, 10, 10],
			filename: pdfFilename,
			image: { type: 'jpeg', quality: 0.98 },
			html2canvas: {
				scale: 2,
				useCORS: true,
				scrollY: 0,
				onclone: (clonedDoc: Document) => {
					sanitizeStylesheets(clonedDoc);
					convertOklchColors(clonedDoc.body);
				}
			},
			jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
		} as Record<string, unknown>)
		.from(element)
		.save();
}
