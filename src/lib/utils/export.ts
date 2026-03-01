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
 * Converts oklch() colors (unsupported by html2canvas) to rgb() on an element
 * and all its descendants by reading the computed styles.
 */
export function convertOklchColors(element: HTMLElement): void {
	const colorProps = ['color', 'background-color', 'border-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'text-decoration-color'];

	function processElement(el: HTMLElement) {
		const computed = getComputedStyle(el);
		for (const prop of colorProps) {
			const value = computed.getPropertyValue(prop);
			if (value && value.includes('oklch')) {
				// getComputedStyle returns resolved values — reading it and
				// writing it back forces the browser to serialize as rgb()
				el.style.setProperty(prop, value);
			}
		}
	}

	processElement(element);
	element.querySelectorAll<HTMLElement>('*').forEach(processElement);
}

/**
 * Clones an element, converts oklch colors to rgb, renders to PDF, then
 * cleans up the clone. This avoids mutating the original DOM.
 */
export async function downloadPdf(element: HTMLElement, filename: string): Promise<void> {
	const html2pdf = (await import('html2pdf.js')).default;

	const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

	// Clone to avoid mutating visible DOM
	const clone = element.cloneNode(true) as HTMLElement;
	clone.style.position = 'fixed';
	clone.style.left = '-9999px';
	document.body.appendChild(clone);

	try {
		convertOklchColors(clone);

		await html2pdf()
			.set({
				margin: [10, 10, 10, 10],
				filename: pdfFilename,
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
				jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
			} as Record<string, unknown>)
			.from(clone)
			.save();
	} finally {
		document.body.removeChild(clone);
	}
}
