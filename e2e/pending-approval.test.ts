import { expect, test } from '@playwright/test';

/**
 * Staff UI — Pending Approval Orders
 *
 * These tests mock the backend endpoints so they can run without a live server.
 * Socket.io real-time updates are NOT tested here (mocking a socket adds complexity
 * for little value at the e2e layer).
 */

const BUSINESS = 'restaurant';
const SLUG = 'test-restaurant';
const BASE = `/${BUSINESS}/${SLUG}/orders/pending-approval`;

const MOCK_ORDER = {
	id: 'ord-1',
	orderNumber: 'ORD-001',
	restaurantId: 'biz-1',
	orderType: 'online',
	orderSource: 'online',
	status: 'pending_approval',
	customerInfo: { name: 'Alice', phone: '+911234567890', email: 'alice@example.com' },
	items: [
		{
			id: 'item-1',
			name: 'Burger',
			quantity: 2,
			basePrice: 150,
			totalPrice: 300,
			status: 'pending'
		},
		{ id: 'item-2', name: 'Fries', quantity: 1, basePrice: 80, totalPrice: 80, status: 'pending' }
	],
	pricing: { subtotal: 380, taxRate: 0, taxAmount: 0, discountAmount: 0, total: 380 },
	discountsApplied: [],
	paymentStatus: 'pending',
	balanceDue: 380,
	priority: 'normal',
	createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
	updatedAt: new Date().toISOString()
};

test.describe('Pending Approval Orders — staff UI', () => {
	test.beforeEach(async ({ page }) => {
		// Mock business context
		await page.route(`**/api/business/${SLUG}/context`, (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					business: {
						id: 'biz-1',
						name: 'Test Restaurant',
						slug: SLUG,
						type: 'restaurant',
						enabledFeatures: [],
						settings: { currency: 'INR' }
					},
					userRole: 'manager',
					subscription: null
				})
			});
		});

		// Mock pending-approval orders list
		await page.route(
			`**/api/business/biz-1/orders?status=pending_approval&orderType=online`,
			(route) => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ orders: [MOCK_ORDER], total: 1 })
				});
			}
		);

		// Also match without query param ordering variations
		await page.route(`**/api/business/biz-1/orders*`, (route) => {
			const url = route.request().url();
			if (url.includes('pending_approval')) {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ orders: [MOCK_ORDER], total: 1 })
				});
			} else {
				route.continue();
			}
		});
	});

	test('shows a pending order row with Approve and Reject buttons', async ({ page }) => {
		await page.goto(BASE);

		// Order number should appear
		await expect(page.getByText(/ORD-001/)).toBeVisible({ timeout: 8000 });

		// Customer name visible
		await expect(page.getByText(/Alice/)).toBeVisible();

		// Both action buttons present
		await expect(page.getByRole('button', { name: /Approve/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Reject/i })).toBeVisible();
	});

	test('clicking Approve removes the row and fires PUT with status=active', async ({ page }) => {
		// Track the status-update request
		let capturedBody: Record<string, unknown> | null = null;
		await page.route(`**/api/business/biz-1/orders/ord-1/status`, async (route) => {
			const body = route.request().postDataJSON();
			capturedBody = body;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ message: 'OK', order: { ...MOCK_ORDER, status: 'active' } })
			});
		});

		await page.goto(BASE);
		await expect(page.getByText(/ORD-001/)).toBeVisible({ timeout: 8000 });

		await page.getByRole('button', { name: /Approve/i }).click();

		// Row should disappear (optimistic removal)
		await expect(page.getByText(/ORD-001/)).not.toBeVisible({ timeout: 5000 });

		// Verify the request body
		expect(capturedBody).toMatchObject({ status: 'active' });
	});

	test('clicking Reject opens a dialog and on confirm fires PATCH with status=cancelled', async ({
		page
	}) => {
		let capturedBody: Record<string, unknown> | null = null;
		await page.route(`**/api/business/biz-1/orders/ord-1/status`, async (route) => {
			const body = route.request().postDataJSON();
			capturedBody = body;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ message: 'OK', order: { ...MOCK_ORDER, status: 'cancelled' } })
			});
		});

		await page.goto(BASE);
		await expect(page.getByText(/ORD-001/)).toBeVisible({ timeout: 8000 });

		await page.getByRole('button', { name: /Reject/i }).click();

		// Dialog opens
		await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });

		// Fill in reason
		await page.getByPlaceholder(/Reason/i).fill('Out of stock');

		// Confirm
		await page.getByRole('button', { name: /Confirm Reject/i }).click();

		// Row removed
		await expect(page.getByText(/ORD-001/)).not.toBeVisible({ timeout: 5000 });

		// Verify the payload
		expect(capturedBody).toMatchObject({ status: 'cancelled', reason: 'Out of stock' });
	});

	test('shows empty state when no pending orders', async ({ page }) => {
		// Override with empty list
		await page.route(`**/api/business/biz-1/orders*`, (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ orders: [], total: 0 })
			});
		});

		await page.goto(BASE);
		await expect(page.getByText(/No pending orders/i)).toBeVisible({ timeout: 8000 });
	});
});
