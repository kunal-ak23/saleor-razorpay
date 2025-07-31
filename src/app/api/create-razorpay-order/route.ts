import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, checkoutId, customerEmail, customerName, customerPhone } = await request.json();

    if (!amount || !currency || !checkoutId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create a shorter receipt ID (max 40 characters for Razorpay)
    const receiptId = checkoutId.length > 40 
      ? crypto.createHash('md5').update(checkoutId).digest('hex').substring(0, 40)
      : checkoutId;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // Convert to paise
      currency,
      receipt: receiptId, // Use truncated/hashed receipt ID
      payment_capture: true,
      notes: {
        checkout_id: checkoutId, // Store full checkout ID in notes
        customer_email: customerEmail,
        customer_name: customerName,
        customer_phone: customerPhone,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount, // This is already in paise
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Razorpay order creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
} 