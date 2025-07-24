import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import Razorpay from "razorpay";
import { TransactionProcessSessionDocument, TransactionProcessSession } from "@/generated/graphql";

export const transactionProcessSessionWebhook = new SaleorSyncWebhook<TransactionProcessSession>({
  name: "Transaction Process Session",
  webhookPath: "api/webhooks/transaction-process-session",
  event: "TRANSACTION_PROCESS_SESSION",
  apl: saleorApp.apl,
  query: TransactionProcessSessionDocument,
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export default transactionProcessSessionWebhook.createHandler(async (req, res, ctx) => {
  const { payment_id, amount, currency = "INR" } = req.body;

  if (!payment_id) {
    return res.status(400).json({
      errors: [{ field: "payment_id", message: "Missing payment_id", code: "INVALID" }],
      data: null,
      transaction: null,
      transactionEvent: null,
    });
  }

  try {
    const payment = await razorpay.payments.fetch(payment_id);
    let capturedPayment = payment;
    if (payment.status !== "captured") {
      capturedPayment = await razorpay.payments.capture(payment_id, payment.amount, currency);
    }
    res.status(200).json({
      data: {},
      transaction: null,
      transactionEvent: {
        type: "CHARGE_SUCCESS",
        pspReference: capturedPayment.id,
        message: "Payment captured successfully",
        amount: { amount: Number(capturedPayment.amount) / 100, currency: capturedPayment.currency },
        externalUrl: capturedPayment.invoice_id ? `https://dashboard.razorpay.com/app/invoices/${capturedPayment.invoice_id}` : null,
      },
      errors: [],
    });
  } catch (error: any) {
    res.status(200).json({
      data: {},
      transaction: null,
      transactionEvent: {
        type: "CHARGE_FAILURE",
        pspReference: payment_id,
        message: error.message,
        amount: amount ? { amount, currency } : null,
        externalUrl: null,
      },
      errors: [{ message: error.message, code: "GRAPHQL_ERROR" }],
    });
  }
}); 