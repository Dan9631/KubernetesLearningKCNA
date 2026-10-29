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

## Opcional

- **Límite de peticiones:** descomenta el bloque `ratelimits` de `wrangler.jsonc` si tu plan lo admite. Limita por registro y es aproximado ([documentación](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)).
- **Dominio propio:** algunas redes corporativas bloquean `*.workers.dev`. Con un dominio propio en Cloudflare, el Worker se sirve desde tu dominio.
- **Ver lo que hay guardado:** `npx wrangler d1 execute kcna-sync --remote --command "SELECT id, rev, length(data), updated FROM progreso"`. Solo verás identificadores y bloques cifrados.

## Quitarlo

1. Borra la variable `SYNC_URL` del repositorio y vuelve a publicar el sitio.
2. Ejecuta `npx wrangler delete` y `npx wrangler d1 delete kcna-sync`.

El progreso local de cada alumno no se ve afectado.
