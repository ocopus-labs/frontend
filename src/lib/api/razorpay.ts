import { createApiClient, getApiClient } from './client';
type FetchOption = { fetch?: typeof fetch };

export interface RazorpayOrderResponse {
  razorpayOrderId: string;
  amount: number;
  currency: string;
}

export interface RazorpayVerifyResponse {
  verified: boolean;
  paymentId: string;
  method: string;
  amount: number;
}

/**
 * Create a Razorpay order on the backend. Returns the order ID that the
 * frontend Razorpay Checkout widget needs to open the payment flow.
 */
export async function createRazorpayOrder(
  businessId: string,
  data: { orderId: string; amount: number },
  options?: FetchOption,
) {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post<RazorpayOrderResponse>(
    `/business/${businessId}/razorpay/create-order`,
    data,
  );
}

/**
 * Verify a Razorpay payment signature after the checkout widget completes.
 * Must be called before treating the payment as successful.
 */
export async function verifyRazorpayPayment(
  businessId: string,
  data: {
    orderId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  options?: FetchOption,
) {
  const api = options?.fetch ? createApiClient({ fetch: options.fetch }) : getApiClient();
  return api.post<RazorpayVerifyResponse>(
    `/business/${businessId}/razorpay/verify-payment`,
    data,
  );
}
