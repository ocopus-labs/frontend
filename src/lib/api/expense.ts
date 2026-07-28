import { createApiClient, getApiClient } from './client';

// ==================== TYPES ====================

export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'other';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ExpenseCategory {
	id: string;
	restaurantId: string;
	name: string;
	description?: string;
	color: string;
	icon?: string;
	isActive: boolean;
	expenseCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface Expense {
	id: string;
	restaurantId: string;
	categoryId: string;
	category?: ExpenseCategory;
	title: string;
	description?: string;
	amount: number;
	currency: string;
	expenseDate: string;
	paymentMethod: PaymentMethod;
	vendorName?: string;
	vendorContact?: string;
	receiptUrl?: string;
	receiptNumber?: string;
	taxAmount?: number;
	taxPercentage?: number;
	status: ExpenseStatus;
	isRecurring: boolean;
	recurringFrequency?: RecurringFrequency;
	recurringEndDate?: string;
	tags?: string[];
	notes?: string;
	approvedBy?: string;
	approvedAt?: string;
	rejectedBy?: string;
	rejectedAt?: string;
	rejectionReason?: string;
	paidAt?: string;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export interface ExpenseSummary {
	totalAmount: number;
	pendingAmount: number;
	approvedAmount: number;
	paidAmount: number;
	categoryBreakdown: Record<string, number>;
	monthlyTrend: { month: string; amount: number }[];
}

export interface CreateExpenseCategoryPayload {
	name: string;
	description?: string;
	color: string;
	icon?: string;
}

export interface UpdateExpenseCategoryPayload extends Partial<CreateExpenseCategoryPayload> {
	isActive?: boolean;
}

export interface CreateExpensePayload {
	categoryId: string;
	title: string;
	description?: string;
	amount: number;
	currency?: string;
	expenseDate: string;
	paymentMethod: PaymentMethod;
	vendorName?: string;
	vendorContact?: string;
	receiptUrl?: string;
	receiptNumber?: string;
	taxAmount?: number;
	taxPercentage?: number;
	isRecurring?: boolean;
	recurringFrequency?: RecurringFrequency;
	recurringEndDate?: string;
	tags?: string[];
	notes?: string;
}

export interface UpdateExpensePayload extends Partial<CreateExpensePayload> {}

export interface ApproveExpensePayload {
	notes?: string;
}

export interface RejectExpensePayload {
	reason: string;
}

export interface MarkAsPaidPayload {
	notes?: string;
}

type FetchOption = { fetch?: typeof fetch };

// ==================== EXPENSE CATEGORIES ====================

export async function getExpenseCategories(
	businessId: string,
	includeInactive?: boolean,
	options?: FetchOption
): Promise<{ categories: ExpenseCategory[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const url = includeInactive
		? `/business/${businessId}/expenses/categories?all=true`
		: `/business/${businessId}/expenses/categories`;
	return api.get(url);
}

export async function getExpenseCategoryById(
	businessId: string,
	categoryId: string,
	options?: FetchOption
): Promise<{ category: ExpenseCategory }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/expenses/categories/${categoryId}`);
}

export async function createExpenseCategory(
	businessId: string,
	data: CreateExpenseCategoryPayload,
	options?: FetchOption
): Promise<{ message: string; category: ExpenseCategory }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/expenses/categories`, data);
}

export async function updateExpenseCategory(
	businessId: string,
	categoryId: string,
	data: UpdateExpenseCategoryPayload,
	options?: FetchOption
): Promise<{ message: string; category: ExpenseCategory }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/expenses/categories/${categoryId}`, data);
}

export async function deleteExpenseCategory(
	businessId: string,
	categoryId: string,
	options?: FetchOption
): Promise<{ message: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.delete(`/business/${businessId}/expenses/categories/${categoryId}`);
}

// ==================== EXPENSES CRUD ====================

export async function getExpenses(
	businessId: string,
	params?: {
		categoryId?: string;
		status?: ExpenseStatus;
		startDate?: string;
		endDate?: string;
		limit?: number;
		offset?: number;
	},
	options?: FetchOption
): Promise<{ expenses: Expense[]; total: number }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
	if (params?.status) searchParams.set('status', params.status);
	if (params?.startDate) searchParams.set('startDate', params.startDate);
	if (params?.endDate) searchParams.set('endDate', params.endDate);
	if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
	if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

	const query = searchParams.toString();
	const url = query
		? `/business/${businessId}/expenses?${query}`
		: `/business/${businessId}/expenses`;
	return api.get(url);
}

export async function getExpenseSummary(
	businessId: string,
	params?: {
		startDate?: string;
		endDate?: string;
	},
	options?: FetchOption
): Promise<{ summary: ExpenseSummary }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	const searchParams = new URLSearchParams();
	if (params?.startDate) searchParams.set('startDate', params.startDate);
	if (params?.endDate) searchParams.set('endDate', params.endDate);

	const query = searchParams.toString();
	const url = query
		? `/business/${businessId}/expenses/summary?${query}`
		: `/business/${businessId}/expenses/summary`;
	return api.get(url);
}

export async function getPendingExpenses(
	businessId: string,
	options?: FetchOption
): Promise<{ expenses: Expense[] }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/expenses/pending`);
}

export async function getExpenseById(
	businessId: string,
	expenseId: string,
	options?: FetchOption
): Promise<{ expense: Expense }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.get(`/business/${businessId}/expenses/${expenseId}`);
}

export async function createExpense(
	businessId: string,
	data: CreateExpensePayload,
	options?: FetchOption
): Promise<{ message: string; expense: Expense }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/expenses`, data);
}

export async function updateExpense(
	businessId: string,
	expenseId: string,
	data: UpdateExpensePayload,
	options?: FetchOption
): Promise<{ message: string; expense: Expense }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.patch(`/business/${businessId}/expenses/${expenseId}`, data);
}

export async function deleteExpense(
	businessId: string,
	expenseId: string,
	options?: FetchOption
): Promise<{ message: string }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.delete(`/business/${businessId}/expenses/${expenseId}`);
}

// ==================== EXPENSE APPROVAL WORKFLOW ====================

export async function approveExpense(
	businessId: string,
	expenseId: string,
	data?: ApproveExpensePayload,
	options?: FetchOption
): Promise<{ message: string; expense: Expense }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/expenses/${expenseId}/approve`, data || {});
}

export async function rejectExpense(
	businessId: string,
	expenseId: string,
	data: RejectExpensePayload,
	options?: FetchOption
): Promise<{ message: string; expense: Expense }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/expenses/${expenseId}/reject`, data);
}

export async function markExpenseAsPaid(
	businessId: string,
	expenseId: string,
	data?: MarkAsPaidPayload,
	options?: FetchOption
): Promise<{ message: string; expense: Expense }> {
	const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
	return api.post(`/business/${businessId}/expenses/${expenseId}/mark-paid`, data || {});
}

// ==================== EXPORT ====================

export async function exportExpenses(
	businessId: string,
	params?: { categoryId?: string; status?: string; startDate?: string; endDate?: string }
): Promise<Blob> {
	const searchParams = new URLSearchParams();
	if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
	if (params?.status) searchParams.set('status', params.status);
	if (params?.startDate) searchParams.set('startDate', params.startDate);
	if (params?.endDate) searchParams.set('endDate', params.endDate);
	const query = searchParams.toString();
	const url = `/api/business/${businessId}/expenses/export${query ? `?${query}` : ''}`;
	const res = await fetch(url, { credentials: 'include' });
	if (!res.ok) throw new Error('Export failed');
	return res.blob();
}
