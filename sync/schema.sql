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
