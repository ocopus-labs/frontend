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
 * Dynamically imports html2pdf.js (already installed), renders the given
 * HTML element to a PDF, and triggers the download.
 */
export async function downloadPdf(element: HTMLElement, filename: string): Promise<void> {
	const html2pdf = (await import('html2pdf.js')).default;

	const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

	await html2pdf()
		.set({
			margin: [10, 10, 10, 10],
			filename: pdfFilename,
			image: { type: 'jpeg', quality: 0.98 },
			html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
			jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
		} as Record<string, unknown>)
		.from(element)
		.save();
}
