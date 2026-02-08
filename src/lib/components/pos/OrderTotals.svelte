<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { createI18nUtils } from '$lib/utils/i18n';

	interface Props {
		subtotal: number;
		showTaxes: boolean;
		taxRate: number;
		taxes: number;
		showDiscount: boolean;
		discountType: 'percentage' | 'fixed';
		discountValue: number;
		discount: number;
		totalPayment: number;
		onToggleTaxes: () => void;
		onToggleDiscount: () => void;
		region?: string;
	}

	let {
		subtotal,
		showTaxes,
		taxRate,
		taxes,
		showDiscount,
		discountType,
		discountValue,
		discount,
		totalPayment,
		onToggleTaxes,
		onToggleDiscount,
		region = 'us'
	}: Props = $props();

	const i18n = createI18nUtils(region);
</script>

<div class="border-t border-border bg-muted/30 p-4">
	<!-- Subtotal -->
	<div class="flex items-center justify-between py-2">
		<span class="text-sm text-muted-foreground">Subtotal</span>
		<span class="text-sm font-medium">{i18n.formatCurrency(subtotal)}</span>
	</div>

	<!-- Tax Toggle Row -->
	<div class="flex items-center justify-between py-2">
		<button
			onclick={onToggleTaxes}
			class="flex items-center gap-3 text-left"
		>
			<Switch checked={showTaxes} />
			<span class="text-sm {showTaxes ? 'text-foreground' : 'text-muted-foreground'}">
				Tax ({taxRate}%)
			</span>
		</button>
		{#if showTaxes}
			<span class="text-sm font-medium">{i18n.formatCurrency(taxes)}</span>
		{:else}
			<span class="text-sm text-muted-foreground">—</span>
		{/if}
	</div>

	<!-- Discount Toggle Row -->
	<div class="flex items-center justify-between py-2">
		<button
			onclick={onToggleDiscount}
			class="flex items-center gap-3 text-left"
		>
			<Switch checked={showDiscount} />
			<span class="text-sm {showDiscount ? 'text-foreground' : 'text-muted-foreground'}">
				Discount
				{#if showDiscount && discountValue > 0}
					<span class="ml-1 text-xs text-green-600">
						({discountType === 'percentage' ? `${discountValue}%` : i18n.formatCurrency(discountValue)})
					</span>
				{/if}
			</span>
		</button>
		{#if showDiscount && discount > 0}
			<span class="text-sm font-medium text-green-600">-{i18n.formatCurrency(discount)}</span>
		{:else}
			<span class="text-sm text-muted-foreground">—</span>
		{/if}
	</div>

	<!-- Total -->
	<div class="mt-2 flex items-center justify-between border-t border-border pt-4">
		<span class="text-base font-semibold">Total</span>
		<span class="text-2xl font-bold">{i18n.formatCurrency(totalPayment)}</span>
	</div>
</div>
