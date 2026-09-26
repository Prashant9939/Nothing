import { useEffect, useState, type ReactNode } from 'react';
import { WifiOff, RotateCcw } from 'lucide-react';

function OfflineScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
          <WifiOff size={36} className="text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">You are currently offline</h1>
        <p className="mt-3 text-gray-500">
          Please check your internet connection. The app will resume automatically once you're back online.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <RotateCcw size={16} /> Try Again
        </button>
      </div>
    </div>
  );
}

export default function OfflineGate({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {children}
      {!online && <OfflineScreen />}
    </>
  );
}
