export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const fmtDate = (d) => {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  return d;
};
