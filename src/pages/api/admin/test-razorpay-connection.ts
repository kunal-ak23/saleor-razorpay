import { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyId, keySecret } = req.body;

    if (!keyId || !keySecret) {
      return res.status(400).json({ error: 'Key ID and Key Secret are required' });
    }

    // Test connection by creating a Razorpay instance
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Try to create a test order to verify credentials
    const testOrder = await razorpay.orders.create({
      amount: 100, // 1 rupee in paise
      currency: 'INR',
      receipt: 'test-connection',
      payment_capture: false,
    });

    res.status(200).json({
      success: true,
      message: 'Connection successful',
      testOrderId: testOrder.id,
    });
  } catch (error: any) {
    console.error('Razorpay connection test failed:', error);
    
    // Handle specific Razorpay errors
    if (error.error) {
      const razorpayError = error.error;
      if (razorpayError.code === 'BAD_REQUEST_ERROR') {
        return res.status(400).json({ 
          error: 'Invalid credentials. Please check your Key ID and Key Secret.' 
        });
      } else if (razorpayError.code === 'UNAUTHORIZED') {
        return res.status(401).json({ 
          error: 'Unauthorized. Please check your Razorpay credentials.' 
        });
      }
    }

    res.status(500).json({ 
      error: error.message || 'Connection test failed. Please check your credentials and try again.' 
    });
  }
} 