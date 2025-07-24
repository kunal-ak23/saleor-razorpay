import { NextApiRequest, NextApiResponse } from 'next';

// In a real app, you'd store this in a database
// For now, we'll use environment variables and a simple in-memory store
let settings = {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: '',
  isTestMode: true,
  supportedCurrencies: ['INR'],
  merchantName: 'Thepla House',
  merchantDescription: 'Delicious Indian Food',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return settings without sensitive data
    const { keySecret, ...safeSettings } = settings;
    res.status(200).json({
      ...safeSettings,
      keySecret: keySecret ? '••••••••••••••••' : '',
    });
  } else if (req.method === 'POST') {
    try {
      const newSettings = req.body;
      
      // Validate required fields
      if (!newSettings.keyId || !newSettings.keySecret) {
        return res.status(400).json({ error: 'Key ID and Key Secret are required' });
      }

      // Update settings
      settings = {
        ...settings,
        ...newSettings,
      };

      // In a real app, you'd save to database here
      console.log('Settings updated:', { ...settings, keySecret: '••••••••••••••••' });

      res.status(200).json({ message: 'Settings saved successfully' });
    } catch (error) {
      console.error('Error saving settings:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 