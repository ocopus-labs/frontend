<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { IconLoader2 } from '@tabler/icons-svelte';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import PermissionEditor from '$lib/components/team/permission-editor.svelte';
	import PageHeader from '$lib/components/global/page-header.svelte';
	import StatCard from '$lib/components/global/stat-card.svelte';
	import {
		IconPlus,
		IconMail,
		IconTrash,
		IconPlayerPlay,
		IconPlayerPause,
		IconDownload,
		IconShield,
		IconClockPlay,
		IconClockStop,
		IconClock
	} from '@tabler/icons-svelte';
	import { SearchInput, FilterDropdown } from '$lib/components/search';
	import { toast } from 'svelte-sonner';
	import { EmptyState, StatusPill } from '$lib/components/data-display';
	import {
		inviteTeamMember,
		updateMemberRole,
		suspendTeamMember,
		reactivateTeamMember,
		removeTeamMember,
		exportTeamMembers,
		clockIn,
		clockOut,
		type TeamMember,
		type TeamMemberStatus,
		type TeamRole,
		type RoleInfo,
		type PermissionTree,
		type StaffShift
	} from '$lib/api';
	import { downloadBlob } from '$lib/utils/export';
	import { userFriendlyError } from '$lib/utils/error';
	import { formatDate } from '$lib/utils/formatting';
	import * as Select from '$lib/components/ui/select';
	import { canModify } from '$lib/utils/permissions';

	let { data }: { data: PageData } = $props();

	// Shift state
	let currentShift = $state<StaffShift | null>(data.currentShift ?? null);
	let isClockingIn = $state(false);
	let isClockingOut = $state(false);

	// Elapsed time for active shift
	let elapsedMins = $state(0);
	$effect(() => {
		if (!currentShift) { elapsedMins = 0; return; }
		const update = () => {
			elapsedMins = Math.floor((Date.now() - new Date(currentShift!.clockInAt).getTime()) / 60000);
		};
		update();
		const timer = setInterval(update, 30000);
		return () => clearInterval(timer);
	});

	function formatElapsed(mins: number): string {
		if (mins < 60) return `${mins}m`;
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}

	async function handleClockIn() {
		isClockingIn = true;
		try {
			const result = await clockIn(data.businessId);
			currentShift = result.shift;
			toast.success('Clocked in successfully');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to clock in'));
		} finally {
			isClockingIn = false;
		}
	}

	async function handleClockOut() {
		isClockingOut = true;
		try {
			const result = await clockOut(data.businessId);
			currentShift = null;
			toast.success(`Clocked out — shift duration: ${formatElapsed(result.shift.durationMins ?? 0)}`);
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to clock out'));
		} finally {
			isClockingOut = false;
		}
	}

	let members = $state<TeamMember[]>(data.members || []);
	let roles = $state<RoleInfo[]>(data.roles || []);
	let searchQuery = $state('');
	let statusFilter = $state<'all' | TeamMemberStatus>('all');
	let roleFilter = $state('all');
	let showInviteDialog = $state(false);
	let editingMember = $state<TeamMember | null>(null);
	let isSubmitting = $state(false);

	// Permission editor state
	let permEditorOpen = $state(false);
	let selectedMember = $state<TeamMember | null>(null);

	// Check if user can manage permissions (owner or manager)
	const canManagePermissions = $derived(
		data.userRole === 'restaurant_owner' ||
		data.userRole === 'owner' ||
		data.userRole === 'manager'
	);

	const roleLabelMap: Record<string, string> = { manager: 'Manager', staff: 'Staff', accountant: 'Accountant', viewer: 'Viewer' };

	function openPermissionEditor(member: TeamMember) {
		selectedMember = member;
		permEditorOpen = true;
	}

	function handlePermissionsSaved() {
		invalidate('app:team');
	}

	// Confirm dialog state
	let suspendDialogOpen = $state(false);
	let suspendTargetId = $state('');
	let removeDialogOpen = $state(false);
	let removeTargetId = $state('');

	let newInvite = $state<{
		email: string;
		role: TeamRole;
		message: string;
	}>({
		email: '',
		role: 'staff',
		message: ''
	});

	const stats = $derived({
		total: members.length,
		active: members.filter((m) => m.status === 'active').length,
		inactive: members.filter((m) => m.status === 'inactive').length,
		suspended: members.filter((m) => m.status === 'suspended').length
	});

	const filteredMembers = $derived(
		members.filter((member) => {
			const matchesSearch =
				member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				member.user.email.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
			const matchesRole = roleFilter === 'all' || member.role === roleFilter;
			return matchesSearch && matchesStatus && matchesRole;
		})
	);

	function getRoleBadge(role: TeamRole) {
		switch (role) {
			case 'manager':
				return { variant: 'default' as const, text: 'Manager' };
			case 'staff':
				return { variant: 'secondary' as const, text: 'Staff' };
			case 'accountant':
				return { variant: 'outline' as const, text: 'Accountant' };
			case 'viewer':
				return { variant: 'outline' as const, text: 'Viewer' };
			default:
				return { variant: 'outline' as const, text: role };
		}
	}

	function getStatusBadge(status: TeamMemberStatus) {
		switch (status) {
			case 'active':
				return { variant: 'default' as const, text: 'Active', class: 'bg-success/10 text-success' };
			case 'inactive':
				return { variant: 'secondary' as const, text: 'Inactive', class: 'bg-gray-100 text-gray-800' };
			case 'suspended':
				return { variant: 'destructive' as const, text: 'Suspended', class: 'bg-destructive/10 text-destructive' };
			default:
				return { variant: 'outline' as const, text: status, class: '' };
		}
	}

	async function sendInvite() {
		if (!newInvite.email.trim()) {
			toast.error('Email is required');
			return;
		}

		isSubmitting = true;
		try {
			const result = await inviteTeamMember(data.businessId, {
				email: newInvite.email,
				role: newInvite.role,
				message: newInvite.message || undefined
			});

			if (result.member) {
				members = [...members, result.member];
			}

			toast.success(result.message || 'Invitation sent successfully');
			showInviteDialog = false;
			newInvite = { email: '', role: 'staff', message: '' };
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to send invitation'));
		} finally {
			isSubmitting = false;
		}
	}

	function editMember(member: TeamMember) {
		editingMember = { ...member };
	}

	async function saveRole() {
		if (!editingMember) return;

		isSubmitting = true;
		try {
			const result = await updateMemberRole(data.businessId, editingMember.id, {
				role: editingMember.role
			});
			members = members.map((m) => (m.id === editingMember!.id ? result.member : m));
			toast.success('Role updated successfully');
			editingMember = null;
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to update role'));
		} finally {
			isSubmitting = false;
		}
	}

	function handleSuspend(memberId: string) {
		suspendTargetId = memberId;
		suspendDialogOpen = true;
	}

	async function confirmSuspend(reason?: string) {
		try {
			const result = await suspendTeamMember(data.businessId, suspendTargetId, { reason: reason || undefined });
			members = members.map((m) => (m.id === suspendTargetId ? result.member : m));
			toast.success('Member suspended');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to suspend member'));
		}
	}

	async function handleReactivate(memberId: string) {
		try {
			const result = await reactivateTeamMember(data.businessId, memberId);
			members = members.map((m) => (m.id === memberId ? result.member : m));
			toast.success('Member reactivated');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to reactivate member'));
		}
	}

	function handleRemove(memberId: string) {
		removeTargetId = memberId;
		removeDialogOpen = true;
	}

	async function confirmRemove() {
		try {
			await removeTeamMember(data.businessId, removeTargetId);
			members = members.filter((m) => m.id !== removeTargetId);
			toast.success('Member removed successfully');
		} catch (error) {
			toast.error(userFriendlyError(error, 'Failed to remove member'));
		}
	}

	async function handleExportTeam() {
		try {
			const blob = await exportTeamMembers(data.businessId);
			downloadBlob(blob, `team-${new Date().toISOString().split('T')[0]}.csv`);
			toast.success('Team exported successfully');
		} catch (err) {
			toast.error(userFriendlyError(err, 'Failed to export team'));
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<PageHeader title="Team Management" description="Manage your team members and roles">
				{#snippet actions()}
					<Button variant="outline" onclick={handleExportTeam}>
						<IconDownload class="mr-2 h-4 w-4" />
						Export
					</Button>
					{#if canModify(data.userRole)}
						<Button onclick={() => (showInviteDialog = true)}>
							<IconPlus class="mr-2 h-4 w-4" />
							Invite Member
						</Button>
					{/if}
				{/snippet}
			</PageHeader>

			<!-- My Shift -->
			<div class="px-6">
				<Card.Root class="border-l-4 {currentShift ? 'border-l-success' : 'border-l-muted'}">
					<Card.Content class="flex items-center justify-between gap-4 py-4">
						<div class="flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-full {currentShift ? 'bg-success/10' : 'bg-muted'}">
								<IconClock class="h-5 w-5 {currentShift ? 'text-success' : 'text-muted-foreground'}" />
							</div>
							<div>
								<p class="text-sm font-medium">My Shift</p>
								{#if currentShift}
									<p class="text-xs text-muted-foreground">
										On duty &middot; {formatElapsed(elapsedMins)} elapsed
									</p>
								{:else}
									<p class="text-xs text-muted-foreground">Not clocked in</p>
								{/if}
							</div>
						</div>
						{#if currentShift}
							<Button
								variant="outline"
								class="border-destructive text-destructive hover:bg-destructive/10"
								onclick={handleClockOut}
								disabled={isClockingOut}
							>
								{#if isClockingOut}
									<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
								{:else}
									<IconClockStop class="mr-2 h-4 w-4" />
								{/if}
								Clock Out
							</Button>
						{:else}
							<Button
								variant="outline"
								class="border-success text-success hover:bg-success/10"
								onclick={handleClockIn}
								disabled={isClockingIn}
							>
								{#if isClockingIn}
									<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
								{:else}
									<IconClockPlay class="mr-2 h-4 w-4" />
								{/if}
								Clock In
							</Button>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Stats -->
			<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-4">
				<StatCard
					label="Total Members"
					value={stats.total}
				/>
				<StatCard
					label="Active"
					value={stats.active}
				/>
				<StatCard
					label="Inactive"
					value={stats.inactive}
				/>
				<StatCard
					label="Suspended"
					value={stats.suspended}
				/>
			</div>

			<!-- Filters -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center">
				<SearchInput
					bind:value={searchQuery}
					placeholder="Search members..."
					debounceMs={300}
					class="max-w-sm"
				/>
				<div class="flex gap-2">
					<FilterDropdown
						bind:value={statusFilter}
						placeholder="All Status"
						allOptionLabel="All Status"
						options={[
							{ value: 'active', label: 'Active' },
							{ value: 'inactive', label: 'Inactive' },
							{ value: 'suspended', label: 'Suspended' }
						]}
					/>
					<FilterDropdown
						bind:value={roleFilter}
						placeholder="All Roles"
						allOptionLabel="All Roles"
						options={[
							{ value: 'manager', label: 'Manager' },
							{ value: 'staff', label: 'Staff' },
							{ value: 'accountant', label: 'Accountant' },
							{ value: 'viewer', label: 'Viewer' }
						]}
					/>
				</div>
			</div>

			<!-- Team Table -->
			{#if filteredMembers.length > 0}
				<div class="px-6">
					<div class="overflow-x-auto rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Member</Table.Head>
									<Table.Head>Role</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Joined</Table.Head>
									<Table.Head>Last Active</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each filteredMembers as member (member.id)}
									<Table.Row class={member.status === 'suspended' ? 'bg-destructive/5' : ''}>
										<Table.Cell>
											<div class="flex items-center gap-3">
												<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
													{#if member.user.image}
														<img
															src={member.user.image}
															alt={member.user.name}
															loading="lazy"
															class="h-10 w-10 rounded-full object-cover"
														/>
													{:else}
														<span class="text-sm font-medium">
															{member.user.name.charAt(0).toUpperCase()}
														</span>
													{/if}
												</div>
												<div>
													<p class="font-medium">{member.user.name}</p>
													<p class="text-sm text-muted-foreground">{member.user.email}</p>
												</div>
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge variant={getRoleBadge(member.role).variant}>
												{getRoleBadge(member.role).text}
											</Badge>
										</Table.Cell>
										<Table.Cell>
											<StatusPill
												label={getStatusBadge(member.status).text}
												status={member.status === "active" ? "success" : member.status === "suspended" ? "error" : "info"}
											/>
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{formatDate(member.joinedAt)}
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{formatDate(member.lastActiveAt)}
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												{#if canModify(data.userRole)}
													{#if canManagePermissions && member.role !== 'restaurant_owner'}
														<Button
															variant="ghost"
															size="icon"
															onclick={() => openPermissionEditor(member)}
															aria-label="Edit permissions"
														>
															<IconShield class="h-4 w-4" />
														</Button>
													{/if}
													<Button variant="ghost" size="sm" onclick={() => editMember(member)}>
														Edit
													</Button>
													{#if member.status === 'suspended'}
														<Button
															variant="ghost"
															size="icon"
															class="text-success"
															onclick={() => handleReactivate(member.id)}
															aria-label="Reactivate member"
														>
															<IconPlayerPlay class="h-4 w-4" />
														</Button>
													{:else if member.status === 'active'}
														<Button
															variant="ghost"
															size="icon"
															class="text-warning"
															onclick={() => handleSuspend(member.id)}
															aria-label="Suspend member"
														>
															<IconPlayerPause class="h-4 w-4" />
														</Button>
													{/if}
													<Button
														variant="ghost"
														size="icon"
														class="text-destructive hover:text-destructive"
														onclick={() => handleRemove(member.id)}
														aria-label="Remove member"
													>
														<IconTrash class="h-4 w-4" />
													</Button>
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>
			{:else}
				<EmptyState
					type={members.length === 0 ? 'empty' : 'no-results'}
					title={members.length === 0 ? 'No team members yet' : 'No members found'}
					description={members.length === 0 ? 'Invite your first team member to get started.' : 'Try adjusting your search or filters.'}
					actionLabel={canModify(data.userRole) ? 'Invite Member' : undefined}
					onAction={canModify(data.userRole) ? () => (showInviteDialog = true) : undefined}
				/>
			{/if}
			<div class="px-6">
						<div class="flex items-center justify-between border-t pt-4">
				<p class="text-sm text-muted-foreground">
					Showing {Math.min((data.page - 1) * data.limit + 1, data.total)} to {Math.min(data.page * data.limit, data.total)} of {data.total} results
				</p>
				<div class="flex gap-1">
					<Button size="sm" variant="outline" disabled={data.page <= 1}
						onclick={() => goto(`?page=${data.page - 1}&limit=${data.limit}`)}>Previous</Button>
					<Button size="sm" variant="outline" disabled={data.page >= data.totalPages}
						onclick={() => goto(`?page=${data.page + 1}&limit=${data.limit}`)}>Next</Button>
				</div>
			</div>
			</div>
		</div>
	</div>
</div>

<!-- Invite Member Dialog -->
<Dialog.Root bind:open={showInviteDialog}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Invite Team Member</Dialog.Title>
			<Dialog.Description>Send an invitation to join your team</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<label for="email" class="text-sm font-medium">Email *</label>
				<div class="relative">
					<IconMail class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id="email"
						autofocus
						type="email"
						bind:value={newInvite.email}
						placeholder="colleague@example.com"
						class="pl-9"
					/>
				</div>
			</div>
			<div class="grid gap-2">
				<label for="role" class="text-sm font-medium">Role</label>
				<Select.Root type="single" bind:value={newInvite.role}>
					<Select.Trigger class="w-full">
						{roleLabelMap[newInvite.role] || newInvite.role}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="manager">Manager</Select.Item>
						<Select.Item value="staff">Staff</Select.Item>
						<Select.Item value="accountant">Accountant</Select.Item>
						<Select.Item value="viewer">Viewer</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="grid gap-2">
				<label for="message" class="text-sm font-medium">Personal Message (optional)</label>
				<Input
					id="message"
					bind:value={newInvite.message}
					placeholder="Join our team!"
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showInviteDialog = false)} disabled={isSubmitting}>
				Cancel
			</Button>
			<Button onclick={sendInvite} disabled={isSubmitting}>
				{#if isSubmitting}
					<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Send Invitation
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Member Dialog -->
<Dialog.Root open={!!editingMember} onOpenChange={(open) => !open && (editingMember = null)}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Team Member</Dialog.Title>
			<Dialog.Description>Update member role and permissions</Dialog.Description>
		</Dialog.Header>
		{#if editingMember}
			<div class="grid gap-4 py-4">
				<div class="flex items-center gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						{#if editingMember.user.image}
							<img
								src={editingMember.user.image}
								alt={editingMember.user.name}
								loading="lazy"
								class="h-12 w-12 rounded-full object-cover"
							/>
						{:else}
							<span class="text-lg font-medium">
								{editingMember.user.name.charAt(0).toUpperCase()}
							</span>
						{/if}
					</div>
					<div>
						<p class="font-medium">{editingMember.user.name}</p>
						<p class="text-sm text-muted-foreground">{editingMember.user.email}</p>
					</div>
				</div>
				<div class="grid gap-2">
					<label for="edit-role" class="text-sm font-medium">Role</label>
					<Select.Root type="single" bind:value={editingMember.role}>
						<Select.Trigger class="w-full">
							{roleLabelMap[editingMember.role] || editingMember.role}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="manager">Manager</Select.Item>
							<Select.Item value="staff">Staff</Select.Item>
							<Select.Item value="accountant">Accountant</Select.Item>
							<Select.Item value="viewer">Viewer</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="rounded-lg bg-muted p-3">
					<p class="text-sm font-medium">Current Permissions</p>
					<div class="mt-2 flex flex-wrap gap-1">
						{#if editingMember.permissions.length > 0}
							{#each editingMember.permissions as perm}
								<Badge variant="outline" class="text-xs">{perm}</Badge>
							{/each}
						{:else}
							<span class="text-sm text-muted-foreground">Default role permissions</span>
						{/if}
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (editingMember = null)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={saveRole} disabled={isSubmitting}>
					{#if isSubmitting}
						<IconLoader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={suspendDialogOpen}
	title="Suspend Team Member"
	description="This will suspend the team member's access. You can optionally provide a reason."
	confirmLabel="Suspend Member"
	variant="destructive"
	showInput={true}
	inputLabel="Suspension reason"
	inputPlaceholder="Enter reason (optional)"
	onConfirm={confirmSuspend}
/>

<ConfirmDialog
	bind:open={removeDialogOpen}
	title="Remove Team Member"
	description="Are you sure you want to remove this team member? This action cannot be undone."
	confirmLabel="Remove Member"
	variant="destructive"
	onConfirm={confirmRemove}
/>

<!-- Permission Editor Sheet -->
<PermissionEditor
	bind:open={permEditorOpen}
	member={selectedMember}
	permissionTree={data.permissionTree ?? null}
	businessId={data.businessId}
	onSaved={handlePermissionsSaved}
/>
