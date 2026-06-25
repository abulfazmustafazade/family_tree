export const inputCls =
  'w-full px-3 py-2.5 bg-white border border-stone-300 rounded-md text-sm focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600';

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-600 mb-1 block">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-stone-500 mt-1 block">{hint}</span>}
    </label>
  );
}
