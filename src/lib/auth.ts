import { createAuthClient } from 'better-auth/svelte';
import { emailOTPClient } from 'better-auth/client/plugins';
import { dodopaymentsClient } from '@dodopayments/better-auth';
import { env } from '$env/dynamic/public';

export const authClient = createAuthClient({
	baseURL: env.PUBLIC_API_BASE?.replace('/api', '') || 'http://localhost:3000',
	credentials: 'include',
	plugins: [emailOTPClient(), dodopaymentsClient()]
});

export const { signIn, signUp, signOut, useSession, emailOtp } = authClient;

// Export Dodo Payments methods for easy access
export const dodopayments = authClient.dodopayments;
