import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

interface RazorpayCheckoutWidgetProps {
  amount: number;
  currency: string;
  checkoutId: string;
  orderId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  onSuccess?: (paymentId: string, orderId: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayCheckoutWidget({
  amount,
  currency,
  checkoutId,
  orderId,
  customerEmail,
  customerName,
  customerPhone,
  onSuccess,
  onError,
  onClose
}: RazorpayCheckoutWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyId, setKeyId] = useState<string | null>(null);
  const router = useRouter();

  const initializePayment = useCallback(async () => {
    try {
      // Get payment gateway configuration from our app
      const response = await fetch('/api/payment-gateway-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          checkoutId,
          orderId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }

      const config = await response.json();
      setKeyId(config.keyId);

      // Initialize Razorpay checkout
      const options = {
        key: config.keyId,
        amount: config.amount,
        currency: config.currency,
        name: 'Thepla House',
        description: `Payment for ${orderId || checkoutId}`,
        order_id: config.orderId,
        handler: function (response: any) {
          // Handle successful payment
          if (onSuccess) {
            onSuccess(response.razorpay_payment_id, response.razorpay_order_id);
          }
        },
        prefill: {
          name: customerName || '',
          email: customerEmail || '',
          contact: customerPhone || '',
        },
        notes: {
          saleor_checkout_id: checkoutId,
          saleor_order_id: orderId || '',
        },
        theme: {
          color: '#3399cc',
        },
        modal: {
          ondismiss: function() {
            if (onClose) {
              onClose();
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [amount, currency, checkoutId, orderId, customerName, customerEmail, customerPhone, onSuccess, onError, onClose]);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      setIsLoading(false);
    };
    script.onerror = () => {
      setError('Failed to load Razorpay');
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !keyId) {
      initializePayment();
    }
  }, [isLoading, keyId, initializePayment]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading payment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Opening Razorpay checkout...</p>
      </div>
    </div>
  );
} 