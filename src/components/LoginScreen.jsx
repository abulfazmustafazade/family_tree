import { useState } from 'react';
import { Users, Shield, Eye } from 'lucide-react';
import { inputCls } from './Field.jsx';

export function LoginScreen({ config, onAdminLogin, onGuestLogin }) {
  const [mode, setMode] = useState(null);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="bg-stone-50 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-sm w-full">
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-full bg-amber-600 mx-auto mb-3 flex items-center justify-center shadow-lg">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-2xl text-stone-900">Nəsil Şəcərəsi</h1>
          <p className="text-sm text-stone-500 mt-1">Ailə tarixini birgə qurun</p>
        </div>

        {!mode && (
          <div className="space-y-2">
            <button
              onClick={() => setMode('admin')}
              className="w-full p-3.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-left flex items-center gap-3 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-600/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="font-medium text-sm">Admin kimi giriş</div>
                <div className="text-[11px] text-stone-400 mt-0.5">Tam idarəetmə hüququ</div>
              </div>
            </button>

            <button
              onClick={() => setMode('guest')}
              className="w-full p-3.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-xl text-left flex items-center gap-3 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Eye className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="font-medium text-sm">Qonaq kimi giriş</div>
                <div className="text-[11px] text-stone-500 mt-0.5">Bax və düzəliş təklif et</div>
              </div>
            </button>
          </div>
        )}

        {mode === 'admin' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Admin şifrəsi</label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className={inputCls}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (config.admin_password === password) onAdminLogin();
                    else setError('Şifrə yanlışdır');
                  }
                }}
              />
            </div>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (config.admin_password === password) onAdminLogin();
                  else setError('Şifrə yanlışdır');
                }}
                className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Giriş
              </button>
              <button
                onClick={() => { setMode(null); setPassword(''); setError(''); }}
                className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm rounded-lg transition-colors"
              >
                Geri
              </button>
            </div>
          </div>
        )}

        {mode === 'guest' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Adınız</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Məsələn: Əli Məmmədov"
                className={inputCls}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && onGuestLogin(name)}
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Göndərdiyiniz təkliflərdə bu ad görünəcək
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => name.trim() && onGuestLogin(name)}
                disabled={!name.trim()}
                className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Davam et
              </button>
              <button
                onClick={() => { setMode(null); setName(''); }}
                className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm rounded-lg transition-colors"
              >
                Geri
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
