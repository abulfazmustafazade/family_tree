import { Edit3, Calendar, FileText } from 'lucide-react';
import { fmtDate } from '../lib/helpers.js';

export function PersonDetail({ person, people, role, onEdit, onClose }) {
  if (!person) return null;
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const father = person.fatherId ? byId[person.fatherId] : null;
  const mother = person.motherId ? byId[person.motherId] : null;
  const spouse = person.spouseId ? byId[person.spouseId] : null;
  const children = people.filter(
    (p) => p.fatherId === person.id || p.motherId === person.id
  );

  return (
    <div className="space-y-4">
      <div
        className={`p-4 rounded-lg ${
          person.gender === 'female'
            ? 'bg-rose-50 border border-rose-200'
            : 'bg-emerald-50 border border-emerald-200'
        }`}
      >
        <h2 className="font-serif text-xl text-stone-900">
          {person.firstName} {person.lastName}
        </h2>
        {person.maidenName && (
          <div className="text-sm text-stone-600 italic">(qız soyadı: {person.maidenName})</div>
        )}
        <div className="mt-2 space-y-1 text-sm text-stone-700">
          {person.birthDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Doğum: {fmtDate(person.birthDate)}
              {person.birthPlace && `, ${person.birthPlace}`}
            </div>
          )}
          {!person.isAlive && person.deathDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Vəfat: {fmtDate(person.deathDate)}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {father && (
          <div>
            <span className="text-stone-500">Atası:</span>{' '}
            <span className="text-stone-800">
              {father.firstName} {father.lastName}
            </span>
          </div>
        )}
        {mother && (
          <div>
            <span className="text-stone-500">Anası:</span>{' '}
            <span className="text-stone-800">
              {mother.firstName} {mother.lastName}
            </span>
          </div>
        )}
        {spouse && (
          <div>
            <span className="text-stone-500">Həyat yoldaşı:</span>{' '}
            <span className="text-stone-800">
              {spouse.firstName} {spouse.lastName}
            </span>
          </div>
        )}
        {children.length > 0 && (
          <div>
            <span className="text-stone-500">Övladları ({children.length}):</span>
            <ul className="ml-4 mt-1 list-disc text-stone-800">
              {children.map((c) => (
                <li key={c.id}>
                  {c.firstName} {c.lastName}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {person.notes && (
        <div className="p-3 bg-stone-50 rounded border border-stone-200 text-sm text-stone-700">
          <div className="text-xs text-stone-500 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Qeydlər
          </div>
          {person.notes}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onEdit(person)}
          className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          {role === 'admin' ? 'Düzəliş et' : 'Düzəliş təklif et'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-medium rounded-md"
        >
          Bağla
        </button>
      </div>
    </div>
  );
}
