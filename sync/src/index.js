// Worker del curso KCNA. Sincronización: guarda y devuelve un bloque cifrado por código de sincronización; no
// puede leer el progreso (se cifra en el navegador). Ver docs/SINCRONIZACION.md.
// Diplomas: califica el examen final, emite constancias firmadas a quien lo aprueba y permite consultarlas. El nombre
// del titular es el único dato personal que se guarda. Ver docs/PLAN-DIPLOMAS.md.

const MAX_BODY = 96 * 1024;          // bytes del cuerpo JSON
const TTL_DAYS = 400;                // registros sin escribir en este tiempo se borran (cron diario)
const MAX_COPIAS = 7;                // copias anteriores que se conservan por registro
const DAY = 86_400_000;
const HEX64 = /^[0-9a-f]{64}$/;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CURSO = 'Ruta Cloud Native';
const MAX_DIPLOMA_BODY = 2048;
const EXAMEN_PREGUNTAS = 30;         // preguntas al azar por intento
const EXAMEN_APROBAR = 75;           // porcentaje mínimo de aciertos
const EXAMEN_INTENTOS = 3;           // intentos por cada diploma que permite el código
const EXAMEN_MINUTOS = 60;           // plazo para entregar
// letras de cualquier alfabeto con espacios, puntos, apóstrofos y guiones entre ellas
const NOMBRE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = { Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

function reply(body, status, headers) {
  const h = { ...headers, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (body === null) return new Response(null, { status, headers: h });
  return new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } });
}

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// comparación en tiempo constante para no filtrar el hash por tiempos de respuesta
function sameHash(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** La base aún no tiene alguna tabla nueva (schema.sql sin aplicar) */
const sinTabla = (e) => /no such table/i.test(String(e?.message ?? e));

// ---------- diplomas ----------
/** Texto exacto que se firma. El sitio lo reconstruye igual para comprobar la firma (web/src/lib/diploma.ts) */
const mensajeDiploma = (d) => JSON.stringify([1, d.id, d.nombre, d.curso, d.nota, d.emitido]);

async function firmar(env, texto) {
  const pkcs8 = Uint8Array.from(atob(env.DIPLOMA_KEY), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, false, ['sign']);
  const sig = await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(texto));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Lee un cuerpo JSON pequeño; devuelve una respuesta de error si no vale */
async function cuerpo(req, h, max) {
  if (Number(req.headers.get('Content-Length') ?? 0) > max) return { error: reply({ error: 'too_large' }, 413, h) };
  const text = await req.text();
  if (text.length > max) return { error: reply({ error: 'too_large' }, 413, h) };
  try {
    const body = JSON.parse(text);
    if (body && typeof body === 'object') return { body };
  } catch { /* cae abajo */ }
  return { error: reply({ error: 'bad_request' }, 400, h) };
}

async function limitar(env, req, h, zona) {
  if (!env.RATE_LIMITER) return null;
  const { success } = await env.RATE_LIMITER.limit({ key: `${zona}:${req.headers.get('CF-Connecting-IP') ?? ''}` });
  return success ? null : reply({ error: 'rate_limited' }, 429, { ...h, 'Retry-After': '60' });
}

// ---------- examen ----------
// Todo lo que decide el resultado ocurre aquí: el sorteo de preguntas, el plazo, la calificación y el número de
// intentos. El navegador solo recibe los enunciados y envía las opciones marcadas; las respuestas correctas no
// salen nunca del servidor, así que modificar el sitio o llamar a la API a mano no permite aprobar.

/** Lo que ve quien presenta el examen: enunciados y opciones, sin las respuestas */
async function enunciados(env, ids) {
  const { results } = await env.DB.prepare(`SELECT id, texto, opciones, correctas FROM pregunta WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
  const porId = new Map(results.map((p) => [p.id, p]));
  return ids.map((id) => {
    const p = porId.get(id);
    return p ? { texto: p.texto, opciones: JSON.parse(p.opciones), elige: JSON.parse(p.correctas).length } : { texto: '(pregunta retirada)', opciones: [], elige: 0 };
  });
}

async function examen(req, env, h, intento) {
  try {
    // Empezar un intento: un código de invitación con usos e intentos disponibles
    if (!intento) {
      if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405, { ...h, Allow: 'POST, OPTIONS' });
      const lim = await limitar(env, req, h, 'examen');
      if (lim) return lim;
      const { body, error } = await cuerpo(req, h, MAX_DIPLOMA_BODY);
      if (error) return error;
      if (typeof body.codigo !== 'string') return reply({ error: 'bad_request' }, 400, h);
      const codigo = body.codigo.toUpperCase().replace(/[^0-9A-Z]/g, '');
      if (codigo.length < 12 || codigo.length > 40) return reply({ error: 'codigo_invalido' }, 403, h);
      const ch = await sha256hex(codigo);

      const { results } = await env.DB.prepare('SELECT id FROM pregunta WHERE activa = 1 ORDER BY random() LIMIT ?').bind(EXAMEN_PREGUNTAS).all();
      if (results.length < EXAMEN_PREGUNTAS) return reply({ error: 'unavailable' }, 503, h); // banco sin cargar
      const ids = results.map((p) => p.id);
      const secreto = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
      const now = Date.now();
      // El intento solo se crea si al código le quedan usos e intentos; se cuenta al crearlo, se entregue o no
      const r = await env.DB.prepare(`INSERT INTO intento (id, codigo_hash, preguntas, creado)
        SELECT ?, codigo_hash, ?, ? FROM invitacion
        WHERE codigo_hash = ? AND usos < usos_max AND (SELECT COUNT(*) FROM intento WHERE codigo_hash = ?) < usos_max * ?`)
        .bind(await sha256hex(secreto), JSON.stringify(ids), now, ch, ch, EXAMEN_INTENTOS).run();
      if (!r.meta.changes) {
        const inv = await env.DB.prepare('SELECT usos, usos_max FROM invitacion WHERE codigo_hash = ?').bind(ch).first();
        return reply({ error: inv && inv.usos < inv.usos_max ? 'sin_intentos' : 'codigo_invalido' }, 403, h);
      }
      return reply({ intento: secreto, ahora: now, expira: now + EXAMEN_MINUTOS * 60_000, aprobar: EXAMEN_APROBAR, preguntas: await enunciados(env, ids) }, 201, h);
    }

    const ih = await sha256hex(intento);
    const row = await env.DB.prepare('SELECT preguntas, creado, entregado, nota, aprobado, diploma_id FROM intento WHERE id = ?').bind(ih).first();
    if (!row) return reply({ error: 'not_found' }, 404, h);
    const ids = JSON.parse(row.preguntas);
    const expira = row.creado + EXAMEN_MINUTOS * 60_000;
    const resultado = () => ({ entregado: row.entregado, nota: row.nota, aprobado: !!row.aprobado, aprobar: EXAMEN_APROBAR, diploma: row.diploma_id });

    // Retomar un intento (por ejemplo, tras recargar la página) o ver su resultado
    if (req.method === 'GET') {
      if (row.entregado) return reply(resultado(), 200, h);
      if (Date.now() > expira) return reply({ error: 'expirado' }, 410, h);
      return reply({ ahora: Date.now(), expira, aprobar: EXAMEN_APROBAR, preguntas: await enunciados(env, ids) }, 200, h);
    }

    // Entregar: se califica una sola vez y dentro del plazo (con un minuto de margen por la red)
    if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405, { ...h, Allow: 'GET, POST, OPTIONS' });
    if (row.entregado) return reply({ error: 'ya_entregado', ...resultado() }, 409, h);
    const now = Date.now();
    if (now > expira + 60_000) return reply({ error: 'expirado' }, 410, h);
    const { body, error } = await cuerpo(req, h, 8192);
    if (error) return error;
    const marcadas = body.respuestas;
    const valida = (r) => Array.isArray(r) && r.length <= 12 && r.every((n) => Number.isInteger(n) && n >= 0 && n < 100);
    if (!Array.isArray(marcadas) || marcadas.length !== ids.length || !marcadas.every(valida)) return reply({ error: 'bad_request' }, 400, h);

    const { results } = await env.DB.prepare(`SELECT id, correctas FROM pregunta WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
    const correctas = new Map(results.map((p) => [p.id, JSON.parse(p.correctas)]));
    // una pregunta cuenta solo si se marcaron exactamente sus opciones correctas
    const aciertos = ids.filter((id, i) => {
      const c = correctas.get(id), m = [...new Set(marcadas[i])];
      return c && m.length === c.length && m.every((n) => c.includes(n));
    }).length;
    const nota = Math.round((aciertos * 100) / ids.length);
    const aprobado = aciertos * 100 >= EXAMEN_APROBAR * ids.length ? 1 : 0;
    const r = await env.DB.prepare('UPDATE intento SET entregado = ?, nota = ?, aprobado = ? WHERE id = ? AND entregado IS NULL').bind(now, nota, aprobado, ih).run();
    if (!r.meta.changes) return reply({ error: 'ya_entregado' }, 409, h); // otra entrega llegó antes
    return reply({ entregado: now, nota, aprobado: !!aprobado, aprobar: EXAMEN_APROBAR, aciertos, total: ids.length, diploma: null }, 200, h);
  } catch (e) {
    if (!sinTabla(e)) throw e;
    return reply({ error: 'unavailable' }, 503, h); // base sin las tablas del examen
  }
}

async function diplomas(req, env, h, id) {
  try {
    // Consulta pública: cualquiera con el identificador puede comprobar un diploma
    if (id) {
      if (req.method !== 'GET') return reply({ error: 'method_not_allowed' }, 405, { ...h, Allow: 'GET, OPTIONS' });
      const d = await env.DB.prepare('SELECT id, nombre, curso, nota, emitido, firma, revocado FROM diploma WHERE id = ?').bind(id).first();
      return d ? reply(d, 200, h) : reply({ error: 'not_found' }, 404, h);
    }

    // Emisión: un intento de examen aprobado que aún no dio diploma, y el nombre que se imprimirá.
    // El aprobado se lee de la base; lo que diga el navegador sobre la nota no cuenta.
    if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405, { ...h, Allow: 'POST, OPTIONS' });
    if (!env.DIPLOMA_KEY) return reply({ error: 'unavailable' }, 503, h); // falta el secreto con la llave de firma
    const lim = await limitar(env, req, h, 'diploma');
    if (lim) return lim;
    const { body, error } = await cuerpo(req, h, MAX_DIPLOMA_BODY);
    if (error) return error;
    if (typeof body.nombre !== 'string' || typeof body.intento !== 'string') return reply({ error: 'bad_request' }, 400, h);
    const nombre = body.nombre.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (nombre.length < 3 || nombre.length > 80 || !NOMBRE.test(nombre)) return reply({ error: 'nombre_invalido' }, 400, h);
    if (!HEX64.test(body.intento)) return reply({ error: 'no_aprobado' }, 403, h);
    const ih = await sha256hex(body.intento);
    const it = await env.DB.prepare('SELECT codigo_hash, nota FROM intento WHERE id = ? AND aprobado = 1 AND diploma_id IS NULL').bind(ih).first();
    if (!it) return reply({ error: 'no_aprobado' }, 403, h);

    const d = { id: crypto.randomUUID(), nombre, curso: CURSO, nota: it.nota, emitido: Date.now() };
    const firma = await firmar(env, mensajeDiploma(d));
    // Una sola transacción: el diploma se inserta si el intento sigue sin diploma y al código le quedan usos;
    // después se marca el intento y se descuenta el uso, solo si el diploma llegó a insertarse.
    const emitido = 'EXISTS (SELECT 1 FROM diploma WHERE id = ?)';
    const [ins] = await env.DB.batch([
      env.DB.prepare(`INSERT INTO diploma (id, nombre, curso, nota, emitido, firma) SELECT ?, ?, ?, ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM intento WHERE id = ? AND aprobado = 1 AND diploma_id IS NULL)
          AND EXISTS (SELECT 1 FROM invitacion WHERE codigo_hash = ? AND usos < usos_max)`)
        .bind(d.id, d.nombre, d.curso, d.nota, d.emitido, firma, ih, it.codigo_hash),
      env.DB.prepare(`UPDATE intento SET diploma_id = ? WHERE id = ? AND ${emitido}`).bind(d.id, ih, d.id),
      env.DB.prepare(`UPDATE invitacion SET usos = usos + 1 WHERE codigo_hash = ? AND ${emitido}`).bind(it.codigo_hash, d.id),
    ]);
    if (!ins.meta.changes) return reply({ error: 'no_aprobado' }, 403, h);
    return reply({ ...d, firma, revocado: null }, 201, h);
  } catch (e) {
    if (!sinTabla(e)) throw e;
    return reply({ error: 'unavailable' }, 503, h); // base sin las tablas de diplomas
  }
}

export default {
  async fetch(req, env) {
    const h = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    const { pathname } = new URL(req.url);
    if (pathname === '/v1/health') return reply({ ok: true }, 200, h);
    const dm = pathname.match(/^\/v1\/diplomas(?:\/([^/]+))?$/);
    if (dm) return dm[1] && !UUID.test(dm[1]) ? reply({ error: 'not_found' }, 404, h) : diplomas(req, env, h, dm[1]);
    const em = pathname.match(/^\/v1\/examen(?:\/([^/]+))?$/);
    if (em) return em[1] && !HEX64.test(em[1]) ? reply({ error: 'not_found' }, 404, h) : examen(req, env, h, em[1]);
    const m = pathname.match(/^\/v1\/sync\/([0-9a-f]{64})(?:\/copias(?:\/([1-9][0-9]{0,8}))?)?$/);
    if (!m) return reply({ error: 'not_found' }, 404, h);
    const id = m[1];
    const copias = pathname.includes('/copias'); // lista de copias anteriores, o una si trae versión

    const auth = req.headers.get('Authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!HEX64.test(token)) return reply({ error: 'unauthorized' }, 401, h);

    // Límite de peticiones opcional (binding RATE_LIMITER en wrangler.jsonc): por registro, no por IP
    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: id });
      if (!success) return reply({ error: 'rate_limited' }, 429, { ...h, 'Retry-After': '60' });
    }

    const th = await sha256hex(token);
    const row = await env.DB.prepare('SELECT token_hash, rev, iv, data, updated FROM progreso WHERE id = ?').bind(id).first();
    if (row && !sameHash(row.token_hash, th)) return reply({ error: 'unauthorized' }, 401, h);

    // Copias anteriores (solo lectura): la versión que había al terminar cada día con cambios
    if (copias) {
      if (req.method !== 'GET') return reply({ error: 'method_not_allowed' }, 405, { ...h, Allow: 'GET, OPTIONS' });
      if (!row) return reply({ error: 'not_found' }, 404, h);
      try {
        if (m[2]) {
          const c = await env.DB.prepare('SELECT rev, iv, data, updated FROM copia WHERE id = ? AND rev = ?').bind(id, Number(m[2])).first();
          return c ? reply(c, 200, h) : reply({ error: 'not_found' }, 404, h);
        }
        const { results } = await env.DB.prepare('SELECT rev, updated FROM copia WHERE id = ? ORDER BY rev DESC').bind(id).all();
        return reply({ copias: results }, 200, h);
      } catch (e) {
        if (!sinTabla(e)) throw e;
        return reply({ error: 'not_found' }, 404, h); // como un Worker sin copias: el sitio oculta la sección
      }
    }

    if (req.method === 'GET') {
      if (!row) return reply({ error: 'not_found' }, 404, h);
      return reply({ rev: row.rev, iv: row.iv, data: row.data, updated: row.updated }, 200, h);
    }

    if (req.method === 'DELETE') {
      if (row) {
        const del = env.DB.prepare('DELETE FROM progreso WHERE id = ? AND token_hash = ?').bind(id, th);
        try {
          await env.DB.batch([env.DB.prepare('DELETE FROM copia WHERE id = ?').bind(id), del]);
        } catch (e) {
          if (!sinTabla(e)) throw e;
          await del.run();
        }
      }
      return reply(null, 204, h);
    }

    if (req.method === 'PUT') {
      if (Number(req.headers.get('Content-Length') ?? 0) > MAX_BODY) return reply({ error: 'too_large' }, 413, h);
      const text = await req.text();
      if (text.length > MAX_BODY) return reply({ error: 'too_large' }, 413, h);
      let body;
      try { body = JSON.parse(text); } catch { return reply({ error: 'bad_request' }, 400, h); }
      const { rev, iv, data } = body ?? {};
      if (!Number.isInteger(rev) || rev < 0 || typeof iv !== 'string' || iv.length > 24 || !B64.test(iv) || typeof data !== 'string' || !data || !B64.test(data)) {
        return reply({ error: 'bad_request' }, 400, h);
      }
      const now = Date.now();
      if (!row) {
        // primer guardado de este código: el token queda asociado al registro
        if (rev !== 0) return reply({ error: 'conflict', rev: 0 }, 409, h);
        const r = await env.DB.prepare('INSERT INTO progreso (id, token_hash, rev, iv, data, updated) VALUES (?, ?, 1, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
          .bind(id, th, iv, data, now).run();
        if (!r.meta.changes) return reply({ error: 'conflict', rev: 1 }, 409, h);
        return reply({ rev: 1, updated: now }, 200, h);
      }
      // concurrencia optimista: solo se escribe si nadie lo hizo desde la versión que leyó el cliente.
      // Si la versión que se va a sobrescribir es de un día anterior (UTC), antes se guarda como copia: queda
      // el estado con el que terminó cada día con cambios. Las tres sentencias van en una transacción y las dos
      // primeras comparten condición (misma versión), así que no se archiva nada si la escritura no ocurre.
      const today = now - (now % DAY);
      const update = () => env.DB.prepare('UPDATE progreso SET rev = rev + 1, iv = ?, data = ?, updated = ? WHERE id = ? AND rev = ? AND token_hash = ?')
        .bind(iv, data, now, id, rev, th);
      let r;
      try {
        [, r] = await env.DB.batch([
          env.DB.prepare('INSERT OR IGNORE INTO copia (id, rev, iv, data, updated) SELECT id, rev, iv, data, updated FROM progreso WHERE id = ? AND rev = ? AND token_hash = ? AND updated < ?')
            .bind(id, rev, th, today),
          update(),
          env.DB.prepare('DELETE FROM copia WHERE id = ? AND rev NOT IN (SELECT rev FROM copia WHERE id = ? ORDER BY rev DESC LIMIT ?)')
            .bind(id, id, MAX_COPIAS),
        ]);
      } catch (e) {
        // base sin la tabla `copia` (falta aplicar schema.sql): la sincronización sigue, sin copias
        if (!sinTabla(e)) throw e;
        r = await update().run();
      }
      if (!r.meta.changes) {
        const cur = await env.DB.prepare('SELECT rev FROM progreso WHERE id = ?').bind(id).first();
        return reply({ error: 'conflict', rev: cur?.rev ?? 0 }, 409, h);
      }
      return reply({ rev: rev + 1, updated: now }, 200, h);
    }

    return reply({ error: 'method_not_allowed' }, 405, { ...h, Allow: 'GET, PUT, DELETE, OPTIONS' });
  },

  // Limpieza diaria: registros abandonados y las copias que quedaron sin registro
  async scheduled(_event, env) {
    await env.DB.prepare('DELETE FROM progreso WHERE updated < ?').bind(Date.now() - TTL_DAYS * DAY).run();
    try {
      await env.DB.prepare('DELETE FROM copia WHERE id NOT IN (SELECT id FROM progreso)').run();
    } catch (e) {
      if (!sinTabla(e)) throw e;
    }
  },
};
