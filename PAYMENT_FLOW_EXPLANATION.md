# Payment Flow: How Users Get the Payment Screen

## Overview

When a charge is successful, the user gets the payment screen through a multi-step process involving the frontend, Saleor, and Razorpay. Here's the complete flow:

## 🔄 Complete Payment Flow

### Step 1: Frontend Initiates Payment
```typescript
// Frontend calls transactionInitialize mutation
const result = await transactionInitialize({
  checkoutId: "Q2hlY2tvdXQ6M2UwZjU4YWYtNmFmOS00ZWMyLTg2YjktYTBiNzgyNmFlZTNj",
  action: "CHARGE",
  paymentGateway: {
    id: "razorpay.payment.gateway",
    data: {
      amount: 2.00,
      currency: "INR",
      customer: {
        contact: "+918690149598",
        email: "kunalsharma.ks13@gmail.com",
        name: "Kunal Sharma"
      },
      notes: { checkout_id: "..." },
      order_id: "..."
    }
  },
  amount: 2.00
});
```

### Step 2: Saleor Triggers Webhook
Saleor receives the mutation and triggers the `TRANSACTION_INITIALIZE_SESSION` webhook to your app.

### Step 3: App Creates Razorpay Order
Your app receives the webhook and creates a Razorpay order:

```typescript
// App response to webhook
{
  "data": {
    "orderId": "order_xxx",
    "amount": 200, // in paise
    "currency": "INR",
    "keyId": "rzp_test_xxx",
    "customer": { ... },
    "notes": { ... }
  },
  "transactionEvent": {
    "type": "CHARGE_REQUEST",
    "pspReference": "order_xxx",
    "message": "Razorpay order created successfully",
    "amount": { "amount": 2.00, "currency": "INR" },
    "externalUrl": "https://dashboard.razorpay.com/app/orders/xxx"
  }
}
```

### Step 4: Frontend Receives Order Details
The frontend receives the response with Razorpay order details and can now show the payment screen.

## 🖥️ How the Payment Screen is Displayed

### Option 1: Razorpay Checkout (Recommended)
The frontend uses the returned data to initialize Razorpay's checkout:

```typescript
// Frontend code after receiving order details
const options = {
  key: result.data.keyId, // "rzp_test_xxx"
  amount: result.data.amount, // 200 (in paise)
  currency: result.data.currency, // "INR"
  name: "Your Store Name",
  description: "Order Payment",
  order_id: result.data.orderId, // "order_xxx"
  handler: function (response: any) {
    // Payment successful
    console.log("Payment ID:", response.razorpay_payment_id);
    
    // Call transactionProcess mutation
    transactionProcess({
      id: result.transaction.id,
      data: {
        razorpay_payment_id: response.razorpay_payment_id
      }
    });
  },
  prefill: {
    name: result.data.customer.name,
    email: result.data.customer.email,
    contact: result.data.customer.contact
  },
  notes: result.data.notes
};

const rzp = new Razorpay(options);
rzp.open();
```

### Option 2: Custom Payment UI
The frontend can also create a custom payment form using the order details:

```typescript
// Custom payment form
const paymentForm = {
  orderId: result.data.orderId,
  amount: result.data.amount,
  currency: result.data.currency,
  keyId: result.data.keyId
};

// Show custom payment form to user
showPaymentForm(paymentForm);
```

## 🎯 What Happens When Charge is Successful

### 1. User Completes Payment
- User enters payment details in Razorpay checkout
- Razorpay processes the payment
- Payment is successful

### 2. Frontend Receives Payment Response
```typescript
// Razorpay handler callback
handler: function (response) {
  // response.razorpay_payment_id contains the payment ID
  // response.razorpay_order_id contains the order ID
  // response.razorpay_signature contains the signature
  
  // Verify payment signature (recommended)
  const isValid = verifyPaymentSignature(response);
  
  if (isValid) {
    // Call transactionProcess mutation
    processPayment(response.razorpay_payment_id);
  }
}
```

### 3. Frontend Calls transactionProcess
```typescript
const processPayment = async (paymentId: string) => {
  const result = await transactionProcess({
    id: transactionId, // from previous transactionInitialize response
    data: {
      razorpay_payment_id: paymentId,
      amount: 2.00,
      currency: "INR"
    }
  });
  
  if (result.data?.transactionEvent?.type === "CHARGE_SUCCESS") {
    // Payment successful - redirect to success page
    window.location.href = "/payment-success";
  } else {
    // Payment failed
    showError("Payment failed");
  }
};
```

### 4. App Processes Payment
Your app receives the `TRANSACTION_PROCESS_SESSION` webhook and:

```typescript
// App processes the payment
const paymentResult = await RazorpayService.processPayment({
  paymentId: "pay_xxx",
  amount: 2.00,
  currency: "INR"
});

// Returns success response
{
  "data": {
    "paymentId": "pay_xxx",
    "orderId": "order_xxx",
    "status": "captured",
    "method": "card",
    "amount": 2.00,
    "currency": "INR"
  },
  "transactionEvent": {
    "type": "CHARGE_SUCCESS",
    "pspReference": "pay_xxx",
    "message": "Payment captured successfully",
    "amount": { "amount": 2.00, "currency": "INR" },
    "externalUrl": "https://dashboard.razorpay.com/app/payments/pay_xxx"
  }
}
```

### 5. User Sees Success Screen
The frontend receives the success response and shows the payment success screen.

## 🎨 Frontend Implementation Examples

### React Component Example
```typescript
import React, { useState } from 'react';
import { useMutation } from 'urql';

const PaymentComponent = ({ checkoutId, amount }) => {
  const [loading, setLoading] = useState(false);
  
  const [transactionInitialize] = useMutation(TRANSACTION_INITIALIZE_MUTATION);
  const [transactionProcess] = useMutation(TRANSACTION_PROCESS_MUTATION);
  
  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // Step 1: Initialize transaction
      const initResult = await transactionInitialize({
        checkoutId,
        action: "CHARGE",
        paymentGateway: {
          id: "razorpay.payment.gateway",
          data: {
            amount,
            currency: "INR",
            customer: {
              name: "User Name",
              email: "user@example.com",
              contact: "+919876543210"
            }
          }
        },
        amount
      });
      
      if (initResult.data?.transactionInitialize?.data) {
        const orderData = initResult.data.transactionInitialize.data;
        
        // Step 2: Show Razorpay checkout
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Your Store",
          order_id: orderData.orderId,
          handler: async (response: any) => {
            // Step 3: Process payment
            const processResult = await transactionProcess({
              id: initResult.data.transactionInitialize.transaction.id,
              data: {
                razorpay_payment_id: response.razorpay_payment_id
              }
            });
            
            if (processResult.data?.transactionProcess?.transactionEvent?.type === "CHARGE_SUCCESS") {
              // Success - redirect or show success message
              window.location.href = "/success";
            }
          }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? "Processing..." : "Pay Now"}
    </button>
  );
};
```

## 🔧 Configuration Required

### 1. Razorpay Script
Add Razorpay script to your HTML:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 2. Environment Variables
```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### 3. Frontend Dependencies
```bash
npm install razorpay
# or
yarn add razorpay
```

## 🎯 Key Points

1. **The app doesn't directly show the payment screen** - it provides the data needed for the frontend to show it
2. **Frontend is responsible for the UI** - using Razorpay's checkout or custom forms
3. **App handles the backend logic** - order creation, payment processing, webhook responses
4. **Two-step process** - initialize → show payment screen → process payment
5. **Success handling** - frontend receives success response and shows success screen

This architecture separates concerns properly: the app handles payment logic, while the frontend handles user experience and payment UI. 