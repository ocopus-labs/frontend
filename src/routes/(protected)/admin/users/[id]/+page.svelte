<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import ConfirmDialog from '$lib/components/global/confirm-dialog.svelte';
	import {
		banAdminUser,
		unbanAdminUser,
		updateAdminUserRole,
		adminForceVerifyEmail,
		adminDisable2FA,
		adminGetUserSessions,
		adminRevokeSession,
		adminRevokeAllSessions,
		adminDeleteUser,
		adminResetPassword,
		adminUpdateUserProfile,
		impersonateUser,
		getAdminAuditLogs,
		type UserSessionInfo
	} from '$lib/api/admin';
	import { toast } from 'svelte-sonner';
	import { invalidate, goto } from '$app/navigation';
	import { formatDate, formatDateTime } from '$lib/utils/formatting';
	import type { PageData } from './$types';

	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Shield from '@lucide/svelte/icons/shield';
	import Mail from '@lucide/svelte/icons/mail';
	import MailCheck from '@lucide/svelte/icons/mail-check';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Ban from '@lucide/svelte/icons/ban';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Monitor from '@lucide/svelte/icons/monitor';
	import LogOut from '@lucide/svelte/icons/log-out';
	import UserCog from '@lucide/svelte/icons/user-cog';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Clock from '@lucide/svelte/icons/clock';
	import Activity from '@lucide/svelte/icons/activity';
	import Copy from '@lucide/svelte/icons/copy';

	let { data }: { data: PageData } = $props();
	let user = $derived(data.user);

	// Dialog states
	let banDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let disable2FADialogOpen = $state(false);
	let impersonateDialogOpen = $state(false);
	let resetPasswordDialogOpen = $state(false);
	let editProfileOpen = $state(false);

	let isActioning = $state(false);

	// Sessions
	let sessions = $state<UserSessionInfo[]>([]);
	let sessionsLoaded = $state(false);

	// Audit logs
	let auditLogs = $state<any[]>([]);
	let auditLogsLoaded = $state(false);

	// Edit profile state
	let editName = $state('');
	let editEmail = $state('');

	// Reset password result
	let tempPassword = $state('');

	import { ADMIN_ROLE_OPTIONS } from '$lib/constants/domain';
	const ROLES = ADMIN_ROLE_OPTIONS;

	function getInitials(name: string | null, email: string): string {
		if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
		return email[0].toUpperCase();
	}

	function getRoleBadgeVariant(role: string | null): 'default' | 'destructive' | 'secondary' {
		if (role === 'super_admin') return 'destructive';
		if (role === 'franchise_owner') return 'default';
		return 'secondary';
	}

	function parseUA(ua: string | null): string {
		if (!ua) return 'Unknown device';
		if (ua.includes('Mobile')) return 'Mobile';
		if (ua.includes('Chrome')) return 'Chrome';
		if (ua.includes('Firefox')) return 'Firefox';
		if (ua.includes('Safari')) return 'Safari';
		return 'Browser';
	}

	function openEditProfile() {
		editName = user.name || '';
		editEmail = user.email || '';
		editProfileOpen = true;
	}

	async function saveProfile() {
		isActioning = true;
		try {
			await adminUpdateUserProfile(user.id, { name: editName, email: editEmail });
			toast.success('Profile updated');
			editProfileOpen = false;
			await invalidate('app:admin-users');
		} catch (e: any) { toast.error(e?.message || 'Failed to update'); }
		finally { isActioning = false; }
	}

	async function loadSessions() {
		if (sessionsLoaded) return;
		try {
			sessions = await adminGetUserSessions(user.id);
			sessionsLoaded = true;
		} catch { toast.error('Failed to load sessions'); }
	}

	async function loadAuditLogs() {
		if (auditLogsLoaded) return;
		try {
			const result = await getAdminAuditLogs({ userId: user.id, limit: 20 });
			auditLogs = result.logs;
			auditLogsLoaded = true;
		} catch { toast.error('Failed to load activity'); }
	}

	async function confirmBan(reason?: string) {
		isActioning = true;
		try {
			await banAdminUser(user.id, { reason: reason || undefined });
			toast.success('User has been banned');
			await invalidate('app:admin-users');
		} catch { toast.error('Failed to ban user'); }
		finally { isActioning = false; }
	}

	async function handleUnban() {
		isActioning = true;
		try {
			await unbanAdminUser(user.id);
			toast.success('User has been unbanned');
			await invalidate('app:admin-users');
		} catch { toast.error('Failed to unban user'); }
		finally { isActioning = false; }
	}

	async function handleRoleChange(newRole: string) {
		if (newRole === user.role) return;
		isActioning = true;
		try {
			await updateAdminUserRole(user.id, newRole);
			toast.success(`Role updated to ${newRole.replace(/_/g, ' ')}`);
			await invalidate('app:admin-users');
		} catch { toast.error('Failed to update role'); }
		finally { isActioning = false; }
	}

	async function handleVerifyEmail() {
		isActioning = true;
		try {
			await adminForceVerifyEmail(user.id);
			toast.success('Email marked as verified');
			await invalidate('app:admin-users');
		} catch { toast.error('Failed to verify email'); }
		finally { isActioning = false; }
	}

	async function handleDisable2FA() {
		isActioning = true;
		try {
			await adminDisable2FA(user.id);
			toast.success('2FA has been disabled');
			await invalidate('app:admin-users');
		} catch { toast.error('Failed to disable 2FA'); }
		finally { isActioning = false; }
	}

	async function handleResetPassword() {
		isActioning = true;
		try {
			const result = await adminResetPassword(user.id);
			tempPassword = result.temporaryPassword;
			resetPasswordDialogOpen = true;
		} catch { toast.error('Failed to reset password'); }
		finally { isActioning = false; }
	}

	async function copyTempPassword() {
		await navigator.clipboard.writeText(tempPassword);
		toast.success('Password copied to clipboard');
	}

	async function handleRevokeSession(sessionId: string) {
		try {
			await adminRevokeSession(user.id, sessionId);
			sessions = sessions.filter((s) => s.id !== sessionId);
			toast.success('Session revoked');
		} catch { toast.error('Failed to revoke session'); }
	}

	async function handleRevokeAll() {
		try {
			const result = await adminRevokeAllSessions(user.id);
			sessions = [];
			toast.success(`${result.count} session(s) revoked`);
		} catch { toast.error('Failed to revoke sessions'); }
	}

	async function handleDelete() {
		isActioning = true;
		try {
			await adminDeleteUser(user.id);
			toast.success('User deleted');
			goto('/admin/users');
		} catch (err: any) {
			toast.error(err?.message || 'Failed to delete user');
		} finally { isActioning = false; }
	}

	async function handleImpersonate() {
		try {
			await impersonateUser(user.id);
			toast.success(`Now impersonating ${user.name || user.email}`);
			goto('/dashboard');
		} catch { toast.error('Failed to impersonate user'); }
	}
</script>

<svelte:head>
	<title>{user.name || user.email} | Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" href="/admin/users" aria-label="Back">
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">User Details</h1>
				<p class="text-muted-foreground">{user.email}</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if user.role !== 'super_admin'}
				<Button variant="outline" size="sm" onclick={() => (impersonateDialogOpen = true)}>
					<UserCog class="mr-2 h-4 w-4" />
					Impersonate
				</Button>
			{/if}
			{#if user.banned}
				<Button variant="outline" size="sm" onclick={handleUnban} disabled={isActioning}>
					<ShieldCheck class="mr-2 h-4 w-4" />Unban
				</Button>
			{:else}
				<Button variant="destructive" size="sm" onclick={() => (banDialogOpen = true)} disabled={isActioning}>
					<Ban class="mr-2 h-4 w-4" />Ban
				</Button>
			{/if}
			{#if user.role !== 'super_admin'}
				<Button variant="destructive" size="sm" onclick={() => (deleteDialogOpen = true)} disabled={isActioning}>
					<Trash2 class="mr-2 h-4 w-4" />Delete
				</Button>
			{/if}
		</div>
	</div>

	<!-- Profile + Stats -->
	<div class="grid gap-6 md:grid-cols-3">
		<Card.Root class="md:col-span-1">
			<Card.Content class="pt-6">
				<div class="flex flex-col items-center text-center">
					<Avatar.Root class="h-24 w-24 mb-4">
						<Avatar.Image src={user.image || undefined} alt={user.name || user.email} />
						<Avatar.Fallback class="text-2xl">{getInitials(user.name, user.email)}</Avatar.Fallback>
					</Avatar.Root>
					<h2 class="text-xl font-semibold">{user.name || 'Unnamed User'}</h2>
					<p class="text-muted-foreground text-sm">{user.email}</p>

					<Button variant="ghost" size="sm" class="mt-2" onclick={openEditProfile}>
						<Pencil class="mr-1 h-3 w-3" />Edit
					</Button>

					<div class="flex flex-wrap gap-2 mt-4 justify-center">
						{#if user.role}
							<Badge variant={getRoleBadgeVariant(user.role)} class="capitalize">
								{#if user.role === 'super_admin'}<Shield class="h-3 w-3 mr-1" />{/if}
								{user.role.replace(/_/g, ' ')}
							</Badge>
						{/if}
						{#if user.banned}
							<Badge variant="destructive">Banned</Badge>
						{:else}
							<Badge variant="outline">Active</Badge>
						{/if}
						{#if user.emailVerified}
							<Badge variant="outline" class="text-green-600"><MailCheck class="h-3 w-3 mr-1" />Verified</Badge>
						{:else}
							<Badge variant="secondary"><Mail class="h-3 w-3 mr-1" />Unverified</Badge>
						{/if}
					</div>

					<Separator class="my-4" />

					<div class="w-full space-y-2 text-left text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Joined</span>
							<span>{formatDate(user.createdAt)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Last login</span>
							<span>{user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Auth method</span>
							<span class="capitalize">{user.authMethods?.length ? user.authMethods.join(', ') : 'email'}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">2FA</span>
							<span>{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
						</div>
						{#if user.banned && user.banReason}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Ban reason</span>
								<span class="text-destructive text-right max-w-[60%]">{user.banReason}</span>
							</div>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="md:col-span-2">
			<Card.Header>
				<Card.Title>Quick Stats</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div class="rounded-lg border p-4 text-center">
						<p class="text-2xl font-bold">{user._count?.businessUsers ?? 0}</p>
						<p class="text-xs text-muted-foreground">Memberships</p>
					</div>
					<div class="rounded-lg border p-4 text-center">
						<p class="text-2xl font-bold">{user._count?.ownedRestaurants ?? 0}</p>
						<p class="text-xs text-muted-foreground">Owned Businesses</p>
					</div>
					<div class="rounded-lg border p-4 text-center">
						<p class="text-2xl font-bold">{user._count?.orders ?? 0}</p>
						<p class="text-xs text-muted-foreground">Total Orders</p>
					</div>
					<div class="rounded-lg border p-4 text-center">
						<p class="text-2xl font-bold">{user._count?.sessions ?? 0}</p>
						<p class="text-xs text-muted-foreground">Active Sessions</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Tabs -->
	<Tabs.Root value="actions">
		<Tabs.List>
			<Tabs.Trigger value="actions">Admin Actions</Tabs.Trigger>
			<Tabs.Trigger value="sessions" onclick={loadSessions}>Sessions</Tabs.Trigger>
			<Tabs.Trigger value="businesses">Businesses</Tabs.Trigger>
			<Tabs.Trigger value="subscriptions">Subscriptions</Tabs.Trigger>
			<Tabs.Trigger value="activity" onclick={loadAuditLogs}>Activity</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="actions">
			<Card.Root>
				<Card.Content class="pt-6 space-y-6">
					<!-- Role -->
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium">Change Role</p>
							<p class="text-sm text-muted-foreground">Update the user's platform-wide role</p>
						</div>
						<Select.Root type="single" value={user.role || 'user'} onValueChange={handleRoleChange}>
							<Select.Trigger class="w-[200px]" disabled={isActioning}>
								{ROLES.find((r) => r.value === (user.role || 'user'))?.label || 'Select'}
							</Select.Trigger>
							<Select.Content>
								{#each ROLES as role}
									<Select.Item value={role.value}>{role.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<Separator />

					<!-- Reset Password -->
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium">Reset Password</p>
							<p class="text-sm text-muted-foreground">Generate a temporary password for this user</p>
						</div>
						<Button variant="outline" size="sm" onclick={handleResetPassword} disabled={isActioning}>
							<KeyRound class="mr-2 h-4 w-4" />Reset Password
						</Button>
					</div>
					<Separator />

					<!-- Verify Email -->
					{#if !user.emailVerified}
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">Force Verify Email</p>
								<p class="text-sm text-muted-foreground">Mark email as verified without user confirmation</p>
							</div>
							<Button variant="outline" size="sm" onclick={handleVerifyEmail} disabled={isActioning}>
								<MailCheck class="mr-2 h-4 w-4" />Verify Email
							</Button>
						</div>
						<Separator />
					{/if}

					<!-- 2FA -->
					{#if user.twoFactorEnabled}
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">Two-Factor Authentication</p>
								<p class="text-sm text-muted-foreground">2FA is enabled. Disable if user is locked out.</p>
							</div>
							<Button variant="destructive" size="sm" onclick={() => (disable2FADialogOpen = true)} disabled={isActioning}>
								<Smartphone class="mr-2 h-4 w-4" />Disable 2FA
							</Button>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="sessions">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>Active Sessions ({sessions.length})</Card.Title>
						{#if sessions.length > 0}
							<Button variant="destructive" size="sm" onclick={handleRevokeAll}>
								<LogOut class="mr-2 h-4 w-4" />Revoke All
							</Button>
						{/if}
					</div>
				</Card.Header>
				<Card.Content>
					{#if !sessionsLoaded}
						<p class="text-muted-foreground text-sm">Loading sessions...</p>
					{:else if sessions.length === 0}
						<p class="text-muted-foreground text-sm">No active sessions</p>
					{:else}
						<div class="space-y-3">
							{#each sessions as session}
								<div class="flex items-center justify-between rounded-lg border p-3">
									<div class="flex items-center gap-3">
										<Monitor class="h-5 w-5 text-muted-foreground" />
										<div>
											<p class="text-sm font-medium">{parseUA(session.userAgent)}</p>
											<p class="text-xs text-muted-foreground">
												IP: {session.ipAddress || 'Unknown'} &middot; {formatDateTime(session.createdAt)}
											</p>
											<p class="text-xs text-muted-foreground">
												Expires: {formatDateTime(session.expiresAt)}
											</p>
										</div>
									</div>
									<Button variant="ghost" size="sm" onclick={() => handleRevokeSession(session.id)}>
										<LogOut class="h-4 w-4" />
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="businesses">
			<Card.Root>
				<Card.Header>
					<Card.Title>Business Memberships</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if user.businessUsers && user.businessUsers.length > 0}
						<div class="space-y-3">
							{#each user.businessUsers as bu}
								<a href="/admin/businesses/{bu.restaurant?.id}" class="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
									<div class="flex items-center gap-3">
										<Building2 class="h-5 w-5 text-muted-foreground" />
										<div>
											<p class="text-sm font-medium">{bu.restaurant?.name || 'Unknown'}</p>
											<p class="text-xs text-muted-foreground">{bu.restaurant?.type} &middot; {bu.restaurant?.slug}</p>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<Badge variant="outline" class="capitalize">{bu.role?.replace(/_/g, ' ')}</Badge>
										<Badge variant={bu.restaurant?.status === 'active' ? 'default' : 'secondary'} class="capitalize">
											{bu.restaurant?.status}
										</Badge>
									</div>
								</a>
							{/each}
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">No business memberships</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="subscriptions">
			<Card.Root>
				<Card.Header>
					<Card.Title>Subscriptions</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if user.subscriptions && user.subscriptions.length > 0}
						<div class="space-y-3">
							{#each user.subscriptions as sub}
								<div class="flex items-center justify-between rounded-lg border p-4">
									<div>
										<p class="font-medium">{sub.plan?.displayName || sub.plan?.name || 'Unknown Plan'}</p>
										<p class="text-xs text-muted-foreground">
											Period: {formatDate(sub.currentPeriodStart)} — {formatDate(sub.currentPeriodEnd)}
										</p>
									</div>
									<Badge variant={sub.status === 'active' ? 'default' : sub.status === 'canceled' ? 'destructive' : 'secondary'} class="capitalize">
										{sub.status}
									</Badge>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-muted-foreground text-sm">No subscriptions</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="activity">
			<Card.Root>
				<Card.Header>
					<Card.Title>Recent Activity</Card.Title>
				</Card.Header>
				<Card.Content>
					{#if !auditLogsLoaded}
						<p class="text-muted-foreground text-sm">Loading activity...</p>
					{:else if auditLogs.length === 0}
						<p class="text-muted-foreground text-sm">No activity recorded</p>
					{:else}
						<div class="space-y-2">
							{#each auditLogs as log}
								<div class="flex items-start gap-3 rounded-lg border p-3">
									<Activity class="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
									<div class="flex-1 min-w-0">
										<p class="text-sm font-medium">{log.action}</p>
										<p class="text-xs text-muted-foreground">
											{log.resource}{log.resourceId ? ` / ${log.resourceId.slice(0, 8)}...` : ''}
										</p>
										{#if log.details && Object.keys(log.details).length > 0}
											<p class="text-xs text-muted-foreground mt-0.5 truncate">
												{JSON.stringify(log.details).slice(0, 100)}
											</p>
										{/if}
									</div>
									<span class="text-xs text-muted-foreground shrink-0">{formatDateTime(log.createdAt)}</span>
								</div>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Edit Profile Dialog -->
<Dialog.Root bind:open={editProfileOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit User Profile</Dialog.Title>
			<Dialog.Description>Update the user's name and email address.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<label for="edit-name" class="text-sm font-medium">Name</label>
				<Input id="edit-name" bind:value={editName} placeholder="Full name" />
			</div>
			<div class="space-y-2">
				<label for="edit-email" class="text-sm font-medium">Email</label>
				<Input id="edit-email" type="email" bind:value={editEmail} placeholder="email@example.com" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (editProfileOpen = false)}>Cancel</Button>
			<Button onclick={saveProfile} disabled={isActioning}>
				{isActioning ? 'Saving...' : 'Save Changes'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Reset Password Result Dialog -->
<Dialog.Root bind:open={resetPasswordDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Password Reset</Dialog.Title>
			<Dialog.Description>A temporary password has been generated. Share it securely with the user.</Dialog.Description>
		</Dialog.Header>
		<div class="py-4">
			<div class="flex items-center gap-2 rounded-lg border bg-muted p-3">
				<code class="flex-1 text-sm font-mono">{tempPassword}</code>
				<Button variant="ghost" size="sm" onclick={copyTempPassword}>
					<Copy class="h-4 w-4" />
				</Button>
			</div>
			<p class="mt-2 text-xs text-muted-foreground">The user will be required to change this password on next login.</p>
		</div>
		<Dialog.Footer>
			<Button onclick={() => { resetPasswordDialogOpen = false; tempPassword = ''; }}>Done</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Confirm Dialogs -->
<ConfirmDialog
	bind:open={banDialogOpen}
	title="Ban User"
	description="Are you sure you want to ban {user.name || user.email}? They will be unable to access the platform."
	confirmLabel="Ban User"
	variant="destructive"
	showInput={true}
	inputLabel="Reason (optional)"
	onConfirm={confirmBan}
/>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete User"
	description="Permanently delete {user.name || user.email}? This will remove all their sessions, accounts, and team memberships. This cannot be undone."
	confirmLabel="Delete Permanently"
	variant="destructive"
	onConfirm={handleDelete}
/>

<ConfirmDialog
	bind:open={disable2FADialogOpen}
	title="Disable 2FA"
	description="This will remove two-factor authentication for {user.name || user.email}. They will need to re-enable it manually."
	confirmLabel="Disable 2FA"
	variant="destructive"
	onConfirm={handleDisable2FA}
/>

<ConfirmDialog
	bind:open={impersonateDialogOpen}
	title="Impersonate User"
	description="You will be logged in as {user.name || user.email}. Your admin session will be preserved and you can return to your account."
	confirmLabel="Start Impersonation"
	onConfirm={handleImpersonate}
/>
