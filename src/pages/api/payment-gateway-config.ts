import { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, currency = 'INR', checkoutId, orderId } = req.body;

    if (!amount || !checkoutId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // Convert to paise
      currency,
      receipt: orderId || checkoutId,
      payment_capture: true,
      notes: {
        saleor_checkout_id: checkoutId,
        saleor_order_id: orderId || '',
      },
    });

    res.status(200).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      orderId: order.id,
    });
  } catch (error: any) {
    console.error('Payment gateway config error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 