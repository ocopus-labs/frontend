<script lang="ts">
	import type { PageData } from './$types';
	import { invalidate } from '$app/navigation';
	import PageShell from '$lib/components/global/page-shell.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import { NativeSelect, NativeSelectOption } from '$lib/components/ui/native-select';
	import { EmptyState } from '$lib/components/data-display';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		createResource,
		deleteResource,
		updateResource,
		type Resource,
		type ResourceType
	} from '$lib/api';
	import { canModify } from '$lib/utils/permissions';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	let { data }: { data: PageData } = $props();

	const canManage = $derived(canModify(data.userRole));
	const active = $derived(data.resources.filter((r) => r.status === 'active'));

	const TYPE_LABEL: Record<ResourceType, string> = {
		chair: 'Chair',
		room: 'Room',
		equipment: 'Equipment',
		other: 'Other'
	};

	let editorOpen = $state(false);
	let editing = $state<Resource | null>(null);
	let name = $state('');
	let type = $state<ResourceType>('chair');
	let sortOrder = $state('0');
	let notes = $state('');
	let saving = $state(false);

	let confirmOpen = $state(false);
	let removing = $state<Resource | null>(null);

	function openNew() {
		editing = null;
		name = '';
		type = 'chair';
		// New rows go to the end, so adding a chair does not silently jump the
		// queue ahead of the ones the salon already ordered.
		sortOrder = String(data.resources.length);
		notes = '';
		editorOpen = true;
	}

	function openEdit(resource: Resource) {
		editing = resource;
		name = resource.name;
		type = resource.type;
		sortOrder = String(resource.sortOrder);
		notes = resource.notes ?? '';
		editorOpen = true;
	}

	async function save() {
		if (!name.trim()) return;
		saving = true;
		try {
			const payload = {
				name: name.trim(),
				type,
				sortOrder: Number(sortOrder) || 0,
				notes: notes.trim()
			};
			if (editing) await updateResource(data.businessId, editing.id, payload);
			else await createResource(data.businessId, payload);
			toast.success(editing ? 'Saved' : `${payload.name} added`);
			editorOpen = false;
			await invalidate('app:resources');
		} catch (error) {
			// A duplicate name comes back as a 409 written for a human.
			toast.error(userFriendlyError(error, 'Could not save that'));
		} finally {
			saving = false;
		}
	}

	async function toggleStatus(resource: Resource) {
		try {
			await updateResource(data.businessId, resource.id, {
				status: resource.status === 'active' ? 'inactive' : 'active'
			});
			toast.success(
				resource.status === 'active' ? `${resource.name} retired` : `${resource.name} back in use`
			);
			await invalidate('app:resources');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Could not update that'));
		}
	}

	function confirmRemove(resource: Resource) {
		removing = resource;
		confirmOpen = true;
	}

	async function remove() {
		if (!removing) return;
		try {
			await deleteResource(data.businessId, removing.id);
			toast.success(`${removing.name} removed`);
			await invalidate('app:resources');
		} catch (error) {
			// The server refuses once anything has been booked into it, and says
			// how many and what to do instead. Shown as-is.
			toast.error(userFriendlyError(error, 'Could not remove that'));
		}
	}
</script>

<PageShell
	title="Chairs & rooms"
	description="What a booking occupies, alongside the person performing it"
>
	{#snippet actions()}
		{#if canManage}
			<Button size="sm" onclick={openNew}>
				<PlusIcon class="size-3.5" />
				Add
			</Button>
		{/if}
	{/snippet}

	{#if data.resources.length === 0}
		<EmptyState
			title="No chairs or rooms yet"
			description="Add them and any service marked as needing one will be booked into a free room automatically — and the database will refuse to double-book it."
		/>
	{:else}
		<Card.Root>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head class="text-right">Order</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="w-px"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.resources as resource (resource.id)}
						<Table.Row class={resource.status === 'inactive' ? 'opacity-60' : ''}>
							<Table.Cell class="font-medium">
								{resource.name}
								{#if resource.notes}
									<div class="text-xs font-normal text-muted-foreground">{resource.notes}</div>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-sm text-muted-foreground">
								{TYPE_LABEL[resource.type]}
							</Table.Cell>
							<Table.Cell class="text-right tabular-nums">{resource.sortOrder}</Table.Cell>
							<Table.Cell>
								<Badge variant={resource.status === 'active' ? 'secondary' : 'outline'}>
									{resource.status === 'active' ? 'In use' : 'Retired'}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								{#if canManage}
									<div class="flex justify-end gap-1">
										<Button variant="ghost" size="sm" onclick={() => toggleStatus(resource)}>
											{resource.status === 'active' ? 'Retire' : 'Restore'}
										</Button>
										<Button variant="ghost" size="icon-sm" onclick={() => openEdit(resource)}>
											<PencilIcon class="size-3.5" />
											<span class="sr-only">Edit {resource.name}</span>
										</Button>
										<Button variant="ghost" size="icon-sm" onclick={() => confirmRemove(resource)}>
											<TrashIcon class="size-3.5 text-destructive" />
											<span class="sr-only">Remove {resource.name}</span>
										</Button>
									</div>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>

		<p class="text-xs text-muted-foreground">
			{active.length} in use. Bookings fill them in the order above, so put the ones you would rather
			use first.
		</p>
	{/if}
</PageShell>

<Dialog.Root bind:open={editorOpen}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>{editing ? editing.name : 'Add a chair or room'}</Dialog.Title>
		</Dialog.Header>

		<Field.Group>
			<Field.Field>
				<Field.Label for="resource-name">Name</Field.Label>
				<Input id="resource-name" bind:value={name} placeholder="Chair 1" />
			</Field.Field>
			<Field.Field>
				<Field.Label for="resource-type">Type</Field.Label>
				<NativeSelect id="resource-type" bind:value={type} class="w-full">
					<NativeSelectOption value="chair">Chair</NativeSelectOption>
					<NativeSelectOption value="room">Room</NativeSelectOption>
					<NativeSelectOption value="equipment">Equipment</NativeSelectOption>
					<NativeSelectOption value="other">Other</NativeSelectOption>
				</NativeSelect>
				<Field.Description>For grouping only — booking treats them alike.</Field.Description>
			</Field.Field>
			<Field.Field>
				<Field.Label for="resource-order">Order</Field.Label>
				<Input id="resource-order" type="number" min="0" bind:value={sortOrder} />
				<Field.Description>Bookings fill the lowest number first.</Field.Description>
			</Field.Field>
			<Field.Field>
				<Field.Label for="resource-notes">Notes</Field.Label>
				<Textarea id="resource-notes" bind:value={notes} rows={2} placeholder="By the window" />
			</Field.Field>
		</Field.Group>

		<Button onclick={save} disabled={saving || !name.trim()}>
			{#if saving}
				<Loader2Icon class="size-3.5 animate-spin" />
			{/if}
			Save
		</Button>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Remove {removing?.name}?"
	description="If anything has ever been booked into it this will be refused — retire it instead, which keeps the history intact."
	confirmLabel="Remove"
	variant="destructive"
	onConfirm={remove}
/>
