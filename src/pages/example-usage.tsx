import React, { useState } from "react";

export default function ExampleUsage() {
  const [checkoutId, setCheckoutId] = useState("");
  const [amount, setAmount] = useState("2.00");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  const handlePaymentInitialize = async () => {
    if (!checkoutId) {
      alert("Please enter a checkout ID");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/complete-payment-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkoutId,
          amount: parseFloat(amount),
          currency: "INR",
          customer: {
            contact: "+918690149598",
            email: "kunalsharma.ks13@gmail.com",
            name: "Kunal Sharma"
          },
          notes: {
            checkout_id: checkoutId
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPaymentData(data);
        setResult({ type: "initialize", data });
      } else {
        setResult({ type: "error", error: data.error });
      }
    } catch (error) {
      console.error("Payment initialize error:", error);
      setResult({ type: "error", error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!paymentData?.transactionId) {
      alert("Please initialize payment first");
      return;
    }

    setLoading(true);
    try {
      // Simulate payment success with a mock payment ID
      const mockPaymentId = "pay_" + Math.random().toString(36).substr(2, 9);
      
      const response = await fetch("/api/complete-payment-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkoutId,
          paymentId: mockPaymentId,
          transactionId: paymentData.transactionId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult({ type: "success", data });
      } else {
        setResult({ type: "error", error: data.error });
      }
    } catch (error) {
      console.error("Payment success error:", error);
      setResult({ type: "error", error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Razorpay Payment App - Complete Flow Example</h1>
      
      <div style={{ marginBottom: "20px" }}>
        <h2>Step 1: Initialize Payment</h2>
        <p>This step creates a Razorpay order and prepares the payment flow.</p>
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
        onClick={handlePaymentInitialize}
        disabled={loading}
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          marginRight: "10px"
        }}
      >
        {loading ? "Processing..." : "Initialize Payment"}
      </button>

      {paymentData && (
        <div style={{ marginTop: "30px" }}>
          <h2>Step 2: Simulate Payment Success</h2>
          <p>After payment initialization, simulate a successful payment to complete the checkout automatically.</p>
          
          <button
            onClick={handlePaymentSuccess}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Processing..." : "Simulate Payment Success"}
          </button>
        </div>
      )}

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
        <h2>How the Automatic Payment Flow Works:</h2>
        <ol>
          <li><strong>Initialize Payment:</strong> Frontend calls <code>/api/complete-payment-flow</code> with checkout data</li>
          <li><strong>App Creates Order:</strong> App calls <code>transactionInitialize</code> mutation and creates Razorpay order</li>
          <li><strong>Payment Success:</strong> When payment is successful, frontend calls the same endpoint with payment details</li>
          <li><strong>Automatic Completion:</strong> App automatically calls <code>transactionProcess</code> and <code>checkoutComplete</code> mutations</li>
          <li><strong>Order Created:</strong> Saleor creates the order and the payment flow is complete</li>
        </ol>

        <h3>Benefits of This Approach:</h3>
        <ul>
          <li><strong>Automatic:</strong> No need for frontend to handle multiple mutations</li>
          <li><strong>Seamless:</strong> App handles the complete payment flow internally</li>
          <li><strong>Reliable:</strong> Reduces chances of incomplete checkouts</li>
          <li><strong>Simple:</strong> Frontend only needs to call one endpoint</li>
        </ul>

        <h3>API Endpoint Usage:</h3>
        <pre style={{ backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
{`// Step 1: Initialize Payment
POST /api/complete-payment-flow
{
  "checkoutId": "Q2hlY2tvdXQ6...",
  "amount": 2.00,
  "currency": "INR",
  "customer": {
    "name": "Kunal Sharma",
    "email": "kunalsharma.ks13@gmail.com",
    "contact": "+918690149598"
  }
}

// Step 2: Payment Success (called by frontend after Razorpay payment)
POST /api/complete-payment-flow
{
  "checkoutId": "Q2hlY2tvdXQ6...",
  "paymentId": "pay_xxx",
  "transactionId": "transaction_xxx"
}`}
        </pre>
      </div>
    </div>
  );
} 