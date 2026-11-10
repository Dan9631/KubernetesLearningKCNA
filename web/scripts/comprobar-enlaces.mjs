// Comprueba que cada fuente oficial de los ejercicios (FUENTES en src/lib/kube/drills.ts) responde 200 y que su ancla
// existe en la página. Necesita red, por eso no corre en el prebuild: node --use-system-ca scripts/comprobar-enlaces.mjs
// (--use-system-ca usa los certificados de Windows; hace falta detrás del proxy corporativo).
import { FUENTES } from '../src/lib/kube/drills.ts';
const usos = new Map();
for (const [id, list] of Object.entries(FUENTES)) for (const u of list) (usos.get(u) ?? usos.set(u, []).get(u)).push(id);
const paginas = new Map();
async function html(base) {
  if (!paginas.has(base)) paginas.set(base, (async () => {
    try { const r = await fetch(base, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 link-check' }, signal: AbortSignal.timeout(60000) }); return { status: r.status, body: r.ok ? await r.text() : '' }; }
    catch (e) { return { status: 0, body: '', err: String(e.cause?.code ?? e.message) }; }
  })());
  return paginas.get(base);
}
const malos = []; let ok = 0;
const urls = [...usos.keys()];
for (let i = 0; i < urls.length; i += 4) {
  await Promise.all(urls.slice(i, i + 4).map(async (u) => {
    const [base, ancla] = u.split('#');
    const p = await html(base);
    if (p.status !== 200) { malos.push(`${p.status || p.err}  ${u}  (${usos.get(u).join(', ')})`); return; }
    if (ancla) {
      const a = decodeURIComponent(ancla).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp(`(id|name)=["']?${a}(["'\s>])`).test(p.body)) { malos.push(`sin ancla #${ancla}  ${base}  (${usos.get(u).join(', ')})`); return; }
    }
    ok++;
  }));
}
console.log(`${urls.length} enlaces distintos: ${ok} correctos, ${malos.length} con problema`);
console.log(malos.sort().join('\n'));
