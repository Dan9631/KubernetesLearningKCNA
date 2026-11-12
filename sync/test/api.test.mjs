// Pruebas de la API contra `npm run dev` (o SYNC_URL=https://... para el Worker desplegado)
import { randomBytes, createHash } from 'node:crypto';
const BASE = process.env.SYNC_URL ?? 'http://127.0.0.1:8787';
// El Worker local cierra las conexiones inactivas; si una petición cae en una conexión ya cerrada, se repite
const rawFetch = globalThis.fetch;
const fetch = async (...a) => {
  for (let i = 0; ; i++) {
    try { return await rawFetch(...a); } catch (e) { if (i >= 5 || !(e instanceof TypeError)) throw e; await new Promise((ok) => setTimeout(ok, 300)); }
  }
};
const hex = (n) => randomBytes(n).toString('hex');
const id = hex(32), token = hex(32), other = hex(32);
const auth = (t = token) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });
const put = (body, t) => fetch(`${BASE}/v1/sync/${id}`, { method: 'PUT', headers: auth(t), body: JSON.stringify(body) });
const iv = randomBytes(12).toString('base64'), data = randomBytes(2000).toString('base64');
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); if (!ok) fails++; };

check((await (await fetch(`${BASE}/v1/health`)).json()).ok, 'health');
check((await fetch(`${BASE}/v1/sync/${id}`)).status === 401, 'sin token: 401');
check((await fetch(`${BASE}/v1/sync/${id}`, { headers: auth() })).status === 404, 'registro nuevo: 404');
check((await fetch(`${BASE}/v1/sync/xyz`, { headers: auth() })).status === 404, 'id inválido: 404');
let r = await put({ rev: 0, iv, data });
check(r.status === 200 && (await r.json()).rev === 1, 'primer PUT crea rev 1');
r = await fetch(`${BASE}/v1/sync/${id}`, { headers: auth() });
const got = await r.json();
check(r.status === 200 && got.data === data && got.iv === iv && got.rev === 1, 'GET devuelve el bloque');
r = await put({ rev: 0, iv, data });
check(r.status === 409 && (await r.json()).rev === 1, 'PUT con versión vieja: 409 con la actual');
r = await put({ rev: 1, iv, data: data.slice(4) });
check(r.status === 200 && (await r.json()).rev === 2, 'PUT con la versión correcta: rev 2');
check((await fetch(`${BASE}/v1/sync/${id}`, { headers: auth(other) })).status === 401, 'otro token: 401 al leer');
check((await put({ rev: 2, iv, data }, other)).status === 401, 'otro token: 401 al escribir');
check((await put({ rev: 2, iv, data: 'no es base64!' })).status === 400, 'datos no base64: 400');
check((await put({ rev: 2, iv, data: 'A'.repeat(100 * 1024) })).status === 413, 'más de 96 KB: 413');
r = await fetch(`${BASE}/v1/sync/${id}`, { method: 'OPTIONS', headers: { Origin: 'https://dan9631.github.io', 'Access-Control-Request-Method': 'PUT' } });
check(r.status === 204 && r.headers.get('access-control-allow-origin') === 'https://dan9631.github.io', 'CORS: origen permitido');
r = await fetch(`${BASE}/v1/sync/${id}`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'PUT' } });
check(!r.headers.get('access-control-allow-origin'), 'CORS: origen ajeno sin permiso');

// ---------- copias anteriores ----------
const copias = (t, rev = '') => fetch(`${BASE}/v1/sync/${id}/copias${rev && '/' + rev}`, { headers: auth(t) });
r = await copias();
const lista0 = await r.json();
check(r.status === 200 && Array.isArray(lista0.copias) && lista0.copias.length === 0, 'copias: lista vacía si todo se escribió hoy');
check((await copias(other)).status === 401, 'copias: otro token, 401');
check((await fetch(`${BASE}/v1/sync/${id}/copias`)).status === 401, 'copias: sin token, 401');
check((await fetch(`${BASE}/v1/sync/${hex(32)}/copias`, { headers: auth() })).status === 404, 'copias: registro inexistente, 404');
check((await copias(token, '1')).status === 404, 'copias: versión no archivada, 404');
check((await fetch(`${BASE}/v1/sync/${id}/copias/abc`, { headers: auth() })).status === 404, 'copias: versión inválida, 404');
check((await fetch(`${BASE}/v1/sync/${id}/copias`, { method: 'PUT', headers: auth(), body: '{}' })).status === 405, 'copias: solo lectura, 405');

// Para simular el paso de los días se retrasa la fecha del registro en la base local (solo contra `npm run dev`)
if (!process.env.SYNC_URL) {
  const { execSync } = await import('node:child_process');
  const sql = (q) => String(execSync(`npx wrangler d1 execute kcna-sync --local --json --command "${q}"`, { stdio: 'pipe' }));
  // tras tocar la base desde fuera, el Worker local cierra las conexiones abiertas: se espera a que vuelva a responder
  const listo = async () => { for (let i = 0; i < 40; i++) { try { if ((await fetch(`${BASE}/v1/health`)).ok) return; } catch { /* reintenta */ } await new Promise((ok) => setTimeout(ok, 250)); } };
  const ayer = async () => { sql(`UPDATE progreso SET updated = updated - 86400000 WHERE id = '${id}'`); await listo(); };
  const leer = async () => (await fetch(`${BASE}/v1/sync/${id}`, { headers: auth() })).json();
  const lista = async () => (await (await copias()).json()).copias;
  const bloque = (n) => Buffer.from(`version ${n} `.repeat(40)).toString('base64');

  // el registro está en rev 2; pasa un día y se escribe de nuevo
  const antes = await leer();
  await ayer();
  r = await put({ rev: 2, iv, data: bloque(3) });
  check(r.status === 200, 'PUT al día siguiente');
  let l = await lista();
  check(l.length === 1 && l[0].rev === 2 && l[0].updated === antes.updated - 86400000, 'se archiva la versión del día anterior, con su fecha');
  const c = await (await copias(token, '2')).json();
  check(c.data === antes.data && c.iv === antes.iv && c.rev === 2, 'la copia devuelve el bloque que había');
  check((await copias(other, '2')).status === 401, 'copia concreta con otro token: 401');

  r = await put({ rev: 3, iv, data: bloque(4) });
  check(r.status === 200 && (await lista()).length === 1, 'otra escritura el mismo día no archiva');

  await ayer();
  r = await put({ rev: 3, iv, data: bloque(5) });
  check(r.status === 409 && (await lista()).length === 1, 'un PUT rechazado por versión vieja no archiva');

  // diez días más, con una escritura cada día: quedan las 7 copias más recientes
  let rev = 4;
  for (let d = 0; d < 10; d++) { if (d) await ayer(); r = await put({ rev, iv, data: bloque(rev + 1) }); rev = (await r.json()).rev; }
  l = await lista();
  check(l.length === 7 && l[0].rev === rev - 1 && l.every((x, i) => !i || x.rev < l[i - 1].rev), `se conservan 7 copias, de la más reciente a la más antigua (${l.map((x) => x.rev).join(',')})`);
  check((await copias(token, '2')).status === 404, 'la copia más antigua se descartó');
  check((await leer()).rev === rev, 'el registro actual no se ve afectado');

  check((await fetch(`${BASE}/v1/sync/${id}`, { method: 'DELETE', headers: auth() })).status === 204, 'DELETE con copias: 204');
  await listo();
  const quedan = JSON.parse(sql(`SELECT COUNT(*) AS n FROM copia WHERE id = '${id}'`))[0].results[0].n;
  check(quedan === 0, 'borrar el registro borra sus copias');
  r = await put({ rev: 0, iv, data }); // se vuelve a crear para las pruebas de borrado de abajo
  check(r.status === 200, 'el mismo código se puede volver a usar tras borrar');
} else {
  console.log('     (copias con cambio de día: solo se prueban contra el Worker local)');
}

check((await fetch(`${BASE}/v1/sync/${id}`, { method: 'DELETE', headers: auth(other) })).status === 401, 'borrar con otro token: 401');
check((await fetch(`${BASE}/v1/sync/${id}`, { method: 'DELETE', headers: auth() })).status === 204, 'DELETE: 204');
check((await fetch(`${BASE}/v1/sync/${id}`, { headers: auth() })).status === 404, 'tras borrar: 404');

// ---------- diplomas ----------
const { randomUUID, createPublicKey, createPrivateKey, verify } = await import('node:crypto');
const pedir = (body) => fetch(`${BASE}/v1/diplomas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const diploma = (d) => fetch(`${BASE}/v1/diplomas/${d}`);
check((await diploma(randomUUID())).status === 404, 'diploma inexistente: 404');
check((await diploma('no-es-un-uuid')).status === 404, 'diploma con identificador inválido: 404');
check((await fetch(`${BASE}/v1/diplomas`)).status === 405, 'diplomas: la lista no se puede leer, 405');
check((await fetch(`${BASE}/v1/diplomas/${randomUUID()}`, { method: 'DELETE' })).status === 405, 'diploma: solo lectura, 405');

if (!process.env.SYNC_URL) {
  // contra el Worker local: se da de alta un código de dos usos y se comprueba la firma con la llave de .dev.vars
  const { execSync } = await import('node:child_process');
  const { readFileSync } = await import('node:fs');
  const sql = (q) => String(execSync(`npx wrangler d1 execute kcna-sync --local --json --command "${q}"`, { stdio: 'pipe' }));
  const listo = async () => { for (let i = 0; i < 40; i++) { try { if ((await fetch(`${BASE}/v1/health`)).ok) return; } catch { /* reintenta */ } await new Promise((ok) => setTimeout(ok, 250)); } };
  const privada = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').match(/^DIPLOMA_KEY=(.+)$/m)?.[1];
  if (!privada) throw new Error('Falta la llave de prueba: ejecuta `node scripts/llave-diploma.mjs --local` y reinicia `npm run dev`');
  const publica = createPublicKey(createPrivateKey({ key: Buffer.from(privada, 'base64'), format: 'der', type: 'pkcs8' }));
  const firmaOk = (d) => verify(null, Buffer.from(JSON.stringify([1, d.id, d.nombre, d.curso, d.nota, d.emitido])), publica, Buffer.from(d.firma, 'base64'));

  const codigo = randomBytes(10).toString('hex').toUpperCase();
  const ch = createHash('sha256').update(codigo).digest('hex');
  sql(`INSERT INTO invitacion (codigo_hash, usos_max, usos, creado) VALUES ('${ch}', 2, 0, ${Date.now()})`);
  await listo();
  const usos = () => JSON.parse(sql(`SELECT usos FROM invitacion WHERE codigo_hash = '${ch}'`))[0].results[0].usos;

  check((await pedir('{')).status === 400, 'diploma: cuerpo que no es JSON, 400');
  check((await pedir({ codigo })).status === 400, 'diploma: sin nombre, 400');
  for (const malo of ['Al', 'x'.repeat(81), '<b>Ana</b>', 'Ana 2', '  ']) {
    r = await pedir({ codigo, nombre: malo });
    check(r.status === 400 && (await r.json()).error === 'nombre_invalido', `diploma: nombre inválido (${malo.slice(0, 12)}), 400`);
  }
  check((await pedir({ codigo: 'x'.repeat(3000), nombre: 'Ana Pérez' })).status === 413, 'diploma: cuerpo demasiado grande, 413');
  r = await pedir({ codigo: randomBytes(10).toString('hex'), nombre: 'Ana Pérez' });
  check(r.status === 403 && (await r.json()).error === 'codigo_invalido', 'diploma: código inexistente, 403');
  await listo();
  check(usos() === 0, 'los intentos fallidos no gastan usos del código');

  // el código se acepta con guiones y en minúsculas; el nombre se guarda sin espacios sobrantes
  r = await pedir({ codigo: codigo.toLowerCase().match(/.{4}/g).join('-'), nombre: '  María  José   O’Brien-Núñez ' });
  const d1 = await r.json();
  check(r.status === 201 && d1.nombre === 'María José O’Brien-Núñez' && d1.revocado === null && d1.nota === null, 'diploma emitido: 201 con el nombre normalizado');
  check(firmaOk(d1), 'la firma del diploma es válida');
  check(!firmaOk({ ...d1, nombre: 'Otra Persona' }) && !firmaOk({ ...d1, emitido: d1.emitido + 1 }), 'un diploma alterado no pasa la firma');
  r = await diploma(d1.id);
  const visto = await r.json();
  check(r.status === 200 && JSON.stringify(visto) === JSON.stringify(d1), 'la consulta devuelve el diploma emitido');

  r = await pedir({ codigo, nombre: 'Ana Pérez' });
  const d2 = await r.json();
  check(r.status === 201 && d2.id !== d1.id && firmaOk(d2), 'segundo uso del código: otro diploma');
  r = await pedir({ codigo, nombre: 'Luis Gómez' });
  check(r.status === 403 && (await r.json()).error === 'codigo_invalido', 'código agotado: 403');
  await listo();
  check(usos() === 2, 'el código queda con sus dos usos gastados');

  sql(`UPDATE diploma SET revocado = ${Date.now()} WHERE id = '${d2.id}'`);
  await listo();
  const rev2 = await (await diploma(d2.id)).json();
  check(rev2.revocado > 0 && firmaOk(rev2), 'diploma revocado: se consulta con su fecha de revocación');

  sql(`DELETE FROM diploma WHERE id IN ('${d1.id}', '${d2.id}'); DELETE FROM invitacion WHERE codigo_hash = '${ch}'`);
  await listo();
  check((await diploma(d1.id)).status === 404, 'diploma borrado: 404');
} else {
  r = await pedir({ codigo: randomBytes(10).toString('hex'), nombre: 'Prueba Automática' });
  check(r.status === 403 || r.status === 503, `diploma con código inexistente: ${r.status === 503 ? '503, la emisión aún no está configurada' : '403'}`);
  console.log('     (emisión y firma de diplomas: solo se prueban contra el Worker local)');
}
console.log(fails ? `\n${fails} fallos` : '\nTodo OK');
process.exitCode = fails ? 1 : 0;
