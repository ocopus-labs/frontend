<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
import { Checkbox } from '$lib/components/ui/checkbox';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import {
		authClient,
		changePassword,
		listSessions,
		revokeOtherSessions,
		twoFactor
	} from '$lib/auth';

	import Shield from '@lucide/svelte/icons/shield';
	import Key from '@lucide/svelte/icons/key';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Copy from '@lucide/svelte/icons/copy';

	// Password change state
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);
	let showDisablePassword = $state(false);
	let revokeOtherOnChange = $state(false);
	let isChangingPassword = $state(false);

	// Sessions state
	let sessions = $state<any[]>([]);
	let isLoadingSessions = $state(true);
	let isRevokingAll = $state(false);
	let revokingSessionId = $state<string | null>(null);

	// 2FA state
	let twoFactorEnabled = $state(false);
	let isSettingUp2FA = $state(false);
	let isDisabling2FA = $state(false);
	let totpUri = $state('');
	let backupCodes = $state<string[]>([]);
	let verifyCode = $state('');
	let disablePassword = $state('');
	let show2FASetup = $state(false);
	let showBackupCodes = $state(false);
	let showDisable2FA = $state(false);

	onMount(async () => {
		await loadSessions();
		// Check 2FA status from session
		try {
			const session = await authClient.getSession();
			if (session.data?.user) {
				twoFactorEnabled = (session.data.user as any).twoFactorEnabled ?? false;
			}
		} catch {
			// ignore
		}
	});

	// Password change
	async function handleChangePassword() {
		if (newPassword !== confirmPassword) {
			toast.error('New passwords do not match');
			return;
		}
		if (newPassword.length < 8) {
			toast.error('Password must be at least 8 characters');
			return;
		}

		isChangingPassword = true;
		try {
			const result = await changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: revokeOtherOnChange
			});
			if (result.error) {
				toast.error(result.error.message || 'Failed to change password');
			} else {
				toast.success('Password changed successfully');
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
				revokeOtherOnChange = false;
				if (revokeOtherOnChange) {
					await loadSessions();
				}
			}
		} catch (err: any) {
			toast.error(err.message || 'Failed to change password');
		} finally {
			isChangingPassword = false;
		}
	}

	// Sessions
	async function loadSessions() {
		isLoadingSessions = true;
		try {
			const result = await listSessions();
			if (result.data) {
				sessions = result.data;
			}
		} catch (err) {
			console.error('Failed to load sessions:', err);
		} finally {
			isLoadingSessions = false;
		}
	}

	async function handleRevokeSession(sessionToken: string) {
		revokingSessionId = sessionToken;
		try {
			const result = await authClient.revokeSession({ token: sessionToken });
			if (result.error) {
				toast.error(result.error.message || 'Failed to revoke session');
			} else {
				toast.success('Session revoked');
				await loadSessions();
			}
		} catch (err: any) {
			toast.error(err.message || 'Failed to revoke session');
		} finally {
			revokingSessionId = null;
		}
	}

	async function handleRevokeAllOthers() {
		isRevokingAll = true;
		try {
			const result = await revokeOtherSessions();
			if (result.error) {
				toast.error(result.error.message || 'Failed to revoke sessions');
			} else {
				toast.success('All other sessions revoked');
				await loadSessions();
			}
		} catch (err: any) {
			toast.error(err.message || 'Failed to revoke sessions');
		} finally {
			isRevokingAll = false;
		}
	}

	// 2FA
	async function handleEnable2FA() {
		show2FASetup = true;
		isSettingUp2FA = true;
		try {
			const result = await twoFactor.enable({ password: currentPassword || '' });
			if (result.error) {
				toast.error(result.error.message || 'Failed to start 2FA setup');
				show2FASetup = false;
			} else if (result.data) {
				totpUri = result.data.totpURI;
				backupCodes = result.data.backupCodes;
			}
		} catch (err: any) {
			toast.error(err.message || 'Failed to start 2FA setup');
			show2FASetup = false;
		} finally {
			isSettingUp2FA = false;
		}
	}

	async function handleVerify2FA() {
		if (verifyCode.length !== 6) {
			toast.error('Please enter a 6-digit code');
			return;
		}

		isSettingUp2FA = true;
		try {
			const result = await twoFactor.verifyTotp({ code: verifyCode });
			if (result.error) {
				toast.error(result.error.message || 'Invalid code. Please try again.');
			} else {
				twoFactorEnabled = true;
				showBackupCodes = true;
				show2FASetup = false;
				toast.success('Two-factor authentication enabled');
			}
		} catch (err: any) {
			toast.error(err.message || 'Failed to verify code');
		} finally {
			isSettingUp2FA = false;
			verifyCode = '';
		}
	}

	async function handleDisable2FA() {
		isDisabling2FA = true;
		try {
			const result = await twoFactor.disable({ password: disablePassword });
			if (result.error) {
				toast.error(result.error.message || 'Failed to disable 2FA');
			} else {
				twoFactorEnabled = false;
				showDisable2FA = false;
				disablePassword = '';
				toast.success('Two-factor authentication disabled');
			}
		} catch (err: any) {
			toast.error(err.message || 'Failed to disable 2FA');
		} finally {
			isDisabling2FA = false;
		}
	}

	function parseUserAgent(ua: string | null): { device: string; browser: string } {
		if (!ua) return { device: 'Unknown device', browser: 'Unknown browser' };
		let browser = 'Unknown browser';
		let device = 'Desktop';

		if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
		else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

		if (ua.includes('Firefox')) browser = 'Firefox';
		else if (ua.includes('Edg')) browser = 'Edge';
		else if (ua.includes('Chrome')) browser = 'Chrome';
		else if (ua.includes('Safari')) browser = 'Safari';

		return { device, browser };
	}

	function formatSessionDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString(undefined, {
			dateStyle: 'medium'
		});
	}

	function copyBackupCodes() {
		navigator.clipboard.writeText(backupCodes.join('\n'));
		toast.success('Backup codes copied to clipboard');
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

	<!-- Password Change -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-3">
				<Key class="size-5 text-muted-foreground" />
				<div>
					<Card.Title>Change Password</Card.Title>
					<Card.Description>Update your account password</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
				<div class="space-y-2">
					<Label for="current-password">Current Password</Label>
					<InputGroup.Root>
						<InputGroup.Input
							id="current-password"
							type={showCurrentPassword ? 'text' : 'password'}
							bind:value={currentPassword}
							placeholder="Enter current password"
							required
						/>
						<InputGroup.Button
							size="icon-sm"
							ontouchstart={(e) => e.preventDefault()}
							onclick={() => (showCurrentPassword = !showCurrentPassword)}
							aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
						>
							{#if showCurrentPassword}
								<EyeOff class="size-4" />
							{:else}
								<Eye class="size-4" />
							{/if}
						</InputGroup.Button>
					</InputGroup.Root>
				</div>
				<div class="space-y-2">
					<Label for="new-password">New Password</Label>
					<InputGroup.Root>
						<InputGroup.Input
							id="new-password"
							type={showNewPassword ? 'text' : 'password'}
							bind:value={newPassword}
							placeholder="Enter new password (min. 8 characters)"
							required
							minlength={8}
						/>
						<InputGroup.Button
							size="icon-sm"
							ontouchstart={(e) => e.preventDefault()}
							onclick={() => (showNewPassword = !showNewPassword)}
							aria-label={showNewPassword ? 'Hide password' : 'Show password'}
						>
							{#if showNewPassword}
								<EyeOff class="size-4" />
							{:else}
								<Eye class="size-4" />
							{/if}
						</InputGroup.Button>
					</InputGroup.Root>
				</div>
				<div class="space-y-2">
					<Label for="confirm-password">Confirm New Password</Label>
					<InputGroup.Root>
						<InputGroup.Input
							id="confirm-password"
							type={showConfirmPassword ? 'text' : 'password'}
							bind:value={confirmPassword}
							placeholder="Confirm new password"
							required
						/>
						<InputGroup.Button
							size="icon-sm"
							ontouchstart={(e) => e.preventDefault()}
							onclick={() => (showConfirmPassword = !showConfirmPassword)}
							aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
						>
							{#if showConfirmPassword}
								<EyeOff class="size-4" />
							{:else}
								<Eye class="size-4" />
							{/if}
						</InputGroup.Button>
					</InputGroup.Root>
				</div>
				<div class="flex items-center gap-2">
					<Checkbox id="revoke-others" bind:checked={revokeOtherOnChange} />
					<Label for="revoke-others" class="text-sm font-normal">Sign out all other devices</Label>
				</div>
				<Button type="submit" disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}>
					{#if isChangingPassword}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Changing...
					{:else}
						Change Password
					{/if}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Separator />

	<!-- Two-Factor Authentication -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<ShieldCheck class="size-5 text-muted-foreground" />
					<div>
						<Card.Title>Two-Factor Authentication</Card.Title>
						<Card.Description>Add an extra layer of security to your account</Card.Description>
					</div>
				</div>
				{#if twoFactorEnabled}
					<Badge variant="default">Enabled</Badge>
				{:else}
					<Badge variant="secondary">Disabled</Badge>
				{/if}
			</div>
		</Card.Header>
		<Card.Content>
			{#if show2FASetup}
				<div class="space-y-4">
					{#if isSettingUp2FA && !totpUri}
						<div class="flex items-center justify-center py-8">
							<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					{:else if totpUri}
						<div class="space-y-4">
							<p class="text-sm text-muted-foreground">
								Open your authenticator app (Google Authenticator, Authy, etc.) and enter this secret key:
							</p>
							<div class="flex items-center gap-2 rounded-lg bg-muted p-3">
								<code class="flex-1 break-all font-mono text-sm font-medium">
									{totpUri.match(/secret=([^&]+)/)?.[1] || totpUri}
								</code>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => {
										const secret = totpUri.match(/secret=([^&]+)/)?.[1] || totpUri;
										navigator.clipboard.writeText(secret);
										toast.success('Secret copied to clipboard');
									}}
								>
									<Copy class="h-4 w-4" />
								</Button>
							</div>
							<p class="text-xs text-muted-foreground">
								Or use this full TOTP URI if your app supports it:
							</p>
							<div class="break-all rounded-lg bg-muted p-2 font-mono text-xs text-muted-foreground">
								{totpUri}
							</div>
							<div class="space-y-2">
								<Label for="verify-code">Verification Code</Label>
								<Input
									id="verify-code"
									type="text"
									inputmode="numeric"
									maxlength={6}
									bind:value={verifyCode}
									placeholder="Enter 6-digit code"
								/>
							</div>
							<div class="flex gap-2">
								<Button onclick={handleVerify2FA} disabled={isSettingUp2FA || verifyCode.length !== 6}>
									{#if isSettingUp2FA}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{/if}
									Verify & Enable
								</Button>
								<Button variant="outline" onclick={() => { show2FASetup = false; totpUri = ''; verifyCode = ''; }}>
									Cancel
								</Button>
							</div>
						</div>
					{/if}
				</div>
			{:else if showBackupCodes}
				<div class="space-y-4">
					<p class="text-sm font-medium text-destructive">
						Save your backup codes! You won't be able to see them again.
					</p>
					<div class="rounded-lg border bg-muted p-4">
						<div class="grid grid-cols-2 gap-2 font-mono text-sm">
							{#each backupCodes as code}
								<div class="rounded bg-background px-2 py-1">{code}</div>
							{/each}
						</div>
					</div>
					<div class="flex gap-2">
						<Button variant="outline" onclick={copyBackupCodes}>
							<Copy class="mr-2 h-4 w-4" />
							Copy Codes
						</Button>
						<Button onclick={() => { showBackupCodes = false; backupCodes = []; }}>
							I've Saved My Codes
						</Button>
					</div>
				</div>
			{:else if showDisable2FA}
				<div class="space-y-4">
					<p class="text-sm text-muted-foreground">
						Enter your password to disable two-factor authentication.
					</p>
					<div class="space-y-2">
						<Label for="disable-password">Password</Label>
						<InputGroup.Root>
							<InputGroup.Input
								id="disable-password"
								type={showDisablePassword ? 'text' : 'password'}
								bind:value={disablePassword}
								placeholder="Enter your password"
							/>
							<InputGroup.Button
								size="icon-sm"
								ontouchstart={(e) => e.preventDefault()}
								onclick={() => (showDisablePassword = !showDisablePassword)}
								aria-label={showDisablePassword ? 'Hide password' : 'Show password'}
							>
								{#if showDisablePassword}
									<EyeOff class="size-4" />
								{:else}
									<Eye class="size-4" />
								{/if}
							</InputGroup.Button>
						</InputGroup.Root>
					</div>
					<div class="flex gap-2">
						<Button variant="destructive" onclick={handleDisable2FA} disabled={isDisabling2FA || !disablePassword}>
							{#if isDisabling2FA}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							Disable 2FA
						</Button>
						<Button variant="outline" onclick={() => { showDisable2FA = false; disablePassword = ''; }}>
							Cancel
						</Button>
					</div>
				</div>
			{:else}
				<p class="mb-4 text-sm text-muted-foreground">
					{#if twoFactorEnabled}
						Your account is protected with two-factor authentication.
					{:else}
						Protect your account by requiring a verification code from your phone in addition to your password.
					{/if}
				</p>
				{#if twoFactorEnabled}
					<Button variant="destructive" onclick={() => showDisable2FA = true}>
						Disable 2FA
					</Button>
				{:else}
					<Button onclick={handleEnable2FA}>
						<ShieldCheck class="mr-2 h-4 w-4" />
						Enable 2FA
					</Button>
				{/if}
			{/if}
		</Card.Content>
	</Card.Root>

	<Separator />

	<!-- Active Sessions -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Monitor class="size-5 text-muted-foreground" />
					<div>
						<Card.Title>Active Sessions</Card.Title>
						<Card.Description>Manage your active sign-in sessions</Card.Description>
					</div>
				</div>
				{#if sessions.length > 1}
					<Button
						variant="outline"
						size="sm"
						onclick={handleRevokeAllOthers}
						disabled={isRevokingAll}
					>
						{#if isRevokingAll}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<LogOut class="mr-2 h-4 w-4" />
						{/if}
						Sign Out Others
					</Button>
				{/if}
			</div>
		</Card.Header>
		<Card.Content>
			{#if isLoadingSessions}
				<div class="flex items-center justify-center py-8">
					<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			{:else if sessions.length === 0}
				<p class="text-sm text-muted-foreground">No active sessions found.</p>
			{:else}
				<div class="space-y-3">
					{#each sessions as session (session.token)}
						{@const ua = parseUserAgent(session.userAgent)}
						{@const isCurrent = session.token === sessions[0]?.token}
						<div class="flex items-center justify-between rounded-lg border p-4 {isCurrent ? 'border-primary/50 bg-primary/5' : ''}">
							<div class="flex items-center gap-3">
								{#if ua.device === 'Mobile'}
									<Smartphone class="h-5 w-5 text-muted-foreground" />
								{:else}
									<Monitor class="h-5 w-5 text-muted-foreground" />
								{/if}
								<div>
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium">{ua.browser} on {ua.device}</span>
										{#if isCurrent}
											<Badge variant="outline" class="text-xs">Current</Badge>
										{/if}
									</div>
									<div class="flex gap-3 text-xs text-muted-foreground">
										{#if session.ipAddress}
											<span>{session.ipAddress}</span>
										{/if}
										<span>Created {formatSessionDate(session.createdAt)}</span>
									</div>
								</div>
							</div>
							{#if !isCurrent}
								<Button
									variant="ghost"
									size="sm"
									onclick={() => handleRevokeSession(session.token)}
									disabled={revokingSessionId === session.token}
								>
									{#if revokingSessionId === session.token}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else}
										<LogOut class="h-4 w-4" />
									{/if}
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
