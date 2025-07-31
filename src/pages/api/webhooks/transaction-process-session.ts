import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import { TransactionProcessSessionDocument, TransactionProcessSession } from "@/generated/graphql";
import { RazorpayService } from "@/lib/razorpay";
import { getTransactionActions } from "@/lib/transaction-actions";
import { dataSchema, ResponseType } from "@/lib/validation/transaction";
import { v7 as uuidv7 } from "uuid";

export const transactionProcessSessionWebhook = new SaleorSyncWebhook<TransactionProcessSession>({
  name: "Transaction Process Session",
  webhookPath: "api/webhooks/transaction-process-session",
  event: "TRANSACTION_PROCESS_SESSION",
  apl: saleorApp.apl,
  query: TransactionProcessSessionDocument,
});

export default transactionProcessSessionWebhook.createHandler(async (req, res, ctx) => {
  const { payload } = ctx;
  const { actionType, amount } = payload.action;

  console.debug("Received webhook", { payload });

  const rawEventData = payload.data;
  const dataResult = dataSchema.safeParse(rawEventData);

  if (dataResult.error) {
    console.warn("Invalid data field received in notification", { error: dataResult.error });

    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: actionType === "CHARGE" ? "CHARGE_FAILURE" : "AUTHORIZATION_FAILURE",
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

  // Extract payment information from the transaction data
  const { payment_id, razorpay_payment_id, amount: paymentAmount, currency = "INR" } = payload.data || {};

  if (!razorpay_payment_id && !payment_id) {
    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: actionType === "CHARGE" ? "CHARGE_FAILURE" : "AUTHORIZATION_FAILURE",
      message: "Missing payment_id or razorpay_payment_id",
      amount,
      actions: [],
      data: {
        exception: true,
      },
    };

    console.info("Returning missing payment ID error response to Saleor", { response: errorResponse });
    return res.status(200).json(errorResponse);
  }

  const paymentId = razorpay_payment_id || payment_id;

  try {
    // Process payment using service
    const paymentResult = await RazorpayService.processPayment({
      paymentId,
      amount: paymentAmount || amount,
      currency,
    });

    if (!paymentResult.success) {
      const errorResponse: ResponseType = {
        pspReference: paymentId,
        result: "CHARGE_FAILURE",
        message: `Payment processing failed: ${paymentResult.error}`,
        amount,
        actions: getTransactionActions("CHARGE_FAILURE" as any),
        data: {
          exception: true,
        },
        externalUrl: `https://dashboard.razorpay.com/app/payments/${paymentId}`,
      };

      console.info("Returning payment failure response to Saleor", { response: errorResponse });
      return res.status(200).json(errorResponse);
    }

    const capturedPayment = paymentResult.payment!;

    // Determine transaction event type based on payment status
    let eventType = "CHARGE_SUCCESS";
    let message = "Payment processed successfully";
    
    if (capturedPayment.status === "authorized") {
      eventType = "AUTHORIZATION_SUCCESS";
      message = "Payment authorized successfully";
    } else if (capturedPayment.status === "captured") {
      eventType = "CHARGE_SUCCESS";
      message = "Payment captured successfully";
    }

    const successResponse: ResponseType = {
      pspReference: data.event.includePspReference ? capturedPayment.id : undefined,
      result: data.event.type,
      message,
      actions: getTransactionActions(eventType as any),
      amount,
      externalUrl: `https://dashboard.razorpay.com/app/payments/${capturedPayment.id}`,
      data: {
        paymentId: capturedPayment.id,
        orderId: capturedPayment.order_id,
        status: capturedPayment.status,
        method: capturedPayment.method,
        amount: Number(capturedPayment.amount) / 100,
        currency: capturedPayment.currency,
      },
    };

    console.info("Returning success response to Saleor", { response: successResponse });

    return res.status(200).json(successResponse);
  } catch (error: any) {
    console.error("Razorpay payment processing error:", error);
    
    const errorResponse: ResponseType = {
      pspReference: paymentId,
      result: "CHARGE_FAILURE",
      message: `Payment processing failed: ${error.message}`,
      amount,
      actions: getTransactionActions("CHARGE_FAILURE" as any),
      data: {
        exception: true,
      },
      externalUrl: `https://dashboard.razorpay.com/app/payments/${paymentId}`,
    };

    console.info("Returning error response to Saleor", { response: errorResponse });

    return res.status(200).json(errorResponse);
  }
}); 