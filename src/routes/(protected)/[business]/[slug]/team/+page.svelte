<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Loader2 } from '@lucide/svelte';
	import {
		IconPlus,
		IconSearch,
		IconUsers,
		IconUserCheck,
		IconUserOff,
		IconMail,
		IconTrash,
		IconPlayerPlay,
		IconPlayerPause
	} from '@tabler/icons-svelte';
	import { toast } from 'svelte-sonner';
	import {
		inviteTeamMember,
		updateMemberRole,
		suspendTeamMember,
		reactivateTeamMember,
		removeTeamMember,
		type TeamMember,
		type TeamMemberStatus,
		type TeamRole,
		type RoleInfo
	} from '$lib/api';

	let { data }: { data: PageData } = $props();

	let members = $state<TeamMember[]>(data.members || []);
	let roles = $state<RoleInfo[]>(data.roles || []);
	let searchQuery = $state('');
	let statusFilter = $state<'all' | TeamMemberStatus>('all');
	let roleFilter = $state('all');
	let showInviteDialog = $state(false);
	let editingMember = $state<TeamMember | null>(null);
	let isSubmitting = $state(false);

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
				return { variant: 'default' as const, text: 'Active', class: 'bg-green-100 text-green-800' };
			case 'inactive':
				return { variant: 'secondary' as const, text: 'Inactive', class: 'bg-gray-100 text-gray-800' };
			case 'suspended':
				return { variant: 'destructive' as const, text: 'Suspended', class: 'bg-red-100 text-red-800' };
			default:
				return { variant: 'outline' as const, text: status, class: '' };
		}
	}

	function formatDate(dateString?: string): string {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
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
			toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
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
			toast.error(error instanceof Error ? error.message : 'Failed to update role');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleSuspend(memberId: string) {
		const reason = prompt('Please enter suspension reason (optional):');

		try {
			const result = await suspendTeamMember(data.businessId, memberId, { reason: reason || undefined });
			members = members.map((m) => (m.id === memberId ? result.member : m));
			toast.success('Member suspended');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to suspend member');
		}
	}

	async function handleReactivate(memberId: string) {
		try {
			const result = await reactivateTeamMember(data.businessId, memberId);
			members = members.map((m) => (m.id === memberId ? result.member : m));
			toast.success('Member reactivated');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to reactivate member');
		}
	}

	async function handleRemove(memberId: string) {
		if (!confirm('Are you sure you want to remove this team member?')) return;

		try {
			await removeTeamMember(data.businessId, memberId);
			members = members.filter((m) => m.id !== memberId);
			toast.success('Member removed successfully');
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove member');
		}
	}
</script>

<div class="flex flex-1 flex-col">
	<div class="@container/main flex flex-1 flex-col gap-4">
		<div class="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-2xl font-bold">Team Management</h1>
					<p class="text-muted-foreground">Manage your team members and roles</p>
				</div>
				<Button onclick={() => (showInviteDialog = true)}>
					<IconPlus class="mr-2 h-4 w-4" />
					Invite Member
				</Button>
			</div>

			<!-- Stats -->
			<div class="grid grid-cols-2 gap-4 px-6 sm:grid-cols-4">
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Total Members</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconUsers class="h-5 w-5 text-muted-foreground" />
							<span class="text-2xl font-bold">{stats.total}</span>
						</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Active</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconUserCheck class="h-5 w-5 text-green-500" />
							<span class="text-2xl font-bold text-green-600">{stats.active}</span>
						</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Inactive</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="flex items-center gap-2">
							<IconUserOff class="h-5 w-5 text-gray-500" />
							<span class="text-2xl font-bold text-gray-600">{stats.inactive}</span>
						</div>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header class="pb-2">
						<Card.Title class="text-sm font-medium">Suspended</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold text-red-600">{stats.suspended}</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Filters -->
			<div class="flex flex-col gap-4 px-6 sm:flex-row sm:items-center">
				<div class="relative max-w-sm flex-1">
					<IconSearch class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input placeholder="Search members..." bind:value={searchQuery} class="pl-9" />
				</div>

				<div class="flex gap-2">
					<select
						bind:value={statusFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Status</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
						<option value="suspended">Suspended</option>
					</select>

					<select
						bind:value={roleFilter}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="all">All Roles</option>
						<option value="manager">Manager</option>
						<option value="staff">Staff</option>
						<option value="accountant">Accountant</option>
						<option value="viewer">Viewer</option>
					</select>
				</div>
			</div>

			<!-- Team Table -->
			{#if filteredMembers.length > 0}
				<div class="px-6">
					<div class="rounded-md border">
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
									<Table.Row class={member.status === 'suspended' ? 'bg-red-50 dark:bg-red-950' : ''}>
										<Table.Cell>
											<div class="flex items-center gap-3">
												<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
													{#if member.user.image}
														<img
															src={member.user.image}
															alt={member.user.name}
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
											<span class="rounded-full px-2 py-1 text-xs {getStatusBadge(member.status).class}">
												{getStatusBadge(member.status).text}
											</span>
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{formatDate(member.joinedAt)}
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{formatDate(member.lastActiveAt)}
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-1">
												<Button variant="ghost" size="sm" onclick={() => editMember(member)}>
													Edit
												</Button>
												{#if member.status === 'suspended'}
													<Button
														variant="ghost"
														size="sm"
														class="text-green-600"
														onclick={() => handleReactivate(member.id)}
													>
														<IconPlayerPlay class="h-4 w-4" />
													</Button>
												{:else if member.status === 'active'}
													<Button
														variant="ghost"
														size="sm"
														class="text-yellow-600"
														onclick={() => handleSuspend(member.id)}
													>
														<IconPlayerPause class="h-4 w-4" />
													</Button>
												{/if}
												<Button
													variant="ghost"
													size="sm"
													class="text-destructive hover:text-destructive"
													onclick={() => handleRemove(member.id)}
												>
													<IconTrash class="h-4 w-4" />
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<IconUsers class="h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No team members found</h3>
					<p class="text-muted-foreground">Invite your first team member to get started.</p>
					<Button class="mt-4" onclick={() => (showInviteDialog = true)}>
						<IconPlus class="mr-2 h-4 w-4" />
						Invite Member
					</Button>
				</div>
			{/if}
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
						type="email"
						bind:value={newInvite.email}
						placeholder="colleague@example.com"
						class="pl-9"
					/>
				</div>
			</div>
			<div class="grid gap-2">
				<label for="role" class="text-sm font-medium">Role</label>
				<select
					id="role"
					bind:value={newInvite.role}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm"
				>
					<option value="manager">Manager</option>
					<option value="staff">Staff</option>
					<option value="accountant">Accountant</option>
					<option value="viewer">Viewer</option>
				</select>
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
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
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
					<select
						id="edit-role"
						bind:value={editingMember.role}
						class="rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="manager">Manager</option>
						<option value="staff">Staff</option>
						<option value="accountant">Accountant</option>
						<option value="viewer">Viewer</option>
					</select>
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
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
