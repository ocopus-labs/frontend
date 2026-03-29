<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { StatusPill, EmptyState } from '$lib/components/data-display';
	import {
		getFranchiseStaff,
		inviteFranchiseStaff,
		removeFranchiseStaff,
	} from '$lib/api/franchise';
	import type { FranchiseUser } from '$lib/api/types';

	import Plus from '@lucide/svelte/icons/plus';
	import Users from '@lucide/svelte/icons/users';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Mail from '@lucide/svelte/icons/mail';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const franchise = $derived(data.franchise);
	const userRole = $derived(data.userRole);
	const isOwner = $derived(userRole === 'franchise_owner');

	let staff = $state<FranchiseUser[]>([]);
	let loading = $state(true);
	let showInvite = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state('viewer');
	let inviting = $state(false);

	$effect(() => {
		if (franchise?.id) {
			getFranchiseStaff(franchise.id)
				.then((res) => {
					staff = res.staff;
				})
				.catch(() => {
					staff = [];
				})
				.finally(() => {
					loading = false;
				});
		}
	});

	async function handleInvite() {
		if (!franchise?.id || !inviteEmail.trim()) return;
		inviting = true;
		try {
			const { member } = await inviteFranchiseStaff(franchise.id, {
				email: inviteEmail.trim(),
				role: inviteRole,
			});
			staff = [member, ...staff];
			inviteEmail = '';
			showInvite = false;
		} catch (err: any) {
			alert(err?.message || 'Failed to invite staff member');
		} finally {
			inviting = false;
		}
	}

	async function handleRemove(userId: string) {
		if (!franchise?.id) return;
		if (!confirm('Remove this staff member from the franchise?')) return;

		try {
			await removeFranchiseStaff(franchise.id, userId);
			staff = staff.filter((s) => s.userId !== userId);
		} catch (err: any) {
			alert(err?.message || 'Failed to remove staff member');
		}
	}

	function getRoleLabel(role: string): string {
		const labels: Record<string, string> = {
			franchise_owner: 'Owner',
			manager: 'Manager',
			viewer: 'Viewer',
		};
		return labels[role] || role;
	}
</script>

<svelte:head>
	<title>Team - {franchise?.name ?? 'Franchise'} | POS</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Team</h1>
			<p class="mt-1 text-muted-foreground">
				Manage franchise-level staff for {franchise?.name}.
			</p>
		</div>
		{#if isOwner}
			<Button onclick={() => (showInvite = !showInvite)}>
				<Plus class="mr-2 h-4 w-4" />
				Invite Member
			</Button>
		{/if}
	</div>

	<!-- Invite Form -->
	{#if showInvite}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Invite Staff Member</Card.Title>
			</Card.Header>
			<Card.Content>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleInvite();
					}}
					class="flex items-end gap-3"
				>
					<div class="flex-1">
						<label for="invite-email" class="mb-1 block text-sm font-medium">
							Email Address
						</label>
						<Input
							id="invite-email"
							type="email"
							placeholder="user@example.com"
							bind:value={inviteEmail}
							required
						/>
					</div>
					<div class="w-40">
						<label for="invite-role" class="mb-1 block text-sm font-medium">Role</label>
						<Select.Root
							type="single"
							value={inviteRole}
							onValueChange={(v) => {
								if (v) inviteRole = v;
							}}
						>
							<Select.Trigger>
								{getRoleLabel(inviteRole)}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="manager">Manager</Select.Item>
								<Select.Item value="viewer">Viewer</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<Button type="submit" disabled={inviting}>
						{inviting ? 'Inviting...' : 'Invite'}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Staff List -->
	{#if loading}
		<div class="space-y-3">
			{#each [1, 2, 3] as _}
				<div class="flex items-center gap-3 rounded-lg border p-4">
					<div class="h-10 w-10 animate-pulse rounded-full bg-muted"></div>
					<div class="flex-1">
						<div class="h-4 w-32 animate-pulse rounded bg-muted"></div>
						<div class="mt-1 h-3 w-48 animate-pulse rounded bg-muted"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if staff.length > 0}
		<div class="space-y-2">
			{#each staff as member (member.id)}
				<div class="flex items-center justify-between rounded-lg border p-4">
					<div class="flex items-center gap-3">
						{#if member.user.image}
							<img
								src={member.user.image}
								alt={member.user.name ?? ''}
								class="size-10 rounded-full object-cover"
							/>
						{:else}
							<div
								class="flex size-10 items-center justify-center rounded-full bg-muted"
							>
								<span class="text-sm font-medium">
									{(member.user.name ?? member.user.email).charAt(0).toUpperCase()}
								</span>
							</div>
						{/if}
						<div>
							<p class="font-medium">{member.user.name ?? 'No name'}</p>
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<Mail class="size-3" />
								<span>{member.user.email}</span>
							</div>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<StatusPill
							label={getRoleLabel(member.role)}
							status={member.role === 'franchise_owner' ? 'info' : 'neutral'}
							size="sm"
						/>
						{#if isOwner && member.role !== 'franchise_owner'}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => handleRemove(member.userId)}
							>
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<EmptyState
			type="empty"
			title="No team members"
			description="Invite staff members to manage this franchise."
			actionLabel="Invite Member"
			onAction={() => (showInvite = true)}
			icon={Users}
		/>
	{/if}
</div>
