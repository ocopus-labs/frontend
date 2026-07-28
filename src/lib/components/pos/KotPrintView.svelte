<script lang="ts">
	interface KotItem {
		name: string;
		quantity: number;
		modifiers?: {
			size?: { name: string };
			spiceLevel?: { name: string };
			addOns?: { name: string }[];
			specialInstructions?: string;
		};
		status: string;
	}

	interface Props {
		orderNumber: string;
		tableNumber?: string;
		staffName?: string;
		orderType: string;
		items: KotItem[];
		createdAt: string;
		isReprint?: boolean;
	}

	let {
		orderNumber,
		tableNumber,
		staffName,
		orderType,
		items,
		createdAt,
		isReprint = false
	}: Props = $props();

	const activeItems = $derived(items.filter((i) => i.status !== 'cancelled'));
	const cancelledItems = $derived(items.filter((i) => i.status === 'cancelled'));
</script>

<div class="kot-print" style="width: 72mm; font-family: monospace; font-size: 12px; padding: 4mm;">
	{#if isReprint}
		<div
			style="text-align: center; font-weight: bold; border: 1px dashed black; padding: 2px; margin-bottom: 4px;"
		>
			*** REPRINT ***
		</div>
	{/if}

	<div style="text-align: center; font-weight: bold; font-size: 14px;">KOT #{orderNumber}</div>
	<div
		style="text-align: center; font-size: 10px; border-bottom: 1px dashed black; padding-bottom: 4px; margin-bottom: 4px;"
	>
		{orderType.replace('_', ' ').toUpperCase()}
		{#if tableNumber}
			| Table: {tableNumber}{/if}
		{#if staffName}
			| {staffName}{/if}
	</div>

	<div style="font-size: 10px; margin-bottom: 4px;">
		{new Date(createdAt).toLocaleString()}
	</div>

	<div style="border-bottom: 1px dashed black; margin-bottom: 4px;"></div>

	{#each activeItems as item}
		<div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
			<span style="font-weight: bold;">{item.quantity}x {item.name}</span>
		</div>
		{#if item.modifiers?.size}
			<div style="font-size: 10px; padding-left: 8px;">Size: {item.modifiers.size.name}</div>
		{/if}
		{#if item.modifiers?.spiceLevel}
			<div style="font-size: 10px; padding-left: 8px;">Spice: {item.modifiers.spiceLevel.name}</div>
		{/if}
		{#if item.modifiers?.addOns?.length}
			<div style="font-size: 10px; padding-left: 8px;">
				+ {item.modifiers.addOns.map((a) => a.name).join(', ')}
			</div>
		{/if}
		{#if item.modifiers?.specialInstructions}
			<div style="font-size: 10px; padding-left: 8px; font-style: italic;">
				Note: {item.modifiers.specialInstructions}
			</div>
		{/if}
	{/each}

	{#each cancelledItems as item}
		<div style="text-decoration: line-through; color: gray; margin-bottom: 2px;">
			{item.quantity}x {item.name} [CANCELLED]
		</div>
	{/each}

	<div
		style="border-top: 1px dashed black; margin-top: 4px; padding-top: 4px; text-align: center; font-size: 10px;"
	>
		Items: {activeItems.length}
	</div>
</div>

<style>
	@media print {
		:global(body) {
			margin: 0 !important;
			padding: 0 !important;
		}
		.kot-print {
			width: 72mm !important;
			margin: 0 !important;
			padding: 2mm !important;
		}
	}
</style>
