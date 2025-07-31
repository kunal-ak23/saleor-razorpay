# Razorpay Payment App for Saleor

This is a Saleor payment app that integrates Razorpay as a payment gateway. The app follows the same pattern as the [Saleor Dummy Payment App](https://github.com/saleor/dummy-payment-app) but is specifically designed for Razorpay integration.

## Features

- ✅ Transaction initialization with Razorpay order creation
- ✅ Payment processing and capture
- ✅ Refund support
- ✅ Proper error handling and validation
- ✅ Integration with Saleor's Transactions API
- ✅ Support for both CHARGE and AUTHORIZATION flows

## Setup

### Environment Variables

Create a `.env` file with the following variables:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Run the development server:
```bash
pnpm dev
```

3. Install the app in your Saleor instance

## Usage

### Frontend Integration

The frontend should call the `transactionInitialize` mutation with Razorpay payment gateway data:

```typescript
const variables = {
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
      notes: {
        checkout_id: "Q2hlY2tvdXQ6M2UwZjU4YWYtNmFmOS00ZWMyLTg2YjktYTBiNzgyNmFlZTNj"
      },
      order_id: "Q2hlY2tvdXQ6M2UwZjU4YWYtNmFmOS00ZWMyLTg2YjktYTBiNzgyNmFlZTNj"
    }
  },
  amount: 2.00
};
```

### GraphQL Mutation

```graphql
mutation transactionInitialize($checkoutId: ID!, $action: TransactionFlowStrategyEnum, $paymentGateway: PaymentGatewayToInitialize!, $amount: PositiveDecimal) {
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
```

## Webhook Endpoints

### 1. Transaction Initialize Session (`/api/webhooks/transaction-initialize-session`)

Handles the initial transaction setup and creates a Razorpay order.

**Request Body:**
```json
{
  "id": "checkout_id",
  "action": "CHARGE",
  "amount": 2.00,
  "currency": "INR",
  "data": {
    "amount": 2.00,
    "currency": "INR",
    "customer": {
      "name": "Kunal Sharma",
      "email": "kunalsharma.ks13@gmail.com",
      "contact": "+918690149598"
    },
    "notes": {
      "checkout_id": "checkout_id"
    },
    "order_id": "checkout_id"
  }
}
```

**Response:**
```json
{
  "data": {
    "orderId": "order_xxx",
    "amount": 200,
    "currency": "INR",
    "keyId": "rzp_test_xxx",
    "customer": { ... },
    "notes": { ... }
  },
  "transaction": {
    "id": "xxx",
    "actions": ["CHARGE", "AUTHORIZATION"]
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

### 2. Transaction Process Session (`/api/webhooks/transaction-process-session`)

Handles payment processing and capture.

**Request Body:**
```json
{
  "razorpay_payment_id": "pay_xxx",
  "amount": 2.00,
  "currency": "INR"
}
```

**Response:**
```json
{
  "data": {
    "paymentId": "pay_xxx",
    "orderId": "order_xxx",
    "status": "captured",
    "method": "card",
    "amount": 2.00,
    "currency": "INR"
  },
  "transaction": {
    "id": "xxx",
    "actions": ["REFUND", "CANCEL"]
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

### 3. Payment Gateway Initialize Session (`/api/webhooks/payment-gateway-initialize-session`)

Provides payment gateway configuration.

**Response:**
```json
{
  "gatewayConfigs": [
    {
      "id": "razorpay.payment.gateway",
      "data": {
        "keyId": "rzp_test_xxx",
        "amount": 2.00,
        "currency": "INR",
        "name": "Razorpay",
        "description": "Pay securely with Razorpay",
        "supportedCurrencies": ["INR", "USD", "EUR", "GBP"],
        "supportedPaymentMethods": ["card", "netbanking", "wallet", "upi"]
      },
      "errors": []
    }
  ],
  "errors": []
}
```

## Architecture

### Core Components

1. **Validation Module** (`src/lib/validation/transaction.ts`)
   - Validates transaction data using Zod schema
   - Ensures required fields are present

2. **Razorpay Service** (`src/lib/razorpay.ts`)
   - Centralized Razorpay operations
   - Order creation, payment processing, and refund handling
   - Error handling and response formatting

3. **Webhook Handlers**
   - `transaction-initialize-session.ts`: Creates Razorpay orders
   - `transaction-process-session.ts`: Processes payments
   - `payment-gateway-initialize-session.ts`: Provides gateway config

### Data Flow

1. **Frontend** → Calls `transactionInitialize` mutation with payment gateway data
2. **Saleor** → Triggers `TRANSACTION_INITIALIZE_SESSION` webhook
3. **App** → Validates data, creates Razorpay order, returns order details
4. **Frontend** → Uses returned data to complete payment with Razorpay
5. **Frontend** → Calls `transactionProcess` mutation with payment ID
6. **Saleor** → Triggers `TRANSACTION_PROCESS_SESSION` webhook
7. **App** → Captures payment and returns success/failure status

## Error Handling

The app includes comprehensive error handling:

- **Validation Errors**: Invalid data structure or missing required fields
- **Razorpay API Errors**: Network issues, invalid credentials, etc.
- **Payment Processing Errors**: Failed captures, invalid payment IDs
- **Graceful Degradation**: Returns appropriate error responses instead of crashing

## Testing

Visit `/example-usage` to test the integration with a sample checkout.

## Environment Setup

Make sure to set up your Razorpay test credentials:

1. Create a Razorpay account
2. Get your test API keys from the dashboard
3. Add them to your `.env` file
4. Test with small amounts first

## Production Considerations

- Use production Razorpay keys
- Implement proper logging
- Add monitoring and alerting
- Consider implementing webhook signature verification
- Add rate limiting and security measures

## Support

For issues or questions, please refer to:
- [Saleor Documentation](https://docs.saleor.io/)
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Saleor Dummy Payment App](https://github.com/saleor/dummy-payment-app) 