// Worker del curso KCNA. Sincronización: guarda y devuelve un bloque cifrado por código de sincronización; no
// puede leer el progreso (se cifra en el navegador). Ver docs/SINCRONIZACION.md.
// Diplomas: emite constancias firmadas a quien trae un código de invitación y permite consultarlas. El nombre
// del titular es el único dato personal que se guarda. Ver docs/PLAN-DIPLOMAS.md.

const MAX_BODY = 96 * 1024;          // bytes del cuerpo JSON
const TTL_DAYS = 400;                // registros sin escribir en este tiempo se borran (cron diario)
const MAX_COPIAS = 7;                // copias anteriores que se conservan por registro
const DAY = 86_400_000;
const HEX64 = /^[0-9a-f]{64}$/;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CURSO = 'Curso de preparación para KCNA';
const MAX_DIPLOMA_BODY = 2048;
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

async function diplomas(req, env, h, id) {
  try {
    // Consulta pública: cualquiera con el identificador puede comprobar un diploma
    if (id) {
      if (req.method !== 'GET') return reply({ error: 'method_not_allowed' }, 405, { ...h, Allow: 'GET, OPTIONS' });
      const d = await env.DB.prepare('SELECT id, nombre, curso, nota, emitido, firma, revocado FROM diploma WHERE id = ?').bind(id).first();
      return d ? reply(d, 200, h) : reply({ error: 'not_found' }, 404, h);
    }

    // Emisión: un código de invitación con usos disponibles y el nombre que se imprimirá
    if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405, { ...h, Allow: 'POST, OPTIONS' });
    if (!env.DIPLOMA_KEY) return reply({ error: 'unavailable' }, 503, h); // falta el secreto con la llave de firma
    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: `diploma:${req.headers.get('CF-Connecting-IP') ?? ''}` });
      if (!success) return reply({ error: 'rate_limited' }, 429, { ...h, 'Retry-After': '60' });
    }
    if (Number(req.headers.get('Content-Length') ?? 0) > MAX_DIPLOMA_BODY) return reply({ error: 'too_large' }, 413, h);
    const text = await req.text();
    if (text.length > MAX_DIPLOMA_BODY) return reply({ error: 'too_large' }, 413, h);
    let body;
    try { body = JSON.parse(text); } catch { return reply({ error: 'bad_request' }, 400, h); }
    if (typeof body?.nombre !== 'string' || typeof body?.codigo !== 'string') return reply({ error: 'bad_request' }, 400, h);
    const nombre = body.nombre.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (nombre.length < 3 || nombre.length > 80 || !NOMBRE.test(nombre)) return reply({ error: 'nombre_invalido' }, 400, h);
    const codigo = body.codigo.toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (codigo.length < 12 || codigo.length > 40) return reply({ error: 'codigo_invalido' }, 403, h);
    const ch = await sha256hex(codigo);

    const d = { id: crypto.randomUUID(), nombre, curso: CURSO, nota: null, emitido: Date.now() };
    const firma = await firmar(env, mensajeDiploma(d));
    // El diploma solo se inserta si al código le quedan usos, y el uso se descuenta en la misma transacción
    const libre = 'codigo_hash = ? AND usos < usos_max';
    const [ins] = await env.DB.batch([
      env.DB.prepare(`INSERT INTO diploma (id, nombre, curso, nota, emitido, firma) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM invitacion WHERE ${libre})`)
        .bind(d.id, d.nombre, d.curso, d.nota, d.emitido, firma, ch),
      env.DB.prepare(`UPDATE invitacion SET usos = usos + 1 WHERE ${libre} AND EXISTS (SELECT 1 FROM diploma WHERE id = ?)`).bind(ch, d.id),
    ]);
    // la misma respuesta para un código inexistente y uno agotado
    if (!ins.meta.changes) return reply({ error: 'codigo_invalido' }, 403, h);
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
