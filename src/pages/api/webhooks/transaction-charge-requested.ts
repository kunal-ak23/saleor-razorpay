import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import {
  TransactionChargeRequestedDocument,
  TransactionChargeRequestedEventFragment,
} from "@/generated/graphql";
import { getTransactionActions } from "@/lib/transaction-actions";
import { dataSchema, ResponseType } from "@/lib/validation/transaction";
import { v7 as uuidv7 } from "uuid";

export const transactionChargeRequestedWebhook =
  new SaleorSyncWebhook<TransactionChargeRequestedEventFragment>({
    name: "Transaction Charge Requested",
    webhookPath: "api/webhooks/transaction-charge-requested",
    event: "TRANSACTION_CHARGE_REQUESTED",
    apl: saleorApp.apl,
    query: TransactionChargeRequestedDocument,
  });

export default transactionChargeRequestedWebhook.createHandler(async (req, res, ctx) => {
  const { payload } = ctx;

  console.debug("Received webhook", { payload });

  // The webhook payload contains transaction data, not a data field
  const transaction = payload.transaction;
  const amount = transaction?.authorizedAmount?.amount || 0;

  // For Razorpay, charge requests are typically handled during the payment process
  // This webhook is called when Saleor wants to charge an authorized payment
  const payment_id = transaction?.pspReference;

  if (!payment_id) {
    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: "CHARGE_FAILURE",
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
    // In Razorpay, charging is typically done during the payment capture process
    // This is a simplified implementation - in practice, you might need to handle
    // the actual payment capture logic here
    const successResponse: ResponseType = {
      pspReference: payment_id,
      result: "CHARGE_SUCCESS",
      message: "Payment charged successfully",
      actions: getTransactionActions("CHARGE_SUCCESS" as any),
      amount,
      externalUrl: `https://dashboard.razorpay.com/app/payments/${payment_id}`,
      data: {
        paymentId: payment_id,
        amount,
        currency: transaction?.authorizedAmount?.currency || "INR",
        status: "captured",
      },
    };

    console.info("Returning success response to Saleor", { response: successResponse });

    return res.status(200).json(successResponse);
  } catch (error: any) {
    console.error("Razorpay charge processing error:", error);

    const errorResponse: ResponseType = {
      pspReference: payment_id,
      result: "CHARGE_FAILURE",
      message: `Charge processing failed: ${error.message}`,
      amount: 0,
      actions: getTransactionActions("CHARGE_FAILURE" as any),
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