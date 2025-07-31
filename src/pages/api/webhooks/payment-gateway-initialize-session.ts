import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import {
  PaymentGatewayInitializeSessionDocument,
  PaymentGatewayInitializeSessionEventFragment,
} from "@/generated/graphql";

export const paymentGatewayInitializeSessionWebhook =
  new SaleorSyncWebhook<PaymentGatewayInitializeSessionEventFragment>({
    name: "Payment Gateway Initialize Session",
    webhookPath: "api/webhooks/payment-gateway-initialize-session",
    event: "PAYMENT_GATEWAY_INITIALIZE_SESSION",
    apl: saleorApp.apl,
    query: PaymentGatewayInitializeSessionDocument,
  });

export default paymentGatewayInitializeSessionWebhook.createHandler((req, res, ctx) => {
  return res.status(200).json({
    data: {
      ok: true,
    },
  });
});

/**
 * Disable body parser for this endpoint, so signature can be verified
 */
export const config = {
  api: {
    bodyParser: false,
  },
}; 