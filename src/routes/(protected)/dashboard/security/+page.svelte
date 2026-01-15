<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { useSession } from '$lib/auth';
	import { toast } from 'svelte-sonner';

	import Shield from '@lucide/svelte/icons/shield';
	import Key from '@lucide/svelte/icons/key';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import Monitor from '@lucide/svelte/icons/monitor';
	import LogOut from '@lucide/svelte/icons/log-out';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';

	const session = useSession();
	const user = $derived($session.data?.user);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let twoFactorEnabled = $state(false);
	let isChangingPassword = $state(false);

	// Mock sessions data
	const activeSessions = [
		{
			id: '1',
			device: 'Chrome on Windows',
			location: 'New York, US',
			lastActive: 'Now',
			current: true
		},
		{
			id: '2',
			device: 'Safari on iPhone',
			location: 'New York, US',
			lastActive: '2 hours ago',
			current: false
		}
	];

	async function handleChangePassword() {
		if (newPassword !== confirmPassword) {
			toast.error('Passwords do not match');
			return;
		}
		if (newPassword.length < 8) {
			toast.error('Password must be at least 8 characters');
			return;
		}

		isChangingPassword = true;
		try {
			// TODO: Implement actual password change
			await new Promise((resolve) => setTimeout(resolve, 1000));
			toast.success('Password changed successfully');
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (error) {
			toast.error('Failed to change password');
		} finally {
			isChangingPassword = false;
		}
	}

	function revokeSession(sessionId: string) {
		toast.success('Session revoked');
	}
</script>

<svelte:head>
	<title>Security | POS</title>
</svelte:head>

<div class="max-w-2xl space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Security</h1>
		<p class="mt-2 text-muted-foreground">
			Manage your account security and active sessions.
		</p>
	</div>

	<!-- Change Password -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-3">
				<Key class="size-5 text-muted-foreground" />
				<div>
					<Card.Title>Change Password</Card.Title>
					<Card.Description>Update your password regularly for security</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-2">
				<Label for="current-password">Current Password</Label>
				<Input id="current-password" type="password" bind:value={currentPassword} />
			</div>
			<div class="grid gap-2">
				<Label for="new-password">New Password</Label>
				<Input id="new-password" type="password" bind:value={newPassword} />
			</div>
			<div class="grid gap-2">
				<Label for="confirm-password">Confirm New Password</Label>
				<Input id="confirm-password" type="password" bind:value={confirmPassword} />
			</div>
		</Card.Content>
		<Card.Footer>
			<Button onclick={handleChangePassword} disabled={isChangingPassword}>
				{isChangingPassword ? 'Changing...' : 'Change Password'}
			</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Two-Factor Authentication -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-3">
				<Smartphone class="size-5 text-muted-foreground" />
				<div>
					<Card.Title>Two-Factor Authentication</Card.Title>
					<Card.Description>Add an extra layer of security</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center justify-between">
				<div>
					<p class="font-medium">Enable 2FA</p>
					<p class="text-sm text-muted-foreground">
						Use an authenticator app for additional security
					</p>
				</div>
				<Switch bind:checked={twoFactorEnabled} />
			</div>
		</Card.Content>
		{#if !twoFactorEnabled}
			<Card.Footer>
				<div class="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
					<AlertTriangle class="size-4" />
					We recommend enabling 2FA for better security
				</div>
			</Card.Footer>
		{/if}
	</Card.Root>

	<!-- Active Sessions -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Monitor class="size-5 text-muted-foreground" />
					<div>
						<Card.Title>Active Sessions</Card.Title>
						<Card.Description>Manage your logged-in devices</Card.Description>
					</div>
				</div>
				<Button variant="outline" size="sm">
					<LogOut class="mr-2 size-4" />
					Sign Out All
				</Button>
			</div>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#each activeSessions as session}
				<div class="flex items-center justify-between rounded-lg border p-4">
					<div class="flex items-center gap-4">
						<Monitor class="size-8 text-muted-foreground" />
						<div>
							<div class="flex items-center gap-2">
								<p class="font-medium">{session.device}</p>
								{#if session.current}
									<Badge variant="secondary">Current</Badge>
								{/if}
							</div>
							<p class="text-sm text-muted-foreground">
								{session.location} • {session.lastActive}
							</p>
						</div>
					</div>
					{#if !session.current}
						<Button variant="ghost" size="sm" onclick={() => revokeSession(session.id)}>
							Revoke
						</Button>
					{/if}
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
