<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { signIn, emailOtp, authClient, twoFactor } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';
	import { env } from '$env/dynamic/public';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';

	let { class: className, ...restProps }: HTMLAttributes<HTMLFormElement> = $props();

	let redirectTo = $derived($page.url.searchParams.get('returnTo') || '/dashboard');

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let otp = $state('');
	let isLoading = $state(false);
	let showVerification = $state(false);
	let isSendingOtp = $state(false);
	let cooldown = $state(0);
	let cooldownInterval: ReturnType<typeof setInterval> | null = null;

	// 2FA challenge state
	let show2FAChallenge = $state(false);
	let totpCode = $state('');
	let isVerifying2FA = $state(false);

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

	// Cleanup interval on component destroy
	$effect(() => {
		return () => {
			if (cooldownInterval) clearInterval(cooldownInterval);
		};
	});

	// Auto-send OTP when verification section is shown
	$effect(() => {
		if (showVerification) {
			sendVerificationOtp();
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isLoading = true;

		try {
			const result = await signIn.email({
				email,
				password,
				callbackURL: redirectTo
			});

			if (result.error) {
				const errorMsg = result.error.message?.toLowerCase() || '';
				const errorCode = (result.error as any).code || '';
				if (errorCode === 'TWO_FACTOR_REQUIRED' || errorMsg.includes('two factor') || errorMsg.includes('two-factor') || errorMsg.includes('2fa')) {
					// User has 2FA enabled — show the TOTP challenge screen
					show2FAChallenge = true;
				} else if (errorMsg.includes('email') && errorMsg.includes('verified')) {
					showVerification = true;
					toast.error('Email not verified', {
						description: 'Please verify your email to continue.'
					});
				} else {
					toast.error('Login failed', {
						description: result.error.message || 'Invalid email or password'
					});
				}
			} else {
				toast.success('Login successful!');
				const user = result.data?.user as { role?: string } | undefined;
				const target = user?.role === 'super_admin' ? '/admin' : redirectTo;
				goto(target);
			}
		} catch (error) {
			toast.error('Login failed', {
				description: 'An unexpected error occurred. Please try again.'
			});
		} finally {
			isLoading = false;
		}
	}

	async function handle2FAVerify() {
		if (totpCode.length !== 6) {
			toast.error('Please enter a 6-digit code');
			return;
		}
		isVerifying2FA = true;
		try {
			const result = await twoFactor.verifyTotp({ code: totpCode });
			if (result.error) {
				toast.error('Invalid code', {
					description: result.error.message || 'Please check your authenticator app and try again.'
				});
			} else {
				toast.success('Login successful!');
				goto(redirectTo);
			}
		} catch (error) {
			toast.error('Verification failed', {
				description: 'An unexpected error occurred. Please try again.'
			});
		} finally {
			isVerifying2FA = false;
			totpCode = '';
		}
	}

	async function sendVerificationOtp() {
		if (!email || isSendingOtp || cooldown > 0) return;
		isSendingOtp = true;
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
		} catch (error) {
			toast.error('Failed to send verification code');
		} finally {
			isSendingOtp = false;
		}
	}

	async function verifyEmail() {
		if (!otp) {
			toast.error('Please enter the verification code');
			return;
		}
		isLoading = true;
		try {
			const result = await emailOtp.verifyEmail({ email, otp });
			if (result.error) {
				toast.error('Verification failed', {
					description: result.error.message
				});
			} else {
				toast.success('Email verified! You can now log in.');
				showVerification = false;
				otp = '';
			}
		} catch (error) {
			toast.error('Verification failed');
		} finally {
			isLoading = false;
		}
	}
</script>

<form class={cn('flex flex-col gap-6', className)} {...restProps} onsubmit={handleSubmit}>
	<Field.Group>
		<div class="flex flex-col items-center gap-1 text-center">
			<h1 class="text-2xl font-bold">Log in to your account</h1>
			<p class="text-sm text-balance text-muted-foreground">
				Fill in the form below to log in to your account
			</p>
		</div>

		{#if show2FAChallenge}
			<!-- Two-Factor Authentication Challenge -->
			<div class="flex flex-col items-center gap-2 text-center">
				<ShieldCheck class="size-10 text-primary" />
				<h2 class="text-lg font-semibold">Two-Factor Authentication</h2>
				<p class="text-sm text-muted-foreground">
					Enter the 6-digit code from your authenticator app to continue.
				</p>
			</div>
			<Field.Field>
				<Field.Label for="totp-code">Authentication Code</Field.Label>
				<Input
					id="totp-code"
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					placeholder="000000"
					bind:value={totpCode}
					maxlength={6}
					autocomplete="one-time-code"
					oninput={() => { totpCode = totpCode.replace(/\D/g, ''); }}
					disabled={isVerifying2FA}
				/>
			</Field.Field>
			<Field.Field>
				<Button
					type="button"
					onclick={handle2FAVerify}
					disabled={isVerifying2FA || totpCode.length !== 6}
				>
					{isVerifying2FA ? 'Verifying...' : 'Verify Code'}
				</Button>
			</Field.Field>
			<Field.Field>
				<Button
					type="button"
					variant="ghost"
					onclick={() => { show2FAChallenge = false; totpCode = ''; }}
				>
					Back to Login
				</Button>
			</Field.Field>
		{:else}

		<Field.Field>
			<Field.Label for="email">Email</Field.Label>
			<Input
				id="email"
				type="email"
				placeholder="m@example.com"
				bind:value={email}
				required
				disabled={isLoading || showVerification}
			/>
		</Field.Field>
		{#if !showVerification}
			<Field.Field>
				<Field.Label for="password">Password</Field.Label>
				<InputGroup.Root>
					<InputGroup.Input
						id="password"
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						required
						disabled={isLoading}
					/>
					<InputGroup.Button
						size="icon-sm"
						ontouchstart={(e) => e.preventDefault()}
						onclick={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{#if showPassword}
							<EyeOff class="size-4" />
						{:else}
							<Eye class="size-4" />
						{/if}
					</InputGroup.Button>
				</InputGroup.Root>
			</Field.Field>
			<Field.Field>
				<Field.Description class="text-right">
					<a href="/forget-password" class="text-sm underline">Forgot your password?</a>
				</Field.Description>
			</Field.Field>
			<Field.Field>
				<Button type="submit" disabled={isLoading}>
					{isLoading ? 'Logging in...' : 'Log In'}
				</Button>
			</Field.Field>
		{:else}
			<div
				class="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
			>
				<p class="text-sm text-amber-800 dark:text-amber-200">
					Your email is not verified. Enter the verification code sent to your email, or click "Send
					Code" to receive a new one.
				</p>
			</div>
			<Field.Field>
				<Field.Label for="otp">Verification Code</Field.Label>
				<div class="flex gap-2">
					<Input
						id="otp"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						placeholder="Enter 6-digit code"
						bind:value={otp}
						maxlength={6}
						class="flex-1"
						oninput={() => {
							otp = otp.replace(/\D/g, '');
						}}
					/>
					<Button
						type="button"
						variant="outline"
						onclick={sendVerificationOtp}
						disabled={isSendingOtp || cooldown > 0}
					>
						{#if isSendingOtp}
							Sending...
						{:else if cooldown > 0}
							Resend ({cooldown}s)
						{:else}
							Send Code
						{/if}
					</Button>
				</div>
			</Field.Field>
			<Field.Field>
				<Button type="button" onclick={verifyEmail} disabled={isLoading || !otp}>
					{isLoading ? 'Verifying...' : 'Verify Email'}
				</Button>
			</Field.Field>
			<Field.Field>
				<Button type="button" variant="ghost" onclick={() => (showVerification = false)}>
					Back to Login
				</Button>
			</Field.Field>
		{/if}
		<Field.Separator>Or continue with</Field.Separator>
		<Field.Field>
			<Button variant="outline" type="button" onclick={async() => {
				try {
					const frontendUrl = env.PUBLIC_FRONTEND_URL || 'http://localhost:5173';
					await authClient.signIn.social({
						provider: 'google',
						callbackURL: `${frontendUrl}${redirectTo}`
					});
				} catch {
					toast.error('Google sign-in failed. Please try again.');
				}
			}}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path
						d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
						fill="currentColor"
					/>
				</svg>
				Continue with Google
			</Button>
			<Field.Description class="px-6 text-center">
				Don't have an account? <a href="/register">Sign up</a>
			</Field.Description>
		</Field.Field>

		{/if}
	</Field.Group>
</form>
