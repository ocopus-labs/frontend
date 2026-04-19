<script lang="ts">
	import { customerAuthClient, useCustomerSession, customerPhoneNumber } from '$lib/customer-auth';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '$lib/components/ui/dialog';
	import PhoneOtpForm from './PhoneOtpForm.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// useCustomerSession returns a nanostores Atom — same pattern as useSession in nav-user.svelte
	const session = useCustomerSession();

	// The phone number plugin stores `phoneNumberVerified` on the user object.
	// A Google-only sign-in leaves this false, triggering the gate.
	// While isPending is true, we render children optimistically.
	let needsVerify = $derived.by(() => {
		const s = $session;
		if (!s || s.isPending) return false;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (s.data as any)?.user?.phoneNumberVerified === false;
	});

	// For PhoneVerifyGate, sendOtp + verify is the canonical "bind phone to Google account"
	// flow — the phone-number plugin has no separate `add` method; verifying an OTP
	// unconditionally sets phoneNumberVerified=true and links the phone to the session user.
	async function sendOtpForBind(phone: string) {
		return customerPhoneNumber.sendOtp({ phoneNumber: phone });
	}

	async function handleVerifySuccess() {
		// Attempt a session refresh; fall back to reload if reactivity doesn't update.
		await customerAuthClient.getSession({ fetchOptions: { cache: 'no-store' } });
		window.location.reload();
	}
</script>

{@render children()}

{#if needsVerify}
	<Dialog open={needsVerify} onOpenChange={() => {}}>
		<DialogContent
			class="sm:max-w-md"
			escapeKeydownBehavior="ignore"
			interactOutsideBehavior="ignore"
		>
			<DialogHeader>
				<DialogTitle>Add your phone to continue</DialogTitle>
				<DialogDescription>
					Please verify your phone number to complete your account setup.
				</DialogDescription>
			</DialogHeader>
			<div class="mt-2">
				<PhoneOtpForm sendOtp={sendOtpForBind} onSuccess={handleVerifySuccess} />
			</div>
		</DialogContent>
	</Dialog>
{/if}
