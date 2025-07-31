# Automatic Payment Flow Implementation

## Overview

This implementation provides an **automatic payment flow** where the app handles both `transactionInitialize` and `checkoutComplete` mutations internally, making it much simpler for the frontend to integrate.

## 🎯 Key Benefits

1. **Automatic**: App handles all mutations internally
2. **Seamless**: Frontend only needs to call one endpoint
3. **Reliable**: Reduces chances of incomplete checkouts
4. **Simple**: Minimal frontend integration required

## 📁 File Structure

```
graphql/
├── mutations/
│   ├── transaction-initialize.graphql    # transactionInitialize mutation
│   └── checkout-complete.graphql         # checkoutComplete mutation
└── subscriptions/
    ├── transaction-initialize-session.graphql
    ├── transaction-process-session.graphql
    └── payment-gateway-initialize-session.graphql

src/
├── lib/
│   ├── payment-flow.ts                   # Payment flow service
│   ├── razorpay.ts                       # Razorpay operations
│   └── validation/
│       └── transaction.ts                # Data validation
└── pages/api/
    ├── complete-payment-flow.ts          # Main payment endpoint
    └── webhooks/
        ├── transaction-initialize-session.ts
        ├── transaction-process-session.ts
        └── payment-gateway-initialize-session.ts
```

## 🔄 Complete Flow

### Step 1: Initialize Payment
```typescript
// Frontend calls the app's endpoint
const response = await fetch("/api/complete-payment-flow", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    checkoutId: "Q2hlY2tvdXQ6...",
    amount: 2.00,
    currency: "INR",
    customer: {
      name: "Kunal Sharma",
      email: "kunalsharma.ks13@gmail.com",
      contact: "+918690149598"
    },
    notes: { checkout_id: "..." }
  })
});

const data = await response.json();
// Returns: { success: true, orderId: "order_xxx", transactionId: "transaction_xxx" }
```

**What happens internally:**
1. App validates the input data
2. App calls `transactionInitialize` mutation with Razorpay payment gateway data
3. App creates Razorpay order via webhook
4. App returns order details to frontend

### Step 2: Payment Success
```typescript
// Frontend calls the same endpoint with payment details
const response = await fetch("/api/complete-payment-flow", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    checkoutId: "Q2hlY2tvdXQ6...",
    paymentId: "pay_xxx",        // From Razorpay
    transactionId: "transaction_xxx"  // From step 1
  })
});

const data = await response.json();
// Returns: { success: true, order: { id: "order_xxx" } }
```

**What happens internally:**
1. App calls `transactionProcess` mutation with payment ID
2. App processes payment via webhook
3. If payment is successful, app automatically calls `checkoutComplete` mutation
4. App returns the created order

## 🎨 Frontend Integration

### React Component Example
```typescript
import React, { useState } from 'react';

const PaymentComponent = ({ checkoutId, amount }) => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  const initializePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/complete-payment-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          amount,
          currency: "INR",
          customer: {
            name: "User Name",
            email: "user@example.com",
            contact: "+919876543210"
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPaymentData(data);
        // Now show Razorpay checkout with data.orderId
        showRazorpayCheckout(data.orderId, data.transactionId);
      }
    } catch (error) {
      console.error("Payment initialization failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const showRazorpayCheckout = (orderId, transactionId) => {
    const options = {
      key: "rzp_test_xxx", // Your Razorpay key
      amount: amount * 100,
      currency: "INR",
      name: "Your Store",
      order_id: orderId,
      handler: async (response) => {
        // Payment successful - complete the flow
        await completePayment(response.razorpay_payment_id, transactionId);
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  };

  const completePayment = async (paymentId, transactionId) => {
    try {
      const response = await fetch("/api/complete-payment-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          paymentId,
          transactionId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Payment and checkout completed successfully
        window.location.href = `/success?orderId=${data.order.id}`;
      } else {
        alert("Payment failed: " + data.error);
      }
    } catch (error) {
      console.error("Payment completion failed:", error);
    }
  };

  return (
    <button onClick={initializePayment} disabled={loading}>
      {loading ? "Processing..." : "Pay Now"}
    </button>
  );
};
```

## 🔧 API Endpoint Details

### `/api/complete-payment-flow`

**Method:** POST

**Request Body (Initialize):**
```json
{
  "checkoutId": "Q2hlY2tvdXQ6...",
  "amount": 2.00,
  "currency": "INR",
  "customer": {
    "name": "Kunal Sharma",
    "email": "kunalsharma.ks13@gmail.com",
    "contact": "+918690149598"
  },
  "notes": {
    "checkout_id": "Q2hlY2tvdXQ6..."
  }
}
```

**Request Body (Payment Success):**
```json
{
  "checkoutId": "Q2hlY2tvdXQ6...",
  "paymentId": "pay_xxx",
  "transactionId": "transaction_xxx"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment processed and checkout completed successfully",
  "order": {
    "id": "order_xxx"
  },
  "paymentId": "pay_xxx"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

## 🎯 Why This Approach is Better

### Before (Manual Flow)
```typescript
// Frontend had to handle multiple mutations
const initResult = await transactionInitialize({...});
const processResult = await transactionProcess({...});
const checkoutResult = await checkoutComplete({...});
```

### After (Automatic Flow)
```typescript
// Frontend only calls one endpoint
const result = await fetch("/api/complete-payment-flow", {...});
```

### Benefits:
1. **Reduced Complexity**: Frontend doesn't need to know about multiple mutations
2. **Better Error Handling**: App handles all error scenarios internally
3. **Atomic Operations**: Either everything succeeds or everything fails
4. **Easier Testing**: Single endpoint to test
5. **Better UX**: No partial states where payment succeeds but checkout fails

## 🚀 Usage in Production

1. **Set up environment variables:**
   ```env
   RAZORPAY_KEY_ID=rzp_test_your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   ```

2. **Install the app in Saleor**

3. **Frontend integration:**
   ```typescript
   // Just two API calls for complete payment flow
   const initResult = await fetch("/api/complete-payment-flow", {...});
   const completeResult = await fetch("/api/complete-payment-flow", {...});
   ```

This approach makes the payment integration much simpler and more reliable! 🎉 