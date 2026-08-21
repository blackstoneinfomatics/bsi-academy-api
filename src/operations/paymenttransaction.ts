import mongoose from "mongoose";
import Stripe from "stripe";
import { config } from "../config/env";
import PaymentModel from "../models/paymenttransaction";
import InvoiceModel from "../models/subscriptionInvoice";
import SubscriptionModel from "../models/tenantsubscription";
import {
  PaymentStatus,
  PaymentType,
  PaymentGateway,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
  BillingCycle,
} from "../shared/enum";
import { paymentMessages } from "../config/messages";
import { throwError } from "../helpers/throwError";

const stripe = new Stripe(config.stripeKey.stripesecretkey);

const ZERO_DECIMAL_CURRENCIES = [
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
];

const THREE_DECIMAL_CURRENCIES = ["BHD", "JOD", "KWD", "OMR", "TND"];

export function fromStripeAmount(amount: number, currency: string) {
  currency = currency.toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.includes(currency)) {
    return amount;
  }

  if (THREE_DECIMAL_CURRENCIES.includes(currency)) {
    return amount / 1000;
  }

  return amount / 100;
}

export function toStripeAmount(amount: number, currency: string) {
  currency = currency.toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.includes(currency)) {
    return Math.round(amount);
  }

  if (THREE_DECIMAL_CURRENCIES.includes(currency)) {
    return Math.round(amount * 1000);
  }

  return Math.round(amount * 100);
}
export class PaymentService {
  async createPaymentIntent(invoiceId: string) {
    try {
      const invoice = await InvoiceModel.findById(invoiceId);

      if (!invoice || invoice.deletedAt) {
        throwError(paymentMessages.INVOICE_NOT_FOUND, 404);
        return;
      }

      if (invoice.status === "PAID") {
        throwError(paymentMessages.INVOICE_ALREADY_PAID, 409);
      }

      const subscription = await SubscriptionModel.findById(
        invoice.subscriptionId,
      );

      if (!subscription) {
        throwError(paymentMessages.SUBSCRIPTION_NOT_FOUND, 404);
      }

      // Existing pending payment
      const existing = await PaymentModel.findOne({
        invoiceId,
        paymentStatus: PaymentStatus.PENDING,
      });

      if (existing?.stripePaymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(
          existing.stripePaymentIntentId,
        );
        return {
          success: true,
          message: paymentMessages.CREATE_PAYMENT_INTENT_SUCCESS,
          data: {
            clientSecret: pi.client_secret,
          },
        };
      }

      const paymentNumber = await this.generatePaymentNumber();

      const paymentIntent = await stripe.paymentIntents.create({
        amount: toStripeAmount(invoice.totalAmount, invoice.currency),
        currency: invoice.currency.toLowerCase(),
        metadata: {
          invoiceId,
        },
      });

      await PaymentModel.create({
        paymentNumber,
        tenantId: invoice.tenantId,
        invoiceId,
        subscriptionId: invoice.subscriptionId,
        amount: invoice.totalAmount,
        currency: invoice.currency,
        paymentType: PaymentType.SUBSCRIPTION,
        gateway: PaymentGateway.STRIPE,
        paymentStatus: PaymentStatus.PENDING,
        stripePaymentIntentId: paymentIntent.id,
        paymentResponse: paymentIntent,
        createdBy: "System",
      });

      return {
        success: true,
        message: paymentMessages.CREATE_PAYMENT_INTENT_SUCCESS,
        data: {
          clientSecret: paymentIntent.client_secret,
        },
      };
    } catch (error: any) {
      console.error("Create Payment Intent Error:", error);

      throwError(
        error.message || paymentMessages.INTERNAL_SERVER_ERROR,
        error.statusCode || 500,
      );
    }
  }

  async confirmPayment(invoiceId: string, paymentIntentResponse: any) {
    if (!paymentIntentResponse) {
      throwError(paymentMessages.VALIDATION_FAILED, 400);
    }

    try {
      const invoice = await InvoiceModel.findById(invoiceId);

      if (!invoice) {
        throwError(paymentMessages.INVOICE_NOT_FOUND, 404);
        return;
      }

      const payment = await PaymentModel.findOne({
        invoiceId,
        paymentStatus: PaymentStatus.PENDING,
      });

      if (!payment) {
        throwError(paymentMessages.PAYMENT_NOT_FOUND, 404);
        return;
      }

      const subscription = await SubscriptionModel.findById(
        invoice.subscriptionId,
      );

      if (!subscription) {
        throwError(paymentMessages.SUBSCRIPTION_NOT_FOUND, 404);
        return;
      }

      payment.paymentDate = new Date();
      payment.transactionReference = paymentIntentResponse.id;
      payment.paymentMethod =
        paymentIntentResponse.payment_method_types?.[0] || "CARD";
      payment.paymentResponse = paymentIntentResponse;
      payment.updatedBy = "System";

      if (paymentIntentResponse.status === "succeeded") {
        if (invoice.status === "PAID") {
          throwError(paymentMessages.INVOICE_ALREADY_PAID, 409);
        }

        const pi = await stripe.paymentIntents.retrieve(
          paymentIntentResponse.id,
        );
        console.log("Payment Intent Retrieved:", pi);

        const chargeId = pi.latest_charge;
        const charges = await stripe.charges.retrieve(chargeId as string, {
          expand: ["balance_transaction"],
        });
        console.log("Charge Retrieved:", charges);

        const balanceTransaction = await getBalanceTransaction(
          chargeId as string,
        );

        console.log("Balance Transaction Retrieved:", balanceTransaction);

        payment.netAmount = convertFromStripeSettlement(
          balanceTransaction.net,
          balanceTransaction.currency,
          payment.currency.toLocaleLowerCase(),
          balanceTransaction.exchange_rate || 1,
          payment.currency.toLocaleLowerCase(),
        );
        payment.processingFee = convertFromStripeSettlement(
          balanceTransaction.fee,
          balanceTransaction.currency,
          payment.currency.toLocaleLowerCase(),
          balanceTransaction.exchange_rate || 1,
          payment.currency.toLocaleLowerCase(),
        );
        payment.refundableAmount = convertFromStripeSettlement(
          balanceTransaction.net,
          balanceTransaction.currency,
          payment.currency.toLocaleLowerCase(),
          balanceTransaction.exchange_rate || 1,
          payment.currency.toLocaleLowerCase(),
        );

        payment.paymentStatus = PaymentStatus.SUCCESS;
        await payment.save();

        invoice.status = SubscriptionInvoiceStatus.PAID;
        await invoice.save();

        // Update Subscription
        const startDate = new Date();
        const endDate = this.calculateEndDate(
          startDate,
          subscription.billingCycle,
        );

        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.paymentStatus = PaymentStatus.PAID;
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        subscription.nextRenewalDate = endDate;

        await subscription.save();

        return {
          success: true,
          message: paymentMessages.CONFIRM_PAYMENT_SUCCESS,
        };
      }

      payment.paymentStatus = PaymentStatus.FAILED;
      payment.failureReason =
        paymentIntentResponse?.last_payment_error?.message ||
        paymentIntentResponse?.failure_message ||
        "Payment failed";

      await payment.save();

      return {
        success: false,
        message: payment.failureReason,
      };
    } catch (err) {
      console.error(err);
      throwError(paymentMessages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  // =============================
  // HELPERS
  // =============================

  private async generatePaymentNumber() {
    const year = new Date().getFullYear();
    const count = await PaymentModel.countDocuments();
    return `PAY-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  private calculateEndDate(start: Date, cycle: BillingCycle) {
    const date = new Date(start);

    switch (cycle) {
      case BillingCycle.MONTHLY:
        date.setMonth(date.getMonth() + 1);
        break;

      case BillingCycle.QUARTERLY:
        date.setMonth(date.getMonth() + 3);
        break;

      case BillingCycle.HALF_YEARLY:
        date.setMonth(date.getMonth() + 6);
        break;

      case BillingCycle.YEARLY:
        date.setFullYear(date.getFullYear() + 1);
        break;

      default:
        throw new Error(`Invalid billing cycle: ${cycle}`);
    }

    return date;
  }
}
async function getBalanceTransaction(chargeId: string) {
  for (let i = 0; i < 5; i++) {
    const charge = await stripe.charges.retrieve(chargeId, {
      expand: ["balance_transaction"],
    });

    if (charge.balance_transaction) {
      if (typeof charge.balance_transaction === "string") {
        return await stripe.balanceTransactions.retrieve(
          charge.balance_transaction,
        );
      }
      return charge.balance_transaction;
    }

    await new Promise((res) => setTimeout(res, 1000));
  }

  throw new Error("Balance transaction not available after retries");
}

function roundTo2(value: number) {
  return Math.round(value * 100) / 100;
}

function convertFromStripeSettlement(
  amount: number,
  stripeCurrency: string,
  targetCurrency: string,
  exchangeRate?: number,
  originalCurrency?: string,
) {
  const normalized = fromStripeAmount(amount, stripeCurrency);

  if (stripeCurrency.toLowerCase() === targetCurrency.toLowerCase()) {
    return roundTo2(normalized);
  }

  if (!exchangeRate || !originalCurrency) {
    throw new Error("Missing exchange rate or original currency");
  }

  const originalAmount = normalized / exchangeRate;

  if (targetCurrency.toLowerCase() === originalCurrency.toLowerCase()) {
    return roundTo2(originalAmount);
  }

  throw new Error("External FX conversion required");
}
