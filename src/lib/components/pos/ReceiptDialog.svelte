<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		IconPrinter,
		IconX,
		IconCheck,
		IconDownload,
		IconMail,
		IconBrandWhatsapp,
		IconSend,
		IconLoader2,
		IconHistory,
		IconUsb
	} from '@tabler/icons-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import Receipt from './Receipt.svelte';
	import {
		generateReceipt,
		getPaymentById,
		sendReceipt,
		getReceiptDeliveries,
		type Receipt as ReceiptType,
		type PaymentMethod,
		type ReceiptDelivery
	} from '$lib/api';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { env } from '$env/dynamic/public';
	import { convertOklchColors, sanitizeStylesheets } from '$lib/utils/export';

	interface Props {
		open: boolean;
		paymentId: string;
		orderId?: string;
		change?: number;
		onClose: () => void;
		onPrintComplete?: () => void;
		region?: string;
	}

	let {
		open,
		paymentId,
		orderId,
		change,
		onClose,
		onPrintComplete,
		region = 'us'
	}: Props = $props();

	let isLoading = $state(true);
	let isPrinting = $state(false);
	let isDownloading = $state(false);
	let isThermalPrinting = $state(false);
	let error = $state<string | null>(null);

	let receiptData = $state<{
		receipt: ReceiptType;
		business: { name: string; address: object; contact: object };
		orderNumber: string;
		paymentNumber: string;
	} | null>(null);

	// Send receipt state
	let resolvedOrderId = $state<string | null>(null);
	let sendChannel = $state<'email' | 'whatsapp' | null>(null);
	let recipient = $state('');
	let isSending = $state(false);
	let deliveries = $state<ReceiptDelivery[]>([]);
	let showDeliveryHistory = $state(false);
	let customerEmail = $state('');
	let customerPhone = $state('');

	$effect(() => {
		if (open && paymentId) {
			loadReceipt();
		}
	});

	async function loadReceipt() {
		isLoading = true;
		error = null;
		sendChannel = null;
		recipient = '';
		deliveries = [];
		showDeliveryHistory = false;

		try {
			const businessId = $page.data.business.id;
			const data = await generateReceipt(businessId, paymentId);
			receiptData = data;

			// Resolve orderId and customer info from payment
			try {
				const paymentData = await getPaymentById(businessId, paymentId);
				resolvedOrderId = orderId || paymentData.payment.orderId;
				// Pre-fill customer info if available
				if (paymentData.payment.customerInfo) {
					customerEmail = paymentData.payment.customerInfo.email || '';
					customerPhone = paymentData.payment.customerInfo.phone || '';
				}
			} catch {
				resolvedOrderId = orderId || null;
			}

			// Load delivery history if we have an orderId
			if (resolvedOrderId) {
				loadDeliveries();
			}
		} catch (err) {
			console.error('Failed to load receipt:', err);
			error = 'Failed to load receipt. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function loadDeliveries() {
		if (!resolvedOrderId) return;
		try {
			const businessId = $page.data.business.id;
			deliveries = await getReceiptDeliveries(businessId, resolvedOrderId);
		} catch {
			// Silently fail — delivery history is not critical
			deliveries = [];
		}
	}

	function handleSelectChannel(channel: 'email' | 'whatsapp') {
		sendChannel = channel;
		// Pre-fill recipient based on channel
		recipient = channel === 'email' ? customerEmail : customerPhone;
	}

	function handleCancelSend() {
		sendChannel = null;
		recipient = '';
	}

	async function handleSendReceipt() {
		if (!resolvedOrderId || !sendChannel || !recipient.trim()) return;
		isSending = true;
		try {
			const businessId = $page.data.business.id;
			await sendReceipt(businessId, resolvedOrderId, {
				channel: sendChannel,
				recipient: recipient.trim()
			});
			toast.success(`Receipt sent via ${sendChannel === 'email' ? 'email' : 'WhatsApp'}`);
			sendChannel = null;
			recipient = '';
			// Refresh delivery history
			loadDeliveries();
		} catch (err) {
			console.error('Failed to send receipt:', err);
			toast.error('Failed to send receipt. Please try again.');
		} finally {
			isSending = false;
		}
	}

	function handlePrint() {
		isPrinting = true;

		// Use a slight delay to ensure the print dialog opens properly
		setTimeout(() => {
			window.print();
			isPrinting = false;
			onPrintComplete?.();
		}, 100);
	}

	async function handleDownloadPdf() {
		if (!receiptData) return;
		isDownloading = true;

		try {
			const html2pdf = (await import('html2pdf.js')).default;
			const receiptEl = document.querySelector('.receipt-preview-content') as HTMLElement | null;
			if (!receiptEl) throw new Error('Receipt element not found');

			const filename = `receipt-${receiptData.paymentNumber || 'unknown'}.pdf`;
			await html2pdf()
				.set({
					margin: 4,
					filename,
					image: { type: 'jpeg', quality: 0.98 },
					html2canvas: {
						scale: 2,
						useCORS: true,
						onclone: (clonedDoc: Document) => {
							sanitizeStylesheets(clonedDoc);
							convertOklchColors(clonedDoc.body);
						}
					},
					jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
				})
				.from(receiptEl)
				.save();

			toast.success('Receipt downloaded');
		} catch (err) {
			console.error('Failed to download PDF:', err);
			toast.error('Failed to download receipt');
		} finally {
			isDownloading = false;
		}
	}

	async function fetchThermalData(): Promise<ArrayBuffer | null> {
		if (!resolvedOrderId) return null;
		const businessId = $page.data.business.id;
		const baseUrl = env.PUBLIC_API_BASE || '/api/v1';
		const url = `${baseUrl}/business/${businessId}/orders/${resolvedOrderId}/thermal-receipt`;

		const response = await fetch(url, { credentials: 'include' });
		if (!response.ok) {
			throw new Error(`Failed to fetch thermal receipt: ${response.statusText}`);
		}
		return response.arrayBuffer();
	}

	async function sendToUsbPrinter(data: ArrayBuffer): Promise<boolean> {
		// WebUSB API — navigator.usb is not in all TS lib typings
		const usb = (navigator as any).usb;
		if (!usb) return false;

		try {
			const device = await usb.requestDevice({
				filters: [{ classCode: 7 }] // Printer class
			});

			await device.open();

			if (device.configuration === null) {
				await device.selectConfiguration(1);
			}

			const iface = device.configuration?.interfaces.find((i: any) =>
				i.alternate.endpoints.some((e: any) => e.direction === 'out' && e.type === 'bulk')
			);

			if (!iface) {
				throw new Error('No suitable printer interface found');
			}

			await device.claimInterface(iface.interfaceNumber);

			const endpoint = iface.alternate.endpoints.find(
				(e: any) => e.direction === 'out' && e.type === 'bulk'
			);

			if (!endpoint) {
				throw new Error('No bulk OUT endpoint found');
			}

			await device.transferOut(endpoint.endpointNumber, data);
			await device.close();
			return true;
		} catch (err) {
			if (err instanceof DOMException && err.name === 'NotFoundError') {
				return false; // User cancelled device picker
			}
			throw err;
		}
	}

	async function handleThermalPrint() {
		if (!resolvedOrderId) {
			toast.error('Order information not available for thermal printing');
			return;
		}

		isThermalPrinting = true;
		try {
			const data = await fetchThermalData();
			if (!data) {
				toast.error('Failed to generate thermal receipt data');
				return;
			}

			// Try WebUSB if available
			if ((navigator as any).usb) {
				const sent = await sendToUsbPrinter(data);
				if (sent) {
					toast.success('Receipt sent to thermal printer');
					return;
				}
			}

			// Fallback: download the .bin file
			const blob = new Blob([data], { type: 'application/octet-stream' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `receipt-${resolvedOrderId}.bin`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success('Thermal receipt file downloaded');
		} catch (err) {
			console.error('Thermal print failed:', err);
			toast.error('Failed to send to thermal printer');
		} finally {
			isThermalPrinting = false;
		}
	}

	function handleClose() {
		receiptData = null;
		error = null;
		sendChannel = null;
		recipient = '';
		resolvedOrderId = null;
		deliveries = [];
		showDeliveryHistory = false;
		onClose();
	}

	function formatDeliveryTime(dateStr: string): string {
		try {
			return new Date(dateStr).toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return dateStr;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<Dialog.Content class="max-w-md print:hidden">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<IconPrinter class="h-5 w-5" />
				Receipt
			</Dialog.Title>
			<Dialog.Description>Preview and print your receipt</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-[60vh] overflow-y-auto py-4">
			{#if isLoading}
				<div class="flex h-48 items-center justify-center">
					<div
						class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
					></div>
				</div>
			{:else if error}
				<div class="flex h-48 flex-col items-center justify-center gap-4 text-center">
					<p class="text-destructive">{error}</p>
					<Button variant="outline" onclick={loadReceipt}>Try Again</Button>
				</div>
			{:else if receiptData}
				<div class="receipt-preview-content rounded-lg border border-border bg-white">
					<Receipt
						receipt={receiptData.receipt}
						business={receiptData.business}
						orderNumber={receiptData.orderNumber}
						paymentNumber={receiptData.paymentNumber}
						{change}
						{region}
					/>
				</div>
			{/if}
		</div>

		{#if receiptData && resolvedOrderId}
			<Separator />

			<!-- Send Receipt Section -->
			<div class="space-y-3 py-2">
				<p class="text-sm font-medium">Send Receipt</p>

				{#if sendChannel === null}
					<div class="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onclick={() => handleSelectChannel('email')}
							disabled={isLoading || !!error}
						>
							<IconMail class="mr-2 h-4 w-4" />
							Email
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={() => handleSelectChannel('whatsapp')}
							disabled={isLoading || !!error}
						>
							<IconBrandWhatsapp class="mr-2 h-4 w-4" />
							WhatsApp
						</Button>
						{#if deliveries.length > 0}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => (showDeliveryHistory = !showDeliveryHistory)}
							>
								<IconHistory class="mr-2 h-4 w-4" />
								History ({deliveries.length})
							</Button>
						{/if}
					</div>
				{:else}
					<div class="flex gap-2">
						<Input
							type={sendChannel === 'email' ? 'email' : 'tel'}
							placeholder={sendChannel === 'email' ? 'customer@example.com' : '+1 234 567 8900'}
							bind:value={recipient}
							class="h-9 text-sm"
							disabled={isSending}
						/>
						<Button size="sm" onclick={handleSendReceipt} disabled={isSending || !recipient.trim()}>
							{#if isSending}
								<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
								Sending...
							{:else}
								<IconSend class="mr-2 h-4 w-4" />
								Send
							{/if}
						</Button>
						<Button variant="ghost" size="sm" onclick={handleCancelSend} disabled={isSending}>
							<IconX class="h-4 w-4" />
						</Button>
					</div>
				{/if}

				<!-- Delivery History -->
				{#if showDeliveryHistory && deliveries.length > 0}
					<div class="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2">
						{#each deliveries as delivery}
							<div class="flex items-center justify-between text-xs text-muted-foreground">
								<div class="flex items-center gap-1.5">
									{#if delivery.channel === 'email'}
										<IconMail class="h-3 w-3" />
									{:else}
										<IconBrandWhatsapp class="h-3 w-3" />
									{/if}
									<span class="max-w-[160px] truncate">{delivery.recipient}</span>
								</div>
								<div class="flex items-center gap-1.5">
									<span class="capitalize">{delivery.status}</span>
									<span>{formatDeliveryTime(delivery.createdAt)}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<Dialog.Footer class="flex gap-2 sm:justify-between">
			<Button variant="outline" onclick={handleClose}>
				<IconX class="mr-2 h-4 w-4" />
				Close
			</Button>
			<div class="flex gap-2">
				{#if resolvedOrderId}
					<Button
						variant="outline"
						onclick={handleThermalPrint}
						disabled={isLoading || !!error || isThermalPrinting}
						title="Send to thermal printer via USB or download ESC/POS file"
					>
						<IconUsb class="mr-2 h-4 w-4" />
						{isThermalPrinting ? 'Sending...' : 'Thermal'}
					</Button>
				{/if}
				<Button
					variant="outline"
					onclick={handleDownloadPdf}
					disabled={isLoading || !!error || isDownloading}
				>
					<IconDownload class="mr-2 h-4 w-4" />
					{isDownloading ? 'Downloading...' : 'Download PDF'}
				</Button>
				<Button onclick={handlePrint} disabled={isLoading || !!error || isPrinting}>
					<IconPrinter class="mr-2 h-4 w-4" />
					{isPrinting ? 'Printing...' : 'Print'}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Print-only content (hidden on screen, shown when printing) -->
{#if open && receiptData}
	<div class="print-only">
		<Receipt
			receipt={receiptData.receipt}
			business={receiptData.business}
			orderNumber={receiptData.orderNumber}
			paymentNumber={receiptData.paymentNumber}
			{change}
			{region}
		/>
	</div>
{/if}

<style>
	/* Print-only class - hidden on screen, visible when printing */
	.print-only {
		display: none;
	}

	@media print {
		.print-only {
			display: block;
		}
	}
</style>
