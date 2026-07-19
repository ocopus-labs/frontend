<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
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
		<!--
			Switch renders its own <button>, so wrapping it in one was invalid HTML
			that the parser splits during hydration — and it left the switch not
			independently focusable. The Label is the click target now.
		-->
		<div class="flex items-center gap-3">
			<Switch id="toggle-taxes" checked={showTaxes} onCheckedChange={onToggleTaxes} />
			<Label
				for="toggle-taxes"
				class="cursor-pointer text-sm font-normal {showTaxes
					? 'text-foreground'
					: 'text-muted-foreground'}"
			>
				Tax ({taxRate}%)
			</Label>
		</div>
		{#if showTaxes}
			<span class="text-sm font-medium">{i18n.formatCurrency(taxes)}</span>
		{:else}
			<span class="text-sm text-muted-foreground">—</span>
		{/if}
	</div>

	<!-- Discount Toggle Row -->
	<div class="flex items-center justify-between py-2">
		<div class="flex items-center gap-3">
			<Switch id="toggle-discount" checked={showDiscount} onCheckedChange={onToggleDiscount} />
			<Label
				for="toggle-discount"
				class="cursor-pointer text-sm font-normal {showDiscount
					? 'text-foreground'
					: 'text-muted-foreground'}"
			>
				Discount
				{#if showDiscount && discountValue > 0}
					<span class="ml-1 text-xs text-success">
						({discountType === 'percentage'
							? `${discountValue}%`
							: i18n.formatCurrency(discountValue)})
					</span>
				{/if}
			</Label>
		</div>
		{#if showDiscount && discount > 0}
			<span class="text-sm font-medium text-success">-{i18n.formatCurrency(discount)}</span>
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
