import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import { TransactionInitializeSessionDocument, TransactionInitializeSession } from "@/generated/graphql";
import { validateTransactionData, dataSchema, ResponseType } from "@/lib/validation/transaction";
import { RazorpayService } from "@/lib/razorpay";
import { getTransactionActions } from "@/lib/transaction-actions";
import { v7 as uuidv7 } from "uuid";

export const transactionInitializeSessionWebhook = new SaleorSyncWebhook<TransactionInitializeSession>({
  name: "Transaction Initialize Session",
  webhookPath: "api/webhooks/transaction-initialize-session",
  event: "TRANSACTION_INITIALIZE_SESSION",
  apl: saleorApp.apl,
  query: TransactionInitializeSessionDocument,
});

export default transactionInitializeSessionWebhook.createHandler(async (req, res, ctx) => {
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

  try {
    // Validate the payment gateway data if provided
    let validatedData;
    if (payload.data && typeof payload.data === "object") {
      try {
        validatedData = validateTransactionData(payload.data);
      } catch (validationError: any) {
        const errorResponse: ResponseType = {
          pspReference: uuidv7(),
          result: actionType === "CHARGE" ? "CHARGE_FAILURE" : "AUTHORIZATION_FAILURE",
          message: `Validation error: ${validationError.message}`,
          amount,
          actions: [],
          data: {
            exception: true,
          },
        };

        console.info("Returning validation error response to Saleor", { response: errorResponse });
        return res.status(200).json(errorResponse);
      }
    }

    // Use validated data or fallback to request body
    const orderAmount = validatedData?.amount || amount;
    const orderCurrency = validatedData?.currency || "INR";
    const customerData = validatedData?.customer;
    const notes = validatedData?.notes || { 
      saleor_id: payload.transaction?.id, 
      idempotencyKey: payload.idempotencyKey || "" 
    };

    if (!orderAmount) {
      const errorResponse: ResponseType = {
        pspReference: uuidv7(),
        result: actionType === "CHARGE" ? "CHARGE_FAILURE" : "AUTHORIZATION_FAILURE",
        message: "Missing required amount",
        amount,
        actions: [],
        data: {
          exception: true,
        },
      };

      console.info("Returning missing amount error response to Saleor", { response: errorResponse });
      return res.status(200).json(errorResponse);
    }

    // Create Razorpay order using service
    const orderResult = await RazorpayService.createOrder({
      amount: Number(orderAmount),
      currency: orderCurrency,
      receipt: payload.transaction?.id || uuidv7(),
      notes,
    });

    if (!orderResult.success) {
      throw new Error(orderResult.error);
    }

    const order = orderResult.order!;

    // Determine transaction event type based on action
    const eventType = actionType === "AUTHORIZATION" ? "AUTHORIZATION_REQUEST" : "CHARGE_REQUEST";

    const successResponse: ResponseType = {
      pspReference: data.event.includePspReference ? order.id : undefined,
      result: data.event.type,
      message: "Razorpay order created successfully",
      actions: getTransactionActions(eventType as any),
      amount,
      externalUrl: `https://dashboard.razorpay.com/app/orders/${order.id}`,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID || "",
        customer: customerData ? JSON.stringify(customerData) : "",
        notes: notes ? JSON.stringify(notes) : "",
      },
    };

    console.info("Returning success response to Saleor", { response: successResponse });

    return res.status(200).json(successResponse);
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);

    const errorResponse: ResponseType = {
      pspReference: uuidv7(),
      result: actionType === "CHARGE" ? "CHARGE_FAILURE" : "AUTHORIZATION_FAILURE",
      message: error.message || "Failed to create Razorpay order",
      amount,
      actions: [],
      data: {
        exception: true,
      },
    };

    console.info("Returning error response to Saleor", { response: errorResponse });

    return res.status(200).json(errorResponse);
  }
}); 