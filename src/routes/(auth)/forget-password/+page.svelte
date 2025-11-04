<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import * as InputOTP from '$lib/components/ui/input-otp/index.js';
	let { class: className, ...restProps }: HTMLAttributes<HTMLFormElement> = $props();

	let step = $state<'email' | 'otp'>('email');
	let email = $state('');
	let otp = $state('');
	let password = $state('');
	let confirmPassword = $state('');

	// UI states
	let isLoading = $state(false);
	let message = $state('');
	let messageType = $state<'success' | 'error' | ''>('');
	let canResend = $state(false);
	let resendTimer = $state(0);

	// Validation
	let emailError = $state('');
	let otpError = $state('');
	let passwordError = $state('');

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

	function validateOtp() {
		if (!otp) {
			otpError = 'OTP is required';
			return false;
		}
		if (otp.length < 6) {
			otpError = 'OTP must be 6 digits';
			return false;
		}
		otpError = '';
		return true;
	}

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

	async function handleEmailSubmit(event: Event) {
		event.preventDefault();
		if (!validateEmail()) return;

		isLoading = true;
		message = '';

		try {
			// TODO: Replace with actual API call
			await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

			step = 'otp';
			message = `Reset code sent to ${email}`;
			messageType = 'success';
			startResendTimer();
		} catch (error) {
			message = 'Failed to send reset code. Please try again.';
			messageType = 'error';
		} finally {
			isLoading = false;
		}
	}

	async function handleOtpSubmit(event: Event) {
		event.preventDefault();
		if (!validateOtp() || !validatePassword()) return;

		isLoading = true;
		message = '';

		try {
			// TODO: Replace with actual API call
			await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call

			message = 'Password reset successfully! You can now log in with your new password.';
			messageType = 'success';

			// Clear form and redirect after success
			setTimeout(() => {
				email = '';
				otp = '';
				password = '';
				confirmPassword = '';
				step = 'email';
				message = '';
				// TODO: Redirect to login page
			}, 3000);
		} catch (error) {
			message = 'Failed to reset password. Please check your OTP and try again.';
			messageType = 'error';
		} finally {
			isLoading = false;
		}
	}

	function startResendTimer() {
		canResend = false;
		resendTimer = 60;
		const interval = setInterval(() => {
			resendTimer--;
			if (resendTimer <= 0) {
				canResend = true;
				clearInterval(interval);
			}
		}, 1000);
	}

	async function resendOtp() {
		if (!canResend) return;

		isLoading = true;
		message = '';

		try {
			// TODO: Replace with actual API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			message = 'New reset code sent to your email';
			messageType = 'success';
			startResendTimer();
		} catch (error) {
			message = 'Failed to resend code. Please try again.';
			messageType = 'error';
		} finally {
			isLoading = false;
		}
	}

	function goBack() {
		step = 'email';
		otp = '';
		password = '';
		confirmPassword = '';
		message = '';
		otpError = '';
		passwordError = '';
	}
</script>

<form
	class={cn('flex flex-col gap-6', className)}
	{...restProps}
	onsubmit={step === 'email' ? handleEmailSubmit : handleOtpSubmit}
>
	<Field.Group>
		<div class="flex flex-col items-center gap-1 text-center">
			<h1 class="text-2xl font-bold">Reset your password</h1>
			<p class="text-sm text-balance text-muted-foreground">
				{#if step === 'email'}
					Enter your email address to receive a reset code
				{:else}
					Enter the OTP sent to {email} and set a new password
				{/if}
			</p>
		</div>

		{#if message}
			<div
				class="rounded-md p-3 text-sm {messageType === 'success'
					? 'border border-green-200 bg-green-50 text-green-800'
					: 'border border-red-200 bg-red-50 text-red-800'}"
			>
				{message}
			</div>
		{/if}

		{#if step === 'email'}
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
				<Button type="submit" disabled={isLoading}>
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
						Send Reset Code
					{/if}
				</Button>
			</Field.Field>
		{:else}
			<div class="flex items-center justify-between">
				<Button variant="ghost" type="button" onclick={goBack} disabled={isLoading}>← Back</Button>
				{#if canResend}
					<Button variant="ghost" type="button" onclick={resendOtp} disabled={isLoading}>
						Resend Code
					</Button>
				{:else}
					<span class="text-sm text-muted-foreground">Resend in {resendTimer}s</span>
				{/if}
			</div>

			<Field.Field>
				<Field.Label for="otp">OTP</Field.Label>
				<InputOTP.Root maxlength={6}>
					{#snippet children({ cells })}
						<InputOTP.Group>
							{#each cells.slice(0, 2) as cell (cell)}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
						<InputOTP.Separator />
						<InputOTP.Group>
							{#each cells.slice(2, 4) as cell (cell)}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
						<InputOTP.Separator />
						<InputOTP.Group>
							{#each cells.slice(4, 6) as cell (cell)}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
					{/snippet}
				</InputOTP.Root>
				{#if otpError}
					<Field.Description class="text-red-600">{otpError}</Field.Description>
				{/if}
			</Field.Field>

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
				<Button type="submit" disabled={isLoading}>
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
		{/if}
	</Field.Group>
</form>
