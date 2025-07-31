import { NextApiRequest, NextApiResponse } from "next";
import { PaymentFlowService } from "@/lib/payment-flow";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { checkoutId, amount, currency, customer, notes, paymentId, transactionId } = req.body;

  if (!checkoutId) {
    return res.status(400).json({ error: "Checkout ID is required" });
  }

  try {
    // If paymentId and transactionId are provided, this is a payment success callback
    if (paymentId && transactionId) {
      const result = await PaymentFlowService.processPaymentSuccess(paymentId, transactionId, checkoutId);
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: "Payment processed and checkout completed successfully",
          order: result.order,
          paymentId: result.paymentId
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }
    }

    // Otherwise, initialize the payment
    if (!amount || !currency || !customer) {
      return res.status(400).json({ 
        error: "Amount, currency, and customer data are required for payment initialization" 
      });
    }

    const result = await PaymentFlowService.initializePayment({
      checkoutId,
      amount,
      currency,
      customer,
      notes
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Payment initialized successfully",
        orderId: result.orderId,
        transactionId: result.transactionId,
        order: result.order
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    console.error("Payment flow error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
} 