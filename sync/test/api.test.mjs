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
const HEXRE = /^[0-9a-f]{64}$/;
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

// ---------- examen y diplomas ----------
const { randomUUID, createPublicKey, createPrivateKey, verify } = await import('node:crypto');
const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const empezar = (codigo) => fetch(`${BASE}/v1/examen`, json({ codigo }));
const entregar = (intento, body) => fetch(`${BASE}/v1/examen/${intento}`, json(body));
const pedir = (body) => fetch(`${BASE}/v1/diplomas`, json(body));
const diploma = (d) => fetch(`${BASE}/v1/diplomas/${d}`);
check((await diploma(randomUUID())).status === 404, 'diploma inexistente: 404');
check((await diploma('no-es-un-uuid')).status === 404, 'diploma con identificador inválido: 404');
check((await fetch(`${BASE}/v1/diplomas`)).status === 405, 'diplomas: la lista no se puede leer, 405');
check((await fetch(`${BASE}/v1/diplomas/${randomUUID()}`, { method: 'DELETE' })).status === 405, 'diploma: solo lectura, 405');
check((await fetch(`${BASE}/v1/examen/${hex(32)}`)).status === 404, 'intento inexistente: 404');
check((await fetch(`${BASE}/v1/examen`)).status === 405, 'examen: los intentos no se pueden listar, 405');

if (!process.env.SYNC_URL) {
  // Contra el Worker local: códigos y preguntas de prueba, y la firma se comprueba con la llave de .dev.vars
  const { execSync } = await import('node:child_process');
  const { readFileSync, writeFileSync, rmSync } = await import('node:fs');
  const run = (args) => String(execSync(`npx wrangler d1 execute kcna-sync --local --json ${args}`, { stdio: 'pipe' }));
  const listo = async () => { for (let i = 0; i < 40; i++) { try { if ((await fetch(`${BASE}/v1/health`)).ok) return; } catch { /* reintenta */ } await new Promise((ok) => setTimeout(ok, 250)); } };
  const sql = async (q) => { const out = JSON.parse(run(`--command "${q}"`)); await listo(); return out[0].results; };
  const privada = readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').match(/^DIPLOMA_KEY=(.+)$/m)?.[1];
  if (!privada) throw new Error('Falta la llave de prueba: ejecuta `npm run diploma:llave -- --local` y reinicia `npm run dev`');
  const publica = createPublicKey(createPrivateKey({ key: Buffer.from(privada, 'base64'), format: 'der', type: 'pkcs8' }));
  const firmaOk = (d) => verify(null, Buffer.from(JSON.stringify([1, d.id, d.nombre, d.curso, d.nota, d.emitido])), publica, Buffer.from(d.firma, 'base64'));

  // 40 preguntas de prueba (ids desde 900001), una de cada cinco con dos respuestas correctas; el resto del banco
  // local se retira mientras duran las pruebas para que el sorteo solo use estas
  const otras = (await sql('SELECT id FROM pregunta WHERE activa = 1 AND id < 900000')).map((p) => p.id);
  const banco = Array.from({ length: 40 }, (_, i) => ({ id: 900001 + i, texto: `Pregunta de prueba ${i + 1}`, opciones: ['a', 'b', 'c', 'd'], correctas: i % 5 ? [i % 4] : [1, 3] }));
  const archivo = new URL('./banco-prueba.sql', import.meta.url);
  writeFileSync(archivo, [
    'UPDATE pregunta SET activa = 0 WHERE id < 900000;',
    ...banco.map((p) => `INSERT OR REPLACE INTO pregunta (id, texto, opciones, correctas, activa) VALUES (${p.id}, '${p.texto}', '${JSON.stringify(p.opciones)}', '${JSON.stringify(p.correctas)}', 1);`),
  ].join('\n'));
  run('--file=test/banco-prueba.sql');
  rmSync(archivo);
  await listo();
  const correctas = new Map(banco.map((p) => [p.texto, p.correctas]));
  /** Respuestas para un examen: correctas en las primeras `n` preguntas y equivocadas en el resto */
  const responder = (preguntas, n) => preguntas.map((p, i) => (i < n ? correctas.get(p.texto) : [(correctas.get(p.texto)[0] + 1) % 4]));

  const codigos = [];
  const nuevoCodigo = async (usos) => {
    const codigo = randomBytes(10).toString('hex').toUpperCase();
    const ch = createHash('sha256').update(codigo).digest('hex');
    await sql(`INSERT INTO invitacion (codigo_hash, usos_max, usos, creado) VALUES ('${ch}', ${usos}, 0, ${Date.now()})`);
    codigos.push(ch);
    return { codigo, ch };
  };
  const usos = async (ch) => (await sql(`SELECT usos FROM invitacion WHERE codigo_hash = '${ch}'`))[0].usos;
  const idDe = (intento) => createHash('sha256').update(intento).digest('hex');

  // --- empezar un intento ---
  const A = await nuevoCodigo(1);
  check((await empezar(undefined)).status === 400, 'examen: sin código, 400');
  r = await empezar(randomBytes(10).toString('hex'));
  check(r.status === 403 && (await r.json()).error === 'codigo_invalido', 'examen: código inexistente, 403');
  r = await empezar(A.codigo.toLowerCase().match(/.{4}/g).join('-'));
  const e1 = await r.json();
  check(r.status === 201 && HEXRE.test(e1.intento) && e1.preguntas.length === 30 && e1.aprobar === 75, 'examen: empieza con 30 preguntas (código con guiones y minúsculas)');
  check(new Set(e1.preguntas.map((p) => p.texto)).size === 30, 'las 30 preguntas son distintas');
  check(!/correcta|answer/i.test(JSON.stringify(e1)) && e1.preguntas.every((p) => Object.keys(p).sort().join() === 'elige,opciones,texto'), 'la respuesta del examen no trae las respuestas correctas');
  check(e1.preguntas.every((p) => p.elige === correctas.get(p.texto).length), 'cada pregunta dice cuántas opciones hay que marcar');
  r = await fetch(`${BASE}/v1/examen/${e1.intento}`);
  const e1b = await r.json();
  check(r.status === 200 && JSON.stringify(e1b.preguntas) === JSON.stringify(e1.preguntas) && e1b.expira === e1.expira, 'retomar el intento devuelve las mismas preguntas y el mismo plazo');

  // --- trampas ---
  r = await pedir({ intento: e1.intento, nombre: 'Ana Pérez' });
  check(r.status === 403 && (await r.json()).error === 'no_aprobado', 'TRAMPA pedir el diploma sin entregar el examen: 403');
  r = await pedir({ intento: hex(32), nombre: 'Ana Pérez' });
  check(r.status === 403, 'TRAMPA pedir el diploma con un intento inventado: 403');
  r = await pedir({ codigo: A.codigo, nombre: 'Ana Pérez' });
  check(r.status === 400, 'TRAMPA pedir el diploma solo con el código, sin examen: 400');
  r = await pedir({ intento: e1.intento, nombre: 'Ana Pérez', aprobado: true, nota: 100 });
  check(r.status === 403, 'TRAMPA pedir el diploma diciendo «aprobado: true»: 403');

  for (const mal of [{ respuestas: 'todas' }, { respuestas: [[0]] }, { respuestas: e1.preguntas.map(() => ['a']) }, { respuestas: e1.preguntas.map(() => 0) }, {}]) {
    check((await entregar(e1.intento, mal)).status === 400, `entrega mal formada (${JSON.stringify(mal).slice(0, 28)}…): 400`);
  }
  check((await entregar(e1.intento, '{')).status === 400, 'entrega que no es JSON: 400');

  // todas equivocadas, pero el cuerpo dice que aprobó: cuenta lo que califica el servidor
  r = await entregar(e1.intento, { respuestas: responder(e1.preguntas, 0), nota: 100, aprobado: true, aciertos: 30 });
  const res1 = await r.json();
  check(r.status === 200 && res1.nota === 0 && res1.aprobado === false && res1.aciertos === 0, 'TRAMPA entregar todo mal diciendo «nota: 100»: el servidor califica 0 y no aprueba');
  check(!/correcta/i.test(JSON.stringify(res1)), 'el resultado no revela las respuestas correctas');
  r = await entregar(e1.intento, { respuestas: responder(e1.preguntas, 30) });
  check(r.status === 409 && (await r.json()).error === 'ya_entregado', 'TRAMPA entregar otra vez con las respuestas buenas: 409');
  r = await pedir({ intento: e1.intento, nombre: 'Ana Pérez' });
  check(r.status === 403, 'TRAMPA pedir el diploma con un intento reprobado: 403');
  const visto = await (await fetch(`${BASE}/v1/examen/${e1.intento}`)).json();
  check(visto.nota === 0 && visto.aprobado === false && !visto.preguntas, 'un intento entregado ya no muestra las preguntas, solo el resultado');

  // marcar todas las opciones de cada pregunta no cuenta como acierto
  const e2 = await (await empezar(A.codigo)).json();
  r = await entregar(e2.intento, { respuestas: e2.preguntas.map(() => [0, 1, 2, 3]) });
  check((await r.json()).aciertos === 0, 'TRAMPA marcar todas las opciones de cada pregunta: 0 aciertos');

  // fuera de plazo: se retrasa el inicio del intento en la base
  const e3 = await (await empezar(A.codigo)).json();
  await sql(`UPDATE intento SET creado = creado - 62 * 60000 WHERE id = '${idDe(e3.intento)}'`);
  r = await entregar(e3.intento, { respuestas: responder(e3.preguntas, 30) });
  check(r.status === 410 && (await r.json()).error === 'expirado', 'TRAMPA entregar pasado el plazo de 60 minutos: 410');
  check((await fetch(`${BASE}/v1/examen/${e3.intento}`)).status === 410, 'un intento vencido ya no muestra las preguntas');

  r = await empezar(A.codigo);
  check(r.status === 403 && (await r.json()).error === 'sin_intentos', 'cuarto intento con el mismo código: 403, sin intentos');
  check((await usos(A.ch)) === 0, 'reprobar no gasta el uso del código');

  // --- nota mínima: 22 de 30 no aprueba, 23 de 30 sí ---
  const B = await nuevoCodigo(1);
  const b1 = await (await empezar(B.codigo)).json();
  const rb1 = await (await entregar(b1.intento, { respuestas: responder(b1.preguntas, 22) })).json();
  check(rb1.aciertos === 22 && rb1.nota === 73 && rb1.aprobado === false, '22 de 30 (73 %): no aprueba');
  const b2 = await (await empezar(B.codigo)).json();
  const rb2 = await (await entregar(b2.intento, { respuestas: responder(b2.preguntas, 23) })).json();
  check(rb2.aciertos === 23 && rb2.nota === 77 && rb2.aprobado === true, '23 de 30 (77 %): aprueba');

  // --- emisión ---
  for (const malo of ['Al', 'x'.repeat(81), '<b>Ana</b>', 'Ana 2', '  ']) {
    r = await pedir({ intento: b2.intento, nombre: malo });
    check(r.status === 400 && (await r.json()).error === 'nombre_invalido', `diploma: nombre inválido (${malo.slice(0, 12)}), 400`);
  }
  check((await pedir({ intento: b2.intento, nombre: 'x'.repeat(3000) })).status === 413, 'diploma: cuerpo demasiado grande, 413');
  r = await pedir({ intento: b2.intento, nombre: '  María  José   O’Brien-Núñez ', nota: 100 });
  const d1 = await r.json();
  check(r.status === 201 && d1.nombre === 'María José O’Brien-Núñez' && d1.revocado === null, 'diploma emitido tras aprobar: 201 con el nombre normalizado');
  check(d1.nota === 77, 'TRAMPA pedir el diploma con «nota: 100»: lleva la nota real del examen (77)');
  check(firmaOk(d1), 'la firma del diploma es válida');
  check(!firmaOk({ ...d1, nombre: 'Otra Persona' }) && !firmaOk({ ...d1, nota: 100 }) && !firmaOk({ ...d1, emitido: d1.emitido + 1 }), 'un diploma alterado (nombre, nota o fecha) no pasa la firma');
  r = await diploma(d1.id);
  check(r.status === 200 && JSON.stringify(await r.json()) === JSON.stringify(d1), 'la consulta devuelve el diploma emitido');
  r = await pedir({ intento: b2.intento, nombre: 'Luis Gómez' });
  check(r.status === 403, 'TRAMPA sacar un segundo diploma con el mismo intento aprobado: 403');
  check((await usos(B.ch)) === 1, 'el diploma gasta el uso del código');
  r = await empezar(B.codigo);
  check(r.status === 403 && (await r.json()).error === 'codigo_invalido', 'código ya usado: no deja empezar otro examen');
  check((await (await fetch(`${BASE}/v1/examen/${b2.intento}`)).json()).diploma === d1.id, 'el intento recuerda qué diploma dio');

  // dos personas aprueban con un código de un solo uso: solo sale un diploma
  const C = await nuevoCodigo(1);
  const c1 = await (await empezar(C.codigo)).json(), c2 = await (await empezar(C.codigo)).json();
  await entregar(c1.intento, { respuestas: responder(c1.preguntas, 30) });
  await entregar(c2.intento, { respuestas: responder(c2.preguntas, 30) });
  const [p1, p2] = await Promise.all([pedir({ intento: c1.intento, nombre: 'Ana Pérez' }), pedir({ intento: c2.intento, nombre: 'Luis Gómez' })]);
  check([p1.status, p2.status].sort().join() === '201,403' && (await usos(C.ch)) === 1, 'TRAMPA dos aprobados a la vez con un código de un uso: un solo diploma');
  const d2 = await (p1.status === 201 ? p1 : p2).json();

  await sql(`UPDATE diploma SET revocado = ${Date.now()} WHERE id = '${d2.id}'`);
  const rev2 = await (await diploma(d2.id)).json();
  check(rev2.revocado > 0 && firmaOk(rev2), 'diploma revocado: se consulta con su fecha de revocación');

  // con menos de 30 preguntas activas no se puede empezar
  const D = await nuevoCodigo(1);
  await sql('UPDATE pregunta SET activa = 0 WHERE id > 900029');
  check((await empezar(D.codigo)).status === 503, 'banco con menos de 30 preguntas: 503');

  // limpieza: fuera lo de prueba y el banco local vuelve a como estaba
  const lista = codigos.map((c) => `'${c}'`).join(',');
  await sql(`DELETE FROM diploma WHERE id IN ('${d1.id}', '${d2.id}'); DELETE FROM intento WHERE codigo_hash IN (${lista}); DELETE FROM invitacion WHERE codigo_hash IN (${lista}); DELETE FROM pregunta WHERE id >= 900000`);
  if (otras.length) await sql(`UPDATE pregunta SET activa = 1 WHERE id IN (${otras.join(',')})`);
  check((await diploma(d1.id)).status === 404, 'diploma borrado: 404');
} else {
  r = await empezar(randomBytes(10).toString('hex'));
  check(r.status === 403 || r.status === 503, `examen con código inexistente: ${r.status === 503 ? '503, el banco de preguntas aún no está cargado' : '403'}`);
  r = await pedir({ intento: hex(32), nombre: 'Prueba Automática' });
  check(r.status === 403 || r.status === 503, `diploma con un intento inventado: ${r.status === 503 ? '503, la emisión aún no está configurada' : '403'}`);
  r = await pedir({ codigo: randomBytes(10).toString('hex'), nombre: 'Prueba Automática' });
  check(r.status === 400 || r.status === 503, 'diploma solo con un código, sin examen: rechazado');
  console.log('     (examen, trampas y firma de diplomas: solo se prueban contra el Worker local)');
}
console.log(fails ? `\n${fails} fallos` : '\nTodo OK');
process.exitCode = fails ? 1 : 0;
