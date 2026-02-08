// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session, User } from 'better-auth';

// Extended user type with our custom fields
interface AppUser extends User {
	role?: string | null;
	banned?: boolean | null;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: Session | null;
			user: AppUser | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'd3-shape';

export {};
