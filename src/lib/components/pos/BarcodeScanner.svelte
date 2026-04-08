<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { IconScan, IconCamera, IconCameraOff, IconX } from '@tabler/icons-svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		onscan: (barcode: string, format?: string) => void;
	}

	let { open = $bindable(), onclose, onscan }: Props = $props();

	let videoRef = $state<HTMLVideoElement | null>(null);
	let canvasRef = $state<HTMLCanvasElement | null>(null);
	let stream = $state<MediaStream | null>(null);
	let cameraError = $state<string | null>(null);
	let isScanning = $state(false);
	let lastScannedBarcode = $state('');
	let scanCooldown = $state(false);
	let animationFrameId = $state<number | null>(null);

	// USB scanner keyboard buffer
	let keyBuffer = $state('');
	let keyTimer: ReturnType<typeof setTimeout> | undefined;

	// Handle keyboard input from USB barcode scanners
	function handleKeyDown(event: KeyboardEvent) {
		if (!open) return;

		// USB scanners typically send characters rapidly followed by Enter
		if (event.key === 'Enter') {
			if (keyBuffer.length >= 4) {
				handleBarcodeScan(keyBuffer.trim(), 'keyboard');
			}
			keyBuffer = '';
			clearTimeout(keyTimer);
			return;
		}

		// Only accept printable characters
		if (event.key.length === 1) {
			keyBuffer += event.key;

			// Reset buffer after 100ms of no input (normal typing is slower)
			clearTimeout(keyTimer);
			keyTimer = setTimeout(() => {
				keyBuffer = '';
			}, 100);
		}
	}

	function handleBarcodeScan(barcode: string, format?: string) {
		if (scanCooldown || barcode === lastScannedBarcode) return;

		lastScannedBarcode = barcode;
		scanCooldown = true;

		onscan(barcode, format);

		// Prevent duplicate scans for 1.5 seconds
		setTimeout(() => {
			scanCooldown = false;
			lastScannedBarcode = '';
		}, 1500);
	}

	async function startCamera() {
		cameraError = null;

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'environment',
					width: { ideal: 640 },
					height: { ideal: 480 },
				},
			});

			if (videoRef) {
				videoRef.srcObject = stream;
				await videoRef.play();
				isScanning = true;
				startBarcodeDetection();
			}
		} catch (err) {
			cameraError =
				err instanceof DOMException && err.name === 'NotAllowedError'
					? 'Camera permission denied. Please allow camera access.'
					: 'Could not access camera. USB scanner input is still active.';
		}
	}

	async function startBarcodeDetection() {
		// Check for native BarcodeDetector support
		const hasBarcodeDetector = 'BarcodeDetector' in window;

		if (!hasBarcodeDetector) {
			// Fallback: camera shows feed, user relies on USB scanner
			return;
		}

		try {
			const detector = new (window as any).BarcodeDetector({
				formats: [
					'ean_13',
					'ean_8',
					'upc_a',
					'upc_e',
					'code_128',
					'code_39',
					'code_93',
					'codabar',
					'itf',
					'qr_code',
					'data_matrix',
				],
			});

			const detectFrame = async () => {
				if (!isScanning || !videoRef || videoRef.readyState < 2) {
					if (isScanning) {
						animationFrameId = requestAnimationFrame(detectFrame);
					}
					return;
				}

				try {
					const barcodes = await detector.detect(videoRef);
					if (barcodes.length > 0) {
						const barcode = barcodes[0];
						handleBarcodeScan(barcode.rawValue, barcode.format);
					}
				} catch {
					// Detection failed for this frame, continue
				}

				if (isScanning) {
					animationFrameId = requestAnimationFrame(detectFrame);
				}
			};

			animationFrameId = requestAnimationFrame(detectFrame);
		} catch {
			// BarcodeDetector construction failed
		}
	}

	function stopCamera() {
		isScanning = false;

		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}

		if (videoRef) {
			videoRef.srcObject = null;
		}
	}

	function handleClose() {
		stopCamera();
		onclose();
	}

	$effect(() => {
		if (open) {
			startCamera();
		} else {
			stopCamera();
		}
	});

	onMount(() => {
		window.addEventListener('keydown', handleKeyDown);
	});

	onDestroy(() => {
		stopCamera();
		clearTimeout(keyTimer);
		window.removeEventListener('keydown', handleKeyDown);
	});
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (!o) handleClose(); }}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<IconScan class="h-5 w-5" />
				Scan Barcode
			</Dialog.Title>
			<Dialog.Description>
				Point camera at a barcode or use a USB scanner.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			{#if cameraError}
				<div
					class="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 p-8"
				>
					<IconCameraOff class="mb-3 h-10 w-10 text-muted-foreground" />
					<p class="text-center text-sm text-muted-foreground">{cameraError}</p>
					<Button variant="outline" size="sm" class="mt-3" onclick={startCamera}>
						<IconCamera class="mr-1 h-4 w-4" />
						Retry Camera
					</Button>
				</div>
			{:else}
				<div class="relative overflow-hidden rounded-lg bg-black">
					<!-- svelte-ignore element_invalid_self_closing_tag -->
					<video
						bind:this={videoRef}
						class="h-auto w-full"
						playsinline
						muted
					/>
					{#if isScanning}
						<div
							class="pointer-events-none absolute inset-0 flex items-center justify-center"
						>
							<div
								class="h-48 w-64 rounded-lg border-2 border-primary/60"
							></div>
						</div>
						<div class="absolute bottom-2 left-2 right-2">
							<div
								class="rounded-md bg-black/60 px-3 py-1.5 text-center text-xs text-white"
							>
								{#if scanCooldown}
									Barcode detected!
								{:else}
									Align barcode within frame
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<div class="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
				<p class="font-medium">USB Scanner Active</p>
				<p class="mt-0.5">
					Scan with a USB barcode scanner at any time while this dialog is open.
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose}>
				<IconX class="mr-1 h-4 w-4" />
				Close
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
