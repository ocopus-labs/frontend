<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		open: boolean;
		onClose: () => void;
		shortcuts: { key: string; description: string }[];
	}

	let { open, onClose, shortcuts }: Props = $props();
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && onClose()}>
	<Dialog.Content class="max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Keyboard Shortcuts</Dialog.Title>
			<Dialog.Description>Press these keys for quick actions</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-2 py-4">
			{#each shortcuts as shortcut}
				<div class="flex items-center justify-between">
					<span class="text-sm">{shortcut.description}</span>
					<Badge variant="outline" class="font-mono">{shortcut.key}</Badge>
				</div>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
