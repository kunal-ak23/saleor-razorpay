import { createGraphQLClient } from "./create-graphq-client";

export interface PaymentFlowData {
  checkoutId: string;
  amount: number;
  currency: string;
  customer: {
    name: string;
    email: string;
    contact: string;
  };
  notes?: Record<string, string>;
}

export interface PaymentFlowResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  transactionId?: string;
  order?: any;
  error?: string;
}

export class PaymentFlowService {
  private static client = createGraphQLClient();

  static async initializePayment(data: PaymentFlowData): Promise<PaymentFlowResult> {
    try {
      const variables = {
        checkoutId: data.checkoutId,
        action: "CHARGE" as const,
        paymentGateway: {
          id: "razorpay.payment.gateway",
          data: {
            event: {
              includePspReference: true,
              type: "CHARGE_SUCCESS"
            },
            amount: data.amount,
            currency: data.currency,
            customer: data.customer,
            notes: data.notes || { checkout_id: data.checkoutId },
            order_id: data.checkoutId
          }
        },
        amount: data.amount
      };

      const result = await this.client.mutation(`
        mutation TransactionInitialize($checkoutId: ID!, $action: TransactionFlowStrategyEnum, $paymentGateway: PaymentGatewayToInitialize!, $amount: PositiveDecimal) {
          transactionInitialize(
            id: $checkoutId
            action: $action
            paymentGateway: $paymentGateway
            amount: $amount
          ) {
            transaction {
              id
              actions
            }
            transactionEvent {
              message
              type
            }
            data
            errors {
              field
              code
              message
            }
          }
        }
      `, variables).toPromise();

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      const transactionData = result.data?.transactionInitialize;
      
      if (transactionData?.errors?.length > 0) {
        return {
          success: false,
          error: transactionData.errors[0].message
        };
      }

      return {
        success: true,
        orderId: transactionData?.data?.orderId,
        transactionId: transactionData?.transaction?.id,
        order: transactionData?.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to initialize payment"
      };
    }
  }

  static async completeCheckout(checkoutId: string): Promise<PaymentFlowResult> {
    try {
      const variables = {
        checkoutId
      };

      const result = await this.client.mutation(`
        mutation CheckoutComplete($checkoutId: ID!) {
          checkoutComplete(id: $checkoutId) {
            errors {
              message
              field
              code
            }
            order {
              id
            }
          }
        }
      `, variables).toPromise();

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      const checkoutData = result.data?.checkoutComplete;
      
      if (checkoutData?.errors?.length > 0) {
        return {
          success: false,
          error: checkoutData.errors[0].message
        };
      }

      return {
        success: true,
        order: checkoutData?.order
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to complete checkout"
      };
    }
  }

  static async processPaymentSuccess(paymentId: string, transactionId: string, checkoutId: string): Promise<PaymentFlowResult> {
    try {
      // First, process the payment
      const processResult = await this.processPayment(paymentId, transactionId);
      
      if (!processResult.success) {
        return processResult;
      }

      // If payment is successful, automatically complete the checkout
      const checkoutResult = await this.completeCheckout(checkoutId);
      
      if (!checkoutResult.success) {
        return {
          success: false,
          error: `Payment successful but checkout failed: ${checkoutResult.error}`
        };
      }

      return {
        success: true,
        paymentId: processResult.paymentId,
        order: checkoutResult.order
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to process payment success"
      };
    }
  }

  private static async processPayment(paymentId: string, transactionId: string): Promise<PaymentFlowResult> {
    try {
      const variables = {
        id: transactionId,
        data: {
          razorpay_payment_id: paymentId
        }
      };

      const result = await this.client.mutation(`
        mutation TransactionProcess($id: ID!, $data: JSON!) {
          transactionProcess(id: $id, data: $data) {
            transaction {
              id
              actions
            }
            transactionEvent {
              message
              type
            }
            data
            errors {
              field
              code
              message
            }
          }
        }
      `, variables).toPromise();

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      const transactionData = result.data?.transactionProcess;
      
      if (transactionData?.errors?.length > 0) {
        return {
          success: false,
          error: transactionData.errors[0].message
        };
      }

      const eventType = transactionData?.transactionEvent?.type;
      
      if (eventType === "CHARGE_SUCCESS" || eventType === "AUTHORIZATION_SUCCESS") {
        return {
          success: true,
          paymentId: paymentId
        };
      } else {
        return {
          success: false,
          error: `Payment failed: ${transactionData?.transactionEvent?.message || "Unknown error"}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to process payment"
      };
    }
  }
} 