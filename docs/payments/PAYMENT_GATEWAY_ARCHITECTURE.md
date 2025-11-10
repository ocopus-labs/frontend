# 🚀 Payment Gateway Architecture: Multi-Provider Integration Strategy

**Document Version:** 1.0  
**Last Updated:** November 10, 2025  
**Status:** Planning & Design Phase

---

## 📋 Executive Summary

This document outlines the architecture for integrating multiple payment providers (Stripe, Pine Labs, Razorpay, etc.) into a unified billing and POS application. The goal is to support both **global payments** (Stripe) and **India-specific POS payments** (Pine Labs, Razorpay) through a single, maintainable backend architecture using the **Adapter Pattern**.

### The Challenge

Different payment providers have completely different APIs, SDKs, and integration flows:
- **Stripe Terminal**: Server-driven model (NestJS backend → Stripe Cloud → Terminal)
- **Pine Labs (India)**: Server-to-server API with transaction ID fetch model
- **Razorpay**: Hybrid model with test/live mode separation

Building provider-specific logic directly into business services creates unmaintainable code and tight coupling.

### The Solution

Implement the **Adapter Pattern** to create a unified payment interface that abstracts away provider-specific implementation details.

---

## 🎯 Business Context & Student Startup Strategy

### The Reality for Student Entrepreneurs

**The Problem**: Payment gateway integration requires:
1. Registered business entity with PAN/GSTIN
2. Business bank account
3. Upfront costs for registration (₹5,000-₹15,000)
4. Complex legal setup

**The Lean Startup Approach** (Recommended 3-Phase Strategy):

#### Phase 1: Build (Zero Cost)
- Sign up for **Dodo Payments Test Mode** or **Stripe Sandbox** (free, no registration)
- Build entire application with test API keys
- Develop all features: menu, orders, checkout, receipts
- **Result**: Fully functional demo application

#### Phase 2: Demo (Zero Cost)
- Demo your working application to local businesses
- Show live transactions (test mode)
- Get commitment from first customer
- **Result**: Validated business model with first customer

#### Phase 3: Launch (Low Cost)
- Register business as **Sole Proprietorship** (~₹2,000-5,000)
- Activate payment provider to "Live Mode"
- Onboard first paying customer
- **Result**: Revenue-generating business

### Provider Comparison for India

| Provider | Best For | Cost | Setup Time | Student Friendly |
|----------|----------|------|------------|------------------|
| **Dodo Payments** | MVP & Indian market | Free test mode, 1.99% live | 1 day (test), 1 week (live) | ⭐⭐⭐⭐⭐ |
| **Stripe** | Global expansion | Free test mode, 2.9% + ₹2 | 1 day (test), 1 week (live) | ⭐⭐⭐⭐ |
| **Pine Labs** | Large enterprises | Custom pricing | 2-4 weeks | ⭐⭐ (requires established business) |
| **Razorpay** | Alternative India option | Free test mode, 2% live | 1 day (test), 1 week (live) | ⭐⭐⭐⭐ |

**Recommended Sequence**:
1. **Start with**: Dodo Payments (test mode) - Perfect for MVP, lowest fees
2. **Add next**: Stripe (for global customers)
3. **Add later**: Pine Labs (after 10+ customers, established business)

---

## 🏛️ Architecture Overview

### The Adapter Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                     SvelteKit Frontend                       │
│  (POS UI, Checkout, Order Management)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      NestJS Backend                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           PaymentService (Factory)                  │    │
│  │  - Selects correct adapter based on:               │    │
│  │    • Business country (IN → Pine Labs)             │    │
│  │    • Business configuration                         │    │
│  │    • Transaction type                               │    │
│  └──────────┬──────────────────────────────────────────┘    │
│             │ implements IPaymentGateway                    │
│             ▼                                               │
  ┌──────────────────┐  ┌──────────────────┐               │
  │  StripeAdapter   │  │ PineLabsAdapter  │  ┌──────────┐ │
  │                  │  │                  │  │   Dodo   │ │
  │ • createPOS()    │  │ • createPOS()    │  │ Payments │ │
  │ • handleWebhook()│  │ • handleWebhook()│  │ Adapter  │ │
  └─────────┬────────┘  └─────────┬────────┘  └────┬─────┘ │
└────────────┼───────────────────────┼────────────────┼───────┘
             │                       │                │
             ▼                       ▼                ▼
    ┌────────────────┐    ┌────────────────┐  ┌──────────────┐
    │  Stripe API    │    │ Pine Labs API  │  │Dodo Payments │
    │  (Global)      │    │ (India POS)    │  │API (India)   │
    └────────────────┘    └────────────────┘  └──────────────┘
```

### Key Components

1. **IPaymentGateway Interface**: Unified contract for all payment operations
2. **Adapter Classes**: Provider-specific implementations (Stripe, Pine Labs, Razorpay)
3. **PaymentService (Factory)**: Intelligent selector that chooses the right adapter
4. **Webhook Controllers**: Provider-specific endpoints for async payment confirmations

---

## 🔌 Core Interfaces & Contracts

### The Universal Payment Interface

```typescript
// src/payments/interfaces/payment-gateway.interface.ts

/**
 * Generic response after initiating a payment
 */
export interface PaymentStartResponse {
  status: 'PENDING' | 'REQUIRES_ACTION' | 'COMPLETED' | 'FAILED';
  
  // Unique ID from provider (Stripe PaymentIntent, Pine Labs PTRID)
  paymentIntentId: string;
  
  // Human-readable message for cashier
  displayMessage?: string;
  
  // Additional provider-specific data (stored but not exposed to frontend)
  metadata?: Record<string, any>;
}

/**
 * Generic webhook processing result
 */
export interface WebhookProcessingResult {
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  orderId: string;
  transactionId?: string;
  amount?: number;
  metadata?: Record<string, any>;
}

/**
 * The contract all payment adapters must implement
 */
export interface IPaymentGateway {
  /**
   * Initialize a Point-of-Sale payment
   * @param amount Amount in smallest currency unit (cents/paise)
   * @param currency ISO currency code (usd, inr, eur)
   * @param terminalId Hardware terminal identifier
   * @param orderId Internal order ID from our system
   * @param metadata Additional data (customer info, items, etc.)
   */
  createPosPayment(
    amount: number,
    currency: string,
    terminalId: string,
    orderId: string,
    metadata?: Record<string, any>
  ): Promise<PaymentStartResponse>;

  /**
   * Process incoming webhook from provider
   * @param payload Raw webhook body
   * @param signature Provider-specific signature header
   */
  handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<WebhookProcessingResult | null>;

  /**
   * Cancel a pending payment
   * @param paymentIntentId Provider's payment ID
   */
  cancelPayment(paymentIntentId: string): Promise<boolean>;

  /**
   * Query payment status (for polling if webhooks fail)
   * @param paymentIntentId Provider's payment ID
   */
  getPaymentStatus(paymentIntentId: string): Promise<PaymentStartResponse>;
}
```

---

## 🔧 Adapter Implementations

### 1. Stripe Adapter (Global)

**Use Case**: International payments, US/EU/Global markets, card-present terminals

```typescript
// src/payments/adapters/stripe.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { IPaymentGateway, PaymentStartResponse, WebhookProcessingResult } from '../interfaces/payment-gateway.interface';
import Stripe from 'stripe';

@Injectable()
export class StripeAdapter implements IPaymentGateway {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeAdapter.name);

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-10-28.acacia',
    });
  }

  async createPosPayment(
    amount: number,
    currency: string,
    terminalId: string,
    orderId: string,
    metadata?: Record<string, any>
  ): Promise<PaymentStartResponse> {
    try {
      // Step 1: Create PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ['card_present'],
        capture_method: 'automatic',
        metadata: { orderId, ...metadata },
      });

      // Step 2: Send to terminal (server-driven flow)
      await this.stripe.terminal.readers.processPaymentIntent(terminalId, {
        payment_intent: paymentIntent.id,
      });

      this.logger.log(`Payment initiated: ${paymentIntent.id} for order ${orderId}`);

      return {
        status: 'PENDING',
        paymentIntentId: paymentIntent.id,
        displayMessage: 'Present card to terminal...',
      };
    } catch (error) {
      this.logger.error(`Stripe payment failed: ${error.message}`);
      return {
        status: 'FAILED',
        paymentIntentId: null,
        displayMessage: error.message,
      };
    }
  }

  async handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<WebhookProcessingResult | null> {
    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Handle terminal events
      switch (event.type) {
        case 'payment_intent.succeeded':
          const intent = event.data.object as Stripe.PaymentIntent;
          return {
            status: 'COMPLETED',
            orderId: intent.metadata.orderId,
            transactionId: intent.id,
            amount: intent.amount,
          };

        case 'payment_intent.payment_failed':
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          return {
            status: 'FAILED',
            orderId: failedIntent.metadata.orderId,
            transactionId: failedIntent.id,
          };

        case 'payment_intent.canceled':
          const canceledIntent = event.data.object as Stripe.PaymentIntent;
          return {
            status: 'CANCELLED',
            orderId: canceledIntent.metadata.orderId,
            transactionId: canceledIntent.id,
          };

        default:
          this.logger.debug(`Unhandled event type: ${event.type}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Webhook verification failed: ${error.message}`);
      throw error;
    }
  }

  async cancelPayment(paymentIntentId: string): Promise<boolean> {
    try {
      await this.stripe.paymentIntents.cancel(paymentIntentId);
      return true;
    } catch (error) {
      this.logger.error(`Cancel failed: ${error.message}`);
      return false;
    }
  }

  async getPaymentStatus(paymentIntentId: string): Promise<PaymentStartResponse> {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    
    const statusMap = {
      'succeeded': 'COMPLETED',
      'processing': 'PENDING',
      'requires_action': 'REQUIRES_ACTION',
      'canceled': 'FAILED',
      'requires_payment_method': 'FAILED',
    };

    return {
      status: statusMap[intent.status] || 'FAILED',
      paymentIntentId: intent.id,
      displayMessage: intent.status,
    };
  }
}
```

### 2. Pine Labs Adapter (India POS)

**Use Case**: Large Indian enterprises, established POS infrastructure

```typescript
// src/payments/adapters/pinelabs.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IPaymentGateway, PaymentStartResponse, WebhookProcessingResult } from '../interfaces/payment-gateway.interface';

@Injectable()
export class PineLabsAdapter implements IPaymentGateway {
  private readonly logger = new Logger(PineLabsAdapter.name);
  private readonly apiUrl = process.env.PINELABS_API_URL || 'https://api.pinelabs.com/v1';

  constructor(private readonly httpService: HttpService) {}

  async createPosPayment(
    amount: number,
    currency: string,
    terminalId: string,
    orderId: string,
    metadata?: Record<string, any>
  ): Promise<PaymentStartResponse> {
    try {
      // Pine Labs expects amount in paise (for INR)
      const amountPaise = currency === 'inr' ? amount : amount * 100;

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/pos/charge`,
          {
            merchant_id: process.env.PINELABS_MERCHANT_ID,
            terminal_id: terminalId,
            amount: amountPaise,
            currency: currency.toUpperCase(),
            merchant_transaction_id: orderId,
            metadata: metadata,
          },
          {
            headers: {
              'X-Api-Key': process.env.PINELABS_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      const ptrid = response.data.ptrid; // Pine Labs Transaction Reference ID

      this.logger.log(`Pine Labs transaction created: ${ptrid} for order ${orderId}`);

      // Key difference: Cashier must fetch this on terminal
      return {
        status: 'REQUIRES_ACTION',
        paymentIntentId: ptrid,
        displayMessage: `Enter Transaction ID on terminal: ${ptrid}`,
        metadata: { ptrid, terminalId },
      };
    } catch (error) {
      this.logger.error(`Pine Labs payment failed: ${error.message}`);
      return {
        status: 'FAILED',
        paymentIntentId: null,
        displayMessage: error.response?.data?.message || error.message,
      };
    }
  }

  async handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<WebhookProcessingResult | null> {
    try {
      // Verify Pine Labs signature
      const isValid = this.verifyPineLabsSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid Pine Labs webhook signature');
      }

      const event = JSON.parse(payload.toString());

      // Pine Labs webhook structure
      switch (event.status) {
        case 'CAPTURE_SUCCESS':
          return {
            status: 'COMPLETED',
            orderId: event.merchant_transaction_id,
            transactionId: event.ptrid,
            amount: event.amount,
            metadata: event.metadata,
          };

        case 'CAPTURE_FAILED':
        case 'TRANSACTION_FAILED':
          return {
            status: 'FAILED',
            orderId: event.merchant_transaction_id,
            transactionId: event.ptrid,
          };

        case 'TRANSACTION_CANCELLED':
          return {
            status: 'CANCELLED',
            orderId: event.merchant_transaction_id,
            transactionId: event.ptrid,
          };

        default:
          this.logger.debug(`Unhandled Pine Labs event: ${event.status}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Pine Labs webhook processing failed: ${error.message}`);
      throw error;
    }
  }

  async cancelPayment(paymentIntentId: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/pos/cancel`,
          { ptrid: paymentIntentId },
          {
            headers: {
              'X-Api-Key': process.env.PINELABS_API_KEY,
            },
          }
        )
      );
      return true;
    } catch (error) {
      this.logger.error(`Pine Labs cancel failed: ${error.message}`);
      return false;
    }
  }

  async getPaymentStatus(paymentIntentId: string): Promise<PaymentStartResponse> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.apiUrl}/pos/status/${paymentIntentId}`, {
        headers: { 'X-Api-Key': process.env.PINELABS_API_KEY },
      })
    );

    const statusMap = {
      'PENDING': 'PENDING',
      'PROCESSING': 'PENDING',
      'CAPTURE_SUCCESS': 'COMPLETED',
      'CAPTURE_FAILED': 'FAILED',
      'TRANSACTION_CANCELLED': 'FAILED',
    };

    return {
      status: statusMap[response.data.status] || 'FAILED',
      paymentIntentId,
      displayMessage: response.data.status,
    };
  }

  private verifyPineLabsSignature(payload: Buffer, signature: string): boolean {
    // Implement Pine Labs signature verification
    // Usually HMAC-SHA256 with shared secret
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.PINELABS_WEBHOOK_SECRET);
    const expectedSignature = hmac.update(payload).digest('hex');
    return signature === expectedSignature;
  }
}
```

### 3. Dodo Payments Adapter (India - Recommended for MVP)

**Use Case**: Indian startups, SMBs, rapid development, lowest transaction fees

```typescript
// src/payments/adapters/dodo-payments.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IPaymentGateway, PaymentStartResponse, WebhookProcessingResult } from '../interfaces/payment-gateway.interface';

@Injectable()
export class DodoPaymentsAdapter implements IPaymentGateway {
  private readonly logger = new Logger(DodoPaymentsAdapter.name);
  private readonly apiUrl = process.env.DODO_PAYMENTS_API_URL || 'https://api.dodopayments.com/v1';

  constructor(private readonly httpService: HttpService) {}

  async createPosPayment(
    amount: number,
    currency: string,
    terminalId: string,
    orderId: string,
    metadata?: Record<string, any>
  ): Promise<PaymentStartResponse> {
    try {
      // Dodo Payments expects amount in smallest currency unit (paise for INR)
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/payments`,
          {
            amount,
            currency: currency.toUpperCase(),
            payment_method_types: ['card', 'upi', 'netbanking'],
            merchant_order_id: orderId,
            terminal_id: terminalId,
            metadata,
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      const payment = response.data;

      this.logger.log(`Dodo payment created: ${payment.id} for order ${orderId}`);

      return {
        status: 'PENDING',
        paymentIntentId: payment.id,
        displayMessage: 'Waiting for payment...',
        metadata: { 
          dodo_payment_id: payment.id,
          payment_url: payment.payment_url, // For QR code or redirect
        },
      };
    } catch (error) {
      this.logger.error(`Dodo Payments failed: ${error.message}`);
      return {
        status: 'FAILED',
        paymentIntentId: null,
        displayMessage: error.response?.data?.message || error.message,
      };
    }
  }

  async handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<WebhookProcessingResult | null> {
    try {
      // Verify Dodo Payments signature
      const isValid = this.verifyDodoSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid Dodo Payments webhook signature');
      }

      const event = JSON.parse(payload.toString());

      // Dodo Payments webhook structure
      switch (event.event_type) {
        case 'payment.success':
          return {
            status: 'COMPLETED',
            orderId: event.data.merchant_order_id,
            transactionId: event.data.payment_id,
            amount: event.data.amount,
            metadata: event.data.metadata,
          };

        case 'payment.failed':
          return {
            status: 'FAILED',
            orderId: event.data.merchant_order_id,
            transactionId: event.data.payment_id,
          };

        case 'payment.cancelled':
          return {
            status: 'CANCELLED',
            orderId: event.data.merchant_order_id,
            transactionId: event.data.payment_id,
          };

        default:
          this.logger.debug(`Unhandled Dodo Payments event: ${event.event_type}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Dodo Payments webhook processing failed: ${error.message}`);
      throw error;
    }
  }

  async cancelPayment(paymentIntentId: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/payments/${paymentIntentId}/cancel`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
            },
          }
        )
      );
      return true;
    } catch (error) {
      this.logger.error(`Dodo Payments cancel failed: ${error.message}`);
      return false;
    }
  }

  async getPaymentStatus(paymentIntentId: string): Promise<PaymentStartResponse> {
    const response = await firstValueFrom(
      this.httpService.get(`${this.apiUrl}/payments/${paymentIntentId}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.DODO_PAYMENTS_API_KEY}` 
        },
      })
    );

    const payment = response.data;
    
    const statusMap = {
      'pending': 'PENDING',
      'processing': 'PENDING',
      'success': 'COMPLETED',
      'failed': 'FAILED',
      'cancelled': 'FAILED',
    };

    return {
      status: statusMap[payment.status] || 'FAILED',
      paymentIntentId,
      displayMessage: payment.status,
    };
  }

  private verifyDodoSignature(payload: Buffer, signature: string): boolean {
    // Implement Dodo Payments signature verification
    // Usually HMAC-SHA256 with shared webhook secret
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.DODO_PAYMENTS_WEBHOOK_SECRET);
    const expectedSignature = hmac.update(payload).digest('hex');
    return signature === expectedSignature;
  }
}
```

---

## 🏭 The Factory Service

```typescript
// src/payments/payment.service.ts

import { Injectable, InternalServerErrorException, Inject, Logger } from '@nestjs/common';
import { IPaymentGateway, PaymentStartResponse } from './interfaces/payment-gateway.interface';
import { StripeAdapter } from './adapters/stripe.adapter';
import { PineLabsAdapter } from './adapters/pinelabs.adapter';
import { RazorpayAdapter } from './adapters/razorpay.adapter';
import { BusinessService } from '../business/business.service';
import { OrderService } from '../orders/order.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly stripeAdapter: StripeAdapter,
    private readonly pineLabsAdapter: PineLabsAdapter,
    private readonly dodoPaymentsAdapter: DodoPaymentsAdapter,
    private readonly businessService: BusinessService,
    private readonly orderService: OrderService,
  ) {}

  /**
   * Factory method: Select the correct payment gateway
   */
  private async selectGateway(businessId: string): Promise<IPaymentGateway> {
    const business = await this.businessService.findOne(businessId);

    // Decision logic
    if (business.country === 'IN') {
      // India: Check if Pine Labs is configured
      if (business.paymentConfig?.pineLabsEnabled) {
        this.logger.log(`Using Pine Labs for business ${businessId}`);
        return this.pineLabsAdapter;
      }
      // Default to Dodo Payments for India (lowest fees)
      this.logger.log(`Using Dodo Payments for business ${businessId}`);
      return this.dodoPaymentsAdapter;
    } else {
      // International: Use Stripe
      this.logger.log(`Using Stripe for business ${businessId}`);
      return this.stripeAdapter;
    }

    throw new InternalServerErrorException('No payment gateway configured');
  }

  /**
   * Public method: Start a POS payment
   */
  async startPosPayment(
    businessId: string,
    storeId: string,
    terminalId: string,
    amount: number,
    currency: string,
    orderId: string,
  ): Promise<PaymentStartResponse> {
    // Get the correct gateway
    const gateway = await this.selectGateway(businessId);

    // Get order details for metadata
    const order = await this.orderService.findOne(orderId);

    // Call the unified method
    return gateway.createPosPayment(
      amount,
      currency,
      terminalId,
      orderId,
      {
        businessId,
        storeId,
        customerName: order.customerName,
        itemCount: order.items.length,
      }
    );
  }

  /**
   * Public method: Confirm payment after webhook
   */
  async confirmPayment(orderId: string, status: 'COMPLETED' | 'FAILED' | 'CANCELLED') {
    await this.orderService.updatePaymentStatus(orderId, status);
    this.logger.log(`Order ${orderId} payment status: ${status}`);
    
    // Emit WebSocket event to frontend
    // this.websocketGateway.emit('payment:update', { orderId, status });
  }
}
```

---

## 🔌 Module Configuration

```typescript
// src/payments/payment.module.ts

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { StripeAdapter } from './adapters/stripe.adapter';
import { PineLabsAdapter } from './adapters/pinelabs.adapter';
import { DodoPaymentsAdapter } from './adapters/dodo-payments.adapter';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentController } from './controllers/payment.controller';
import { BusinessModule } from '../business/business.module';
import { OrderModule } from '../orders/order.module';

@Module({
  imports: [
    HttpModule,
    BusinessModule,
    OrderModule,
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
  ],
  providers: [
    PaymentService,
    StripeAdapter,
    PineLabsAdapter,
    DodoPaymentsAdapter,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
```

---

## 📡 API Controllers

### Payment Controller (Frontend-Facing)

```typescript
// src/payments/controllers/payment.controller.ts

import { Controller, Post, Body, Param } from '@nestjs/common';
import { PaymentService } from '../payment.service';

@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('pos/start')
  async startPayment(@Body() dto: {
    businessId: string;
    storeId: string;
    terminalId: string;
    amount: number;
    currency: string;
    orderId: string;
  }) {
    return this.paymentService.startPosPayment(
      dto.businessId,
      dto.storeId,
      dto.terminalId,
      dto.amount,
      dto.currency,
      dto.orderId,
    );
  }
}
```

### Webhook Controllers

```typescript
// src/payments/controllers/payment-webhook.controller.ts

import { Controller, Post, Body, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { StripeAdapter } from '../adapters/stripe.adapter';
import { PineLabsAdapter } from '../adapters/pinelabs.adapter';
import { DodoPaymentsAdapter } from '../adapters/dodo-payments.adapter';
import { PaymentService } from '../payment.service';

@Controller('webhooks')
export class PaymentWebhookController {
  constructor(
    private readonly stripeAdapter: StripeAdapter,
    private readonly pineLabsAdapter: PineLabsAdapter,
    private readonly dodoPaymentsAdapter: DodoPaymentsAdapter,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('stripe')
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const result = await this.stripeAdapter.handleWebhook(
      req.rawBody,
      signature,
    );

    if (result) {
      await this.paymentService.confirmPayment(result.orderId, result.status);
    }

    return { received: true };
  }

  @Post('pinelabs')
  async handlePineLabs(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-pinelabs-signature') signature: string,
  ) {
    const result = await this.pineLabsAdapter.handleWebhook(
      req.rawBody,
      signature,
    );

    if (result) {
      await this.paymentService.confirmPayment(result.orderId, result.status);
    }

    return { received: true };
  }

  @Post('dodo-payments')
  async handleDodoPayments(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-dodo-signature') signature: string,
  ) {
    const result = await this.dodoPaymentsAdapter.handleWebhook(
      req.rawBody,
      signature,
    );

    if (result) {
      await this.paymentService.confirmPayment(result.orderId, result.status);
    }

    return { received: true };
  }
}
```

---

## 🌐 Environment Configuration

```.env
# Stripe (Global)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Pine Labs (India - Enterprise)
PINELABS_API_URL=https://api.pinelabs.com/v1
PINELABS_API_KEY=xxxxx
PINELABS_MERCHANT_ID=xxxxx
PINELABS_WEBHOOK_SECRET=xxxxx

# Dodo Payments (India - MVP Recommended)
DODO_PAYMENTS_API_URL=https://api.dodopayments.com/v1
DODO_PAYMENTS_API_KEY=xxxxx
DODO_PAYMENTS_WEBHOOK_SECRET=xxxxx

# Application
NODE_ENV=development
PORT=3000
```

---

## ✅ Benefits of This Architecture

### 1. **Scalability**
- Add new payment provider: Create one adapter file, add one line to factory
- No changes to business logic or controllers

### 2. **Testability**
- Mock `IPaymentGateway` interface for unit tests
- Test each adapter independently
- No real API calls needed for testing

### 3. **Maintainability**
- Provider-specific code isolated in single files
- Changes to Stripe don't affect Pine Labs
- Clear separation of concerns

### 4. **Flexibility**
- Easy to switch providers per business/region
- Support multiple providers simultaneously
- Feature flags for gradual rollout

### 5. **Student-Friendly**
- Start with Razorpay test mode (free)
- Add Stripe later for global expansion
- Pine Labs only when business is established

---

## 🎓 Learning Resources

### For Stripe Integration
- [Stripe Terminal Docs](https://stripe.com/docs/terminal)
- [Stripe Node.js Library](https://github.com/stripe/stripe-node)
- [Testing with Stripe](https://stripe.com/docs/testing)

### For Dodo Payments Integration
- [Dodo Payments Docs](https://docs.dodopayments.com/)
- [Dodo Payments API Reference](https://docs.dodopayments.com/api)
- [Test Mode Guide](https://docs.dodopayments.com/testing)

### For Pine Labs Integration
- Contact Pine Labs for developer documentation
- Requires business registration first

---

## 📋 Next Steps

1. **Phase 1 (Week 1-2)**: 
   - Implement Dodo Payments adapter
   - Build test mode integration
   - Create demo application

2. **Phase 2 (Week 3-4)**:
   - Get first customer commitment
   - Register business entity
   - Activate live mode

3. **Phase 3 (Month 2)**:
   - Add Stripe adapter for global customers
   - Implement webhook handling
   - Add payment status polling

4. **Phase 4 (Month 3+)**:
   - Consider Pine Labs for enterprise customers
   - Add refund functionality
   - Implement payment analytics

---

**Document Maintained By**: Development Team  
**For Questions**: Refer to implementation guide or contact tech lead
