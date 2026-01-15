import { expect, test } from '@playwright/test';

test.describe('Authentication Flows', () => {
    test('should navigate to login page', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: 'Log in to your account' })).toBeVisible();
    });

    test('should navigate to register page', async ({ page }) => {
        await page.goto('/register');
        await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    });

    test('should navigate to forget password page', async ({ page }) => {
        await page.goto('/forget-password');
        await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    });

    test('should show validation error on empty login submit', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: 'Log In' }).click();
        // HTML5 validation might prevent submission, or toast might appear.
        // Since "required" attribute is on inputs, browser validation triggers.
        // We can check if the input is invalid.
        const emailInput = page.getByLabel('Email');
        await expect(emailInput).toBeVisible();
        // Playwright doesn't easily check native validation message, but we can check if we are still on the same page
        await expect(page).toHaveURL('/login');
    });

    test('should show toast on invalid login', async ({ page }) => {
        await page.goto('/login');
        await page.getByLabel('Email').fill('invalid@example.com');
        await page.getByLabel('Password').fill('wrongpassword');
        await page.getByRole('button', { name: 'Log In' }).click();

        // Expect toast to appear
        await expect(page.getByText('Login failed')).toBeVisible();
    });

    test('should show toast on password mismatch in register', async ({ page }) => {
        await page.goto('/register');
        await page.getByLabel('Full Name').fill('Test User');
        await page.getByLabel('Email').fill('test@example.com');
        await page.getByLabel('Password', { exact: true }).fill('password123');
        await page.getByLabel('Confirm Password').fill('password456');
        await page.getByRole('button', { name: 'Create Account' }).click();

        await expect(page.getByText("Passwords don't match")).toBeVisible();
    });
});
