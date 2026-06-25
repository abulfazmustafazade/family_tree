import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Users, UserPlus, Edit3, Trash2, Check, X, LogOut, Shield, Eye, Calendar, FileText, Bell, Search, Plus, Minus, AlertCircle, Database, RefreshCw } from 'lucide-react';

// ============================================================
// BURAYA SUPABASE MƏLUMATLARINIZI YAZIN
// supabase.com → Layihəniz → Settings → API
// ============================================================
const SUPABASE_URL = 'https://xfjiypgvvfwlzlrpguhl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aVNo7P6LtlhJFVHHgp2msQ_f1N4oPU8';
// ============================================================

// ============ SUPABASE CLIENT (loaded dynamically) ============
let supabaseClient = null;
async function initSupabase() {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.0');
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

const db = {
  async getConfig() {
    const { data, error } = await supabaseClient.from('family_config').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    return data;
  },
  async setConfig(adminPassword) {
    const { error } = await supabaseClient.from('family_config').upsert({ id: 1, admin_password: adminPassword });
    if (error) throw error;
  },
  async listPeople() {
    const { data, error } = await supabaseClient.from('family_people').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToPerson);
  },
  async upsertPerson(p) {
    const { error } = await supabaseClient.from('family_people').upsert(personToRow(p));
    if (error) throw error;
  },
  async updatePersonSpouse(id, spouseId) {
    const { error } = await supabaseClient.from('family_people').update({ spouse_id: spouseId, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
  async deletePerson(id) {
    await supabaseClient.from('family_people').update({ father_id: null }).eq('father_id', id);
    await supabaseClient.from('family_people').update({ mother_id: null }).eq('mother_id', id);
    await supabaseClient.from('family_people').update({ spouse_id: null }).eq('spouse_id', id);
    const { error } = await supabaseClient.from('family_people').delete().eq('id', id);
    if (error) throw error;
  },
  async listPending() {
    const { data, error } = await supabaseClient.from('family_pending').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id, type: r.type, targetId: r.target_id, data: r.data, submittedBy: r.submitted_by, timestamp: r.created_at
    }));
  },
  async addPending(req) {
    const { error } = await supabaseClient.from('family_pending').insert({
      id: req.id, type: req.type, target_id: req.targetId, data: req.data, submitted_by: req.submittedBy
    });
    if (error) throw error;
  },
  async deletePending(id) {
    const { error } = await supabaseClient.from('family_pending').delete().eq('id', id);
    if (error) throw error;
  }
};

const rowToPerson = (r) => ({
  id: r.id,
  firstName: r.first_name || '',
  lastName: r.last_name || '',
  maidenName: r.maiden_name || '',
  gender: r.gender || 'male',
  birthDate: r.birth_date || '',
  deathDate: r.death_date || '',
  isAlive: r.is_alive ?? true,
  birthPlace: r.birth_place || '',
  fatherId: r.father_id || null,
  motherId: r.mother_id || null,
  spouseId: r.spouse_id || null,
  notes: r.notes || ''
});

const personToRow = (p) => ({
  id: p.id,
  first_name: p.firstName,
  last_name: p.lastName || null,
  maiden_name: p.maidenName || null,
  gender: p.gender,
  birth_date: p.birthDate || null,
  death_date: p.deathDate || null,
  is_alive: p.isAlive,
  birth_place: p.birthPlace || null,
  father_id: p.fatherId || null,
  mother_id: p.motherId || null,
  spouse_id: p.spouseId || null,
  notes: p.notes || null,
  updated_at: new Date().toISOString()
});

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const fmtDate = (d) => {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return d;
};

// ============ TREE LAYOUT ============
function buildTreeLayout(people) {
  if (!people.length) return { nodes: [], links: [], width: 0, height: 0, NODE_W: 170, NODE_H: 88 };
  const byId = Object.fromEntries(people.map(p => [p.id, p]));
  const NODE_W = 170, NODE_H = 88, H_GAP = 24, V_GAP = 110;

  const gen = {};
  const visiting = new Set();
  const calcGen = (id) => {
    if (gen[id] !== undefined) return gen[id];
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const p = byId[id];
    if (!p) return 0;
    const f = p.fatherId && byId[p.fatherId] ? calcGen(p.fatherId) + 1 : null;
    const m = p.motherId && byId[p.motherId] ? calcGen(p.motherId) + 1 : null;
    const g = Math.max(f ?? 0, m ?? 0);
    visiting.delete(id);
    gen[id] = g;
    return g;
  };
  people.forEach(p => calcGen(p.id));
  people.forEach(p => {
    if (p.spouseId && byId[p.spouseId]) {
      const mx = Math.max(gen[p.id], gen[p.spouseId]);
      gen[p.id] = mx;
      gen[p.spouseId] = mx;
    }
  });

  const placed = new Set();
  const units = [];
  const sortedPeople = [...people].sort((a, b) => gen[a.id] - gen[b.id]);
  sortedPeople.forEach(p => {
    if (placed.has(p.id)) return;
    if (p.spouseId && byId[p.spouseId] && !placed.has(p.spouseId)) {
      units.push({ ids: [p.id, p.spouseId], gen: gen[p.id] });
      placed.add(p.id); placed.add(p.spouseId);
    } else {
      units.push({ ids: [p.id], gen: gen[p.id] });
      placed.add(p.id);
    }
  });

  const byGen = {};
  units.forEach(u => { (byGen[u.gen] = byGen[u.gen] || []).push(u); });
  const maxGen = Math.max(...Object.keys(byGen).map(Number), 0);

  const unitWidth = (u) => u.ids.length * NODE_W + (u.ids.length - 1) * 10;

  for (let g = maxGen; g >= 0; g--) {
    const row = byGen[g] || [];
    let cursor = 0;
    row.forEach(u => {
      const childUnits = units.filter(cu => cu.gen === g + 1 && cu.ids.some(cid => {
        const c = byId[cid];
        return u.ids.includes(c.fatherId) || u.ids.includes(c.motherId);
      }));
      if (childUnits.length && childUnits.every(cu => cu.x !== undefined)) {
        const minX = Math.min(...childUnits.map(cu => cu.x));
        const maxX = Math.max(...childUnits.map(cu => cu.x + unitWidth(cu)));
        const desired = (minX + maxX) / 2 - unitWidth(u) / 2;
        u.x = Math.max(cursor, desired);
      } else {
        u.x = cursor;
      }
      cursor = u.x + unitWidth(u) + H_GAP;
    });
    for (let i = 1; i < row.length; i++) {
      const prev = row[i - 1], cur = row[i];
      const minStart = prev.x + unitWidth(prev) + H_GAP;
      if (cur.x < minStart) cur.x = minStart;
    }
  }

  const nodes = [];
  units.forEach(u => {
    const y = u.gen * V_GAP;
    u.ids.forEach((id, idx) => {
      nodes.push({ id, x: u.x + idx * (NODE_W + 10), y, person: byId[id] });
    });
  });

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));
  const links = [];
  people.forEach(p => {
    const child = nodeById[p.id];
    if (!child) return;
    const father = p.fatherId ? nodeById[p.fatherId] : null;
    const mother = p.motherId ? nodeById[p.motherId] : null;
    if (father && mother) {
      const midX = (father.x + mother.x) / 2 + NODE_W / 2;
      const midY = father.y + NODE_H;
      links.push({ type: 'parent', x1: midX, y1: midY, x2: child.x + NODE_W / 2, y2: child.y });
    } else if (father) {
      links.push({ type: 'parent', x1: father.x + NODE_W / 2, y1: father.y + NODE_H, x2: child.x + NODE_W / 2, y2: child.y });
    } else if (mother) {
      links.push({ type: 'parent', x1: mother.x + NODE_W / 2, y1: mother.y + NODE_H, x2: child.x + NODE_W / 2, y2: child.y });
    }
  });

  const seenSpouse = new Set();
  people.forEach(p => {
    if (p.spouseId && !seenSpouse.has(p.id + ':' + p.spouseId)) {
      seenSpouse.add(p.id + ':' + p.spouseId);
      seenSpouse.add(p.spouseId + ':' + p.id);
      const a = nodeById[p.id], b = nodeById[p.spouseId];
      if (a && b) {
        links.push({
          type: 'spouse',
          x1: Math.min(a.x, b.x) + NODE_W, y1: a.y + NODE_H / 2,
          x2: Math.max(a.x, b.x), y2: b.y + NODE_H / 2
        });
      }
    }
  });

  const width = Math.max(...nodes.map(n => n.x + NODE_W), 400);
  const height = Math.max(...nodes.map(n => n.y + NODE_H), 300);
  return { nodes, links, width, height, NODE_W, NODE_H };
}

// ============ UI COMPONENTS ============
const inputCls = "w-full px-3 py-2.5 bg-white border border-stone-300 rounded-md text-sm focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-600 mb-1 block">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-stone-500 mt-1 block">{hint}</span>}
    </label>
  );
}

function PersonCard({ node, onClick, highlighted, NODE_W, NODE_H }) {
  const p = node.person;
  const lifespan = p.birthDate || p.deathDate
    ? `${fmtDate(p.birthDate) || '?'} – ${fmtDate(p.deathDate) || (p.isAlive === false ? '?' : '')}`
    : '';
  const isFemale = p.gender === 'female';
  return (
    <div
      onClick={() => onClick(p)}
      className={`absolute cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${highlighted ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
    >
      <div className={`h-full rounded-lg border-2 ${isFemale ? 'border-rose-300 bg-rose-50' : 'border-emerald-300 bg-emerald-50'} px-3 py-2 shadow-sm flex flex-col justify-center`}>
        <div className="font-serif text-sm font-semibold text-stone-800 leading-tight truncate">
          {p.firstName} {p.lastName}
        </div>
        {p.maidenName && (
          <div className="text-[10px] text-stone-500 italic truncate">(qız: {p.maidenName})</div>
        )}
        {lifespan && (
          <div className="text-[11px] text-stone-600 mt-1 font-mono">{lifespan}</div>
        )}
        {p.isAlive === false && !p.deathDate && (
          <div className="text-[10px] text-stone-500">vəfat etmiş</div>
        )}
      </div>
    </div>
  );
}

function TreeView({ people, onPersonClick, highlightedId }) {
  const layout = useMemo(() => buildTreeLayout(people), [people]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const dragRef = useRef(null);
  const pinchRef = useRef(null);

  if (!people.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-500 p-8 text-center">
        <Users className="w-16 h-16 mb-4 text-stone-300" />
        <p className="font-serif text-lg">Hələ ailə üzvü əlavə edilməyib</p>
        <p className="text-sm mt-2">Ağacı qurmaq üçün ilk şəxsi əlavə edin</p>
      </div>
    );
  }

  const startDrag = (e) => {
    if (e.touches && e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchRef.current = { d, zoom };
      dragRef.current = null;
      return;
    }
    const t = e.touches ? e.touches[0] : e;
    dragRef.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
  };
  const onDrag = (e) => {
    if (e.touches && e.touches.length === 2 && pinchRef.current) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const newZoom = Math.max(0.3, Math.min(2, pinchRef.current.zoom * (d / pinchRef.current.d)));
      setZoom(newZoom);
      return;
    }
    if (!dragRef.current) return;
    const t = e.touches ? e.touches[0] : e;
    setPan({ x: t.clientX - dragRef.current.x, y: t.clientY - dragRef.current.y });
  };
  const endDrag = () => { dragRef.current = null; pinchRef.current = null; };

  return (
    <div className="relative w-full h-full bg-stone-50 overflow-hidden rounded-lg border border-stone-200">
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white rounded-lg shadow-md border border-stone-200">
        <button onClick={() => setZoom(z => Math.min(z + 0.15, 2))} className="p-2 hover:bg-stone-100 rounded-t-lg">
          <Plus className="w-4 h-4" />
        </button>
        <div className="text-[10px] text-center text-stone-500 px-1">{Math.round(zoom * 100)}%</div>
        <button onClick={() => setZoom(z => Math.max(z - 0.15, 0.3))} className="p-2 hover:bg-stone-100 rounded-b-lg">
          <Minus className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-x-3 gap-y-1 bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow-sm border border-stone-200 text-xs max-w-[calc(100%-24px)]">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded border-2 border-emerald-300 bg-emerald-50" /> Kişi</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded border-2 border-rose-300 bg-rose-50" /> Qadın</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-rose-400" /> Nikah</div>
      </div>
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={startDrag} onMouseMove={onDrag} onMouseUp={endDrag} onMouseLeave={endDrag}
        onTouchStart={startDrag} onTouchMove={onDrag} onTouchEnd={endDrag}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: layout.width, height: layout.height, position: 'relative'
          }}
        >
          <svg width={layout.width} height={layout.height} className="absolute top-0 left-0 pointer-events-none">
            {layout.links.map((l, i) => {
              if (l.type === 'spouse') {
                return <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#fb7185" strokeWidth="2" strokeDasharray="4 3" />;
              }
              const midY = (l.y1 + l.y2) / 2;
              return (
                <path key={i} d={`M ${l.x1} ${l.y1} L ${l.x1} ${midY} L ${l.x2} ${midY} L ${l.x2} ${l.y2}`} stroke="#78716c" strokeWidth="1.5" fill="none" />
              );
            })}
          </svg>
          {layout.nodes.map(n => (
            <PersonCard key={n.id} node={n} onClick={onPersonClick} highlighted={n.id === highlightedId} NODE_W={layout.NODE_W} NODE_H={layout.NODE_H} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonForm({ person, people, onSave, onCancel, onDelete, canDelete }) {
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
    notes: person?.notes || ''
  }));
  const update = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const fathers = people.filter(p => p.gender === 'male' && p.id !== person?.id);
  const mothers = people.filter(p => p.gender === 'female' && p.id !== person?.id);
  const spouses = people.filter(p => p.gender !== form.gender && p.id !== person?.id);

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
      notes: form.notes.trim()
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Ad *">
          <input className={inputCls} value={form.firstName} onChange={e => update({ firstName: e.target.value })} placeholder="Əli" />
        </Field>
        <Field label="Soyad">
          <input className={inputCls} value={form.lastName} onChange={e => update({ lastName: e.target.value })} placeholder="Məmmədov" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Cins">
          <select className={inputCls} value={form.gender} onChange={e => update({ gender: e.target.value, spouseId: '' })}>
            <option value="male">Kişi</option>
            <option value="female">Qadın</option>
          </select>
        </Field>
        {form.gender === 'female' && (
          <Field label="Qız soyadı">
            <input className={inputCls} value={form.maidenName} onChange={e => update({ maidenName: e.target.value })} placeholder="Quliyeva" />
          </Field>
        )}
      </div>

      <Field label="Doğum tarixi">
        <input type="date" className={inputCls} value={form.birthDate} onChange={e => update({ birthDate: e.target.value })} />
      </Field>

      <Field label="Doğulduğu yer">
        <input className={inputCls} value={form.birthPlace} onChange={e => update({ birthPlace: e.target.value })} placeholder="Bakı" />
      </Field>

      <div className="flex items-center gap-2 py-1">
        <input type="checkbox" id="alive" checked={form.isAlive} onChange={e => update({ isAlive: e.target.checked })} className="rounded w-4 h-4" />
        <label htmlFor="alive" className="text-sm text-stone-700 select-none">Sağdır</label>
      </div>

      {!form.isAlive && (
        <Field label="Vəfat tarixi">
          <input type="date" className={inputCls} value={form.deathDate} onChange={e => update({ deathDate: e.target.value })} />
        </Field>
      )}

      <div className="pt-2 border-t border-stone-200">
        <div className="text-xs font-medium text-stone-600 mb-2">Ailə bağları</div>
        <div className="space-y-3">
          <Field label="Atası">
            <select className={inputCls} value={form.fatherId} onChange={e => update({ fatherId: e.target.value })}>
              <option value="">— seçilməyib —</option>
              {fathers.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
            </select>
          </Field>
          <Field label="Anası">
            <select className={inputCls} value={form.motherId} onChange={e => update({ motherId: e.target.value })}>
              <option value="">— seçilməyib —</option>
              {mothers.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.maidenName ? `(${p.maidenName})` : ''}</option>)}
            </select>
          </Field>
          <Field label="Həyat yoldaşı">
            <select className={inputCls} value={form.spouseId} onChange={e => update({ spouseId: e.target.value })}>
              <option value="">— seçilməyib —</option>
              {spouses.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <Field label="Qeydlər">
        <textarea className={inputCls} rows={3} value={form.notes} onChange={e => update({ notes: e.target.value })} placeholder="Peşə, maraqlı faktlar..." />
      </Field>

      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-stone-200">
        <button onClick={submit} disabled={!form.firstName.trim()} className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed">
          Yadda saxla
        </button>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-medium rounded-md">
            Ləğv et
          </button>
          {canDelete && person && (
            <button onClick={() => onDelete(person.id)} className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-md">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingChangesPanel({ pending, people, onApprove, onReject }) {
  const byId = Object.fromEntries(people.map(p => [p.id, p]));

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
      const fields = { firstName: 'Ad', lastName: 'Soyad', birthDate: 'Doğum', deathDate: 'Vəfat', birthPlace: 'Yer', notes: 'Qeyd' };
      Object.entries(fields).forEach(([k, lbl]) => {
        if ((orig[k] || '') !== (req.data[k] || '')) {
          const showOld = (k === 'birthDate' || k === 'deathDate') ? fmtDate(orig[k]) : orig[k];
          const showNew = (k === 'birthDate' || k === 'deathDate') ? fmtDate(req.data[k]) : req.data[k];
          changes.push(<div key={k}>{lbl}: <span className="line-through text-stone-400">{showOld || '—'}</span> → <span className="text-amber-700">{showNew || '—'}</span></div>);
        }
      });
      return <div className="text-xs space-y-0.5">{changes.length ? changes : <div className="text-stone-500">Bağlantı dəyişiklikləri</div>}</div>;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {pending.map(req => (
        <div key={req.id} className="border border-amber-200 bg-amber-50/50 rounded-lg p-3">
          <div className="mb-2">
            <div className="font-medium text-sm text-stone-800">{describe(req)}</div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {req.submittedBy} • {new Date(req.timestamp).toLocaleString('az-AZ')}
            </div>
          </div>
          <div className="bg-white rounded p-2 mb-2 border border-stone-200">{formatChanges(req)}</div>
          <div className="flex gap-2">
            <button onClick={() => onApprove(req)} className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5" /> Təsdiqlə
            </button>
            <button onClick={() => onReject(req.id)} className="flex-1 px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium rounded flex items-center justify-center gap-1">
              <X className="w-3.5 h-3.5" /> Rədd et
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PersonDetail({ person, people, role, onEdit, onClose }) {
  if (!person) return null;
  const byId = Object.fromEntries(people.map(p => [p.id, p]));
  const father = person.fatherId ? byId[person.fatherId] : null;
  const mother = person.motherId ? byId[person.motherId] : null;
  const spouse = person.spouseId ? byId[person.spouseId] : null;
  const children = people.filter(p => p.fatherId === person.id || p.motherId === person.id);

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${person.gender === 'female' ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
        <h2 className="font-serif text-xl text-stone-900">{person.firstName} {person.lastName}</h2>
        {person.maidenName && <div className="text-sm text-stone-600 italic">(qız soyadı: {person.maidenName})</div>}
        <div className="mt-2 space-y-1 text-sm text-stone-700">
          {person.birthDate && (
            <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Doğum: {fmtDate(person.birthDate)}{person.birthPlace && `, ${person.birthPlace}`}</div>
          )}
          {!person.isAlive && person.deathDate && (
            <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Vəfat: {fmtDate(person.deathDate)}</div>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {father && <div><span className="text-stone-500">Atası:</span> <span className="text-stone-800">{father.firstName} {father.lastName}</span></div>}
        {mother && <div><span className="text-stone-500">Anası:</span> <span className="text-stone-800">{mother.firstName} {mother.lastName}</span></div>}
        {spouse && <div><span className="text-stone-500">Həyat yoldaşı:</span> <span className="text-stone-800">{spouse.firstName} {spouse.lastName}</span></div>}
        {children.length > 0 && (
          <div>
            <span className="text-stone-500">Övladları ({children.length}):</span>
            <ul className="ml-4 mt-1 list-disc text-stone-800">
              {children.map(c => <li key={c.id}>{c.firstName} {c.lastName}</li>)}
            </ul>
          </div>
        )}
      </div>

      {person.notes && (
        <div className="p-3 bg-stone-50 rounded border border-stone-200 text-sm text-stone-700">
          <div className="text-xs text-stone-500 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Qeydlər</div>
          {person.notes}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => onEdit(person)} className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2">
          <Edit3 className="w-4 h-4" />
          {role === 'admin' ? 'Düzəliş et' : 'Düzəliş təklif et'}
        </button>
        <button onClick={onClose} className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm font-medium rounded-md">
          Bağla
        </button>
      </div>
    </div>
  );
}

// ============ SETUP / LOGIN ============
function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="bg-stone-50 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 mx-auto mb-3 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <h1 className="font-serif text-xl text-stone-900 mb-2">Bağlantı xətası</h1>
        <p className="text-sm text-stone-600">{message}</p>
        <p className="text-xs text-stone-500 mt-3">Zəhmət olmasa, administrator ilə əlaqə saxlayın.</p>
      </div>
    </div>
  );
}

function SetupScreen({ onSetup, busy }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (password.length < 4) return setError('Şifrə ən azı 4 simvol olmalıdır');
    if (password !== confirm) return setError('Şifrələr uyğun gəlmir');
    onSetup(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="bg-stone-50 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-sm w-full">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-amber-600 mx-auto mb-3 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-serif text-2xl text-stone-900">Admin təyin et</h1>
          <p className="text-sm text-stone-600 mt-1">İlk dəfə işə salınma — admin şifrəsini təyin edin</p>
        </div>
        <div className="space-y-3">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin şifrəsi" className={inputCls} />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Şifrəni təkrarla" className={inputCls} onKeyDown={e => e.key === 'Enter' && submit()} />
          {error && <div className="text-xs text-red-600">{error}</div>}
          <button onClick={submit} disabled={busy} className="w-full px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md disabled:opacity-50">
            {busy ? 'Saxlanılır...' : 'Tamamla'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ config, onAdminLogin, onGuestLogin }) {
  const [mode, setMode] = useState(null);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-800 flex items-center justify-center p-4">
      <div className="bg-stone-50 rounded-2xl shadow-2xl p-5 sm:p-6 max-w-sm w-full">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-amber-600 mx-auto mb-3 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-serif text-2xl text-stone-900">Nəsil Şəcərəsi</h1>
          <p className="text-sm text-stone-600 mt-1">Ailə tarixini birgə qurun</p>
        </div>

        {!mode && (
          <div className="space-y-2">
            <button onClick={() => setMode('admin')} className="w-full p-3 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-left flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-400" />
              <div>
                <div className="font-medium text-sm">Admin kimi giriş</div>
                <div className="text-[11px] text-stone-400">Tam idarəetmə hüququ</div>
              </div>
            </button>
            <button onClick={() => setMode('guest')} className="w-full p-3 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-lg text-left flex items-center gap-3">
              <Eye className="w-5 h-5 text-amber-600" />
              <div>
                <div className="font-medium text-sm">Qonaq kimi giriş</div>
                <div className="text-[11px] text-stone-500">Bax və düzəliş təklif et</div>
              </div>
            </button>
          </div>
        )}

        {mode === 'admin' && (
          <div className="space-y-3">
            <input
              type="password" autoFocus value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Admin şifrəsi" className={inputCls}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (config.admin_password === password) onAdminLogin();
                  else setError('Şifrə yanlışdır');
                }
              }}
            />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div className="flex gap-2">
              <button onClick={() => { if (config.admin_password === password) onAdminLogin(); else setError('Şifrə yanlışdır'); }} className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md">
                Giriş
              </button>
              <button onClick={() => { setMode(null); setPassword(''); setError(''); }} className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm rounded-md">
                Geri
              </button>
            </div>
          </div>
        )}

        {mode === 'guest' && (
          <div className="space-y-3">
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Adınız" className={inputCls} onKeyDown={e => e.key === 'Enter' && name.trim() && onGuestLogin(name)} />
            <div className="flex gap-2">
              <button onClick={() => name.trim() && onGuestLogin(name)} disabled={!name.trim()} className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-md disabled:opacity-40">
                Davam et
              </button>
              <button onClick={() => { setMode(null); setName(''); }} className="px-4 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-sm rounded-md">
                Geri
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [phase, setPhase] = useState('loading');
  const [initError, setInitError] = useState('');
  const [config, setConfig] = useState(null);
  const [people, setPeople] = useState([]);
  const [pending, setPending] = useState([]);
  const [role, setRole] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [busy, setBusy] = useState(false);

  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = useCallback(async () => {
    try {
      const [cfg, pp, pd] = await Promise.all([db.getConfig(), db.listPeople(), db.listPending()]);
      setConfig(cfg);
      setPeople(pp);
      setPending(pd);
      return cfg;
    } catch (e) {
      showToast('Yüklənmə xətası: ' + e.message, 'error');
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Validate config first
      if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR_ANON')) {
        setInitError('Tətbiq düzgün konfiqurasiya edilməyib.');
        setPhase('error');
        return;
      }
      try {
        await initSupabase();
        // Test connection
        const { error: testErr } = await supabaseClient.from('family_config').select('id').limit(1);
        if (testErr) {
          if (testErr.code === '42P01' || testErr.message?.includes('relation')) {
            setInitError('Verilənlər bazası cədvəlləri tapılmadı.');
          } else {
            setInitError('Verilənlər bazasına qoşulmaq mümkün olmadı.');
          }
          setPhase('error');
          return;
        }
        const cfg = await loadAll();
        setPhase(cfg ? 'login' : 'setup');
      } catch (e) {
        setInitError('Bağlantı qurmaq mümkün olmadı.');
        setPhase('error');
      }
    })();
  }, [loadAll]);

  useEffect(() => {
    if (phase !== 'app' || !supabaseClient) return;
    const channel = supabaseClient
      .channel('family-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_people' }, () => {
        db.listPeople().then(setPeople).catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_pending' }, () => {
        db.listPending().then(setPending).catch(() => {});
      })
      .subscribe();
    return () => { supabaseClient.removeChannel(channel); };
  }, [phase]);

  const handleSetupAdmin = async (password) => {
    setBusy(true);
    try {
      await db.setConfig(password);
      const cfg = await db.getConfig();
      setConfig(cfg);
      setPhase('login');
    } catch (e) {
      showToast('Xəta: ' + e.message, 'error');
    } finally { setBusy(false); }
  };

  const handleAdminLogin = () => { setRole('admin'); setPhase('app'); showToast('Admin kimi giriş edildi'); };
  const handleGuestLogin = (name) => { setGuestName(name.trim()); setRole('guest'); setPhase('app'); };
  const handleLogout = () => { setRole(null); setGuestName(''); setModal(null); setSelectedPerson(null); setPhase('login'); };

  const handleSavePerson = async (data) => {
    try {
      if (role === 'admin') {
        if (editing) {
          await db.upsertPerson({ ...editing, ...data });
          if (data.spouseId && data.spouseId !== editing.spouseId) {
            await db.updatePersonSpouse(data.spouseId, editing.id);
            if (editing.spouseId) await db.updatePersonSpouse(editing.spouseId, null);
          } else if (!data.spouseId && editing.spouseId) {
            await db.updatePersonSpouse(editing.spouseId, null);
          }
          showToast('Məlumatlar yeniləndi');
        } else {
          const newPerson = { ...data, id: uid() };
          await db.upsertPerson(newPerson);
          if (data.spouseId) await db.updatePersonSpouse(data.spouseId, newPerson.id);
          showToast('Yeni şəxs əlavə edildi');
        }
      } else {
        await db.addPending({ id: uid(), type: editing ? 'edit' : 'add', targetId: editing?.id || null, data, submittedBy: guestName });
        showToast('Təsdiq üçün admin-ə göndərildi');
      }
      await loadAll();
    } catch (e) {
      showToast('Xəta: ' + e.message, 'error');
    }
    setModal(null);
    setEditing(null);
    setSelectedPerson(null);
  };

  const handleDeletePerson = async (id) => {
    if (role !== 'admin') return;
    if (!confirm('Bu şəxsi silmək istədiyinizə əminsiniz?')) return;
    try {
      await db.deletePerson(id);
      await loadAll();
      setModal(null);
      setSelectedPerson(null);
      setEditing(null);
      showToast('Şəxs silindi');
    } catch (e) {
      showToast('Xəta: ' + e.message, 'error');
    }
  };

  const handleApprove = async (req) => {
    try {
      if (req.type === 'add') {
        const newPerson = { ...req.data, id: uid() };
        await db.upsertPerson(newPerson);
        if (req.data.spouseId) await db.updatePersonSpouse(req.data.spouseId, newPerson.id);
      } else if (req.type === 'edit') {
        const target = people.find(p => p.id === req.targetId);
        if (target) {
          await db.upsertPerson({ ...target, ...req.data });
          if (req.data.spouseId && req.data.spouseId !== target.spouseId) {
            await db.updatePersonSpouse(req.data.spouseId, target.id);
            if (target.spouseId) await db.updatePersonSpouse(target.spouseId, null);
          }
        }
      }
      await db.deletePending(req.id);
      await loadAll();
      showToast('Təsdiqləndi');
    } catch (e) {
      showToast('Xəta: ' + e.message, 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await db.deletePending(id);
      await loadAll();
      showToast('Rədd edildi');
    } catch (e) {
      showToast('Xəta: ' + e.message, 'error');
    }
  };

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return people.filter(p =>
      (p.firstName + ' ' + p.lastName + ' ' + (p.maidenName || '')).toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search, people]);

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }
  if (phase === 'error') return <ErrorScreen message={initError} />;
  if (phase === 'setup') return <SetupScreen onSetup={handleSetupAdmin} busy={busy} />;
  if (phase === 'login') return <LoginScreen config={config} onAdminLogin={handleAdminLogin} onGuestLogin={handleGuestLogin} />;

  return (
    <div className="min-h-screen bg-stone-100 font-sans">
      <header className="bg-stone-900 text-stone-100 sticky top-0 z-20 shadow-md">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <div className="font-serif text-lg leading-tight">Nəsil Şəcərəsi</div>
              <div className="text-[10px] text-stone-400 leading-tight">
                {role === 'admin' ? 'Admin' : `Qonaq: ${guestName}`}
              </div>
            </div>
          </div>
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setShowSearchResults(true); }}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              placeholder="Axtar..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-800 border border-stone-700 rounded-md text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-600"
            />
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white text-stone-800 rounded-md shadow-lg border border-stone-200 max-h-64 overflow-y-auto z-30">
                {searchResults.map(p => (
                  <button key={p.id}
                    onMouseDown={() => {
                      setSelectedPerson(p); setModal('detail'); setHighlightedId(p.id);
                      setSearch(''); setShowSearchResults(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 text-sm border-b border-stone-100 last:border-0"
                  >
                    <div className="font-medium">{p.firstName} {p.lastName}</div>
                    {p.birthDate && <div className="text-xs text-stone-500">{fmtDate(p.birthDate)}{p.deathDate ? ` – ${fmtDate(p.deathDate)}` : ''}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {role === 'admin' && (
              <button onClick={() => setModal('pending')} className="relative p-2 hover:bg-stone-800 rounded-md">
                <Bell className="w-5 h-5" />
                {pending.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-amber-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {pending.length}
                  </span>
                )}
              </button>
            )}
            <button onClick={handleLogout} className="p-2 hover:bg-stone-800 rounded-md">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="sm:hidden px-3 pb-2 text-[10px] text-stone-400">
          {role === 'admin' ? 'Admin' : `Qonaq: ${guestName}`}
        </div>
      </header>

      <main className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h1 className="font-serif text-lg sm:text-xl text-stone-800">Ailə Ağacı</h1>
          <button
            onClick={() => { setEditing(null); setModal('edit'); }}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm rounded-md flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">{role === 'admin' ? 'Şəxs əlavə et' : 'Əlavə təklif et'}</span>
            <span className="sm:hidden">Əlavə et</span>
          </button>
        </div>

        <div className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
          <TreeView
            people={people}
            highlightedId={highlightedId}
            onPersonClick={(p) => { setSelectedPerson(p); setModal('detail'); setHighlightedId(p.id); }}
          />
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center sm:p-4" onClick={() => { setModal(null); setEditing(null); }}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between z-10">
              <h2 className="font-serif text-lg text-stone-900">
                {modal === 'detail' && 'Şəxs haqqında'}
                {modal === 'edit' && (editing ? (role === 'admin' ? 'Düzəliş' : 'Düzəliş təklifi') : (role === 'admin' ? 'Yeni şəxs' : 'Əlavə təklifi'))}
                {modal === 'pending' && `Təsdiq gözləyən (${pending.length})`}
              </h2>
              <button onClick={() => { setModal(null); setEditing(null); }} className="p-1 hover:bg-stone-100 rounded">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            <div className="p-4">
              {modal === 'detail' && selectedPerson && (
                <PersonDetail person={selectedPerson} people={people} role={role}
                  onEdit={(p) => { setEditing(p); setModal('edit'); }}
                  onClose={() => { setModal(null); setSelectedPerson(null); }}
                />
              )}
              {modal === 'edit' && (
                <>
                  {role === 'guest' && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>Bu dəyişiklik adminin təsdiqindən sonra tətbiq olunacaq.</span>
                    </div>
                  )}
                  <PersonForm person={editing} people={people}
                    onSave={handleSavePerson}
                    onCancel={() => { setModal(null); setEditing(null); }}
                    onDelete={handleDeletePerson}
                    canDelete={role === 'admin'}
                  />
                </>
              )}
              {modal === 'pending' && (
                <PendingChangesPanel pending={pending} people={people} onApprove={handleApprove} onReject={handleReject} />
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md text-sm text-white shadow-lg z-50 max-w-[90vw] text-center ${toast.kind === 'error' ? 'bg-red-600' : 'bg-stone-800'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
