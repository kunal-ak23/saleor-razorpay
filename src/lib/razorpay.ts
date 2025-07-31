import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export interface RazorpayOrderData {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayPaymentData {
  paymentId: string;
  amount?: number;
  currency?: string;
}

export class RazorpayService {
  static async createOrder(data: RazorpayOrderData) {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(data.amount * 100), // Convert to paise
        currency: data.currency,
        receipt: data.receipt,
        payment_capture: true,
        notes: data.notes || {},
      });
      
      return {
        success: true,
        order,
        error: null,
      };
    } catch (error: any) {
      return {
        success: false,
        order: null,
        error: error.message || "Failed to create Razorpay order",
      };
    }
  }

  static async processPayment(data: RazorpayPaymentData) {
    try {
      const payment = await razorpay.payments.fetch(data.paymentId);
      
      let capturedPayment = payment;
      
      // If payment is not already captured, capture it
      if (payment.status !== "captured") {
        capturedPayment = await razorpay.payments.capture(
          data.paymentId, 
          payment.amount, 
          data.currency || payment.currency
        );
      }
      
      return {
        success: true,
        payment: capturedPayment,
        error: null,
      };
    } catch (error: any) {
      return {
        success: false,
        payment: null,
        error: error.message || "Failed to process payment",
      };
    }
  }

  static async refundPayment(paymentId: string, amount?: number) {
    try {
      const refund = await razorpay.payments.refund(paymentId, {
        amount: amount ? Math.round(amount * 100) : undefined,
      });
      
      return {
        success: true,
        refund,
        error: null,
      };
    } catch (error: any) {
      return {
        success: false,
        refund: null,
        error: error.message || "Failed to refund payment",
      };
    }
  }
}

export { razorpay }; 