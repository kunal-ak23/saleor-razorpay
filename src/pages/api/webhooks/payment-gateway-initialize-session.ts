import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import {
  PaymentGatewayInitializeSessionDocument,
  PaymentGatewayInitializeSession,
} from "@/generated/graphql";

export const paymentGatewayInitializeSessionWebhook = new SaleorSyncWebhook<PaymentGatewayInitializeSession>({
  name: "Payment Gateway Initialize Session",
  webhookPath: "api/webhooks/payment-gateway-initialize-session",
  event: "PAYMENT_GATEWAY_INITIALIZE_SESSION",
  apl: saleorApp.apl,
  query: PaymentGatewayInitializeSessionDocument,
});

export default paymentGatewayInitializeSessionWebhook.createHandler(async (req, res, ctx) => {
  const { amount, currency = "INR" } = req.body;

  res.status(200).json({
    gatewayConfigs: [
      {
        id: "razorpay.payment.gateway",
        data: {
          keyId: process.env.RAZORPAY_KEY_ID,
          amount: amount,
          currency: currency,
          name: "Razorpay",
          description: "Pay securely with Razorpay",
          supportedCurrencies: ["INR", "USD", "EUR", "GBP"],
          supportedPaymentMethods: ["card", "netbanking", "wallet", "upi"],
        },
        errors: [],
      },
    ],
    errors: [],
  });
}); 