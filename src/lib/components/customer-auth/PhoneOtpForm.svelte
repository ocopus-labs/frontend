<script lang="ts">
	import { customerPhoneNumber } from '$lib/customer-auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field/index.js';

	interface Props {
		onSuccess?: () => void;
		/** Override the OTP send call — used by PhoneVerifyGate which binds phone to existing session */
		sendOtp?: (phone: string) => Promise<{ error: unknown }>;
	}

	let { onSuccess, sendOtp: sendOtpOverride }: Props = $props();

	let phone = $state('');
	let code = $state('');
	let step = $state<'phone' | 'code'>('phone');
	let sending = $state(false);
	let verifying = $state(false);
	let error = $state('');

	function validatePhone(v: string) {
		return v.startsWith('+') && v.replace(/\D/g, '').length >= 10;
	}

	function validateCode(v: string) {
		return /^\d{6}$/.test(v);
	}

	async function handleSend(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (!validatePhone(phone)) {
			error = 'Enter a valid phone number starting with + (e.g. +91…)';
			return;
		}
		sending = true;
		try {
			const doSend = sendOtpOverride
				? () => sendOtpOverride!(phone)
				: () => customerPhoneNumber.sendOtp({ phoneNumber: phone });
			const res = await doSend();
			if (res.error) {
				const status = (res.error as { status?: number }).status;
				if (status === 429) {
					error = 'Too many requests, try again shortly.';
				} else {
					error = (res.error as { message?: string }).message || 'Failed to send OTP.';
				}
			} else {
				step = 'code';
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			sending = false;
		}
	}

	async function handleVerify(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (!validateCode(code)) {
			error = 'Enter the 6-digit code sent to your phone.';
			return;
		}
		verifying = true;
		try {
			const res = await customerPhoneNumber.verify({ phoneNumber: phone, code });
			if (res.error) {
				error = (res.error as { message?: string }).message || 'Invalid or expired code.';
			} else {
				onSuccess?.();
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			verifying = false;
		}
	}

	function goBack() {
		step = 'phone';
		code = '';
		error = '';
	}
</script>

{#if step === 'phone'}
	<form onsubmit={handleSend} class="flex flex-col gap-3">
		<Field.Field>
			<Field.Label for="phone-input">Phone number</Field.Label>
			<Input
				id="phone-input"
				type="tel"
				bind:value={phone}
				placeholder="+91 98765 43210"
				autocomplete="tel"
				inputmode="tel"
				disabled={sending}
			/>
		</Field.Field>
		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
		<Button type="submit" disabled={sending} class="w-full">
			{sending ? 'Sending…' : 'Send code'}
		</Button>
	</form>
{:else}
	<form onsubmit={handleVerify} class="flex flex-col gap-3">
		<p class="text-sm text-muted-foreground">
			Code sent to <span class="font-medium text-foreground">{phone}</span>.
		</p>
		<Field.Field>
			<Field.Label for="otp-input">6-digit code</Field.Label>
			<Input
				id="otp-input"
				type="text"
				bind:value={code}
				placeholder="123456"
				inputmode="numeric"
				maxlength={6}
				autocomplete="one-time-code"
				disabled={verifying}
			/>
		</Field.Field>
		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
		<Button type="submit" disabled={verifying} class="w-full">
			{verifying ? 'Verifying…' : 'Verify'}
		</Button>
		<button
			type="button"
			onclick={goBack}
			class="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
		>
			Change number
		</button>
	</form>
{/if}
