import { createAuthClient } from 'better-auth/svelte';
import { phoneNumberClient } from 'better-auth/client/plugins';
import { env } from '$env/dynamic/public';

const baseURL =
	env.PUBLIC_CUSTOMER_AUTH_BASE?.replace(/\/api\/customer-auth$/, '') ||
	env.PUBLIC_API_BASE?.replace(/\/api(\/v\d+)?$/, '') ||
	'http://localhost:3000';

export const customerAuthClient = createAuthClient({
	baseURL,
	basePath: '/api/customer-auth',
	credentials: 'include',
	plugins: [phoneNumberClient()]
});

export const {
	signIn: customerSignIn,
	signOut: customerSignOut,
	useSession: useCustomerSession
} = customerAuthClient;

// phoneNumber is exposed via path-to-object mapping of /phone-number/* routes:
//   sendOtp  → /phone-number/send-otp
//   verify   → /phone-number/verify
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customerPhoneNumber = (customerAuthClient as any).phoneNumber as {
	sendOtp: (opts: { phoneNumber: string }) => Promise<{ data: unknown; error: unknown }>;
	verify: (opts: {
		phoneNumber: string;
		code: string;
	}) => Promise<{ data: unknown; error: unknown }>;
};
