// Utilidades de formato que imitan la salida de kubectl: duraciones, tablas, YAML y un jsonpath mínimo.

/** HumanDuration de k8s.io/apimachinery: la columna AGE. */
export function age(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 0) return '0s';
  if (seconds < 120) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 10) { const s = seconds % 60; return s === 0 ? `${minutes}m` : `${minutes}m${s}s`; }
  if (minutes < 180) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 8) { const m = minutes % 60; return m === 0 ? `${hours}h` : `${hours}h${m}m`; }
  if (hours < 48) return `${hours}h`;
  if (hours < 24 * 8) { const h = hours % 24; return h === 0 ? `${Math.floor(hours / 24)}d` : `${Math.floor(hours / 24)}d${h}h`; }
  if (hours < 24 * 365 * 2) return `${Math.floor(hours / 24)}d`;
  return `${Math.floor(hours / 24 / 365)}y`;
}

/** Tabla alineada como el tabwriter de kubectl (3 espacios entre columnas, la última sin relleno). */
export function table(rows: string[][], pad = 3): string[] {
  const widths: number[] = [];
  for (const r of rows) r.forEach((cell, i) => { widths[i] = Math.max(widths[i] ?? 0, cell.length); });
  return rows.map((r) => r.map((cell, i) => (i === r.length - 1 ? cell : cell.padEnd(widths[i] + pad))).join('').replace(/\s+$/, ''));
}

/** "Sun, 26 Oct 2026 10:00:00 -0600" (describe). */
export function rfc1123(ms: number): string {
  const d = new Date(ms);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (n: number) => String(n).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const tz = `${sign}${p(Math.floor(Math.abs(off) / 60))}${p(Math.abs(off) % 60)}`;
  return `${days[d.getDay()]}, ${p(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${tz}`;
}

/** "2026-10-26T16:00:00Z" (YAML). */
export const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

/** "26/Oct/2026:15:04:05 +0000" (access log de nginx). */
export function clf(ms: number): string {
  const d = new Date(ms);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${months[d.getUTCMonth()]}/${d.getUTCFullYear()}:${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

/** "2026/10/26 15:04:05" (logs de nginx). */
export function logstamp(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

// ---------- YAML (estilo kubectl: claves ordenadas, listas sin sangría extra) ----------
const needsQuote = (s: string) =>
  s === '' || /^(true|false|null|~|yes|no|on|off|y|n)$/i.test(s) || /^[-+]?(\d[\d_]*\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s) || /^0x/i.test(s) ||
  /^[\[\]{}&*!|>'"%@`#,?]/.test(s) || /^-\s/.test(s) || /^-$/.test(s) || /:\s|\s#|^\s|\s$/.test(s) || /^[\d-]+:[\d:]/.test(s);

function scalar(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return needsQuote(v) ? JSON.stringify(v) : v;
  return String(v);
}

export function toYaml(v: unknown, indent = 0): string[] {
  const sp = ' '.repeat(indent);
  const out: string[] = [];
  if (Array.isArray(v)) {
    for (const item of v) {
      if (item && typeof item === 'object') {
        const inner = toYaml(item, indent + 2);
        out.push(sp + '- ' + inner[0].slice(indent + 2));
        out.push(...inner.slice(1));
      } else out.push(sp + '- ' + scalar(item));
    }
    return out;
  }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v as object).sort()) {
      const val = (v as Record<string, unknown>)[k];
      const key = needsQuote(k) ? JSON.stringify(k) : k;
      if (Array.isArray(val)) {
        if (!val.length) out.push(`${sp}${key}: []`);
        else { out.push(`${sp}${key}:`); out.push(...toYaml(val, indent)); }
      } else if (val && typeof val === 'object') {
        if (!Object.keys(val).length) out.push(`${sp}${key}: {}`);
        else { out.push(`${sp}${key}:`); out.push(...toYaml(val, indent + 2)); }
      } else if (typeof val === 'string' && val.includes('\n')) {
        const lines = val.replace(/\n$/, '').split('\n');
        out.push(`${sp}${key}: |${val.endsWith('\n') ? '' : '-'}`);
        for (const l of lines) out.push(`${sp}  ${l}`);
      } else out.push(`${sp}${key}: ${scalar(val)}`);
    }
    return out;
  }
  return [sp + scalar(v)];
}

// ---------- jsonpath mínimo: {.a.b}, {.items[*].x}, {.a[0]}, {range .items[*]}...{end}, {'\n'} ----------
type J = unknown;

function walk(obj: J, path: string): J[] {
  let cur: J[] = [obj];
  const segs = path.replace(/^\$?\.?/, '').match(/[^.\[\]]+|\[[^\]]*\]/g) ?? [];
  for (const seg of segs) {
    const next: J[] = [];
    for (const o of cur) {
      if (seg.startsWith('[')) {
        const idx = seg.slice(1, -1).trim();
        if (!Array.isArray(o)) continue;
        if (idx === '*') next.push(...o);
        else if (/^\d+$/.test(idx)) { if (o[+idx] !== undefined) next.push(o[+idx]); }
        else if (idx.startsWith('?(')) {
          // filtro simple: ?(@.type=='InternalIP')
          const m = idx.match(/\?\(@\.([\w.]+)\s*==\s*['"]?([^'")]+)['"]?\)/);
          if (m) for (const it of o) if (String(walk(it, m[1])[0]) === m[2]) next.push(it);
        }
      } else {
        const key = seg.replace(/\\\./g, '.');
        if (o && typeof o === 'object' && !Array.isArray(o)) { const v = (o as Record<string, J>)[key]; if (v !== undefined) next.push(v); }
        else if (Array.isArray(o)) for (const it of o) { const v = it && typeof it === 'object' ? (it as Record<string, J>)[key] : undefined; if (v !== undefined) next.push(v); }
      }
    }
    cur = next;
  }
  return cur;
}

const str = (v: J) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v));

export function jsonpath(expr: string, obj: J): string {
  const parts = expr.split(/(\{[^}]*\})/).filter((p) => p !== '');
  let out = '';
  let i = 0;
  const render = (ctx: J, stop: string | null): string => {
    let s = '';
    while (i < parts.length) {
      const p = parts[i++];
      if (!p.startsWith('{')) { s += p; continue; }
      const inner = p.slice(1, -1).trim();
      if (inner === 'end') { if (stop === 'end') return s; continue; }
      if (inner.startsWith('range ')) {
        const items = walk(ctx, inner.slice(6).trim());
        const start = i;
        const list = items.length ? items : [undefined];
        for (const it of list) { i = start; const r = render(it, 'end'); if (it !== undefined) s += r; }
        continue;
      }
      if (/^['"]/.test(inner)) { s += inner.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t'); continue; }
      s += walk(ctx, inner).map(str).join(' ');
    }
    return s;
  };
  out = render(obj, null);
  return out;
}

export const base64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

/** Hash estable (para valores sintéticos de top, uids de contenedores...). */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
export const hex = (s: string, n = 12) => (hash(s).toString(16) + hash(s + 'x').toString(16) + hash(s + 'y').toString(16)).padStart(n, '0').slice(0, n);
