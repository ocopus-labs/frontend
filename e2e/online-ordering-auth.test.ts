import { expect, test } from '@playwright/test';

const TEST_SLUG = 'test-restaurant';

test.describe('Online ordering — customer auth gate (mocked)', () => {
	test('shows AuthModal on checkout when authEnabled is true and user is not signed in', async ({
		page
	}) => {
		// ── Mock backend responses ──
		// Config endpoint: authEnabled = true
		await page.route(`**/api/order-online/${TEST_SLUG}/config`, (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					business: {
						id: 'biz-1',
						name: 'Test Restaurant',
						slug: TEST_SLUG,
						type: 'restaurant',
						logo: null,
						description: null,
						currency: 'INR'
					},
					onlineOrdering: {
						acceptsDelivery: false,
						acceptsTakeaway: true,
						minOrderAmount: 0,
						acceptedPaymentMethods: ['cash'],
						estimatedPrepTime: 20,
						authEnabled: true
					},
					deliveryZones: [],
					businessHours: null,
					paymentMethods: { dodo: false },
					paymentGateways: {
						stripe: { enabled: false, publishableKey: null, mode: 'test' },
						razorpay: { enabled: false, keyId: null, mode: 'test' },
						dodo: { enabled: false }
					}
				})
			});
		});

		// Menu endpoint: one item
		await page.route(`**/api/order-online/${TEST_SLUG}/menu`, (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					categories: [
						{
							id: 'cat-1',
							name: 'Mains',
							items: [
								{
									id: 'item-1',
									name: 'Butter Chicken',
									price: 250,
									isVeg: false
								}
							]
						}
					]
				})
			});
		});

		// Customer auth session endpoint: no session
		await page.route('**/api/customer-auth/get-session', (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ session: null, user: null })
			});
		});

		// Navigate to the menu browse page
		await page.goto(`/order-online/${TEST_SLUG}`);

		// Add an item to the cart
		const addButton = page.getByRole('button', { name: /ADD/i }).first();
		await expect(addButton).toBeVisible({ timeout: 10000 });
		await addButton.click();

		// The sticky cart bar should appear — click to open cart drawer
		const cartBar = page.locator('.fixed.bottom-0').getByRole('button');
		await expect(cartBar).toBeVisible();
		await cartBar.click();

		// Click "Proceed to Checkout"
		const checkoutBtn = page.getByRole('button', { name: /Proceed to Checkout/i });
		await expect(checkoutBtn).toBeVisible();
		await checkoutBtn.click();

		// Should navigate to checkout
		await expect(page).toHaveURL(`/order-online/${TEST_SLUG}/checkout`);

		// On checkout, clicking Continue (or the page loading) should trigger AuthModal
		// because authEnabled=true and no session.
		const continueBtn = page.getByRole('button', { name: /Continue/i });
		await expect(continueBtn).toBeVisible({ timeout: 10000 });
		await continueBtn.click();

		// AuthModal should be visible with "Sign in to continue" heading
		await expect(page.getByRole('heading', { name: /Sign in to continue/i })).toBeVisible({
			timeout: 5000
		});
	});
});
