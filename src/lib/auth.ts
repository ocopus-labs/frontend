import { createAuthClient } from 'better-auth/svelte';
import { emailOTPClient } from 'better-auth/client/plugins';
import { env } from '$env/dynamic/public';

export const authClient = createAuthClient({
	baseURL: 'http://localhost:3000',
	credentials: 'include',
	plugins: [emailOTPClient()]
});

export const { signIn, signUp, signOut, useSession, emailOtp } = authClient;
