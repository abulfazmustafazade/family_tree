import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Field, inputCls } from './Field.jsx';

export function PersonForm({ person, people, onSave, onCancel, onDelete, canDelete }) {
  const [form, setForm] = useState(() => ({
    firstName: person?.firstName || '',
    lastName: person?.lastName || '',
    maidenName: person?.maidenName || '',
    gender: person?.gender || 'male',
    birthDate: person?.birthDate || '',
    deathDate: person?.deathDate || '',
    isAlive: person?.isAlive ?? true,
    birthPlace: person?.birthPlace || '',
    fatherId: person?.fatherId || '',
    motherId: person?.motherId || '',
    spouseId: person?.spouseId || '',
    notes: person?.notes || '',
  }));

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const fathers = people.filter((p) => p.gender === 'male' && p.id !== person?.id);
  const mothers = people.filter((p) => p.gender === 'female' && p.id !== person?.id);
  const spouses = people.filter((p) => p.gender !== form.gender && p.id !== person?.id);

  const submit = () => {
    if (!form.firstName.trim()) return;
    onSave({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      maidenName: form.maidenName.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      deathDate: form.isAlive ? '' : form.deathDate,
      isAlive: form.isAlive,
      birthPlace: form.birthPlace.trim(),
      fatherId: form.fatherId || null,
      motherId: form.motherId || null,
      spouseId: form.spouseId || null,
      notes: form.notes.trim(),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Ad *">
          <input
            className={inputCls}
            value={form.firstName}
            onChange={(e) => update({ firstName: e.target.value })}
            placeholder="Əli"
          />
        </Field>
        <Field label="Soyad">
          <input
            className={inputCls}
            value={form.lastName}
            onChange={(e) => update({ lastName: e.target.value })}
            placeholder="Məmmədov"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Cins">
          <select
            className={inputCls}
            value={form.gender}
            onChange={(e) => update({ gender: e.target.value, spouseId: '' })}
          >
            <option value="male">Kişi</option>
            <option value="female">Qadın</option>
          </select>
        </Field>
        {form.gender === 'female' && (
          <Field label="Qız soyadı">
            <input
              className={inputCls}
              value={form.maidenName}
              onChange={(e) => update({ maidenName: e.target.value })}
              placeholder="Quliyeva"
            />
          </Field>
        )}
      </div>

      <Field label="Doğum tarixi">
        <input
          type="date"
          className={inputCls}
          value={form.birthDate}
          onChange={(e) => update({ birthDate: e.target.value })}
        />
      </Field>

      <Field label="Doğulduğu yer">
        <input
          className={inputCls}
          value={form.birthPlace}
          onChange={(e) => update({ birthPlace: e.target.value })}
          placeholder="Bakı"
        />
      </Field>

      <div className="flex items-center gap-2 py-1">
        <input
          type="checkbox"
          id="alive"
          checked={form.isAlive}
          onChange={(e) => update({ isAlive: e.target.checked })}
          className="rounded w-4 h-4"
        />
        <label htmlFor="alive" className="text-sm text-stone-700 select-none">
          Sağdır
        </label>
      </div>

      {!form.isAlive && (
        <Field label="Vəfat tarixi">
          <input
            type="date"
            className={inputCls}
            value={form.deathDate}
            onChange={(e) => update({ deathDate: e.target.value })}
          />
        </Field>
      )}

      <div className="pt-2 border-t border-stone-200">
        <div className="text-xs font-medium text-stone-600 mb-2">Ailə bağları</div>
        <div className="space-y-3">
          <Field label="Atası">
            <select
              className={inputCls}
              value={form.fatherId}
              onChange={(e) => update({ fatherId: e.target.value })}
            >
              <option value="">— seçilməyib —</option>
              {fathers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Anası">
            <select
              className={inputCls}
              value={form.motherId}
              onChange={(e) => update({ motherId: e.target.value })}
            >
              <option value="">— seçilməyib —</option>
              {mothers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} {p.maidenName ? `(${p.maidenName})` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Həyat yoldaşı">
            <select
              className={inputCls}
              value={form.spouseId}
              onChange={(e) => update({ spouseId: e.target.value })}
            >
              <option value="">— seçilməyib —</option>
              {spouses.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <Field label="Qeydlər">
        <textarea
          className={inputCls}
          rows={3}
          value={form.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Peşə, maraqlı faktlar..."
        />
      </Field>

      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-stone-200">
        <button
          onClick={submit}
          disabled={!form.firstName.trim()}
          className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Yadda saxla
        </button>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-medium rounded-md"
          >
            Ləğv et
          </button>
          {canDelete && person && (
            <button
              onClick={() => onDelete(person.id)}
              className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
