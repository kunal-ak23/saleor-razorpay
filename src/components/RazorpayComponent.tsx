"use client";

import { Button } from "@saleor/macaw-ui";
import { useTransactionInitializeMutation } from "@/generated/graphql";
import { useState } from "react";

const razorpayGatewayId = "razorpay.payment.gateway";

interface RazorpayComponentProps {
  checkoutId?: string;
  amount?: number;
  currency?: string;
  customer?: {
    name: string;
    email: string;
    contact: string;
  };
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export const RazorpayComponent = ({
  checkoutId = "test-checkout-id",
  amount = 1000, // Amount in paise (10 INR)
  currency = "INR",
  customer = {
    name: "Test Customer",
    email: "test@example.com",
    contact: "+919999999999"
  },
  onSuccess,
  onError
}: RazorpayComponentProps) => {
  const [isInProgress, setIsInProgress] = useState(false);
  const [transactionInitializeState, transactionInitialize] = useTransactionInitializeMutation();

  const onInitializeClick = async () => {
    setIsInProgress(true);
    
    try {
      const result = await transactionInitialize({
        checkoutId,
        paymentGateway: {
          id: razorpayGatewayId,
          data: {
            event: {
              includePspReference: true,
              type: "CHARGE_SUCCESS"
            },
            amount,
            currency,
            customer,
            notes: {
              checkout_id: checkoutId
            }
          }
        },
      });
      
      console.log("Payment initialized successfully", result);
      
      const transactionData = result.data?.transactionInitialize;
      const errors = transactionData?.errors;
      
      if (errors && errors.length > 0) {
        const error = errors[0];
        console.error("Transaction initialization error:", error);
        onError?.(error.message || "Unknown error");
      } else {
        console.log("Transaction data:", transactionData);
        onSuccess?.(transactionData);
        
        // Here you would typically:
        // 1. Redirect to Razorpay payment page
        // 2. Handle the payment flow
        // 3. Process the payment response
        // 4. Complete the checkout
        
        // For demo purposes, we'll just show success
        alert("Payment initialized successfully! In a real app, you would redirect to Razorpay payment page.");
      }
      
    } catch (error: any) {
      console.error("There was a problem with Razorpay Payment Gateway:", error);
      onError?.(error.message || "Failed to initialize payment");
    } finally {
      setIsInProgress(false);
    }
  };

  if (isInProgress) {
    return <Button variant="primary" disabled={true} label="Processing payment..." />;
  }

  return (
    <Button 
      variant="primary" 
      onClick={onInitializeClick} 
      label="Make payment with Razorpay"
    />
  );
}; 