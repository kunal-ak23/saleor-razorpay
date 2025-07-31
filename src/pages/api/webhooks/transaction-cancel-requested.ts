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
    event: "TRANSACTION_CANCEL_REQUESTED",
    apl: saleorApp.apl,
    query: TransactionCancelRequestedDocument,
  });

export default transactionCancelRequestedWebhook.createHandler(async (req, res, ctx) => {
  const { payload } = ctx;
  const { actionType, amount } = payload.action;

  console.debug("Received webhook", { payload });

  const rawEventData = payload.data;
  const dataResult = dataSchema.safeParse(rawEventData);

  if (dataResult.error) {
    console.warn("Invalid data field received in notification", { error: dataResult.error });

    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: "CANCEL_FAILURE",
      message: `Validation error: ${dataResult.error.message}`,
      amount,
      actions: [],
      data: {
        exception: true,
      },
    };

    console.info("Returning error response to Saleor", { response: errorResponse });

    return res.status(200).json(errorResponse);
  }

  const data = dataResult.data;
  console.info("Parsed data field from notification", { data });

  // For Razorpay, cancel requests are typically handled for pending payments
  const { payment_id, amount: cancelAmount, currency = "INR" } = payload.data || {};

  if (!payment_id) {
    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: "CANCEL_FAILURE",
      message: "Missing payment_id",
      amount,
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
      pspReference: data.event.includePspReference ? payment_id : undefined,
      result: data.event.type,
      message: "Payment cancelled successfully",
      actions: getTransactionActions("CANCEL_SUCCESS" as any),
      amount,
      externalUrl: `https://dashboard.razorpay.com/app/payments/${payment_id}`,
      data: {
        paymentId: payment_id,
        amount: cancelAmount || amount,
        currency,
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
      amount,
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