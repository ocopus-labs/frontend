<script lang="ts">
	import { createI18nUtils } from '$lib/utils/i18n';
	import type { Receipt, PaymentMethod } from '$lib/api';

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
	}

	let { receipt, business, orderNumber, paymentNumber, change }: Props = $props();

	const i18n = createI18nUtils('in');

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-IN', {
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

<div class="receipt" id="receipt-content">
	<!-- Receipt Header -->
	<div class="receipt-header">
		<h1 class="business-name">{business.name}</h1>
		{#if business.address}
			<p class="business-address">{formatAddress(business.address)}</p>
		{/if}
		{#if business.contact?.phone}
			<p class="business-contact">Tel: {business.contact.phone}</p>
		{/if}
		{#if business.contact?.email}
			<p class="business-contact">{business.contact.email}</p>
		{/if}
	</div>

	<div class="divider"></div>

	<!-- Order Info -->
	<div class="order-info">
		<div class="info-row">
			<span>Order #:</span>
			<span>{orderNumber}</span>
		</div>
		<div class="info-row">
			<span>Receipt #:</span>
			<span>{receipt.receiptNumber}</span>
		</div>
		<div class="info-row">
			<span>Date:</span>
			<span>{formatDate(receipt.generatedAt)}</span>
		</div>
	</div>

	<div class="divider"></div>

	<!-- Items -->
	<div class="items-section">
		<div class="items-header">
			<span class="item-name-header">Item</span>
			<span class="item-qty-header">Qty</span>
			<span class="item-price-header">Price</span>
			<span class="item-total-header">Total</span>
		</div>
		{#each receipt.items as item}
			<div class="item-row">
				<span class="item-name">{item.name}</span>
				<span class="item-qty">{item.quantity}</span>
				<span class="item-price">{i18n.formatCurrency(item.price)}</span>
				<span class="item-total">{i18n.formatCurrency(item.total)}</span>
			</div>
		{/each}
	</div>

	<div class="divider"></div>

	<!-- Totals -->
	<div class="totals-section">
		<div class="total-row">
			<span>Subtotal</span>
			<span>{i18n.formatCurrency(receipt.subtotal)}</span>
		</div>
		{#if receipt.tax > 0}
			<div class="total-row">
				<span>Tax</span>
				<span>{i18n.formatCurrency(receipt.tax)}</span>
			</div>
		{/if}
		{#if receipt.discount > 0}
			<div class="total-row discount">
				<span>Discount</span>
				<span>-{i18n.formatCurrency(receipt.discount)}</span>
			</div>
		{/if}
		<div class="total-row grand-total">
			<span>Total</span>
			<span>{i18n.formatCurrency(receipt.total)}</span>
		</div>
	</div>

	<div class="divider"></div>

	<!-- Payment Info -->
	<div class="payment-section">
		<div class="total-row">
			<span>Payment Method</span>
			<span>{formatPaymentMethod(receipt.paymentMethod)}</span>
		</div>
		<div class="total-row">
			<span>Amount Paid</span>
			<span>{i18n.formatCurrency(receipt.amountPaid)}</span>
		</div>
		{#if change && change > 0}
			<div class="total-row change">
				<span>Change</span>
				<span>{i18n.formatCurrency(change)}</span>
			</div>
		{/if}
	</div>

	<div class="divider"></div>

	<!-- Footer -->
	<div class="receipt-footer">
		<p>Thank you for your visit!</p>
		<p class="payment-ref">Ref: {paymentNumber}</p>
	</div>
</div>

<style>
	.receipt {
		font-family: 'Courier New', Courier, monospace;
		font-size: 12px;
		max-width: 300px;
		margin: 0 auto;
		padding: 16px;
		background: white;
		color: black;
	}

	.receipt-header {
		text-align: center;
		margin-bottom: 8px;
	}

	.business-name {
		font-size: 18px;
		font-weight: bold;
		margin: 0 0 4px 0;
	}

	.business-address,
	.business-contact {
		font-size: 10px;
		margin: 2px 0;
		color: #333;
	}

	.divider {
		border-top: 1px dashed #333;
		margin: 8px 0;
	}

	.order-info {
		margin: 8px 0;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		margin: 2px 0;
	}

	.items-section {
		margin: 8px 0;
	}

	.items-header {
		display: grid;
		grid-template-columns: 2fr 0.5fr 1fr 1fr;
		font-weight: bold;
		font-size: 10px;
		padding-bottom: 4px;
		border-bottom: 1px solid #ccc;
		margin-bottom: 4px;
	}

	.item-row {
		display: grid;
		grid-template-columns: 2fr 0.5fr 1fr 1fr;
		font-size: 11px;
		padding: 2px 0;
	}

	.item-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-qty {
		text-align: center;
	}

	.item-price,
	.item-total {
		text-align: right;
	}

	.totals-section,
	.payment-section {
		margin: 8px 0;
	}

	.total-row {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		margin: 3px 0;
	}

	.total-row.discount {
		color: #16a34a;
	}

	.total-row.grand-total {
		font-size: 14px;
		font-weight: bold;
		margin-top: 6px;
		padding-top: 4px;
		border-top: 1px solid #333;
	}

	.total-row.change {
		color: #16a34a;
		font-weight: bold;
	}

	.receipt-footer {
		text-align: center;
		margin-top: 12px;
		font-size: 11px;
	}

	.receipt-footer p {
		margin: 4px 0;
	}

	.payment-ref {
		font-size: 9px;
		color: #666;
	}

	/* Print-specific styles */
	@media print {
		.receipt {
			max-width: 80mm;
			padding: 4mm;
			font-size: 10px;
		}

		.business-name {
			font-size: 14px;
		}

		.items-header,
		.item-row,
		.info-row,
		.total-row {
			font-size: 9px;
		}

		.total-row.grand-total {
			font-size: 11px;
		}
	}
</style>
