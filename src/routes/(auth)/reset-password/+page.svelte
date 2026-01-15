<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { authClient } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/stores';
	
	let { class: className, ...restProps }: HTMLAttributes<HTMLFormElement> = $props();

	// Get token from URL query parameter
	let token = $derived($page.url.searchParams.get('token') || '');
	
	let password = $state('');
	let confirmPassword = $state('');

	// UI states
	let isLoading = $state(false);
	let passwordError = $state('');

	// Check if token is present
	$effect(() => {
		if (!token) {
			toast.error('Invalid or missing reset token');
			setTimeout(() => goto('/forget-password'), 2000);
		}
	});

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

<form
	class={cn('flex flex-col gap-6', className)}
	{...restProps}
	onsubmit={handleResetSubmit}
>
	<Field.Group>
		<div class="flex flex-col items-center gap-1 text-center">
			<h1 class="text-2xl font-bold">Set new password</h1>
			<p class="text-sm text-balance text-muted-foreground">
				Enter your new password below
			</p>
		</div>

		<Field.Field>
			<Field.Label for="password">New Password</Field.Label>
			<Input
				id="password"
				type="password"
				placeholder="At least 8 characters"
				required
				bind:value={password}
				disabled={isLoading}
			/>
		</Field.Field>

		<Field.Field>
			<Field.Label for="confirmPassword">Confirm New Password</Field.Label>
			<Input
				id="confirmPassword"
				type="password"
				placeholder="Confirm your password"
				required
				bind:value={confirmPassword}
				disabled={isLoading}
			/>
			{#if passwordError}
				<Field.Description class="text-red-600">{passwordError}</Field.Description>
			{:else}
				<Field.Description class="text-muted-foreground"
					>Password must be at least 8 characters long</Field.Description
				>
			{/if}
		</Field.Field>

		<Field.Field>
			<Button type="submit" disabled={isLoading || !token} class="w-full">
				{#if isLoading}
					<span class="flex items-center gap-2">
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								fill="none"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Resetting...
					</span>
				{:else}
					Reset Password
				{/if}
			</Button>
		</Field.Field>
	</Field.Group>
</form>
