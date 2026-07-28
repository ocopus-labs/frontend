<script lang="ts">
	import { createI18nUtils } from '$lib/utils/i18n';
	import type { Receipt, PaymentMethod } from '$lib/api';
	import type { TaxBreakdown } from '$lib/api/tax';

	interface BusinessInfo {
		name: string;
		address?: {
			street?: string;
			city?: string;
			state?: string;
			postalCode?: string;
			country?: string;
		};
		contact?: {
			phone?: string;
			email?: string;
		};
	}

	interface Props {
		receipt: Receipt;
		business: BusinessInfo;
		orderNumber: string;
		paymentNumber: string;
		change?: number;
		region?: string;
		taxBreakdown?: TaxBreakdown;
		registrationNumber?: string;
		registrationLabel?: string;
		invoiceNumber?: string;
		customerTaxId?: string;
		customerTaxIdLabel?: string;
	}

	let {
		receipt,
		business,
		orderNumber,
		paymentNumber,
		change,
		region = 'us',
		taxBreakdown,
		registrationNumber,
		registrationLabel,
		invoiceNumber,
		customerTaxId,
		customerTaxIdLabel
	}: Props = $props();

	const i18n = createI18nUtils(region);

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString(i18n.getLocale(), {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatPaymentMethod(method: PaymentMethod): string {
		const methods: Record<PaymentMethod, string> = {
			cash: 'Cash',
			card: 'Card',
			upi: 'UPI',
			net_banking: 'Net Banking',
			wallet: 'Wallet',
			razorpay: 'Razorpay',
			stripe: 'Stripe',
			other: 'Other'
		};
		return methods[method] || method;
	}

	function formatAddress(address?: BusinessInfo['address']): string {
		if (!address) return '';
		const parts = [address.street, address.city, address.state, address.postalCode]
			.filter(Boolean)
			.join(', ');
		return parts;
	}
</script>

<div
	class="mx-auto max-w-[300px] bg-white p-4 font-mono text-xs text-black print:max-w-[80mm] print:p-[4mm] print:text-[10px]"
	id="receipt-content"
>
	<!-- Receipt Header -->
	<div class="mb-2 text-center">
		<h1 class="mb-1 text-lg font-bold print:text-sm">{business.name}</h1>
		{#if business.address}
			<p class="my-0.5 text-[10px] text-gray-700">{formatAddress(business.address)}</p>
		{/if}
		{#if business.contact?.phone}
			<p class="my-0.5 text-[10px] text-gray-700">Tel: {business.contact.phone}</p>
		{/if}
		{#if business.contact?.email}
			<p class="my-0.5 text-[10px] text-gray-700">{business.contact.email}</p>
		{/if}
		{#if registrationNumber}
			<p class="my-0.5 text-[10px] text-gray-700">
				{registrationLabel || 'Tax ID'}: {registrationNumber}
			</p>
		{/if}
	</div>

	<div class="my-2 border-t border-dashed border-gray-700"></div>

	<!-- Order Info -->
	<div class="my-2">
		{#if invoiceNumber}
			<div class="my-0.5 flex justify-between text-[11px] font-bold print:text-[9px]">
				<span>Invoice #:</span>
				<span>{invoiceNumber}</span>
			</div>
		{/if}
		<div class="my-0.5 flex justify-between text-[11px] print:text-[9px]">
			<span>Order #:</span>
			<span>{orderNumber}</span>
		</div>
		<div class="my-0.5 flex justify-between text-[11px] print:text-[9px]">
			<span>Receipt #:</span>
			<span>{receipt.receiptNumber}</span>
		</div>
		<div class="my-0.5 flex justify-between text-[11px] print:text-[9px]">
			<span>Date:</span>
			<span>{formatDate(receipt.generatedAt)}</span>
		</div>
		{#if customerTaxId}
			<div class="my-0.5 flex justify-between text-[11px] print:text-[9px]">
				<span>{customerTaxIdLabel || 'Customer Tax ID'}:</span>
				<span>{customerTaxId}</span>
			</div>
		{/if}
	</div>

	<div class="my-2 border-t border-dashed border-gray-700"></div>

	<!-- Items -->
	<div class="my-2">
		<div
			class="mb-1 grid grid-cols-[2fr_0.5fr_1fr_1fr] border-b border-gray-300 pb-1 text-[10px] font-bold print:text-[9px]"
		>
			<span>Item</span>
			<span class="text-center">Qty</span>
			<span class="text-right">Price</span>
			<span class="text-right">Total</span>
		</div>
		{#each receipt.items as item}
			<div class="grid grid-cols-[2fr_0.5fr_1fr_1fr] py-0.5 text-[11px] print:text-[9px]">
				<span class="truncate">{item.name}</span>
				<span class="text-center">{item.quantity}</span>
				<span class="text-right">{i18n.formatCurrency(item.price)}</span>
				<span class="text-right">{i18n.formatCurrency(item.total)}</span>
			</div>
		{/each}
	</div>

	<div class="my-2 border-t border-dashed border-gray-700"></div>

	<!-- Totals -->
	<div class="my-2">
		<div class="my-[3px] flex justify-between text-[11px] print:text-[9px]">
			<span>Subtotal</span>
			<span>{i18n.formatCurrency(receipt.subtotal)}</span>
		</div>
		{#if taxBreakdown}
			<!-- Component-wise tax breakdown -->
			{#each Object.entries(taxBreakdown.componentTotals) as [name, amount]}
				{#if amount > 0}
					<div class="my-[3px] flex justify-between text-[11px] print:text-[9px]">
						<span>{name}</span>
						<span>{i18n.formatCurrency(amount)}</span>
					</div>
				{/if}
			{/each}
		{:else if receipt.tax > 0}
			<div class="my-[3px] flex justify-between text-[11px] print:text-[9px]">
				<span>Tax</span>
				<span>{i18n.formatCurrency(receipt.tax)}</span>
			</div>
		{/if}
		{#if receipt.discount > 0}
			<div
				class="my-[3px] flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400 print:text-[9px]"
			>
				<span>Discount</span>
				<span>-{i18n.formatCurrency(receipt.discount)}</span>
			</div>
		{/if}
		<div
			class="mt-1.5 flex justify-between border-t border-gray-700 pt-1 text-sm font-bold print:text-[11px]"
		>
			<span>Total</span>
			<span>{i18n.formatCurrency(receipt.total)}</span>
		</div>
	</div>

	<!-- Tax Rate Summary (when multiple rates exist) -->
	{#if taxBreakdown && taxBreakdown.rateSummary.length > 1}
		<div class="my-2 border-t border-dashed border-gray-700"></div>
		<div class="my-2">
			<p class="mb-1 text-[10px] font-bold">Tax Summary</p>
			{#each taxBreakdown.rateSummary as rs}
				<div class="my-[2px] flex justify-between text-[10px] print:text-[8px]">
					<span>{rs.rate}% on {i18n.formatCurrency(rs.taxableValue)}</span>
					<span>{i18n.formatCurrency(rs.total)}</span>
				</div>
			{/each}
		</div>
	{/if}

	<div class="my-2 border-t border-dashed border-gray-700"></div>

	<!-- Payment Info -->
	<div class="my-2">
		<div class="my-[3px] flex justify-between text-[11px] print:text-[9px]">
			<span>Payment Method</span>
			<span>{formatPaymentMethod(receipt.paymentMethod)}</span>
		</div>
		<div class="my-[3px] flex justify-between text-[11px] print:text-[9px]">
			<span>Amount Paid</span>
			<span>{i18n.formatCurrency(receipt.amountPaid)}</span>
		</div>
		{#if change && change > 0}
			<div
				class="my-[3px] flex justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400 print:text-[9px]"
			>
				<span>Change</span>
				<span>{i18n.formatCurrency(change)}</span>
			</div>
		{/if}
	</div>

	<div class="my-2 border-t border-dashed border-gray-700"></div>

	<!-- Footer -->
	<div class="mt-3 text-center text-[11px]">
		<p class="my-1">Thank you for your visit!</p>
		<p class="text-[9px] text-gray-500">Ref: {paymentNumber}</p>
	</div>
</div>
