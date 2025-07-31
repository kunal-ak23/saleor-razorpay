import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import Razorpay from "razorpay";
import { TransactionRefundRequestedDocument, TransactionRefundRequested } from "@/generated/graphql";
import { getTransactionActions } from "@/lib/transaction-actions";
import { dataSchema, ResponseType } from "@/lib/validation/transaction";
import { v7 as uuidv7 } from "uuid";

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
  const { payload } = ctx;

  console.debug("Received webhook", { payload });

  // The webhook payload contains transaction data, not a data field
  const transaction = payload.transaction;
  const amount = transaction?.chargedAmount?.amount || 0;

  // Extract payment information from the transaction data
  const payment_id = transaction?.pspReference;

  if (!payment_id) {
    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: "REFUND_FAILURE",
      message: "Missing payment_id",
      amount: 0,
      actions: [],
      data: {
        exception: true,
      },
    };

    console.info("Returning missing payment ID error response to Saleor", { response: errorResponse });
    return res.status(200).json(errorResponse);
  }

  try {
    const refund = await razorpay.payments.refund(payment_id, { 
      amount: Math.round(Number(amount) * 100) 
    });

    const successResponse: ResponseType = {
      pspReference: refund.id,
      result: "REFUND_SUCCESS",
      message: "Refund processed successfully",
      actions: getTransactionActions("REFUND_SUCCESS" as any),
      amount,
      externalUrl: `https://dashboard.razorpay.com/app/payments/${payment_id}`,
      data: {
        refundId: refund.id,
        paymentId: payment_id,
        amount: Number(refund.amount ?? 0) / 100,
        currency: refund.currency,
        status: refund.status,
      },
    };

    console.info("Returning success response to Saleor", { response: successResponse });

    return res.status(200).json(successResponse);
  } catch (error: any) {
    console.error("Razorpay refund processing error:", error);

    const errorResponse: ResponseType = {
      pspReference: payment_id,
      result: "REFUND_FAILURE",
      message: `Refund processing failed: ${error.message}`,
      amount: 0,
      actions: getTransactionActions("REFUND_FAILURE" as any),
      data: {
        exception: true,
      },
      externalUrl: `https://dashboard.razorpay.com/app/payments/${payment_id}`,
    };

    console.info("Returning error response to Saleor", { response: errorResponse });

    return res.status(200).json(errorResponse);
  }
}); 