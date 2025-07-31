# Razorpay Integration Guide

This guide explains how to use the Razorpay payment gateway integration with Saleor, following the same pattern as the dummy-payment-app.

## Overview

The saleor-razorpay app provides a complete Razorpay payment gateway integration for Saleor. It includes:

- Webhook handlers for all transaction events
- Frontend components for payment integration
- Proper error handling and validation
- Transaction action management

## Webhook Handlers

The app includes the following webhook handlers:

### 1. Transaction Initialize Session (`/api/webhooks/transaction-initialize-session`)

Handles payment initialization and creates Razorpay orders.

**Request Data:**
```json
{
  "event": {
    "type": "CHARGE_SUCCESS",
    "includePspReference": true
  },
  "amount": 1000,
  "currency": "INR",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "contact": "+919999999999"
  },
  "notes": {
    "checkout_id": "checkout-123"
  }
}
```

**Response:**
```json
{
  "pspReference": "order_1234567890",
  "result": "CHARGE_SUCCESS",
  "message": "Razorpay order created successfully",
  "actions": ["REFUND", "CANCEL"],
  "amount": 1000,
  "externalUrl": "https://dashboard.razorpay.com/app/orders/order_1234567890",
  "data": {
    "orderId": "order_1234567890",
    "amount": 1000,
    "currency": "INR",
    "keyId": "rzp_test_...",
    "customer": {...},
    "notes": {...}
  }
}
```

### 2. Transaction Process Session (`/api/webhooks/transaction-process-session`)

Handles payment processing and captures payments.

**Request Data:**
```json
{
  "event": {
    "type": "CHARGE_SUCCESS",
    "includePspReference": true
  },
  "razorpay_payment_id": "pay_1234567890",
  "amount": 1000,
  "currency": "INR"
}
```

### 3. Transaction Refund Session (`/api/webhooks/transaction-refund-session`)

Handles payment refunds.

**Request Data:**
```json
{
  "event": {
    "type": "REFUND_SUCCESS",
    "includePspReference": true
  },
  "payment_id": "pay_1234567890",
  "amount": 1000,
  "currency": "INR"
}
```

### 4. Transaction Charge Requested (`/api/webhooks/transaction-charge-requested`)

Handles charge requests for authorized payments.

### 5. Transaction Cancel Requested (`/api/webhooks/transaction-cancel-requested`)

Handles payment cancellation requests.

### 6. Payment Gateway Initialize Session (`/api/webhooks/payment-gateway-initialize-session`)

Simple initialization endpoint that returns success.

## Frontend Integration

### Using the RazorpayComponent

```tsx
import { RazorpayComponent } from "@/components/RazorpayComponent";

const MyCheckoutPage = () => {
  const handlePaymentSuccess = (result: any) => {
    console.log("Payment initialized:", result);
    // Redirect to Razorpay payment page
  };

  const handlePaymentError = (error: string) => {
    console.error("Payment failed:", error);
    // Show error message to user
  };

  return (
    <RazorpayComponent
      checkoutId="checkout-123"
      amount={1000} // Amount in paise (10 INR)
      currency="INR"
      customer={{
        name: "John Doe",
        email: "john@example.com",
        contact: "+919999999999"
      }}
      onSuccess={handlePaymentSuccess}
      onError={handlePaymentError}
    />
  );
};
```

### Manual Integration

You can also integrate manually using the GraphQL mutations:

```tsx
import { useTransactionInitializeMutation } from "@/generated/graphql";

const MyPaymentComponent = () => {
  const [transactionInitialize] = useTransactionInitializeMutation();

  const handlePayment = async () => {
    try {
      const result = await transactionInitialize({
        checkoutId: "checkout-123",
        paymentGateway: {
          id: "razorpay.payment.gateway",
          data: {
            event: {
              includePspReference: true,
              type: "CHARGE_SUCCESS"
            },
            amount: 1000,
            currency: "INR",
            customer: {
              name: "John Doe",
              email: "john@example.com",
              contact: "+919999999999"
            },
            notes: {
              checkout_id: "checkout-123"
            }
          }
        }
      });

      console.log("Payment initialized:", result);
    } catch (error) {
      console.error("Payment failed:", error);
    }
  };

  return <button onClick={handlePayment}>Pay with Razorpay</button>;
};
```

## Environment Variables

Set the following environment variables:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
SALEOR_APP_TOKEN=your_saleor_app_token
SALEOR_API_URL=https://your-saleor-instance.com/graphql/
```

## Transaction Actions

The app automatically determines available transaction actions based on the event type:

- **CHARGE_SUCCESS**: `["REFUND"]`
- **CHARGE_FAILURE**: `["REFUND", "CHARGE", "CANCEL", "AUTHORIZATION"]`
- **AUTHORIZATION_SUCCESS**: `["CHARGE", "CANCEL", "AUTHORIZATION"]`
- **REFUND_SUCCESS**: `["REFUND"]`
- **CANCEL_SUCCESS**: `[]`

## Error Handling

All webhook handlers include comprehensive error handling:

1. **Validation Errors**: Invalid data is caught and returned with proper error messages
2. **Razorpay API Errors**: Network and API errors are handled gracefully
3. **Missing Data**: Required fields are validated before processing
4. **Logging**: All operations are logged for debugging

## Testing

### 1. Start the Development Server

```bash
pnpm dev
```

### 2. Install the App in Saleor

1. Go to your Saleor dashboard
2. Navigate to Apps
3. Install the Razorpay app using the manifest URL

### 3. Test the Payment Flow

1. Go to the Actions page in the app
2. Click "Make payment with Razorpay"
3. Check the console for transaction details
4. Verify webhook responses in the server logs

### 4. Test Webhooks

You can test webhooks using tools like ngrok or by triggering transactions in Saleor.

## Production Deployment

1. **Environment Variables**: Set all required environment variables
2. **Webhook URLs**: Update webhook URLs in Saleor to point to your production domain
3. **SSL**: Ensure all webhook endpoints are served over HTTPS
4. **Monitoring**: Set up monitoring for webhook failures and payment processing

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification**: Ensure webhook signatures are properly verified
2. **Razorpay API Limits**: Monitor API rate limits and implement retry logic
3. **Transaction State**: Ensure transaction states are properly managed
4. **Error Logging**: Check server logs for detailed error information

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=true
```

This will provide detailed logs for all webhook operations.

## Security Considerations

1. **API Keys**: Never expose Razorpay API keys in client-side code
2. **Webhook Verification**: Always verify webhook signatures
3. **Data Validation**: Validate all incoming data before processing
4. **Error Messages**: Don't expose sensitive information in error messages

## Support

For issues and questions:

1. Check the server logs for detailed error information
2. Verify webhook configurations in Saleor
3. Test with the dummy-payment-app for comparison
4. Review Razorpay API documentation for specific payment flows 