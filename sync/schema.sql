-- Un registro por código de sincronización. El servidor no puede leer `data`: va cifrado con AES-GCM
-- en el navegador. `token_hash` es SHA-256 del token que deriva el cliente; no se guarda nada personal.
CREATE TABLE IF NOT EXISTS progreso (
  id         TEXT PRIMARY KEY,          -- 64 hex, derivado del código con HKDF
  token_hash TEXT NOT NULL,             -- SHA-256 (hex) del token
  rev        INTEGER NOT NULL,          -- versión para concurrencia optimista
  iv         TEXT NOT NULL,             -- base64, 12 bytes
  data       TEXT NOT NULL,             -- base64 del progreso comprimido y cifrado
  updated    INTEGER NOT NULL           -- epoch ms de la última escritura
);
CREATE INDEX IF NOT EXISTS progreso_updated ON progreso (updated);

-- Copias anteriores: la versión con la que terminó cada día con cambios (se archiva al sobrescribirla al día
-- siguiente). Como máximo 7 por registro; van cifradas igual que `progreso.data`.
CREATE TABLE IF NOT EXISTS copia (
  id      TEXT NOT NULL,                -- el mismo id de `progreso`
  rev     INTEGER NOT NULL,             -- versión que tenía el registro
  iv      TEXT NOT NULL,
  data    TEXT NOT NULL,
  updated INTEGER NOT NULL,             -- epoch ms en que se escribió esa versión
  PRIMARY KEY (id, rev)
);
