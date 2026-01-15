<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { authClient } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	
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
			const result = await authClient.forgetPassword({
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

<form
	class={cn('flex flex-col gap-6', className)}
	{...restProps}
	onsubmit={handleEmailSubmit}
>
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
				<Field.Description class="text-red-600">{emailError}</Field.Description>
			{/if}
		</Field.Field>
		
		<Field.Field>
			<Button type="submit" disabled={isLoading} class="w-full">
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
						Sending...
					</span>
				{:else}
					Send Reset Link
				{/if}
			</Button>
		</Field.Field>
	</Field.Group>
</form>
