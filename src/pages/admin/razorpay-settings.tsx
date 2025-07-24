import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface RazorpaySettings {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  isTestMode: boolean;
  supportedCurrencies: string[];
  merchantName: string;
  merchantDescription: string;
}

export default function RazorpaySettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<RazorpaySettings>({
    keyId: '',
    keySecret: '',
    webhookSecret: '',
    isTestMode: true,
    supportedCurrencies: ['INR'],
    merchantName: 'Thepla House',
    merchantDescription: 'Delicious Indian Food',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/razorpay-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/razorpay-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/test-razorpay-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyId: settings.keyId,
          keySecret: settings.keySecret,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Connection test successful!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Connection test failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection test failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Razorpay Payment Settings
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure your Razorpay payment gateway settings
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={testConnection}
                  disabled={isLoading || !settings.keyId || !settings.keySecret}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Test Connection
                </button>
              </div>
            </div>

            {message && (
              <div className={`mb-4 p-4 rounded-md ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="keyId" className="block text-sm font-medium text-gray-700">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    id="keyId"
                    value={settings.keyId}
                    onChange={(e) => setSettings({ ...settings, keyId: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="rzp_test_..."
                    required
                  />
                </div>

                <div>
                  <label htmlFor="keySecret" className="block text-sm font-medium text-gray-700">
                    Razorpay Key Secret
                  </label>
                  <input
                    type="password"
                    id="keySecret"
                    value={settings.keySecret}
                    onChange={(e) => setSettings({ ...settings, keySecret: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="••••••••••••••••"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="webhookSecret" className="block text-sm font-medium text-gray-700">
                    Webhook Secret (Optional)
                  </label>
                  <input
                    type="password"
                    id="webhookSecret"
                    value={settings.webhookSecret}
                    onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="••••••••••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="merchantName" className="block text-sm font-medium text-gray-700">
                    Merchant Name
                  </label>
                  <input
                    type="text"
                    id="merchantName"
                    value={settings.merchantName}
                    onChange={(e) => setSettings({ ...settings, merchantName: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Your Store Name"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="merchantDescription" className="block text-sm font-medium text-gray-700">
                    Merchant Description
                  </label>
                  <input
                    type="text"
                    id="merchantDescription"
                    value={settings.merchantDescription}
                    onChange={(e) => setSettings({ ...settings, merchantDescription: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Brief description of your business"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="supportedCurrencies" className="block text-sm font-medium text-gray-700">
                    Supported Currencies
                  </label>
                  <select
                    id="supportedCurrencies"
                    multiple
                    value={settings.supportedCurrencies}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      supportedCurrencies: Array.from(e.target.selectedOptions, option => option.value)
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="INR">Indian Rupee (INR)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple currencies</p>
                </div>

                <div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isTestMode"
                      checked={settings.isTestMode}
                      onChange={(e) => setSettings({ ...settings, isTestMode: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isTestMode" className="ml-2 block text-sm text-gray-700">
                      Test Mode
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Enable test mode for development and testing
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Webhook Configuration</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Configure these webhook URLs in your Razorpay dashboard:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Success:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/razorpay-success` : 'Loading...'}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Payment Failure:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/razorpay-failure` : 'Loading...'}
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 