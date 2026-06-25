import { useState } from 'react';
import { Shield } from 'lucide-react';
import { inputCls } from './Field.jsx';

export function SetupScreen({ onSetup, busy }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (password.length < 4) return setError('Şifrə ən azı 4 simvol olmalıdır');
    if (password !== confirm) return setError('Şifrələr uyğun gəlmir');
    setError('');
    onSetup(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="bg-stone-50 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-sm w-full">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-amber-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-2xl text-stone-900">Admin təyin et</h1>
          <p className="text-sm text-stone-500 mt-1">
            Tətbiq ilk dəfə işə salınır. Admin şifrəsini təyin edin.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-600 mb-1 block">Admin şifrəsi</label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Ən azı 4 simvol"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 mb-1 block">Şifrəni təkrarla</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              placeholder="Şifrənizi yenidən daxil edin"
              className={inputCls}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy || !password || !confirm}
            className="w-full px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? 'Saxlanılır...' : 'Tamamla'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-stone-100 border border-stone-200 rounded-lg text-[11px] text-stone-600">
          <strong>Qeyd:</strong> Bu şifrəni yadda saxlayın. Ailə ağacını idarə etmək üçün lazım olacaq.
        </div>
      </div>
    </div>
  );
}
