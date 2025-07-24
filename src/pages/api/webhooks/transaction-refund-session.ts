import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import Razorpay from "razorpay";
import { TransactionRefundRequestedDocument, TransactionRefundRequested } from "@/generated/graphql";

export const transactionRefundRequestedWebhook = new SaleorSyncWebhook<TransactionRefundRequested>({
  name: "Transaction Refund Requested",
  webhookPath: "api/webhooks/transaction-refund-session",
  event: "TRANSACTION_REFUND_REQUESTED",
  apl: saleorApp.apl,
  query: TransactionRefundRequestedDocument,
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export default transactionRefundRequestedWebhook.createHandler(async (req, res, ctx) => {
  const { payment_id, amount, currency = "INR" } = req.body;

  if (!payment_id || !amount) {
    return res.status(400).json({
      errors: [{ field: !payment_id ? "payment_id" : "amount", message: "Missing required field", code: "INVALID" }],
      data: null,
      transaction: null,
      transactionEvent: null,
    });
  }

  try {
    const refund = await razorpay.payments.refund(payment_id, { amount: Math.round(Number(amount) * 100) });
    res.status(200).json({
      data: {},
      transaction: null,
      transactionEvent: {
        type: "REFUND_SUCCESS",
        pspReference: refund.id,
        message: "Refund processed successfully",
        amount: { amount: Number(refund.amount ?? 0) / 100, currency: refund.currency },
        externalUrl: null,
      },
      errors: [],
    });
  } catch (error: any) {
    res.status(200).json({
      data: {},
      transaction: null,
      transactionEvent: {
        type: "REFUND_FAILURE",
        pspReference: payment_id,
        message: error.message,
        amount: amount ? { amount, currency } : null,
        externalUrl: null,
      },
      errors: [{ message: error.message, code: "GRAPHQL_ERROR" }],
    });
  }
}); 