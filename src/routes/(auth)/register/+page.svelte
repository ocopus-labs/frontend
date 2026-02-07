<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import type { HTMLAttributes } from "svelte/elements";
  import { authClient, signUp } from "$lib/auth";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { env } from "$env/dynamic/public";
  import PasswordStrength from "$lib/components/ui/password-strength.svelte";

  let { class: className, ...restProps }: HTMLAttributes<HTMLFormElement> = $props();
  
  let name = $state("");
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let isLoading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    if (password.length < 8) {
      toast.error("Password too short", {
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    isLoading = true;

    try {
      const result = await signUp.email({
        email,
        password,
        name,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        toast.error("Registration failed", {
          description: result.error.message || "Could not create account",
        });
      } else {
        toast.success("Account created! Please check your email to verify.");
        goto(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (error) {
      toast.error("Registration failed", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      isLoading = false;
    }
  }
</script>
<form class={cn("flex flex-col gap-6", className)} {...restProps} onsubmit={handleSubmit}>
  <Field.Group>
    <div class="flex flex-col items-center gap-1 text-center">
      <h1 class="text-2xl font-bold">Create your account</h1>
      <p class="text-muted-foreground text-balance text-sm">
        Fill in the form below to create your account
      </p>
    </div>
    <Field.Field>
      <Field.Label for="name">Full Name</Field.Label>
      <Input id="name" type="text" placeholder="John Doe" bind:value={name} required />
    </Field.Field>
    <Field.Field>
      <Field.Label for="email">Email</Field.Label>
      <Input id="email" type="email" placeholder="m@example.com" bind:value={email} required />
    </Field.Field>
    <Field.Field>
      <Field.Label for="password">Password</Field.Label>
      <Input id="password" type="password" bind:value={password} required />
      <PasswordStrength {password} />
    </Field.Field>
    <Field.Field>
      <Field.Label for="confirm-password">Confirm Password</Field.Label>
      <Input id="confirm-password" type="password" bind:value={confirmPassword} required />
      <Field.Description>Please confirm your password.</Field.Description>
    </Field.Field>
    <Field.Field>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Creating Account..." : "Create Account"}
      </Button>
    </Field.Field>
    <Field.Separator>Or continue with</Field.Separator>
    <Field.Field>
      <Button variant="outline" type="button" onclick={async () => {
          try {
            const frontendUrl = env.PUBLIC_FRONTEND_URL || 'http://localhost:5173';
            await authClient.signIn.social({
              provider: "google",
              callbackURL: `${frontendUrl}/dashboard`
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
        Already have an account? <a href="/login">Sign in</a>
      </Field.Description>
    </Field.Field>
  </Field.Group>
</form>