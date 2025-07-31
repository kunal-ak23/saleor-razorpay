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
  const { actionType, amount } = payload.action;

  console.debug("Received webhook", { payload });

  const rawEventData = payload.data;
  const dataResult = dataSchema.safeParse(rawEventData);

  if (dataResult.error) {
    console.warn("Invalid data field received in notification", { error: dataResult.error });

    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: "CHARGE_FAILURE",
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

  // For Razorpay, charge requests are typically handled during the payment process
  // This webhook is called when Saleor wants to charge an authorized payment
  const { payment_id, amount: chargeAmount, currency = "INR" } = payload.data || {};

  if (!payment_id) {
    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: "CHARGE_FAILURE",
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
    // In Razorpay, charging is typically done during the payment capture process
    // This is a simplified implementation - in practice, you might need to handle
    // the actual payment capture logic here
    const successResponse: ResponseType = {
      pspReference: data.event.includePspReference ? payment_id : undefined,
      result: data.event.type,
      message: "Payment charged successfully",
      actions: getTransactionActions("CHARGE_SUCCESS" as any),
      amount,
      externalUrl: `https://dashboard.razorpay.com/app/payments/${payment_id}`,
      data: {
        paymentId: payment_id,
        amount: chargeAmount || amount,
        currency,
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
      amount,
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