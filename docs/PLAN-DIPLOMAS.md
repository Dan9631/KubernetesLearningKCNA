# Plan: diplomas de finalización firmados y verificables

Estado (2026-11-12): **fases 2 y 3 implementadas en la rama `diplomas`, sin desplegar**. Faltan el examen
(fase 1) y el PDF (fase 4).

Hecho:

- Worker: tablas `diploma` e `invitacion`, `POST /v1/diplomas` (código de invitación + nombre) y
  `GET /v1/diplomas/<id>`, firma Ed25519 con el secreto `DIPLOMA_KEY`. Pruebas en `sync/test/api.test.mjs`.
- Sitio: `/diploma` (pedirlo) y `/verificar/?id=<id>` (consultarlo y comprobar la firma en el navegador con
  la variable `DIPLOMA_PUBLIC_KEY`). El sitio es estático, así que el identificador va en `?id=` y no en la ruta.
- Instalación y mantenimiento: sección «Diplomas» de `sync/README.md`.

Mientras no exista el examen, un código de invitación basta para emitir: solo deben darse a personas de
confianza. Los diplomas emitidos así llevan `nota` vacía.

## Objetivo

Poder emitir una constancia de que alguien terminó el curso, con una firma que cualquiera pueda comprobar
en una página pública, sin depender de confiar en el PDF.

## Punto de partida (verificado en el código)

- El backend es el Worker de `sync/` (`sync/src/index.js`) con base D1 (`sync/schema.sql`).
- Solo existen las rutas `/v1/health` y `/v1/sync/<id>[/copias[/<rev>]]`.
- El progreso va **cifrado de extremo a extremo** (AES-GCM en el navegador). El servidor no puede leerlo
  y no guarda ningún dato personal: solo `id`, `token_hash`, `rev`, `iv`, `data`, `updated`.
- Los registros sin actividad se borran por TTL.

Consecuencias para los diplomas:

1. El servidor **no puede comprobar** el progreso sincronizado. Lo que diga el cliente se puede falsificar.
2. Emitir un diploma obliga a guardar un nombre, que hoy el sistema no guarda. Debe ser un flujo aparte
   y voluntario, sin tocar la tabla `progreso` ni debilitar el cifrado.
3. Los diplomas no pueden caducar por el TTL de `progreso`: van en su propia tabla.

## Decisiones tomadas (2026-11-12)

| Decisión | Elegido | Efecto |
|---|---|---|
| ¿Para quién es? | Público general | El examen en el servidor es obligatorio, no opcional |
| ¿Quién firma? | El autor, como persona | Falta el nombre y cargo exactos que irán impresos |
| ¿Cómo se prueba que terminó? | Examen final en el servidor | La fase 1 entra antes de abrir al público; se descarta el modo "autodeclarado" |
| ¿Quién puede pedirlo? | Solo con código de invitación | El código habilita presentar el examen; hace falta una tabla de códigos |

## Puntos abiertos

- Nombre y cargo del firmante.
- Dónde vive el banco de preguntas: si el repositorio es público, las respuestas no pueden estar en
  `sync/`; irían en D1, cargadas con un script que no se sube al repositorio.
- Tamaño del banco, número de preguntas por intento, nota mínima e intentos por código.
- Si un código sirve para una sola persona o para un grupo.

## Diseño propuesto

### Fase 1 — Criterio de finalización calificado en el servidor

- Examen final: el Worker entrega N preguntas al azar de un banco y guarda el intento.
- Las respuestas correctas viven solo en el servidor (no en el bundle de `web/`).
- El Worker califica; aprobar (p. ej. ≥ 75 %) habilita la emisión.
- Límite de intentos por día con el `RATE_LIMITER` que ya existe.
- Para presentar el examen hace falta un código de invitación válido.

### Fase 2 — Emisión y firma

Tabla nueva en `sync/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS diploma (
  id        TEXT PRIMARY KEY,   -- UUID, va en el PDF y en el QR
  nombre    TEXT NOT NULL,      -- tal como aparece en el diploma
  curso     TEXT NOT NULL,      -- p. ej. "KCNA v1"
  nota      INTEGER,            -- porcentaje del examen
  emitido   INTEGER NOT NULL,   -- epoch ms
  firma     TEXT NOT NULL,      -- Ed25519 sobre el JSON canónico de los campos anteriores
  revocado  INTEGER             -- epoch ms, NULL si sigue vigente
);
```

- Firma **Ed25519** con WebCrypto en el Worker.
- Llave privada como secreto del Worker (`wrangler secret put DIPLOMA_KEY`); nunca en el repositorio.
- Llave pública publicada en el sitio y en el repositorio.
- Rutas nuevas: `POST /v1/diplomas` (emitir tras aprobar) y `GET /v1/diplomas/<id>` (consultar).

### Fase 3 — Verificación pública

- Página `web/src/pages/verificar.astro` que recibe el ID, consulta el Worker y muestra
  "válido, emitido a X el Y" o "revocado / no existe".
- La página también comprueba la firma en el navegador con la llave pública, para no depender
  solo de la respuesta del servidor.
- Revocación manual (un comando de `wrangler d1 execute`) basta al principio.

### Fase 4 — El diploma en sí

- PDF generado en el navegador con nombre, curso, fecha, ID, QR a `/verificar/<id>`, firmante y cargo.
- Texto obligatorio: **"Constancia de finalización del curso"**. No es la certificación KCNA, que solo
  emiten CNCF y la Linux Foundation. No usar sus logos ni marcas.

### Fase 5 — Opcional

- Exportar como Open Badges 3.0 / W3C Verifiable Credential para que LinkedIn y similares lo reconozcan.
- Firma electrónica con valor legal en Guatemala: exige un prestador de servicios de certificación
  autorizado. No hace falta para una constancia informal.

## Privacidad

- Es el primer dato personal que guardaría el sistema: avisarlo antes de emitir y pedir solo el nombre.
- El diploma no se vincula al `id` de sincronización, para no romper el anonimato del progreso.
- Ofrecer borrado del diploma a petición del titular.
- Actualizar `docs/SINCRONIZACION.md` y `sync/README.md`, que hoy afirman que no se guarda nada personal.

## Orden sugerido

1. Cerrar la rama `copias-anteriores` y abrir una rama nueva para los diplomas.
2. Fase 2 y 3 juntas (emitir + verificar), con emisión por código de invitación para probar el circuito.
3. Fase 1 (examen en el servidor). Hasta que esté, los códigos solo se dan a personas de confianza.
4. Fase 4 (PDF).
5. Fase 5 solo si alguien lo pide.

## Pruebas

- Ampliar `sync/test/api.test.mjs`: emisión, consulta, firma válida, firma alterada, revocado, ID inexistente,
  límite de intentos.
