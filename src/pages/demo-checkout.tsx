import React, { useState } from 'react';
import RazorpayCheckoutWidget from './razorpay-widget';

interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function DemoCheckout() {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('');

  // Demo checkout data
  const checkoutItems: CheckoutItem[] = [
    { id: '1', name: 'Butter Chicken', price: 450, quantity: 1 },
    { id: '2', name: 'Naan Bread', price: 30, quantity: 2 },
    { id: '3', name: 'Dal Makhani', price: 200, quantity: 1 },
  ];

  const subtotal = checkoutItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const handlePaymentSuccess = (paymentId: string, orderId: string) => {
    setPaymentStatus('success');
    setIsProcessing(false);
    console.log('Payment successful:', { paymentId, orderId });
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus('error');
    setIsProcessing(false);
    console.error('Payment failed:', error);
  };

  const handlePaymentClose = () => {
    setIsProcessing(false);
    setPaymentStatus('');
  };

  const handleCheckout = () => {
    if (selectedPaymentMethod === 'razorpay') {
      setIsProcessing(true);
      setPaymentStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Demo Checkout</h1>
            
            {/* Order Summary */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-gray-600">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="text-gray-900">₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax (18% GST)</span>
                    <span>₹{tax}</span>
                  </div>
                  <div className="flex justify-between text-lg font-medium text-gray-900 mt-2">
                    <span>Total</span>
                    <span>₹{total}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={selectedPaymentMethod === 'razorpay'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-gray-700">Razorpay (Credit/Debit Cards, UPI, Net Banking)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={selectedPaymentMethod === 'cod'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-gray-700">Cash on Delivery</span>
                </label>
              </div>
            </div>

            {/* Checkout Button */}
            <div className="flex justify-end">
              <button
                onClick={handleCheckout}
                disabled={!selectedPaymentMethod || isProcessing}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : `Pay ₹${total}`}
              </button>
            </div>

            {/* Payment Status */}
            {paymentStatus && (
              <div className={`mt-4 p-4 rounded-md ${
                paymentStatus === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {paymentStatus === 'success' 
                  ? 'Payment completed successfully!' 
                  : 'Payment failed. Please try again.'}
              </div>
            )}

            {/* Razorpay Widget */}
            {isProcessing && selectedPaymentMethod === 'razorpay' && (
              <div className="mt-6 p-4 border border-gray-200 rounded-md">
                <RazorpayCheckoutWidget
                  amount={total}
                  currency="INR"
                  checkoutId="demo-checkout-123"
                  customerEmail="customer@example.com"
                  customerName="John Doe"
                  customerPhone="+919876543210"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  onClose={handlePaymentClose}
                />
              </div>
            )}
          </div>
        </div>

        {/* Integration Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">Integration Instructions</h3>
          <div className="space-y-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">1. Add Razorpay to Payment Gateways</h4>
              <p>In your Saleor storefront, add Razorpay to the available payment methods:</p>
              <pre className="bg-blue-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`const paymentGateways = [
  // ... existing gateways
  {
    id: "razorpay.payment.gateway",
    name: "Razorpay",
    config: {} // Will be populated by webhook
  }
];`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">2. Render Widget in Checkout</h4>
              <p>When user selects Razorpay, render our widget component:</p>
              <pre className="bg-blue-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`{selectedGateway === "razorpay.payment.gateway" && (
  <RazorpayCheckoutWidget 
    amount={checkout.totalPrice.gross.amount}
    currency={checkout.totalPrice.gross.currency}
    checkoutId={checkout.id}
    onSuccess={handlePaymentSuccess}
    onError={handlePaymentError}
  />
)}`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. Handle Payment Callbacks</h4>
              <p>The widget will automatically handle payment processing and communicate with Saleor via webhooks.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 