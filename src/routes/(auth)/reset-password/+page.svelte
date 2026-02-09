<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { authClient } from '$lib/auth';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/stores';
	import PasswordStrength from '$lib/components/ui/password-strength.svelte';

	let { class: className, ...restProps }: HTMLAttributes<HTMLFormElement> = $props();

	// Get token from URL query parameter
	let token = $derived($page.url.searchParams.get('token') || '');

	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);

	// UI states
	let isLoading = $state(false);
	let passwordError = $state('');

	function validatePassword() {
		if (!password) {
			passwordError = 'Password is required';
			return false;
		}
		if (password.length < 8) {
			passwordError = 'Password must be at least 8 characters';
			return false;
		}
		if (password !== confirmPassword) {
			passwordError = 'Passwords do not match';
			return false;
		}
		passwordError = '';
		return true;
	}

	async function handleResetSubmit(event: Event) {
		event.preventDefault();
		if (!validatePassword()) return;

		isLoading = true;

		try {
			const result = await authClient.resetPassword({
				newPassword: password,
				token
			});

			if (result.error) {
				toast.error(result.error.message || 'Failed to reset password');
				return;
			}

			// Success
			toast.success('Password reset successfully! Redirecting to login...');

			// Redirect to login after 2 seconds
			setTimeout(() => {
				goto('/login');
			}, 2000);
		} catch (error: any) {
			toast.error(error.message || 'An error occurred. Please try again.');
		} finally {
			isLoading = false;
		}
	}
</script>

{#if token}
	<form class={cn('flex flex-col gap-6', className)} {...restProps} onsubmit={handleResetSubmit}>
		<Field.Group>
			<div class="flex flex-col items-center gap-1 text-center">
				<h1 class="text-2xl font-bold">Set new password</h1>
				<p class="text-sm text-balance text-muted-foreground">Enter your new password below</p>
			</div>

			<Field.Field>
				<Field.Label for="password">New Password</Field.Label>
				<InputGroup.Root>
					<InputGroup.Input
						id="password"
						type={showPassword ? 'text' : 'password'}
						placeholder="At least 8 characters"
						required
						bind:value={password}
						disabled={isLoading}
					/>
					<InputGroup.Button
						size="icon-sm"
						ontouchstart={(e) => e.preventDefault()}
						onclick={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{#if showPassword}
							<EyeOff class="size-4" />
						{:else}
							<Eye class="size-4" />
						{/if}
					</InputGroup.Button>
				</InputGroup.Root>
				<PasswordStrength {password} />
			</Field.Field>

			<Field.Field>
				<Field.Label for="confirmPassword">Confirm New Password</Field.Label>
				<InputGroup.Root>
					<InputGroup.Input
						id="confirmPassword"
						type={showConfirmPassword ? 'text' : 'password'}
						placeholder="Confirm your password"
						required
						bind:value={confirmPassword}
						disabled={isLoading}
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
				{#if passwordError}
					<Field.Description class="text-destructive">{passwordError}</Field.Description>
				{:else if confirmPassword && password === confirmPassword}
					<Field.Description class="text-emerald-600 dark:text-emerald-400">Passwords match</Field.Description>
				{/if}
			</Field.Field>

			<Field.Field>
				<Button type="submit" disabled={isLoading} class="w-full">
					{#if isLoading}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Resetting...
					{:else}
						Reset Password
					{/if}
				</Button>
			</Field.Field>
		</Field.Group>
	</form>
{:else}
	<div class="flex flex-col items-center gap-4 text-center">
		<div class="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
			<p class="text-sm text-red-800 dark:text-red-200">
				Invalid or missing reset token. Please request a new password reset link.
			</p>
		</div>
		<a href="/forget-password" class="text-sm underline hover:text-foreground">
			Request a new reset link
		</a>
	</div>
{/if}
