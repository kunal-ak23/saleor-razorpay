import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import { TransactionInitializeSessionDocument, TransactionInitializeSession } from "@/generated/graphql";
import { validateTransactionData } from "@/lib/validation/transaction";
import { RazorpayService } from "@/lib/razorpay";

export const transactionInitializeSessionWebhook = new SaleorSyncWebhook<TransactionInitializeSession>({
  name: "Transaction Initialize Session",
  webhookPath: "api/webhooks/transaction-initialize-session",
  event: "TRANSACTION_INITIALIZE_SESSION",
  apl: saleorApp.apl,
  query: TransactionInitializeSessionDocument,
});

export default transactionInitializeSessionWebhook.createHandler(async (req, res, ctx) => {
  const { data, action, amount, currency = "INR", id, paymentGateway, idempotencyKey } = req.body;

  if (!id) {
    return res.status(400).json({
      errors: [{ field: "id", message: "Missing required field", code: "INVALID" }],
      data: null,
      transaction: null,
      transactionEvent: null,
    });
  }

  try {
    // Validate the payment gateway data if provided
    let validatedData;
    if (data && typeof data === "object") {
      try {
        validatedData = validateTransactionData(data);
      } catch (validationError: any) {
        return res.status(400).json({
          errors: [{ 
            field: "data", 
            message: `Validation error: ${validationError.message}`, 
            code: "INVALID" 
          }],
          data: null,
          transaction: null,
          transactionEvent: null,
        });
      }
    }

    // Use validated data or fallback to request body
    const orderAmount = validatedData?.amount || amount;
    const orderCurrency = validatedData?.currency || currency;
    const customerData = validatedData?.customer;
    const notes = validatedData?.notes || { saleor_id: id, idempotencyKey: idempotencyKey || "" };

    if (!orderAmount) {
      return res.status(400).json({
        errors: [{ field: "amount", message: "Missing required amount", code: "INVALID" }],
        data: null,
        transaction: null,
        transactionEvent: null,
      });
    }

    // Create Razorpay order using service
    const orderResult = await RazorpayService.createOrder({
      amount: Number(orderAmount),
      currency: orderCurrency,
      receipt: id,
      notes,
    });

    if (!orderResult.success) {
      throw new Error(orderResult.error);
    }

    const order = orderResult.order!; // We know it's not null because we checked success

    // Determine transaction event type based on action
    const eventType = action === "AUTHORIZATION" ? "AUTHORIZATION_REQUEST" : "CHARGE_REQUEST";

    res.status(200).json({
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        customer: customerData,
        notes,
      },
      transaction: {
        id: ctx.payload.transaction?.id,
        actions: ["CHARGE", "AUTHORIZATION"],
      },
      transactionEvent: {
        type: eventType,
        pspReference: order.id,
        message: "Razorpay order created successfully",
        amount: { 
          amount: Number(order.amount) / 100, 
          currency: order.currency 
        },
        externalUrl: `https://dashboard.razorpay.com/app/orders/${order.id}`,
      },
      errors: [],
    });
  } catch (error: any) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({
      errors: [{ message: error.message || "Failed to create Razorpay order", code: "GRAPHQL_ERROR" }],
      data: null,
      transaction: null,
      transactionEvent: {
        type: "CHARGE_FAILURE",
        pspReference: null,
        message: error.message || "Failed to create Razorpay order",
        amount: amount ? { amount, currency } : null,
        externalUrl: null,
      },
    });
  }
}); 