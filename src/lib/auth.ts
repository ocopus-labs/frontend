import { createAuthClient } from 'better-auth/svelte';
import { emailOTPClient, twoFactorClient } from 'better-auth/client/plugins';
import { dodopaymentsClient } from '@dodopayments/better-auth';
import { env } from '$env/dynamic/public';

export const authClient = createAuthClient({
	baseURL: env.PUBLIC_API_BASE?.replace(/\/api(\/v\d+)?$/, '') || 'http://localhost:3000',
	credentials: 'include',
	plugins: [emailOTPClient(), dodopaymentsClient(), twoFactorClient()]
});

export const { signIn, signUp, signOut, useSession, emailOtp } = authClient;

// Export Dodo Payments methods for easy access
export const dodopayments = authClient.dodopayments;

// Export auth methods for security page
export const { changePassword, listSessions, revokeSessions, revokeOtherSessions } = authClient;
export const twoFactor = authClient.twoFactor;
