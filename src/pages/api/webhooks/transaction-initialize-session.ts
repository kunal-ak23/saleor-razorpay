import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import Razorpay from "razorpay";
import { TransactionInitializeSessionDocument, TransactionInitializeSession } from "@/generated/graphql";

export const transactionInitializeSessionWebhook = new SaleorSyncWebhook<TransactionInitializeSession>({
  name: "Transaction Initialize Session",
  webhookPath: "api/webhooks/transaction-initialize-session",
  event: "TRANSACTION_INITIALIZE_SESSION",
  apl: saleorApp.apl,
  query: TransactionInitializeSessionDocument,
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export default transactionInitializeSessionWebhook.createHandler(async (req, res, ctx) => {
  const { amount, currency = "INR", id, paymentGateway, idempotencyKey } = req.body;

  if (!amount || !id) {
    return res.status(400).json({
      errors: [{ field: !amount ? "amount" : "id", message: "Missing required field", code: "INVALID" }],
      data: null,
      transaction: null,
      transactionEvent: null,
    });
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt: id,
      payment_capture: true,
      notes: { saleor_id: id, idempotencyKey: idempotencyKey || "" },
    });
    res.status(200).json({
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
      transaction: null,
      transactionEvent: null,
      errors: [],
    });
  } catch (error: any) {
    res.status(500).json({
      errors: [{ message: error.message, code: "GRAPHQL_ERROR" }],
      data: null,
      transaction: null,
      transactionEvent: null,
    });
  }
}); 