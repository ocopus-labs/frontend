<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { emailOtp } from '$lib/auth';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import Mail from '@lucide/svelte/icons/mail';

	let email = $derived($page.url.searchParams.get('email') || '');

	let otp = $state('');
	let isVerifying = $state(false);
	let isSending = $state(false);
	let cooldown = $state(0);
	let cooldownInterval: ReturnType<typeof setInterval> | null = null;

	function startCooldown() {
		cooldown = 60;
		if (cooldownInterval) clearInterval(cooldownInterval);
		cooldownInterval = setInterval(() => {
			cooldown--;
			if (cooldown <= 0) {
				cooldown = 0;
				if (cooldownInterval) {
					clearInterval(cooldownInterval);
					cooldownInterval = null;
				}
			}
		}, 1000);
	}

	$effect(() => {
		return () => {
			if (cooldownInterval) clearInterval(cooldownInterval);
		};
	});

	async function sendOtp() {
		if (!email || isSending || cooldown > 0) return;
		isSending = true;
		try {
			const result = await emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
			if (result.error) {
				toast.error('Failed to send verification code', {
					description: result.error.message
				});
			} else {
				toast.success('Verification code sent to your email');
				startCooldown();
			}
		} catch {
			toast.error('Failed to send verification code');
		} finally {
			isSending = false;
		}
	}

	async function verifyEmail() {
		if (!otp || !email) return;
		isVerifying = true;
		try {
			const result = await emailOtp.verifyEmail({ email, otp });
			if (result.error) {
				toast.error('Verification failed', {
					description: result.error.message
				});
			} else {
				toast.success('Email verified! Redirecting to dashboard...');
				window.location.href = '/dashboard';
			}
		} catch {
			toast.error('Verification failed');
		} finally {
			isVerifying = false;
		}
	}
</script>

<div class="flex flex-col items-center gap-6 text-center">
	<div class="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
		<Mail class="size-8" />
	</div>

	<div class="space-y-2">
		<h1 class="text-2xl font-bold">Check your inbox</h1>
		<p class="text-sm text-muted-foreground">
			We've sent a verification code to
			{#if email}
				<strong>{email}</strong>
			{:else}
				your email address
			{/if}. Enter the code below to verify your account.
		</p>
	</div>

	<div class="w-full space-y-4">
		<Field.Field>
			<Field.Label for="otp">Verification Code</Field.Label>
			<Input
				id="otp"
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				placeholder="Enter 6-digit code"
				bind:value={otp}
				maxlength={6}
				aria-required={true}
				oninput={() => {
					otp = otp.replace(/\D/g, '');
				}}
			/>
		</Field.Field>

		<Button class="w-full" onclick={verifyEmail} disabled={isVerifying || !otp}>
			{isVerifying ? 'Verifying...' : 'Verify Email'}
		</Button>

		<Button variant="outline" class="w-full" onclick={sendOtp} disabled={isSending || cooldown > 0}>
			{#if isSending}
				Sending...
			{:else if cooldown > 0}
				Resend ({cooldown}s)
			{:else}
				Resend verification email
			{/if}
		</Button>
	</div>

	<a href="/login" class="text-sm text-muted-foreground underline hover:text-foreground">
		Back to login
	</a>
</div>
