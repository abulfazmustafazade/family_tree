import { Check, X } from 'lucide-react';
import { fmtDate } from '../lib/helpers.js';

export function PendingPanel({ pending, people, onApprove, onReject }) {
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));

  if (!pending.length) {
    return (
      <div className="text-center text-stone-500 py-8">
        <Check className="w-12 h-12 mx-auto mb-3 text-stone-300" />
        <p>Gözləyən təsdiq yoxdur</p>
      </div>
    );
  }

  const describe = (req) => {
    if (req.type === 'add') return `Yeni şəxs: ${req.data.firstName} ${req.data.lastName}`;
    if (req.type === 'edit') {
      const orig = byId[req.targetId];
      return `${orig?.firstName || '?'} ${orig?.lastName || ''} — düzəliş`;
    }
  };

  const formatChanges = (req) => {
    if (req.type === 'add') {
      const d = req.data;
      return (
        <div className="text-xs text-stone-600 space-y-0.5">
          <div>Ad: {d.firstName} {d.lastName}</div>
          {d.birthDate && <div>Doğum: {fmtDate(d.birthDate)}</div>}
          {d.deathDate && <div>Vəfat: {fmtDate(d.deathDate)}</div>}
          {d.birthPlace && <div>Yer: {d.birthPlace}</div>}
        </div>
      );
    }
    if (req.type === 'edit') {
      const orig = byId[req.targetId] || {};
      const changes = [];
      const fields = {
        firstName: 'Ad',
        lastName: 'Soyad',
        birthDate: 'Doğum',
        deathDate: 'Vəfat',
        birthPlace: 'Yer',
        notes: 'Qeyd',
      };
      Object.entries(fields).forEach(([k, lbl]) => {
        if ((orig[k] || '') !== (req.data[k] || '')) {
          const showOld =
            k === 'birthDate' || k === 'deathDate' ? fmtDate(orig[k]) : orig[k];
          const showNew =
            k === 'birthDate' || k === 'deathDate' ? fmtDate(req.data[k]) : req.data[k];
          changes.push(
            <div key={k}>
              {lbl}:{' '}
              <span className="line-through text-stone-400">{showOld || '—'}</span> →{' '}
              <span className="text-amber-700">{showNew || '—'}</span>
            </div>
          );
        }
      });
      return (
        <div className="text-xs space-y-0.5">
          {changes.length ? (
            changes
          ) : (
            <div className="text-stone-500">Bağlantı dəyişiklikləri</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {pending.map((req) => (
        <div key={req.id} className="border border-amber-200 bg-amber-50/50 rounded-lg p-3">
          <div className="mb-2">
            <div className="font-medium text-sm text-stone-800">{describe(req)}</div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {req.submittedBy} • {new Date(req.timestamp).toLocaleString('az-AZ')}
            </div>
          </div>
          <div className="bg-white rounded p-2 mb-2 border border-stone-200">
            {formatChanges(req)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(req)}
              className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Təsdiqlə
            </button>
            <button
              onClick={() => onReject(req.id)}
              className="flex-1 px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium rounded flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Rədd et
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
