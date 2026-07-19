<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Field from '$lib/components/ui/field';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as InputGroup from '$lib/components/ui/input-group';
	import * as Alert from '$lib/components/ui/alert';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import SectionHeader from '$lib/components/global/section-header.svelte';
	import FilterSelect from '$lib/components/global/filter-select.svelte';
	import { StatusPill, EmptyState } from '$lib/components/data-display';
	import {
		getFranchiseStaff,
		inviteFranchiseStaff,
		removeFranchiseStaff,
		updateFranchiseStaff
	} from '$lib/api/franchise';
	import { formatDate } from '$lib/utils/formatting';
	import { toast } from 'svelte-sonner';
	import type { FranchiseUser } from '$lib/api/types';

	import Plus from '@lucide/svelte/icons/plus';
	import Users from '@lucide/svelte/icons/users';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);
	const userRole = $derived(data.userRole);
	const isOwner = $derived(userRole === 'franchise_owner');

	let staff = $state<FranchiseUser[]>([]);
	let loading = $state(true);
	let loadError = $state(false);

	$effect(() => {
		const id = franchise?.id;
		if (!id) return;

		loading = true;
		loadError = false;

		getFranchiseStaff(id)
			.then((res) => {
				staff = res.staff;
			})
			.catch(() => {
				staff = [];
				loadError = true;
			})
			.finally(() => {
				loading = false;
			});
	});

	// --- role presentation ------------------------------------------------------
	const ROLE_LABELS: Record<string, string> = {
		franchise_owner: 'Owner',
		manager: 'Manager',
		viewer: 'Viewer'
	};

	function getRoleLabel(role: string): string {
		return ROLE_LABELS[role] ?? role;
	}

	/** Owners are structural — they can never be re-roled or removed. */
	function isProtected(member: FranchiseUser): boolean {
		return member.role === 'franchise_owner';
	}

	const roleFilterOptions = [
		{ value: 'all', label: 'All roles' },
		{ value: 'franchise_owner', label: 'Owner' },
		{ value: 'manager', label: 'Manager' },
		{ value: 'viewer', label: 'Viewer' }
	];

	/** Owner is deliberately absent — ownership isn't transferable from here. */
	const assignableRoleOptions = [
		{ value: 'manager', label: 'Manager' },
		{ value: 'viewer', label: 'Viewer' }
	];

	// --- search / filter --------------------------------------------------------
	let search = $state('');
	let roleFilter = $state('all');

	const hasActiveFilters = $derived(search.trim() !== '' || roleFilter !== 'all');

	function clearFilters() {
		search = '';
		roleFilter = 'all';
	}

	const visibleStaff = $derived.by(() => {
		const query = search.trim().toLowerCase();

		return staff.filter((member) => {
			if (roleFilter !== 'all' && member.role !== roleFilter) return false;

			if (query) {
				const haystack = [member.user.name, member.user.email]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				if (!haystack.includes(query)) return false;
			}

			return true;
		});
	});

	// --- invite -----------------------------------------------------------------
	let showInvite = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state('viewer');
	let inviting = $state(false);

	async function handleInvite() {
		if (!franchise?.id || !inviteEmail.trim()) return;
		inviting = true;
		try {
			const { member } = await inviteFranchiseStaff(franchise.id, {
				email: inviteEmail.trim(),
				role: inviteRole
			});
			staff = [member, ...staff];
			inviteEmail = '';
			showInvite = false;
			toast.success('Staff member invited');
		} catch (err: any) {
			toast.error(err?.message || 'Failed to invite staff member');
		} finally {
			inviting = false;
		}
	}

	// --- change role ------------------------------------------------------------
	let memberToEdit = $state<FranchiseUser | null>(null);
	let roleDialogOpen = $state(false);
	let roleDraft = $state('viewer');
	let isSavingRole = $state(false);

	function openRoleDialog(member: FranchiseUser) {
		if (isProtected(member)) return;
		memberToEdit = member;
		roleDraft = member.role;
		// Defer so the dropdown finishes closing before the dialog opens.
		setTimeout(() => {
			roleDialogOpen = true;
		}, 0);
	}

	async function confirmRoleChange() {
		if (!franchise?.id || !memberToEdit || isProtected(memberToEdit)) return;
		if (roleDraft === memberToEdit.role) {
			roleDialogOpen = false;
			return;
		}
		isSavingRole = true;
		const targetUserId = memberToEdit.userId;
		try {
			const { member } = await updateFranchiseStaff(franchise.id, targetUserId, {
				role: roleDraft
			});
			staff = staff.map((s) => (s.userId === targetUserId ? member : s));
			toast.success('Role updated');
			roleDialogOpen = false;
			memberToEdit = null;
		} catch (err: any) {
			toast.error(err?.message || 'Failed to update role');
		} finally {
			isSavingRole = false;
		}
	}

	// --- remove -----------------------------------------------------------------
	let memberToRemove = $state<FranchiseUser | null>(null);
	let removeDialogOpen = $state(false);
	let isRemoving = $state(false);

	function openRemoveDialog(member: FranchiseUser) {
		if (isProtected(member)) return;
		memberToRemove = member;
		setTimeout(() => {
			removeDialogOpen = true;
		}, 0);
	}

	async function confirmRemove() {
		if (!franchise?.id || !memberToRemove) return;
		isRemoving = true;
		const targetUserId = memberToRemove.userId;
		try {
			await removeFranchiseStaff(franchise.id, targetUserId);
			staff = staff.filter((s) => s.userId !== targetUserId);
			toast.success('Staff member removed');
			removeDialogOpen = false;
			memberToRemove = null;
		} catch (err: any) {
			toast.error(err?.message || 'Failed to remove staff member');
		} finally {
			isRemoving = false;
		}
	}

	function initialOf(member: FranchiseUser): string {
		return (member.user.name ?? member.user.email).charAt(0).toUpperCase();
	}
</script>

<svelte:head>
	<title>Team - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

{#if loadError}
	<Alert.Root variant="destructive">
		<AlertTriangle class="size-4" />
		<Alert.Title>Couldn't load team members</Alert.Title>
		<Alert.Description>
			The staff list for this franchise is unavailable right now. Try refreshing the page.
		</Alert.Description>
	</Alert.Root>
{/if}

<SectionHeader
	title="Team"
	description="Franchise-level staff have access to every location under this franchise."
/>

<!-- ── Search + filters + invite ─────────────────────────────────────────── -->
<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
	<InputGroup.Root class="w-full sm:max-w-xs">
		<InputGroup.Addon>
			<Search class="size-4 text-muted-foreground" />
		</InputGroup.Addon>
		<InputGroup.Input
			placeholder="Search by name or email…"
			bind:value={search}
			aria-label="Search team members"
		/>
		{#if search}
			<InputGroup.Button size="icon-sm" onclick={() => (search = '')} aria-label="Clear search">
				<X class="size-4" />
			</InputGroup.Button>
		{/if}
	</InputGroup.Root>

	<FilterSelect
		value={roleFilter}
		options={roleFilterOptions}
		onValueChange={(v) => (roleFilter = v)}
		class="w-[150px]"
	/>

	<div class="flex items-center gap-3 sm:ml-auto">
		<span class="text-sm text-muted-foreground tabular-nums">
			{visibleStaff.length} of {staff.length}
		</span>
		{#if hasActiveFilters}
			<Button variant="ghost" size="sm" onclick={clearFilters}>Clear filters</Button>
		{/if}
		{#if isOwner}
			<Button onclick={() => (showInvite = !showInvite)}>
				<Plus class="mr-1.5 size-4" />
				Invite member
			</Button>
		{/if}
	</div>
</div>

<!-- ── Invite form ───────────────────────────────────────────────────────── -->
{#if showInvite && isOwner}
	<Card.Root>
		<Card.Header class="space-y-0">
			<Card.Title class="text-section-title">Invite staff member</Card.Title>
			<Card.Description>They'll get franchise-wide access at the role you pick.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleInvite();
				}}
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
			>
				<Field.Field class="flex-1">
					<Field.Label for="invite-email">Email address</Field.Label>
					<Input
						id="invite-email"
						type="email"
						placeholder="user@example.com"
						bind:value={inviteEmail}
						required
					/>
				</Field.Field>

				<Field.Field class="sm:w-44">
					<Field.Label for="invite-role">Role</Field.Label>
					<FilterSelect
						value={inviteRole}
						options={assignableRoleOptions}
						onValueChange={(v) => (inviteRole = v)}
						class="w-full"
					/>
				</Field.Field>

				<div class="flex items-center gap-2">
					<Button type="submit" disabled={inviting || !inviteEmail.trim()}>
						{inviting ? 'Inviting…' : 'Invite'}
					</Button>
					<Button
						type="button"
						variant="ghost"
						disabled={inviting}
						onclick={() => (showInvite = false)}
					>
						Cancel
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
{/if}

<!-- ── Staff table ───────────────────────────────────────────────────────── -->
{#if loading}
	<Card.Root>
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Member</Table.Head>
						<Table.Head class="hidden sm:table-cell">Role</Table.Head>
						<Table.Head class="hidden md:table-cell">Joined</Table.Head>
						<Table.Head class="w-12"><span class="sr-only">Actions</span></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each [1, 2, 3, 4] as i (i)}
						<Table.Row>
							<Table.Cell>
								<div class="flex items-center gap-3">
									<Skeleton class="size-9 shrink-0 rounded-full" />
									<div class="flex-1 space-y-1.5">
										<Skeleton class="h-3.5 w-32" />
										<Skeleton class="h-2.5 w-44" />
									</div>
								</div>
							</Table.Cell>
							<Table.Cell class="hidden sm:table-cell"><Skeleton class="h-5 w-16" /></Table.Cell>
							<Table.Cell class="hidden md:table-cell"><Skeleton class="h-3 w-24" /></Table.Cell>
							<Table.Cell><Skeleton class="ml-auto size-8 rounded-md" /></Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
{:else if staff.length === 0}
	<EmptyState
		type="empty"
		title="No team members"
		description="Invite staff members to help manage this franchise."
		actionLabel={isOwner ? 'Invite member' : undefined}
		onAction={isOwner ? () => (showInvite = true) : undefined}
		icon={Users}
	/>
{:else if visibleStaff.length === 0}
	<EmptyState
		type="no-results"
		title="No team members match your filters"
		description="Try a different search term, or clear the filters to see everyone."
		actionLabel="Clear filters"
		onAction={clearFilters}
	/>
{:else}
	<Card.Root>
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Member</Table.Head>
						<Table.Head class="hidden sm:table-cell">Role</Table.Head>
						<Table.Head class="hidden md:table-cell">Joined</Table.Head>
						<Table.Head class="w-12"><span class="sr-only">Actions</span></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each visibleStaff as member (member.id)}
						{@const protectedMember = isProtected(member)}
						{@const displayName = member.user.name ?? member.user.email}
						<Table.Row>
							<Table.Cell>
								<div class="flex min-w-0 items-center gap-3">
									<Avatar.Root class="size-9 shrink-0">
										{#if member.user.image}
											<Avatar.Image
												src={member.user.image}
												alt={displayName}
												class="object-cover"
											/>
										{/if}
										<Avatar.Fallback class="bg-muted text-sm font-medium">
											{initialOf(member)}
										</Avatar.Fallback>
									</Avatar.Root>
									<div class="min-w-0">
										<p class="truncate text-sm font-medium">{member.user.name ?? 'No name'}</p>
										<p class="truncate text-xs text-muted-foreground">{member.user.email}</p>
										<div class="mt-1 sm:hidden">
											<StatusPill
												label={getRoleLabel(member.role)}
												status={protectedMember ? 'info' : 'neutral'}
												size="sm"
											/>
										</div>
									</div>
								</div>
							</Table.Cell>

							<Table.Cell class="hidden sm:table-cell">
								<StatusPill
									label={getRoleLabel(member.role)}
									status={protectedMember ? 'info' : 'neutral'}
									size="sm"
								/>
							</Table.Cell>

							<Table.Cell class="hidden text-sm text-muted-foreground tabular-nums md:table-cell">
								{formatDate(member.joinedAt)}
							</Table.Cell>

							<Table.Cell class="text-right">
								{#if isOwner && !protectedMember}
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											<Button
												variant="ghost"
												size="icon"
												class="size-8"
												aria-label="Options for {displayName}"
											>
												<MoreHorizontal class="size-4" />
											</Button>
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Item onclick={() => openRoleDialog(member)}>
												<ShieldCheck class="mr-2 size-4" />
												Change role
											</DropdownMenu.Item>
											<DropdownMenu.Separator />
											<DropdownMenu.Item
												class="text-destructive focus:text-destructive"
												onclick={() => openRemoveDialog(member)}
											>
												<Trash2 class="mr-2 size-4" />
												Remove
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
{/if}

<!-- Change role -->
<Dialog.Root
	bind:open={roleDialogOpen}
	onOpenChange={(open) => {
		if (!open) memberToEdit = null;
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Change role</Dialog.Title>
			<Dialog.Description>
				Update the franchise role for
				<strong>{memberToEdit?.user?.name ?? memberToEdit?.user?.email}</strong>.
			</Dialog.Description>
		</Dialog.Header>

		<Field.Field>
			<Field.Label for="member-role">Role</Field.Label>
			<FilterSelect
				value={roleDraft}
				options={assignableRoleOptions}
				onValueChange={(v) => (roleDraft = v)}
				class="w-full"
			/>
			<Field.Description>
				Managers can operate every location; viewers get read-only access.
			</Field.Description>
		</Field.Field>

		<Dialog.Footer>
			<Button variant="outline" disabled={isSavingRole} onclick={() => (roleDialogOpen = false)}>
				Cancel
			</Button>
			<Button disabled={isSavingRole} onclick={confirmRoleChange}>
				{isSavingRole ? 'Saving…' : 'Save'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Remove member -->
<AlertDialog.Root
	bind:open={removeDialogOpen}
	onOpenChange={(open) => {
		if (!open) memberToRemove = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Remove staff member</AlertDialog.Title>
			<AlertDialog.Description>
				Remove <strong>{memberToRemove?.user?.name ?? memberToRemove?.user?.email}</strong> from this
				franchise? They will lose access to every location under it.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isRemoving}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				disabled={isRemoving}
				onclick={confirmRemove}
			>
				{isRemoving ? 'Removing…' : 'Remove'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
