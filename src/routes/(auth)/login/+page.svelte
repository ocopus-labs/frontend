<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import type { HTMLAttributes } from "svelte/elements";
  import { signIn, emailOtp } from "$lib/auth";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";

  let { class: className, ...restProps }: HTMLAttributes<HTMLFormElement> = $props();

  let email = $state("");
  let password = $state("");
  let otp = $state("");
  let isLoading = $state(false);
  let showVerification = $state(false);
  let isSendingOtp = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isLoading = true;

    try {
      const result = await signIn.email({
        email,
        password,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        const errorMsg = result.error.message?.toLowerCase() || "";
        if (errorMsg.includes("email") && errorMsg.includes("verified")) {
          showVerification = true;
          toast.error("Email not verified", {
            description: "Please verify your email to continue.",
          });
        } else {
          toast.error("Login failed", {
            description: result.error.message || "Invalid email or password",
          });
        }
      } else {
        toast.success("Login successful!");
        goto("/dashboard");
      }
    } catch (error) {
      toast.error("Login failed", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      isLoading = false;
    }
  }

  async function sendVerificationOtp() {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    isSendingOtp = true;
    try {
      const result = await emailOtp.sendVerificationOtp({ email, type: "email-verification" });
      if (result.error) {
        toast.error("Failed to send verification code", {
          description: result.error.message,
        });
      } else {
        toast.success("Verification code sent to your email");
      }
    } catch (error) {
      toast.error("Failed to send verification code");
    } finally {
      isSendingOtp = false;
    }
  }

  async function verifyEmail() {
    if (!otp) {
      toast.error("Please enter the verification code");
      return;
    }
    isLoading = true;
    try {
      const result = await emailOtp.verifyEmail({ email, otp });
      if (result.error) {
        toast.error("Verification failed", {
          description: result.error.message,
        });
      } else {
        toast.success("Email verified! You can now log in.");
        showVerification = false;
        otp = "";
      }
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      isLoading = false;
    }
  }
</script>
<form class={cn("flex flex-col gap-6", className)} {...restProps} onsubmit={handleSubmit}>
  <Field.Group>
    <div class="flex flex-col items-center gap-1 text-center">
      <h1 class="text-2xl font-bold">Log in to your account</h1>
      <p class="text-muted-foreground text-balance text-sm">
        Fill in the form below to log in to your account
      </p>
    </div>
    <Field.Field>
      <Field.Label for="email">Email</Field.Label>
      <Input id="email" type="email" placeholder="m@example.com" bind:value={email} required disabled={showVerification} />
    </Field.Field>
    {#if !showVerification}
      <Field.Field>
        <Field.Label for="password">Password</Field.Label>
        <Input id="password" type="password" bind:value={password} required />
      </Field.Field>
      <Field.Field>
        <Field.Description class="text-right">
          <a href="/forget-password" class="text-sm underline">Forgot your password?</a>
        </Field.Description>
      </Field.Field>
      <Field.Field>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log In"}
        </Button>
      </Field.Field>
    {:else}
      <div class="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
        <p class="text-sm text-amber-800 dark:text-amber-200">
          Your email is not verified. Enter the verification code sent to your email, or click "Send Code" to receive a new one.
        </p>
      </div>
      <Field.Field>
        <Field.Label for="otp">Verification Code</Field.Label>
        <div class="flex gap-2">
          <Input id="otp" type="text" placeholder="Enter 6-digit code" bind:value={otp} maxlength={6} class="flex-1" />
          <Button type="button" variant="outline" onclick={sendVerificationOtp} disabled={isSendingOtp}>
            {isSendingOtp ? "Sending..." : "Send Code"}
          </Button>
        </div>
      </Field.Field>
      <Field.Field>
        <Button type="button" onclick={verifyEmail} disabled={isLoading || !otp}>
          {isLoading ? "Verifying..." : "Verify Email"}
        </Button>
      </Field.Field>
      <Field.Field>
        <Button type="button" variant="ghost" onclick={() => showVerification = false}>
          Back to Login
        </Button>
      </Field.Field>
    {/if}
    <Field.Separator>Or continue with</Field.Separator>
    <Field.Field>
      <Button variant="outline" type="button" disabled>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path
            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            fill="currentColor"
          />
        </svg>
        Continue with GitHub
      </Button>
      <Button variant="outline" type="button" disabled>
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
  </Field.Group>
</form>