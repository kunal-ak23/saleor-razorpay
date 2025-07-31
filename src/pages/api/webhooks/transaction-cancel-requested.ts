import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import {
  TransactionCancelRequestedDocument,
  TransactionCancelRequestedEventFragment,
} from "@/generated/graphql";
import { getTransactionActions } from "@/lib/transaction-actions";
import { dataSchema, ResponseType } from "@/lib/validation/transaction";
import { v7 as uuidv7 } from "uuid";

export const transactionCancelRequestedWebhook =
  new SaleorSyncWebhook<TransactionCancelRequestedEventFragment>({
    name: "Transaction Cancel Requested",
    webhookPath: "api/webhooks/transaction-cancel-requested",
    event: "TRANSACTION_CANCELATION_REQUESTED",
    apl: saleorApp.apl,
    query: TransactionCancelRequestedDocument,
  });

export default transactionCancelRequestedWebhook.createHandler(async (req, res, ctx) => {
  const { payload } = ctx;

  console.debug("Received webhook", { payload });

  // The webhook payload contains transaction data, not a data field
  const transaction = payload.transaction;
  const amount = transaction?.authorizedAmount?.amount || 0;

  // For Razorpay, cancel requests are typically handled for pending payments
  // This is a simplified implementation - in practice, you might need to handle
  // the actual payment cancellation logic here
  const payment_id = transaction?.pspReference;

  if (!payment_id) {
    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: "CANCEL_FAILURE",
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
    // In Razorpay, cancellation is typically done for pending payments
    // This is a simplified implementation - in practice, you might need to handle
    // the actual payment cancellation logic here
    const successResponse: ResponseType = {
      pspReference: payment_id,
      result: "CANCEL_SUCCESS",
      message: "Payment cancelled successfully",
      actions: getTransactionActions("CANCEL_SUCCESS" as any),
      amount,
      externalUrl: `https://dashboard.razorpay.com/app/payments/${payment_id}`,
      data: {
        paymentId: payment_id,
        amount,
        currency: transaction?.authorizedAmount?.currency || "INR",
        status: "cancelled",
      },
    };

    console.info("Returning success response to Saleor", { response: successResponse });

    return res.status(200).json(successResponse);
  } catch (error: any) {
    console.error("Razorpay cancel processing error:", error);

    const errorResponse: ResponseType = {
      pspReference: payment_id,
      result: "CANCEL_FAILURE",
      message: `Cancel processing failed: ${error.message}`,
      amount: 0,
      actions: getTransactionActions("CANCEL_FAILURE" as any),
      data: {
        exception: true,
      },
      externalUrl: `https://dashboard.razorpay.com/app/payments/${payment_id}`,
    };

    console.info("Returning error response to Saleor", { response: errorResponse });

    return res.status(200).json(errorResponse);
  }
});

/**
 * Disable body parser for this endpoint, so signature can be verified
 */
export const config = {
  api: {
    bodyParser: false,
  },
}; 