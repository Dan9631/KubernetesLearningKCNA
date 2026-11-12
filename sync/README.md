# Worker de sincronización (Cloudflare Workers + D1)

Servicio opcional que guarda el progreso **cifrado** de cada alumno para tenerlo igual en todos sus dispositivos. Diseño, modelo de amenazas y API: [docs/SINCRONIZACION.md](../docs/SINCRONIZACION.md).

Sin desplegarlo, el sitio funciona igual: la página `/sincronizar` dice que no está disponible y el icono de la nube no aparece en la cabecera.

## Probar en local

Desde esta carpeta, en PowerShell:

```powershell
npm ci
npm run db:local          # crea la tabla en la base D1 local (.wrangler/)
npm run dev               # Worker en http://127.0.0.1:8787
```

En otra terminal:

```powershell
npm test                  # pruebas de la API contra el Worker local
```

Para probarlo con el sitio, genera la web apuntando al Worker local y ábrela en `http://127.0.0.1:4322` (es uno de los orígenes permitidos):

```powershell
cd ..\web
$env:PUBLIC_SYNC_URL = "http://127.0.0.1:8787"; npm run build; npx astro preview --port 4322 --host 127.0.0.1
```

## Desplegar en tu cuenta (gratis)

1. Crea una cuenta gratuita en [dash.cloudflare.com](https://dash.cloudflare.com/sign-up). No hace falta dominio ni tarjeta para el plan gratuito de Workers.
2. Inicia sesión con Wrangler. Abre el navegador para autorizar:
   ```powershell
   npx wrangler login
   ```
   Si la red de la empresa bloquea la autorización, hazlo desde otra red. No hace falta tocar la configuración del proxy.
3. Crea la base de datos:
   ```powershell
   npx wrangler d1 create kcna-sync
   ```
   Copia el `database_id` que imprime en `wrangler.jsonc`, en lugar de `00000000-0000-0000-0000-000000000000`.
4. Crea la tabla en la base remota y despliega:
   ```powershell
   npm run db:remote
   npm run deploy
   ```
   Wrangler imprime la URL del Worker, por ejemplo `https://kcna-sync.<tu-subdominio>.workers.dev`.
5. Comprueba que responde:
   ```powershell
   $env:SYNC_URL = "https://kcna-sync.<tu-subdominio>.workers.dev"; npm test
   ```
6. Conecta el sitio. En GitHub, entra al repositorio y abre **Settings › Secrets and variables › Actions › Variables › New repository variable**. Crea la variable `SYNC_URL` con la URL del Worker y vuelve a ejecutar el flujo **Publicar sitio del curso**, con un push o con *Run workflow*.

Si publicas el sitio en otra dirección, añádela a `ALLOWED_ORIGINS` en `wrangler.jsonc` y vuelve a desplegar.

## Actualizar un Worker ya desplegado

Cuando cambia `schema.sql` o `src/index.js` (por ejemplo, al añadir las copias anteriores), en este orden:

```powershell
npm run db:remote         # aplica schema.sql a la base real; solo crea lo que falta, no toca los datos
npm run deploy            # publica el Worker nuevo
$env:SYNC_URL = "https://<tu-worker>.workers.dev"; npm test
```

`wrangler.jsonc` tiene que apuntar al mismo Worker y a la misma base que ya usas: revisa que `name` sea el nombre del Worker desplegado y que `database_id` sea el de tu base (`npx wrangler d1 list` los muestra). Si `name` es otro, `npm run deploy` crea un Worker nuevo en vez de actualizar el que usa el sitio.

Si se despliega el Worker antes de aplicar el esquema, la sincronización sigue funcionando, sin copias anteriores, hasta que se aplique.

## Diplomas

El Worker también califica el examen final y emite las constancias de finalización firmadas a quien lo aprueba (diseño: [docs/PLAN-DIPLOMAS.md](../docs/PLAN-DIPLOMAS.md)). Es opcional: sin estos pasos, la sincronización funciona igual y el examen responde 503.

1. **Tablas.** `schema.sql` crea `diploma`, `invitacion`, `pregunta` e `intento`. Aplícalo con `npm run db:remote`, o pega esas sentencias `CREATE` en la consola de la base D1 del panel de Cloudflare.
2. **Llave de firma.** Genera el par de llaves:
   ```powershell
   npm run diploma:llave
   ```
   - La **privada** va como secreto del Worker con el nombre `DIPLOMA_KEY`: `npx wrangler secret put DIPLOMA_KEY`, o en el panel, en el Worker, **Settings › Variables and Secrets › Add**, de tipo *Secret*. No la guardes en ningún otro sitio: quien la tenga puede firmar diplomas.
   - La **pública** va en GitHub como variable del repositorio `DIPLOMA_PUBLIC_KEY` (junto a `SYNC_URL`). Con ella, la página `/verificar` comprueba la firma en el navegador. Vuelve a publicar el sitio.
3. **Código del Worker.** Despliégalo como en la sección anterior.
4. **Banco de preguntas.** El examen sortea 30 preguntas de la tabla `pregunta` y necesita al menos 30 activas; conviene tener bastantes más, porque cada intento enseña 30. Escríbelas en `banco-examen.json`, en esta carpeta, con el formato del banco de práctica:
   ```json
   [{ "q": "enunciado", "options": ["a", "b", "c", "d"], "answer": [2] }]
   ```
   `answer` son las posiciones, desde 0, de las opciones correctas. Luego:
   ```powershell
   npm run examen:banco -- banco-examen.json
   ```
   Genera `banco-examen.sql`; pega su contenido en la consola de D1 o ejecútalo con `npx wrangler d1 execute kcna-sync --remote --file=banco-examen.sql`. Los dos archivos están en `.gitignore`: **no los subas**, porque quien tenga las respuestas aprueba. Por lo mismo, no uses las preguntas de `quiz/`, que son públicas.
5. **Códigos de invitación.** Con un código se presenta el examen (3 intentos por cada diploma que permite) y, al aprobar, se pide el diploma:
   ```powershell
   npm run diploma:invitacion        # un código de un solo uso
   npm run diploma:invitacion -- 25  # un código que sirve para 25 diplomas
   ```
   Imprime el código y una sentencia `INSERT`; ejecútala en la consola de D1. En la base solo queda el hash del código.

Tareas de mantenimiento, en la consola de D1:

- **Revocar:** `UPDATE diploma SET revocado = unixepoch() * 1000 WHERE id = '<id>';`
- **Borrar a petición del titular:** `DELETE FROM diploma WHERE id = '<id>';`
- **Ver los intentos de examen:** `SELECT codigo_hash, creado, entregado, nota, aprobado, diploma_id FROM intento ORDER BY creado DESC;`
- **Retirar una pregunta:** `UPDATE pregunta SET activa = 0 WHERE id = <n>;`
- **Ver los emitidos:** `SELECT id, nombre, emitido, revocado FROM diploma ORDER BY emitido DESC;`

Si cambias la llave, los diplomas ya emitidos dejan de pasar la comprobación de firma.

El examen son 30 preguntas, 60 minutos, 75 % para aprobar y 3 intentos; se cambian en las constantes `EXAMEN_*` de `src/index.js`. Todo se decide en el Worker: el navegador nunca recibe las respuestas correctas ni puede declarar su nota.

Para las pruebas locales hace falta una llave de prueba: `npm run diploma:llave -- --local` la escribe en `.dev.vars` (reinicia `npm run dev` después).

## Opcional

- **Límite de peticiones:** descomenta el bloque `ratelimits` de `wrangler.jsonc` si tu plan lo admite. Limita por registro y es aproximado ([documentación](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)).
- **Dominio propio:** algunas redes corporativas bloquean `*.workers.dev`. Con un dominio propio en Cloudflare, el Worker se sirve desde tu dominio.
- **Ver lo que hay guardado:** `npx wrangler d1 execute kcna-sync --remote --command "SELECT id, rev, length(data), updated FROM progreso"`. Solo verás identificadores y bloques cifrados.

## Quitarlo

1. Borra la variable `SYNC_URL` del repositorio y vuelve a publicar el sitio.
2. Ejecuta `npx wrangler delete` y `npx wrangler d1 delete kcna-sync`.

El progreso local de cada alumno no se ve afectado.
