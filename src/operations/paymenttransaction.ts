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

const stripe = new Stripe(config.stripeKey.stripesecretkey);

export class PaymentService {
  async createPaymentIntent(invoiceId: string) {
    try {
      const invoice = await InvoiceModel.findById(invoiceId);

      if (!invoice || invoice.deletedAt) {
        throw new Error("Subscription Invoice not found.");
      }

      if (invoice.status === "PAID") {
        throw new Error("Invoice has already been paid.");
      }

      const subscription = await SubscriptionModel.findById(
        invoice.subscriptionId,
      );

      if (!subscription) {
        throw new Error("Tenant Subscription not found.");
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

        if (pi.status === "requires_payment_method") {
          return {
            success: true,
            message: "Reusing existing Payment Intent",
            data: {
              clientSecret: pi.client_secret,
            },
          };
        }
      }

      const paymentNumber = await this.generatePaymentNumber();

      const paymentIntent = await stripe.paymentIntents.create({
        amount: invoice.totalAmount,
        currency: invoice.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
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
        message: "Payment Intent created successfully.",
        data: {
          clientSecret: paymentIntent.client_secret,
        },
      };
    } catch (error: any) {
      console.error("Create Payment Intent Error:", error);

      throw new Error(error.message || "Internal Server Error");
    }
  }

  async confirmPayment(invoiceId: string, paymentIntentResponse: any) {
    if (!paymentIntentResponse) {
      throw new Error("Validation Failed");
    }

    try {
      const invoice = await InvoiceModel.findById(invoiceId);

      if (!invoice) {
        throw new Error("Subscription Invoice not found.");
      }

      const payment = await PaymentModel.findOne({
        invoiceId,
        paymentStatus: PaymentStatus.PENDING,
      });

      if (!payment) {
        throw new Error("Payment not found.");
      }

      const subscription = await SubscriptionModel.findById(
        invoice.subscriptionId,
      );

      if (!subscription) {
        throw new Error("Tenant Subscription not found.");
      }

      payment.paymentDate = new Date();
      payment.transactionReference = paymentIntentResponse.id;
      payment.paymentMethod =
        paymentIntentResponse.payment_method_types?.[0] || "CARD";
      payment.paymentResponse = paymentIntentResponse;
      payment.updatedBy = "System";

      if (paymentIntentResponse.status === "succeeded") {
        if (invoice.status === "PAID") {
          throw new Error("Invoice has already been paid.");
        }

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
          message: "Payment completed successfully.",
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
      throw new Error("Internal Server Error");
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
