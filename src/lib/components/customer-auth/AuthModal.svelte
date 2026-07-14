<script lang="ts">
	import { fade } from 'svelte/transition';
	import { customerSignIn } from '$lib/customer-auth';
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import PhoneOtpForm from './PhoneOtpForm.svelte';

	interface Props {
		open: boolean;
		onSuccess?: () => void;
		/** When true, Google is the only sign-in method (used at checkout). */
		googleOnly?: boolean;
	}

	let { open = $bindable(), onSuccess, googleOnly = false }: Props = $props();

	let activeTab = $state<'google' | 'phone'>('google');

	async function handleGoogle() {
		await customerSignIn.social({
			provider: 'google',
			callbackURL: window.location.href
		});
	}

	function handleSuccess() {
		open = false;
		onSuccess?.();
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md">
		<div in:fade={{ duration: 150 }}>
			<DialogHeader>
				<DialogTitle>Sign in to continue</DialogTitle>
			</DialogHeader>

			{#snippet googleButton()}
				<Button onclick={handleGoogle} variant="outline" class="w-full gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="h-4 w-4"
						aria-hidden="true"
					>
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							fill="#4285F4"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							fill="#34A853"
						/>
						<path
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
							fill="#FBBC05"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							fill="#EA4335"
						/>
					</svg>
					Continue with Google
				</Button>
			{/snippet}

			{#if googleOnly}
				<div class="mt-4 flex flex-col gap-3">
					{@render googleButton()}
					<p class="text-center text-xs text-muted-foreground">
						We use your Google account to secure your order and keep your order history in one
						place.
					</p>
				</div>
			{:else}
				<Tabs bind:value={activeTab} class="mt-4">
					<TabsList class="w-full">
						<TabsTrigger value="google" class="flex-1">Google</TabsTrigger>
						<TabsTrigger value="phone" class="flex-1">Phone</TabsTrigger>
					</TabsList>

					<TabsContent value="google" class="mt-4 flex flex-col gap-3">
						{@render googleButton()}
						<button
							type="button"
							onclick={() => (activeTab = 'phone')}
							class="text-center text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
						>
							Use phone number instead
						</button>
					</TabsContent>

					<TabsContent value="phone" class="mt-4">
						<PhoneOtpForm onSuccess={handleSuccess} />
					</TabsContent>
				</Tabs>
			{/if}

			<p class="mt-4 text-center text-xs text-muted-foreground">
				By continuing, you agree to our
				<a href="/privacy" class="underline underline-offset-2">Privacy Policy</a>
				and
				<a href="/terms" class="underline underline-offset-2">Terms of Service</a>.
			</p>
		</div>
	</DialogContent>
</Dialog>
