import { useMemo, useRef, useState } from 'react';
import { Users, Plus, Minus } from 'lucide-react';
import { buildTreeLayout } from '../utils/treeLayout.js';
import { fmtDate } from '../lib/helpers.js';

function PersonCard({ node, onClick, highlighted, NODE_W, NODE_H }) {
  const p = node.person;
  const lifespan =
    p.birthDate || p.deathDate
      ? `${fmtDate(p.birthDate) || '?'} – ${fmtDate(p.deathDate) || (p.isAlive === false ? '?' : '')}`
      : '';
  const isFemale = p.gender === 'female';
  return (
    <div
      onClick={() => onClick(p)}
      className={`absolute cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
        highlighted ? 'ring-2 ring-amber-500 ring-offset-2' : ''
      }`}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
    >
      <div
        className={`h-full rounded-lg border-2 ${
          isFemale ? 'border-rose-300 bg-rose-50' : 'border-emerald-300 bg-emerald-50'
        } px-3 py-2 shadow-sm flex flex-col justify-center`}
      >
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

export function TreeView({ people, onPersonClick, highlightedId }) {
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
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current = { d, zoom };
      dragRef.current = null;
      return;
    }
    const t = e.touches ? e.touches[0] : e;
    dragRef.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
  };

  const onDrag = (e) => {
    if (e.touches && e.touches.length === 2 && pinchRef.current) {
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newZoom = Math.max(0.3, Math.min(2, pinchRef.current.zoom * (d / pinchRef.current.d)));
      setZoom(newZoom);
      return;
    }
    if (!dragRef.current) return;
    const t = e.touches ? e.touches[0] : e;
    setPan({ x: t.clientX - dragRef.current.x, y: t.clientY - dragRef.current.y });
  };

  const endDrag = () => {
    dragRef.current = null;
    pinchRef.current = null;
  };

  return (
    <div className="relative w-full h-full bg-stone-50 overflow-hidden rounded-lg border border-stone-200">
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white rounded-lg shadow-md border border-stone-200">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2))}
          className="p-2 hover:bg-stone-100 rounded-t-lg"
          aria-label="Yaxınlaşdır"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="text-[10px] text-center text-stone-500 px-1">{Math.round(zoom * 100)}%</div>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.3))}
          className="p-2 hover:bg-stone-100 rounded-b-lg"
          aria-label="Uzaqlaşdır"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-x-3 gap-y-1 bg-white/90 backdrop-blur rounded-lg px-3 py-2 shadow-sm border border-stone-200 text-xs max-w-[calc(100%-24px)]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-emerald-300 bg-emerald-50" /> Kişi
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-rose-300 bg-rose-50" /> Qadın
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-rose-400" /> Nikah
        </div>
      </div>

      <div
        className="tree-container w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={startDrag}
        onMouseMove={onDrag}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={startDrag}
        onTouchMove={onDrag}
        onTouchEnd={endDrag}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: layout.width,
            height: layout.height,
            position: 'relative',
          }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            className="absolute top-0 left-0 pointer-events-none"
          >
            {layout.links.map((l, i) => {
              if (l.type === 'spouse') {
                return (
                  <line
                    key={i}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke="#fb7185"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                );
              }
              const midY = (l.y1 + l.y2) / 2;
              return (
                <path
                  key={i}
                  d={`M ${l.x1} ${l.y1} L ${l.x1} ${midY} L ${l.x2} ${midY} L ${l.x2} ${l.y2}`}
                  stroke="#78716c"
                  strokeWidth="1.5"
                  fill="none"
                />
              );
            })}
          </svg>
          {layout.nodes.map((n) => (
            <PersonCard
              key={n.id}
              node={n}
              onClick={onPersonClick}
              highlighted={n.id === highlightedId}
              NODE_W={layout.NODE_W}
              NODE_H={layout.NODE_H}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
