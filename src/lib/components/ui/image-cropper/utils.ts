/*
	Installed from @ieedan/shadcn-svelte-extras
*/

import Compressor from 'compressorjs';
import type { CropArea } from 'svelte-easy-crop';

export const getFileFromUrl = async (url: string, fileName = 'cropped.png'): Promise<File> => {
	// Fetch the file data from the URL
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`);
	}

	// Convert the response into a Blob
	const blob = await response.blob();

	// Create and return a File. You can set a custom type if needed.
	return new File([blob], fileName, { type: blob.type });
};

const createImage = (url: string): Promise<HTMLImageElement> => {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.addEventListener('load', () => resolve(image));
		image.addEventListener('error', (error) => reject(error));
		image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
		image.src = url;
	});
};

const getRadianAngle = (degreeValue: number) => {
	return (degreeValue * Math.PI) / 180;
};

const MAX_OUTPUT_SIZE = 500;

/** Compress a blob using compressor.js and return a base64 data URI */
const compressBlob = (blob: Blob, quality: number): Promise<string> => {
	return new Promise((resolve, reject) => {
		new Compressor(blob as File, {
			quality,
			maxWidth: MAX_OUTPUT_SIZE,
			maxHeight: MAX_OUTPUT_SIZE,
			mimeType: 'image/webp',
			success(result) {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.onerror = reject;
				reader.readAsDataURL(result);
			},
			error: reject
		});
	});
};

/** Gets the cropped image from the src using the cropped area
 *
 * @param imageSrc
 * @param pixelCrop
 * @param rotation
 * @param quality - Output quality 0-1 (default 0.8)
 * @returns base64 data URI
 */
export const getCroppedImg = async (
	imageSrc: string,
	pixelCrop: CropArea,
	rotation = 0,
	quality = 0.8
): Promise<string> => {
	const image = await createImage(imageSrc);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		throw new Error('Error getting 2d rendering context');
	}

	const maxSize = Math.max(image.width, image.height);
	const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

	// set each dimensions to double largest dimension to allow for a safe area for the
	// image to rotate in without being clipped by canvas context
	canvas.width = safeArea;
	canvas.height = safeArea;

	// translate canvas context to a central location on image to allow rotating around the center.
	ctx.translate(safeArea / 2, safeArea / 2);
	ctx.rotate(getRadianAngle(rotation));
	ctx.translate(-safeArea / 2, -safeArea / 2);

	// draw rotated image and store data.
	ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);
	const data = ctx.getImageData(0, 0, safeArea, safeArea);

	// set canvas width to final desired crop size - this will clear existing context
	canvas.width = pixelCrop.width;
	canvas.height = pixelCrop.height;

	// paste generated rotate image with correct offsets for x,y crop values.
	ctx.putImageData(
		data,
		Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
		Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
	);

	// Return a data URL (base64) instead of a blob URL so the backend
	// can detect it via startsWith('data:') and upload to Cloudinary.
	// Blob URLs (blob:http://localhost/...) are only valid in the current
	// browser session and cannot be processed server-side.
	//
	// The uncompressed PNG is the fallback, not the happy path: a crop off a
	// phone photo runs to several MB, and the API rejects bodies over 5MB before
	// any handler sees them. Compressing to a bounded WebP first keeps the
	// upload small — the CDN downsizes to 500x500 anyway, so the extra bytes
	// buy nothing.
	const pngDataUrl = () => canvas.toDataURL('image/png');

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));

	if (!blob) return pngDataUrl();

	try {
		return await compressBlob(blob, quality);
	} catch {
		// compressor.js failed, or the browser can't encode WebP. Sending the
		// larger PNG is better than failing the crop outright.
		return pngDataUrl();
	}
};
