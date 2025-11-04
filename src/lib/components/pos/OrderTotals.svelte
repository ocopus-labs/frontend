<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { IconPlus, IconTrash } from '@tabler/icons-svelte';
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
		onToggleDiscount
	}: Props = $props();

	// Initialize i18n for India
	const i18n = createI18nUtils('in');
</script>

<div class="space-y-3 border-t border-border p-4 lg:p-6">
	<div class="flex justify-between text-sm">
		<span class="text-muted-foreground">Subtotal</span>
		<span class="font-medium">{i18n.formatCurrency(subtotal)}</span>
	</div>

	<!-- Taxes Section -->
	{#if showTaxes}
		<div class="flex items-center justify-between text-sm">
			<div class="flex items-center gap-2">
				<span class="text-muted-foreground">Taxes ({taxRate}%)</span>
				<button
					onclick={onToggleTaxes}
					class="text-muted-foreground hover:text-destructive"
					title="Remove taxes"
				>
					<IconTrash class="h-3 w-3" />
				</button>
			</div>
			<span class="font-medium">{i18n.formatCurrency(taxes)}</span>
		</div>
	{:else}
		<button
			onclick={onToggleTaxes}
			class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
		>
			<IconPlus class="h-3 w-3" />
			Add Taxes
		</button>
	{/if}

	<!-- Discount Section -->
	{#if showDiscount}
		<div class="space-y-2">
			<div class="flex items-center justify-between text-sm">
				<div class="flex items-center gap-2">
					<span class="text-muted-foreground">Discount</span>
					<button
						onclick={onToggleDiscount}
						class="text-muted-foreground hover:text-destructive"
						title="Remove discount"
					>
						<IconTrash class="h-3 w-3" />
					</button>
				</div>
				<Badge variant="outline" class="border-green-200 bg-green-50 text-green-700">
					{discountType === 'percentage'
						? `${discountValue}%`
						: `${i18n.formatCurrency(discountValue)}`} Discount
				</Badge>
			</div>
			<div class="flex justify-between text-sm text-destructive">
				<span></span>
				<span class="font-medium">-{i18n.formatCurrency(discount)}</span>
			</div>
		</div>
	{:else}
		<button
			onclick={onToggleDiscount}
			class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
		>
			<IconPlus class="h-3 w-3" />
			Add Discount
		</button>
	{/if}

	<div class="border-t border-border pt-3">
		<div class="mb-4 flex items-center justify-between">
			<span class="font-semibold">Total Payment</span>
			<span class="text-xl font-bold">{i18n.formatCurrency(totalPayment)}</span>
		</div>
		<Button class="h-12 w-full text-base">Confirm Payment</Button>
	</div>
</div>
