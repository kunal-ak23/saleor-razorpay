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
  res.status(200).json({
    gatewayConfigs: [
      {
        id: "razorpay.payment.gateway",
        data: {
          keyId: process.env.RAZORPAY_KEY_ID,
        },
        errors: [],
      },
    ],
    errors: [],
  });
}); 