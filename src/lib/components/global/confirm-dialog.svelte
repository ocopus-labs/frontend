<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Input } from '$lib/components/ui/input';
	import { buttonVariants } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { Label } from '$lib/components/ui/label';

	let {
		open = $bindable(false),
		title = 'Are you sure?',
		description = '',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'default' as 'default' | 'destructive',
		showInput = false,
		inputLabel = '',
		inputPlaceholder = '',
		inputRequired = false,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: 'default' | 'destructive';
		showInput?: boolean;
		inputLabel?: string;
		inputPlaceholder?: string;
		inputRequired?: boolean;
		onConfirm?: (inputValue?: string) => void;
		onCancel?: () => void;
	} = $props();

	let inputValue = $state('');

	function handleConfirm() {
		if (showInput && inputRequired && !inputValue.trim()) return;
		onConfirm?.(showInput ? inputValue : undefined);
		inputValue = '';
		open = false;
	}

	function handleCancel() {
		onCancel?.();
		inputValue = '';
		open = false;
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			{#if description}
				<AlertDialog.Description>{description}</AlertDialog.Description>
			{/if}
		</AlertDialog.Header>
		{#if showInput}
			<div class="py-4">
				{#if inputLabel}
					<Label for="confirm-dialog-input" class="mb-2 block text-sm font-medium"
						>{inputLabel}</Label
					>
				{/if}
				<Input id="confirm-dialog-input" bind:value={inputValue} placeholder={inputPlaceholder} />
			</div>
		{/if}
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleCancel}>{cancelLabel}</AlertDialog.Cancel>
			<button
				class={cn(
					buttonVariants({ variant: variant === 'destructive' ? 'destructive' : 'default' })
				)}
				onclick={handleConfirm}
				disabled={showInput && inputRequired && !inputValue.trim()}
			>
				{confirmLabel}
			</button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
