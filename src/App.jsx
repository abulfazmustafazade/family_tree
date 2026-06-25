import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, UserPlus, Bell, Search, LogOut, X, AlertCircle, RefreshCw,
} from 'lucide-react';

import { supabase, isConfigured } from './lib/supabase.js';
import { db }                     from './lib/db.js';
import { uid, fmtDate }           from './lib/helpers.js';

import { TreeView }     from './components/TreeView.jsx';
import { PersonForm }   from './components/PersonForm.jsx';
import { PersonDetail } from './components/PersonDetail.jsx';
import { PendingPanel } from './components/PendingPanel.jsx';
import { LoginScreen }  from './components/LoginScreen.jsx';
import { SetupScreen }  from './components/SetupScreen.jsx';
import { ErrorScreen }  from './components/ErrorScreen.jsx';

// ─── Şəcərə filter funksiyaları (hook deyil, App-dan xaricdə) ────────────────

function getDescendants(rootId, people) {
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const result = new Set([rootId]);
  if (byId[rootId]?.spouseId) result.add(byId[rootId].spouseId);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    people.forEach((p) => {
      if ((p.fatherId === id || p.motherId === id) && !result.has(p.id)) {
        result.add(p.id);
        if (p.spouseId) result.add(p.spouseId);
        queue.push(p.id);
      }
    });
  }
  return people.filter((p) => result.has(p.id));
}

function getAncestors(rootId, people) {
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const result = new Set([rootId]);
  if (byId[rootId]?.spouseId) result.add(byId[rootId].spouseId);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    const p = byId[id];
    if (!p) continue;
    if (p.fatherId && !result.has(p.fatherId)) {
      result.add(p.fatherId);
      if (byId[p.fatherId]?.spouseId) result.add(byId[p.fatherId].spouseId);
      queue.push(p.fatherId);
    }
    if (p.motherId && !result.has(p.motherId)) {
      result.add(p.motherId);
      if (byId[p.motherId]?.spouseId) result.add(byId[p.motherId].spouseId);
      queue.push(p.motherId);
    }
  }
  return people.filter((p) => result.has(p.id));
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm
        text-white shadow-lg z-50 max-w-[90vw] text-center transition-all ${
        toast.kind === 'error' ? 'bg-red-600' : 'bg-stone-800'
      }`}
    >
      {toast.msg}
    </div>
  );
}

// ─── Modal wrapper ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg
          max-h-[92vh] sm:max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-stone-200 px-4 py-3
          flex items-center justify-between z-10">
          <h2 className="font-serif text-lg text-stone-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-md">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Phase ──
  const [phase,     setPhase]     = useState('loading');
  const [initError, setInitError] = useState('');

  // ── Data ──
  const [config,  setConfig]  = useState(null);
  const [people,  setPeople]  = useState([]);
  const [pending, setPending] = useState([]);

  // ── Auth ──
  const [role,      setRole]      = useState(null);
  const [guestName, setGuestName] = useState('');

  // ── UI ──
  const [modal,          setModal]       = useState(null);
  const [selectedPerson, setSelected]    = useState(null);
  const [editing,        setEditing]     = useState(null);
  const [highlightedId,  setHighlight]   = useState(null);
  const [search,         setSearch]      = useState('');
  const [showSearch,     setShowSearch]  = useState(false);
  const [toast,          setToast]       = useState(null);
  const [busy,           setBusy]        = useState(false);

  // ── Şəcərə filter ──
  const [rootId,   setRootId]   = useState(null);
  const [treeMode, setTreeMode] = useState('descendants'); // 'descendants' | 'ancestors'

  // ── Helpers ──────────────────────────────────────────────────────────────
  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };

  const closeModal = () => { setModal(null); setEditing(null); };

  // ── Data loading ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [cfg, pp, pd] = await Promise.all([
        db.getConfig(),
        db.listPeople(),
        db.listPending(),
      ]);
      setConfig(cfg);
      setPeople(pp);
      setPending(pd);
      return cfg;
    } catch (e) {
      showToast('Yüklənmə xətası: ' + e.message, 'error');
      return null;
    }
  }, []);

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isConfigured) {
      setInitError('Tətbiq konfiqurasiya edilməyib. .env faylını yoxlayın.');
      setPhase('error');
      return;
    }
    (async () => {
      try {
        const { error: testErr } = await supabase
          .from('family_config').select('id').limit(1);
        if (testErr) {
          setInitError(
            testErr.code === '42P01' || testErr.message?.includes('relation')
              ? 'Verilənlər bazası cədvəlləri tapılmadı. supabase-schema.sql faylını işə salın.'
              : 'Verilənlər bazasına qoşulmaq mümkün olmadı.'
          );
          setPhase('error');
          return;
        }
        const cfg = await loadAll();
        setPhase(cfg ? 'login' : 'setup');
      } catch {
        setInitError('Bağlantı qurmaq mümkün olmadı.');
        setPhase('error');
      }
    })();
  }, [loadAll]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'app') return;
    const ch = supabase.channel('family-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_people' },
        () => db.listPeople().then(setPeople).catch(() => {}))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_pending' },
        () => db.listPending().then(setPending).catch(() => {}))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [phase]);

  // ── Memos ────────────────────────────────────────────────────────────────

  // Seçilmiş şəxsə görə filtrlənmiş siyahı
  const visiblePeople = useMemo(() => {
    if (!rootId) return people;
    return treeMode === 'ancestors'
      ? getAncestors(rootId, people)
      : getDescendants(rootId, people);
  }, [people, rootId, treeMode]);

  // Axtarış nəticələri (həmişə tam people-dan)
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return people
      .filter((p) =>
        `${p.firstName} ${p.lastName} ${p.maidenName || ''}`.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [search, people]);

  // ── Auth handlers ─────────────────────────────────────────────────────────
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
  const handleLogout = () => {
    setRole(null); setGuestName(''); setModal(null);
    setSelected(null); setRootId(null); setPhase('login');
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────
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
          const np = { ...data, id: uid() };
          await db.upsertPerson(np);
          if (data.spouseId) await db.updatePersonSpouse(data.spouseId, np.id);
          showToast('Yeni şəxs əlavə edildi');
        }
      } else {
        await db.addPending({
          id: uid(), type: editing ? 'edit' : 'add',
          targetId: editing?.id || null, data, submittedBy: guestName,
        });
        showToast('Təsdiq üçün admin-ə göndərildi');
      }
      await loadAll();
    } catch (e) { showToast('Xəta: ' + e.message, 'error'); }
    closeModal();
    setSelected(null);
  };

  const handleDeletePerson = async (id) => {
    if (role !== 'admin') return;
    if (!window.confirm('Bu şəxsi silmək istədiyinizə əminsiniz?')) return;
    try {
      await db.deletePerson(id);
      await loadAll();
      if (rootId === id) setRootId(null);
      closeModal();
      setSelected(null);
      showToast('Şəxs silindi');
    } catch (e) { showToast('Xəta: ' + e.message, 'error'); }
  };

  const handleApprove = async (req) => {
    try {
      if (req.type === 'add') {
        const np = { ...req.data, id: uid() };
        await db.upsertPerson(np);
        if (req.data.spouseId) await db.updatePersonSpouse(req.data.spouseId, np.id);
      } else if (req.type === 'edit') {
        const target = people.find((p) => p.id === req.targetId);
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
    } catch (e) { showToast('Xəta: ' + e.message, 'error'); }
  };

  const handleReject = async (id) => {
    try {
      await db.deletePending(id);
      await loadAll();
      showToast('Rədd edildi');
    } catch (e) { showToast('Xəta: ' + e.message, 'error'); }
  };

  // ── Şəcərə seçim handler ──────────────────────────────────────────────────
  const handleSetRoot = (id) => {
    setRootId(id);
    setTreeMode('descendants');
    closeModal();
    setSelected(null);
  };

  // ── Phase routing ─────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }
  if (phase === 'error') return <ErrorScreen message={initError} />;
  if (phase === 'setup') return <SetupScreen onSetup={handleSetupAdmin} busy={busy} />;
  if (phase === 'login') return (
    <LoginScreen config={config} onAdminLogin={handleAdminLogin} onGuestLogin={handleGuestLogin} />
  );

  // ── Modal title ───────────────────────────────────────────────────────────
  const modalTitle = () => {
    if (modal === 'detail') return 'Şəxs haqqında';
    if (modal === 'pending') return `Təsdiq gözləyən (${pending.length})`;
    if (modal === 'edit') {
      if (editing) return role === 'admin' ? 'Düzəliş et' : 'Düzəliş təklifi';
      return role === 'admin' ? 'Yeni şəxs əlavə et' : 'Əlavə təklifi';
    }
    return '';
  };

  // ── Aktiv şəcərə kök şəxsi ───────────────────────────────────────────────
  const rootPerson = rootId ? people.find((p) => p.id === rootId) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-100 font-sans">

      {/* Header */}
      <header className="bg-stone-900 text-stone-100 sticky top-0 z-20 shadow-md">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">

          {/* Logo */}
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

          {/* Search */}
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              placeholder="Axtar..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-800 border border-stone-700 rounded-md
                text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-600"
            />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white text-stone-800
                rounded-md shadow-lg border border-stone-200 max-h-64 overflow-y-auto z-30">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={() => {
                      setSelected(p); setModal('detail');
                      setHighlight(p.id); setSearch(''); setShowSearch(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 text-sm
                      border-b border-stone-100 last:border-0"
                  >
                    <div className="font-medium">{p.firstName} {p.lastName}</div>
                    {p.birthDate && (
                      <div className="text-xs text-stone-500">
                        {fmtDate(p.birthDate)}{p.deathDate ? ` – ${fmtDate(p.deathDate)}` : ''}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            {role === 'admin' && (
              <button
                onClick={() => setModal('pending')}
                className="relative p-2 hover:bg-stone-800 rounded-md"
                title="Təsdiq gözləyən"
              >
                <Bell className="w-5 h-5" />
                {pending.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-amber-600 text-white
                    text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {pending.length}
                  </span>
                )}
              </button>
            )}
            <button onClick={handleLogout} className="p-2 hover:bg-stone-800 rounded-md" title="Çıxış">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile role badge */}
        <div className="sm:hidden px-3 pb-2 text-[10px] text-stone-400">
          {role === 'admin' ? '🔑 Admin' : `👤 Qonaq: ${guestName}`}
        </div>
      </header>

      {/* Main */}
      <main className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">

        {/* Title row */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <h1 className="font-serif text-lg sm:text-xl text-stone-800">Ailə Ağacı</h1>
          <button
            onClick={() => { setEditing(null); setModal('edit'); }}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-700 hover:bg-amber-800
              text-white text-sm rounded-md flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">
              {role === 'admin' ? 'Şəxs əlavə et' : 'Əlavə təklif et'}
            </span>
            <span className="sm:hidden">Əlavə et</span>
          </button>
        </div>

        {/* Şəcərə filter paneli — yalnız kök seçilib ise görünür */}
        {rootPerson && (
          <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2.5
            bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="text-stone-500 text-xs shrink-0">Şəcərə:</span>
            <span className="font-semibold text-stone-900 truncate">
              {rootPerson.firstName} {rootPerson.lastName}
            </span>
            <div className="flex gap-1 ml-auto flex-wrap shrink-0">
              <button
                onClick={() => setTreeMode('descendants')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  treeMode === 'descendants'
                    ? 'bg-amber-700 text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                Nəsil ↓
              </button>
              <button
                onClick={() => setTreeMode('ancestors')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  treeMode === 'ancestors'
                    ? 'bg-amber-700 text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                Kök ↑
              </button>
              <button
                onClick={() => { setRootId(null); setTreeMode('descendants'); }}
                className="px-2.5 py-1 text-xs rounded-md bg-white text-stone-600
                  border border-stone-200 hover:bg-stone-50 font-medium transition-colors"
              >
                Tam ağac
              </button>
            </div>
          </div>
        )}

        {/* Tree */}
        <div className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
          <TreeView
            people={visiblePeople}
            highlightedId={highlightedId}
            onPersonClick={(p) => {
              setSelected(p);
              setModal('detail');
              setHighlight(p.id);
            }}
          />
        </div>
      </main>

      {/* Modals */}
      {modal && (
        <Modal title={modalTitle()} onClose={closeModal}>
          {modal === 'detail' && selectedPerson && (
            <PersonDetail
              person={selectedPerson}
              people={people}
              role={role}
              onEdit={(p) => { setEditing(p); setModal('edit'); }}
              onClose={closeModal}
              onSetRoot={handleSetRoot}
            />
          )}

          {modal === 'edit' && (
            <>
              {role === 'guest' && (
                <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg
                  text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Bu dəyişiklik adminin təsdiqindən sonra tətbiq olunacaq.</span>
                </div>
              )}
              <PersonForm
                person={editing}
                people={people}
                onSave={handleSavePerson}
                onCancel={closeModal}
                onDelete={handleDeletePerson}
                canDelete={role === 'admin'}
              />
            </>
          )}

          {modal === 'pending' && (
            <PendingPanel
              pending={pending}
              people={people}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </Modal>
      )}

      <Toast toast={toast} />
    </div>
  );
}
