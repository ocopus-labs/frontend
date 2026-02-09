<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { authClient } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	let { class: className, ...restProps }: HTMLAttributes<HTMLFormElement> = $props();

	let email = $state('');

	// UI states
	let isLoading = $state(false);
	let emailError = $state('');

	function validateEmail() {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!email) {
			emailError = 'Email is required';
			return false;
		}
		if (!emailRegex.test(email)) {
			emailError = 'Please enter a valid email address';
			return false;
		}
		emailError = '';
		return true;
	}

	async function handleEmailSubmit(event: Event) {
		event.preventDefault();
		if (!validateEmail()) return;

		isLoading = true;

		try {
			// Use Better Auth client method for forget password
			const result = await (authClient.forgetPassword as any)({
				email,
				redirectTo: `${window.location.origin}/reset-password`
			});

			if (result.error) {
				toast.error(result.error.message || 'Failed to send reset email');
				return;
			}

			// Success - email sent
			toast.success('Password reset email sent! Please check your inbox for the reset link.');

			// Clear the email field
			email = '';
		} catch (error: any) {
			toast.error(error.message || 'An error occurred. Please try again.');
		} finally {
			isLoading = false;
		}
	}
</script>

<form class={cn('flex flex-col gap-6', className)} {...restProps} onsubmit={handleEmailSubmit}>
	<Field.Group>
		<div class="flex flex-col items-center gap-1 text-center">
			<h1 class="text-2xl font-bold">Reset your password</h1>
			<p class="text-sm text-balance text-muted-foreground">
				Enter your email address and we'll send you a link to reset your password
			</p>
		</div>

		<Field.Field>
			<Field.Label for="email">Email</Field.Label>
			<Input
				id="email"
				type="email"
				placeholder="m@example.com"
				required
				bind:value={email}
				disabled={isLoading}
			/>
			{#if emailError}
				<Field.Description class="text-destructive">{emailError}</Field.Description>
			{/if}
		</Field.Field>

		<Field.Field>
			<Button type="submit" disabled={isLoading} class="w-full">
				{#if isLoading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Sending...
				{:else}
					Send Reset Link
				{/if}
			</Button>
		</Field.Field>
	</Field.Group>
</form>
