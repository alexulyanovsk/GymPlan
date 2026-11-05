export const $ = id => document.getElementById(id);
export const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fn = v => { const n = Number(v); return !isFinite(n) ? '0' : n === Math.floor(n) ? String(n) : n.toFixed(1).replace('.', ','); };
export const pn = s => {
  const str = String(s ?? '').trim().replace(',', '.');
  if (str === '') return NaN;
  const n = Number(str);
  return isFinite(n) ? n : NaN;
};
export const rs = ex => ex.repMin === ex.repMax ? `${ex.repMin}` : `${ex.repMin}–${ex.repMax}`;
export const ws = ex => ex.unit === 'свой вес' ? ex.unit : ex.wMin === ex.wMax ? `${fn(ex.wMin)} ${ex.unit}` : `${fn(ex.wMin)}–${fn(ex.wMax)} ${ex.unit}`;
export const fd = ts => {
  if (!ts) return '';
  const d = new Date(ts), p = n => String(n).padStart(2, '0');
  const curYear = new Date().getFullYear();
  const datePart = d.getFullYear() === curYear
    ? `${p(d.getDate())}.${p(d.getMonth() + 1)}`
    : `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
  return `${datePart} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
