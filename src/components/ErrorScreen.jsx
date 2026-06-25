import { AlertCircle } from 'lucide-react';

export function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="bg-stone-50 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 mx-auto mb-3 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="font-serif text-xl text-stone-900 mb-2">Bağlantı xətası</h1>
        <p className="text-sm text-stone-600">{message}</p>
        <p className="text-xs text-stone-500 mt-3">
          Zəhmət olmasa, administrator ilə əlaqə saxlayın.
        </p>
      </div>
    </div>
  );
}
