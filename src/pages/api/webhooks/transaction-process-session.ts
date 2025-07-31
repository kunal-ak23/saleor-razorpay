import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import { TransactionProcessSessionDocument, TransactionProcessSession } from "@/generated/graphql";
import { RazorpayService } from "@/lib/razorpay";

export const transactionProcessSessionWebhook = new SaleorSyncWebhook<TransactionProcessSession>({
  name: "Transaction Process Session",
  webhookPath: "api/webhooks/transaction-process-session",
  event: "TRANSACTION_PROCESS_SESSION",
  apl: saleorApp.apl,
  query: TransactionProcessSessionDocument,
});

export default transactionProcessSessionWebhook.createHandler(async (req, res, ctx) => {
  const { payment_id, razorpay_payment_id, amount, currency = "INR", data } = req.body;

  if (!razorpay_payment_id && !payment_id) {
    return res.status(400).json({
      errors: [{ field: "payment_id", message: "Missing payment_id or razorpay_payment_id", code: "INVALID" }],
      data: null,
      transaction: null,
      transactionEvent: null,
    });
  }

  const paymentId = razorpay_payment_id || payment_id;

  try {
    // Process payment using service
    const paymentResult = await RazorpayService.processPayment({
      paymentId,
      amount,
      currency,
    });

    if (!paymentResult.success) {
      return res.status(200).json({
        data: {},
        transaction: {
          id: ctx.payload.transaction?.id,
          actions: ["REFUND", "CANCEL"],
        },
        transactionEvent: {
          type: "CHARGE_FAILURE",
          pspReference: paymentId,
          message: `Payment processing failed: ${paymentResult.error}`,
          amount: amount ? { amount, currency } : null,
          externalUrl: `https://dashboard.razorpay.com/app/payments/${paymentId}`,
        },
        errors: [{ message: paymentResult.error, code: "PAYMENT_PROCESSING_FAILED" }],
      });
    }

    const capturedPayment = paymentResult.payment!; // We know it's not null because we checked success

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

    res.status(200).json({
      data: {
        paymentId: capturedPayment.id,
        orderId: capturedPayment.order_id,
        status: capturedPayment.status,
        method: capturedPayment.method,
        amount: Number(capturedPayment.amount) / 100,
        currency: capturedPayment.currency,
      },
      transaction: {
        id: ctx.payload.transaction?.id,
        actions: ["REFUND", "CANCEL"],
      },
      transactionEvent: {
        type: eventType,
        pspReference: capturedPayment.id,
        message,
        amount: { 
          amount: Number(capturedPayment.amount) / 100, 
          currency: capturedPayment.currency 
        },
        externalUrl: `https://dashboard.razorpay.com/app/payments/${capturedPayment.id}`,
      },
      errors: [],
    });
  } catch (error: any) {
    console.error("Razorpay payment processing error:", error);
    
    res.status(200).json({
      data: {},
      transaction: {
        id: ctx.payload.transaction?.id,
        actions: ["REFUND", "CANCEL"],
      },
      transactionEvent: {
        type: "CHARGE_FAILURE",
        pspReference: paymentId,
        message: `Payment processing failed: ${error.message}`,
        amount: amount ? { amount, currency } : null,
        externalUrl: `https://dashboard.razorpay.com/app/payments/${paymentId}`,
      },
      errors: [{ message: error.message, code: "PAYMENT_PROCESSING_FAILED" }],
    });
  }
}); 