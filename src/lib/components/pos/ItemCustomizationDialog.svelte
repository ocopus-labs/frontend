<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import { createI18nUtils } from '$lib/utils/i18n';
	import type { MenuItem } from './MenuItemCard.svelte';

	interface Props {
		open: boolean;
		selectedItem: MenuItem | null;
		selectedSize: string;
		selectedSpiceLevel: string;
		selectedMilkType?: string;
		selectedPreparation: string[];
		selectedAddOns: string[];
		selectedRemovals: string[];
		specialInstructions: string;
		customizationQuantity: number;
		onSizeChange: (size: string) => void;
		onSpiceLevelChange: (spice: string) => void;
		onMilkTypeChange?: (milk: string) => void;
		onPreparationToggle: (prep: string) => void;
		onAddOnToggle: (addOn: string) => void;
		onRemovalToggle: (removal: string) => void;
		onSpecialInstructionsChange: (instructions: string) => void;
		onQuantityChange: (delta: number) => void;
		onConfirm: () => void;
		onCancel: () => void;
		region?: string;
	}

	let {
		open,
		selectedItem,
		selectedSize,
		selectedSpiceLevel,
		selectedMilkType = '',
		selectedPreparation,
		selectedAddOns,
		selectedRemovals,
		specialInstructions,
		customizationQuantity,
		onSizeChange,
		onSpiceLevelChange,
		onMilkTypeChange = () => {},
		onPreparationToggle,
		onAddOnToggle,
		onRemovalToggle,
		onSpecialInstructionsChange,
		onQuantityChange,
		onConfirm,
		onCancel,
		region = 'us'
	}: Props = $props();

	const i18n = createI18nUtils(region);

	// Calculate total price
	const totalPrice = $derived.by(() => {
		if (!selectedItem) return 0;
		let total = selectedItem.price;

		// Add size price
		if (selectedSize && selectedItem.modifiers?.sizes) {
			const sizeOption = selectedItem.modifiers.sizes.find((s) => s.name === selectedSize);
			if (sizeOption) total += sizeOption.price;
		}

		// Add spice level price
		if (selectedSpiceLevel && selectedItem.modifiers?.spiceLevels) {
			const spiceOption = selectedItem.modifiers.spiceLevels.find(
				(s) => s.name === selectedSpiceLevel
			);
			if (spiceOption) total += spiceOption.price;
		}

		// Add milk type price
		if (selectedMilkType && selectedItem.modifiers?.milkTypes) {
			const milkOption = selectedItem.modifiers.milkTypes.find((m) => m.name === selectedMilkType);
			if (milkOption) total += milkOption.price;
		}

		// Add add-ons prices
		if (selectedItem?.modifiers?.addOns && Array.isArray(selectedAddOns)) {
			selectedAddOns.forEach((addOn) => {
				const addOnOption = selectedItem.modifiers!.addOns!.find((a) => a.name === addOn);
				if (addOnOption) total += addOnOption.price;
			});
		}

		return total * customizationQuantity;
	});
</script>

<Dialog.Root {open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
	<Dialog.Content class="max-h-[90vh] max-w-2xl overflow-y-auto p-4 sm:p-6">
		<Dialog.Header>
			<Dialog.Title class="text-lg sm:text-xl">Customize Your Order</Dialog.Title>
			<Dialog.Description class="text-sm">
				{#if selectedItem}
					{selectedItem.name} - Base Price: {i18n.formatCurrency(selectedItem.price)}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if selectedItem}
			<div class="space-y-4 sm:space-y-6">
				<!-- Product Image and Info -->
				<div class="flex gap-3 sm:gap-4">
					<img
						src={selectedItem.image}
						alt={selectedItem.name}
						loading="lazy"
						class="h-20 w-20 rounded-lg object-cover sm:h-24 sm:w-24"
					/>
					<div class="flex-1">
						<h3 class="text-base font-semibold sm:text-lg">{selectedItem.name}</h3>
						<p class="text-xs text-muted-foreground sm:text-sm">Customize your item below</p>
					</div>
				</div>

				<!-- Size Selection -->
				{#if selectedItem.modifiers?.sizes && selectedItem.modifiers.sizes.length > 0}
					<div class="space-y-2 sm:space-y-3">
						<Label class="text-sm font-medium">Size</Label>
						<RadioGroup bind:value={selectedSize} onValueChange={onSizeChange}>
							{#each selectedItem.modifiers.sizes as size}
								<div class="flex items-center space-x-2">
									<RadioGroupItem value={size.name} id="size-{size.name}" />
									<Label for="size-{size.name}" class="flex-1 cursor-pointer text-sm sm:text-base">
										{size.name}
										{#if size.price > 0}
											<span class="text-xs text-muted-foreground sm:text-sm">
												(+{i18n.formatCurrency(size.price)})</span
											>
										{/if}
									</Label>
								</div>
							{/each}
						</RadioGroup>
					</div>
				{/if}

				<!-- Spice Level Selection -->
				{#if selectedItem.modifiers?.spiceLevels && selectedItem.modifiers.spiceLevels.length > 0}
					<div class="space-y-2 sm:space-y-3">
						<Label class="text-sm font-medium">Spice Level</Label>
						<RadioGroup bind:value={selectedSpiceLevel} onValueChange={onSpiceLevelChange}>
							{#each selectedItem.modifiers.spiceLevels as spice}
								<div class="flex items-center space-x-2">
									<RadioGroupItem value={spice.name} id="spice-{spice.name}" />
									<Label
										for="spice-{spice.name}"
										class="flex-1 cursor-pointer text-sm sm:text-base"
									>
										{spice.name}
										{#if spice.price > 0}
											<span class="text-xs text-muted-foreground sm:text-sm">
												(+{i18n.formatCurrency(spice.price)})</span
											>
										{/if}
									</Label>
								</div>
							{/each}
						</RadioGroup>
					</div>
				{/if}

				<!-- Milk Type Selection -->
				{#if selectedItem.modifiers?.milkTypes && selectedItem.modifiers.milkTypes.length > 0}
					<div class="space-y-2 sm:space-y-3">
						<Label class="text-sm font-medium">Milk Type</Label>
						<RadioGroup bind:value={selectedMilkType} onValueChange={onMilkTypeChange}>
							{#each selectedItem.modifiers.milkTypes as milk}
								<div class="flex items-center space-x-2">
									<RadioGroupItem value={milk.name} id="milk-{milk.name}" />
									<Label for="milk-{milk.name}" class="flex-1 cursor-pointer text-sm sm:text-base">
										{milk.name}
										{#if milk.price > 0}
											<span class="text-xs text-muted-foreground sm:text-sm">
												(+{i18n.formatCurrency(milk.price)})</span
											>
										{/if}
									</Label>
								</div>
							{/each}
						</RadioGroup>
					</div>
				{/if}

				<!-- Preparation Options -->
				{#if selectedItem.modifiers?.preparation && selectedItem.modifiers.preparation.length > 0}
					<div class="space-y-2 sm:space-y-3">
						<Label class="text-sm font-medium">Preparation</Label>
						<div class="grid grid-cols-2 gap-2 sm:gap-3">
							{#each selectedItem.modifiers.preparation as prep}
								<div class="flex items-center space-x-2">
									<Checkbox
										id="prep-{prep}"
										checked={selectedPreparation.includes(prep)}
										onchange={() => onPreparationToggle(prep)}
									/>
									<Label for="prep-{prep}" class="cursor-pointer text-xs sm:text-sm">{prep}</Label>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Add-ons -->
				{#if selectedItem.modifiers?.addOns && selectedItem.modifiers.addOns.length > 0}
					<div class="space-y-2 sm:space-y-3">
						<Label class="text-sm font-medium">Add-ons</Label>
						<div class="space-y-2">
							{#each selectedItem.modifiers.addOns as addOn}
								<div class="flex items-center space-x-2">
									<Checkbox
										id="addon-{addOn.name}"
										checked={selectedAddOns.includes(addOn.name)}
										onchange={() => onAddOnToggle(addOn.name)}
									/>
									<Label
										for="addon-{addOn.name}"
										class="flex-1 cursor-pointer text-sm sm:text-base"
									>
										{addOn.name}
										<span class="text-muted-foreground">(+{i18n.formatCurrency(addOn.price)})</span>
									</Label>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Removals -->
				{#if selectedItem.modifiers?.removals && selectedItem.modifiers.removals.length > 0}
					<div class="space-y-2 sm:space-y-3">
						<Label class="text-sm font-medium">Removals</Label>
						<div class="space-y-2">
							{#each selectedItem.modifiers.removals as removal}
								<div class="flex items-center space-x-2">
									<Checkbox
										id="removal-{removal}"
										checked={selectedRemovals.includes(removal)}
										onchange={() => onRemovalToggle(removal)}
									/>
									<Label for="removal-{removal}" class="cursor-pointer text-xs sm:text-sm"
										>No {removal}</Label
									>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Special Instructions -->
				<div class="space-y-2 sm:space-y-3">
					<Label for="special-instructions" class="text-sm font-medium">Special Instructions</Label>
					<Textarea
						id="special-instructions"
						placeholder="Any special requests or preparation notes..."
						bind:value={specialInstructions}
						oninput={(e) => onSpecialInstructionsChange(e.currentTarget.value)}
						rows={3}
						class="text-sm"
					/>
				</div>

				<!-- Quantity and Total -->
				<div
					class="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between sm:pt-4"
				>
					<div class="flex items-center gap-2">
						<Label class="text-sm font-medium">Quantity:</Label>
						<div class="flex items-center gap-1">
							<Button
								size="sm"
								variant="outline"
								onclick={() => onQuantityChange(-1)}
								disabled={customizationQuantity <= 1}
								class="h-8 w-8 p-0"
							>
								−
							</Button>
							<span class="w-10 text-center font-medium">{customizationQuantity}</span>
							<Button
								size="sm"
								variant="outline"
								onclick={() => onQuantityChange(1)}
								class="h-8 w-8 p-0">+</Button
							>
						</div>
					</div>
					<div class="text-left sm:text-right">
						<div class="text-xs text-muted-foreground sm:text-sm">Total Price</div>
						<div class="text-lg font-bold sm:text-xl">{i18n.formatCurrency(totalPrice)}</div>
					</div>
				</div>
			</div>
		{/if}

		<Dialog.Footer class="flex-col gap-2 sm:flex-row">
			<Button variant="outline" onclick={onCancel} class="w-full sm:w-auto">Cancel</Button>
			<Button onclick={onConfirm} class="w-full sm:w-auto">Add to Order</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
