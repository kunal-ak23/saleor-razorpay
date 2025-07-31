import React, { useState } from "react";
import { useMutation } from "urql";

const TRANSACTION_INITIALIZE_MUTATION = `
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
        __typename
      }
      transactionEvent {
        message
        type
        __typename
      }
      data
      errors {
        field
        code
        message
        __typename
      }
      __typename
    }
  }
`;

export default function ExampleUsage() {
  const [checkoutId, setCheckoutId] = useState("");
  const [amount, setAmount] = useState("2.00");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [transactionInitializeResult, transactionInitialize] = useMutation(TRANSACTION_INITIALIZE_MUTATION);

  const handleTransactionInitialize = async () => {
    if (!checkoutId) {
      alert("Please enter a checkout ID");
      return;
    }

    setLoading(true);
    try {
      const variables = {
        checkoutId,
        action: "CHARGE" as const,
        paymentGateway: {
          id: "razorpay.payment.gateway",
          data: {
            amount: parseFloat(amount),
            currency: "INR",
            customer: {
              contact: "+918690149598",
              email: "kunalsharma.ks13@gmail.com",
              name: "Kunal Sharma"
            },
            notes: {
              checkout_id: checkoutId
            },
            order_id: checkoutId
          }
        },
        amount: parseFloat(amount)
      };

      const result = await transactionInitialize(variables);
      setResult(result);
    } catch (error) {
      console.error("Transaction initialize error:", error);
      setResult({ error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Razorpay Payment App - Example Usage</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <h2>Transaction Initialize Example</h2>
        <p>This example shows how to call the transactionInitialize mutation with Razorpay payment gateway data.</p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label>
          Checkout ID:
          <input
            type="text"
            value={checkoutId}
            onChange={(e) => setCheckoutId(e.target.value)}
            placeholder="Enter checkout ID"
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label>
          Amount (INR):
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>
      </div>

      <button
        onClick={handleTransactionInitialize}
        disabled={loading}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Processing..." : "Initialize Transaction"}
      </button>

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h3>Result:</h3>
          <pre style={{ 
            backgroundColor: "#f5f5f5", 
            padding: "10px", 
            borderRadius: "4px",
            overflow: "auto",
            maxHeight: "400px"
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: "40px" }}>
        <h2>How it works:</h2>
        <ol>
          <li>The frontend calls <code>transactionInitialize</code> mutation with Razorpay payment gateway data</li>
          <li>The app receives the webhook at <code>/api/webhooks/transaction-initialize-session</code></li>
          <li>The app creates a Razorpay order and returns the order details</li>
          <li>The frontend can then use the returned data to complete the payment with Razorpay</li>
        </ol>

        <h3>Expected Response Structure:</h3>
        <pre style={{ backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
{`{
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
}`}
        </pre>
      </div>
    </div>
  );
} 