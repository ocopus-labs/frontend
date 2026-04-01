<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Switch } from '$lib/components/ui/switch';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import { invalidate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { userFriendlyError } from '$lib/utils/error';
	import type { PageData } from './$types';
	import type { AdminAnnouncement } from '$lib/api/admin';
	import {
		createAdminAnnouncement,
		updateAdminAnnouncement,
		deleteAdminAnnouncement,
		toggleAdminAnnouncementPublish
	} from '$lib/api/admin';
	import { formatDate, getStatusBadgeVariant } from '$lib/utils/formatting';

	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Pin from '@lucide/svelte/icons/pin';
	import Megaphone from '@lucide/svelte/icons/megaphone';

	let { data }: { data: PageData } = $props();

	// Dialog state
	let dialogOpen = $state(false);
	let editingAnnouncement: AdminAnnouncement | null = $state(null);
	let isSubmitting = $state(false);

	// Delete confirmation
	let deleteDialogOpen = $state(false);
	let deleteTargetId: string | null = $state(null);

	// Form state
	let formTitle = $state('');
	let formContent = $state('');
	let formType = $state('info');
	let formTarget = $state('all');
	let formIsPinned = $state(false);
	let formPublishAt = $state('');
	let formExpiresAt = $state('');

	const typeOptions = [
		{ value: 'info', label: 'Info' },
		{ value: 'warning', label: 'Warning' },
		{ value: 'critical', label: 'Critical' },
		{ value: 'maintenance', label: 'Maintenance' }
	];

	const targetOptions = [
		{ value: 'all', label: 'All Users' },
		{ value: 'business_owners', label: 'Business Owners' },
		{ value: 'staff', label: 'Staff' },
		{ value: 'specific_plan', label: 'Specific Plan' }
	];

	function resetForm() {
		formTitle = '';
		formContent = '';
		formType = 'info';
		formTarget = 'all';
		formIsPinned = false;
		formPublishAt = '';
		formExpiresAt = '';
	}

	function openCreateDialog() {
		editingAnnouncement = null;
		resetForm();
		dialogOpen = true;
	}

	function openEditDialog(announcement: AdminAnnouncement) {
		editingAnnouncement = announcement;
		formTitle = announcement.title;
		formContent = announcement.content;
		formType = announcement.type;
		formTarget = announcement.target;
		formIsPinned = announcement.isPinned;
		formPublishAt = announcement.publishAt
			? new Date(announcement.publishAt).toISOString().slice(0, 16)
			: '';
		formExpiresAt = announcement.expiresAt
			? new Date(announcement.expiresAt).toISOString().slice(0, 16)
			: '';
		dialogOpen = true;
	}

	function validateForm(): string | null {
		if (!formTitle.trim()) return 'Title is required';
		if (!formContent.trim()) return 'Content is required';
		if (formPublishAt && formExpiresAt && new Date(formPublishAt) >= new Date(formExpiresAt)) {
			return 'Expiry date must be after publish date';
		}
		return null;
	}

	async function handleSubmit() {
		const error = validateForm();
		if (error) {
			toast.error(error);
			return;
		}

		if (isSubmitting) return;
		isSubmitting = true;

		try {
			const payload: Record<string, unknown> = {
				title: formTitle.trim(),
				content: formContent.trim(),
				type: formType,
				target: formTarget,
				isPinned: formIsPinned
			};
			if (formPublishAt) payload.publishAt = new Date(formPublishAt).toISOString();
			if (formExpiresAt) payload.expiresAt = new Date(formExpiresAt).toISOString();

			if (editingAnnouncement) {
				await updateAdminAnnouncement(editingAnnouncement.id, payload);
				toast.success('Announcement updated successfully');
			} else {
				await createAdminAnnouncement(payload as any);
				toast.success('Announcement created successfully');
			}
			dialogOpen = false;
			await invalidate('app:announcements');
		} catch (err) {
			toast.error(userFriendlyError(err));
		} finally {
			isSubmitting = false;
		}
	}

	function triggerDelete(id: string) {
		deleteTargetId = id;
		deleteDialogOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTargetId) return;
		try {
			await deleteAdminAnnouncement(deleteTargetId);
			toast.success('Announcement deleted successfully');
			await invalidate('app:announcements');
		} catch (err) {
			toast.error(userFriendlyError(err));
		}
	}

	async function handleTogglePublish(announcement: AdminAnnouncement) {
		try {
			await toggleAdminAnnouncementPublish(announcement.id);
			toast.success(
				announcement.isActive ? 'Announcement unpublished' : 'Announcement published'
			);
			await invalidate('app:announcements');
		} catch (err) {
			toast.error(userFriendlyError(err));
		}
	}

	function getTypeBadgeVariant(
		type: string
	): 'default' | 'destructive' | 'secondary' | 'outline' {
		if (type === 'critical') return 'destructive';
		if (type === 'warning') return 'secondary';
		if (type === 'maintenance') return 'outline';
		return 'default';
	}

	function getStatusLabel(announcement: AdminAnnouncement): string {
		if (!announcement.isActive) return 'Inactive';
		const now = new Date();
		if (announcement.publishAt && new Date(announcement.publishAt) > now) return 'Scheduled';
		if (announcement.expiresAt && new Date(announcement.expiresAt) <= now) return 'Expired';
		return 'Active';
	}

	function getTargetLabel(target: string): string {
		const labels: Record<string, string> = {
			all: 'All Users',
			business_owners: 'Business Owners',
			staff: 'Staff',
			specific_plan: 'Specific Plan'
		};
		return labels[target] || target;
	}
</script>

<svelte:head>
	<title>Announcements | Admin</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Announcements</h1>
			<p class="text-muted-foreground">
				Create and manage platform-wide announcements for users
			</p>
		</div>
		<Button onclick={openCreateDialog}>
			<Plus class="mr-2 h-4 w-4" />
			Create Announcement
		</Button>
	</div>

	<!-- Announcements Table -->
	<Card.Root>
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Title</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Target</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-center">Pinned</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head class="w-[160px]">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.announcements as announcement (announcement.id)}
						{@const status = getStatusLabel(announcement)}
						<Table.Row>
							<Table.Cell>
								<div class="max-w-[280px]">
									<span class="font-medium">{announcement.title}</span>
									<p class="truncate text-xs text-muted-foreground">
										{announcement.content}
									</p>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={getTypeBadgeVariant(announcement.type)}>
									{announcement.type}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								<span class="text-sm">{getTargetLabel(announcement.target)}</span>
							</Table.Cell>
							<Table.Cell>
								<Badge variant={getStatusBadgeVariant(status)}>
									{status}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-center">
								{#if announcement.isPinned}
									<Pin class="mx-auto h-4 w-4 text-primary" />
								{:else}
									<span class="text-muted-foreground">-</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="text-sm">
									<div>{formatDate(announcement.createdAt)}</div>
									<div class="text-xs text-muted-foreground">
										by {announcement.creator?.name || announcement.creator?.email || 'Unknown'}
									</div>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										onclick={() => openEditDialog(announcement)}
										aria-label="Edit announcement"
									>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => handleTogglePublish(announcement)}
										aria-label={announcement.isActive
											? 'Unpublish announcement'
											: 'Publish announcement'}
									>
										{#if announcement.isActive}
											<EyeOff class="h-4 w-4 text-muted-foreground" />
										{:else}
											<Eye class="h-4 w-4 text-muted-foreground" />
										{/if}
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => triggerDelete(announcement.id)}
										aria-label="Delete announcement"
									>
										<Trash2 class="h-4 w-4 text-destructive" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={7} class="py-12 text-center text-muted-foreground">
								<div class="flex flex-col items-center gap-2">
									<Megaphone class="h-8 w-8 text-muted-foreground/50" />
									<p>No announcements yet. Create one to communicate with your users.</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Root>
</div>

<!-- Create / Edit Announcement Dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>
				{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
			</Dialog.Title>
			<Dialog.Description>
				{editingAnnouncement
					? 'Update the announcement details'
					: 'Create a new platform-wide announcement'}
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="ann-title">Title</Label>
				<Input
					id="ann-title"
					bind:value={formTitle}
					placeholder="Announcement title"
					maxlength={200}
					autofocus
				/>
			</div>

			<div class="space-y-2">
				<Label for="ann-content">Content</Label>
				<Textarea
					id="ann-content"
					bind:value={formContent}
					placeholder="Announcement content..."
					rows={4}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="ann-type">Type</Label>
					<Select.Root
						type="single"
						value={formType}
						onValueChange={(val) => {
							if (val) formType = val;
						}}
					>
						<Select.Trigger id="ann-type">
							{typeOptions.find((o) => o.value === formType)?.label || 'Select type'}
						</Select.Trigger>
						<Select.Content>
							{#each typeOptions as opt (opt.value)}
								<Select.Item value={opt.value}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label for="ann-target">Target Audience</Label>
					<Select.Root
						type="single"
						value={formTarget}
						onValueChange={(val) => {
							if (val) formTarget = val;
						}}
					>
						<Select.Trigger id="ann-target">
							{targetOptions.find((o) => o.value === formTarget)?.label || 'Select target'}
						</Select.Trigger>
						<Select.Content>
							{#each targetOptions as opt (opt.value)}
								<Select.Item value={opt.value}>{opt.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="ann-publish-at">Publish Date (optional)</Label>
					<Input
						id="ann-publish-at"
						type="datetime-local"
						bind:value={formPublishAt}
					/>
				</div>

				<div class="space-y-2">
					<Label for="ann-expires-at">Expiry Date (optional)</Label>
					<Input
						id="ann-expires-at"
						type="datetime-local"
						bind:value={formExpiresAt}
					/>
				</div>
			</div>

			<div class="flex items-center justify-between rounded-lg border p-3">
				<div>
					<Label for="ann-pinned" class="cursor-pointer">Pinned</Label>
					<p class="text-xs text-muted-foreground">
						Pinned announcements cannot be dismissed by users
					</p>
				</div>
				<Switch bind:checked={formIsPinned} id="ann-pinned" />
			</div>

			<Dialog.Footer>
				<Button
					variant="outline"
					type="button"
					onclick={() => (dialogOpen = false)}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						Saving...
					{:else}
						{editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Announcement"
	description="Are you sure you want to delete this announcement? This action cannot be undone."
	confirmLabel="Delete"
	variant="destructive"
	onConfirm={confirmDelete}
/>
