'use client';

import { useEffect, useState } from 'react';
import { Wifi, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block p-4 bg-emerald-100 rounded-full mb-4">
            <Wifi className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Back Online! 🎉</h1>
          <p className="text-slate-600 mb-6">Your connection has been restored.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          <div className="inline-block p-4 bg-red-100 rounded-full mb-4 animate-pulse">
            <Wifi className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">No Connection</h1>
          <p className="text-slate-300 mb-8">You're currently offline, but don't worry!</p>

          <div className="bg-slate-800 rounded-lg p-6 mb-6 text-left space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-2">📚 What you can do offline:</h3>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>✅ View cached chat history</li>
                <li>✅ Check previous recommendations</li>
                <li>✅ Review order history</li>
                <li>✅ Access saved bookmarks</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">📱 What requires connection:</h3>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>❌ New AI search queries</li>
                <li>❌ WhatsApp sharing</li>
                <li>❌ Payment processing</li>
                <li>❌ Real-time updates</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Try Reconnecting
            </button>
            <Link
              href="/"
              className="block px-6 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors text-center"
            >
              Continue Offline
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
