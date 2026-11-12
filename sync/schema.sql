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

-- Diplomas (ver docs/PLAN-DIPLOMAS.md). Es el único dato personal del sistema: el nombre que el titular pide
-- imprimir. No se relaciona con `progreso` ni caduca con su limpieza.
CREATE TABLE IF NOT EXISTS diploma (
  id        TEXT PRIMARY KEY,           -- UUID, va en el diploma y en el QR
  nombre    TEXT NOT NULL,              -- tal como aparece en el diploma
  curso     TEXT NOT NULL,
  nota      INTEGER,                    -- porcentaje del examen; NULL si se emitió sin examen
  emitido   INTEGER NOT NULL,           -- epoch ms
  firma     TEXT NOT NULL,              -- Ed25519 (base64) sobre [1, id, nombre, curso, nota, emitido] en JSON
  revocado  INTEGER                     -- epoch ms; NULL si sigue vigente
);

-- Códigos de invitación para pedir un diploma. Solo se guarda el SHA-256 del código.
CREATE TABLE IF NOT EXISTS invitacion (
  codigo_hash TEXT PRIMARY KEY,
  usos_max    INTEGER NOT NULL DEFAULT 1,
  usos        INTEGER NOT NULL DEFAULT 0,
  creado      INTEGER NOT NULL          -- epoch ms
);

-- Banco de preguntas del examen final. Las respuestas solo viven aquí: no van en el sitio ni en el repositorio.
-- Se carga con `npm run examen:banco` (ver README.md).
CREATE TABLE IF NOT EXISTS pregunta (
  id        INTEGER PRIMARY KEY,
  texto     TEXT NOT NULL,
  opciones  TEXT NOT NULL,              -- lista JSON de textos
  correctas TEXT NOT NULL,              -- lista JSON con las posiciones de las opciones correctas
  activa    INTEGER NOT NULL DEFAULT 1  -- 0 = retirada: no sale en intentos nuevos
);

-- Intentos de examen. Cada uno fija en el servidor qué preguntas tocaron, cuándo empezó y qué nota sacó.
CREATE TABLE IF NOT EXISTS intento (
  id          TEXT PRIMARY KEY,         -- SHA-256 del identificador secreto que recibe el navegador
  codigo_hash TEXT NOT NULL,            -- código de invitación con el que se empezó
  preguntas   TEXT NOT NULL,            -- lista JSON de ids de `pregunta`, en el orden mostrado
  creado      INTEGER NOT NULL,         -- epoch ms; el plazo de entrega cuenta desde aquí
  entregado   INTEGER,                  -- epoch ms; NULL si no se entregó
  nota        INTEGER,                  -- porcentaje de aciertos
  aprobado    INTEGER,                  -- 1 si alcanzó la nota mínima
  diploma_id  TEXT                      -- diploma emitido con este intento; NULL si ninguno
);
CREATE INDEX IF NOT EXISTS intento_codigo ON intento (codigo_hash);
