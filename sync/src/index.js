// Worker de sincronización del curso KCNA: guarda y devuelve un bloque cifrado por código de sincronización.
// No puede leer el progreso (se cifra en el navegador) ni guarda datos personales. Ver docs/SINCRONIZACION.md.

const MAX_BODY = 96 * 1024;          // bytes del cuerpo JSON
const TTL_DAYS = 400;                // registros sin escribir en este tiempo se borran (cron diario)
const HEX64 = /^[0-9a-f]{64}$/;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = { Vary: 'Origin' };
  if (origin && allowed.includes(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, PUT, DELETE, OPTIONS';
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

export default {
  async fetch(req, env) {
    const h = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    const { pathname } = new URL(req.url);
    if (pathname === '/v1/health') return reply({ ok: true }, 200, h);
    const m = pathname.match(/^\/v1\/sync\/([0-9a-f]{64})$/);
    if (!m) return reply({ error: 'not_found' }, 404, h);
    const id = m[1];

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

    if (req.method === 'GET') {
      if (!row) return reply({ error: 'not_found' }, 404, h);
      return reply({ rev: row.rev, iv: row.iv, data: row.data, updated: row.updated }, 200, h);
    }

    if (req.method === 'DELETE') {
      if (row) await env.DB.prepare('DELETE FROM progreso WHERE id = ? AND token_hash = ?').bind(id, th).run();
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
      // concurrencia optimista: solo se escribe si nadie lo hizo desde la versión que leyó el cliente
      const r = await env.DB.prepare('UPDATE progreso SET rev = rev + 1, iv = ?, data = ?, updated = ? WHERE id = ? AND rev = ? AND token_hash = ?')
        .bind(iv, data, now, id, rev, th).run();
      if (!r.meta.changes) {
        const cur = await env.DB.prepare('SELECT rev FROM progreso WHERE id = ?').bind(id).first();
        return reply({ error: 'conflict', rev: cur?.rev ?? 0 }, 409, h);
      }
      return reply({ rev: rev + 1, updated: now }, 200, h);
    }

    return reply({ error: 'method_not_allowed' }, 405, { ...h, Allow: 'GET, PUT, DELETE, OPTIONS' });
  },

  // Limpieza diaria: registros abandonados
  async scheduled(_event, env) {
    await env.DB.prepare('DELETE FROM progreso WHERE updated < ?').bind(Date.now() - TTL_DAYS * 86_400_000).run();
  },
};
