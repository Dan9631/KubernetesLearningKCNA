# Sincronización del progreso (Cloudflare Workers + D1)

Opcional. Sin ella, el sitio funciona igual que siempre: el progreso vive en el navegador (`localStorage`). Con ella, el mismo progreso aparece en todos tus dispositivos.

## Principio: el servidor no puede leer nada

- **Sin cuentas.** No hay usuario, contraseña ni correo. Al activar la sincronización, el navegador genera un **código de sincronización** aleatorio de 128 bits (26 caracteres, por ejemplo `K7Q2-8MZD-...`). Se lleva a otro dispositivo escribiéndolo o con un QR.
- **Cifrado en el navegador.** Del código salen tres valores con HKDF-SHA-256 (WebCrypto):
  - `id`: identificador del registro en el servidor.
  - `token`: credencial para leer, escribir o borrar ese registro. El servidor solo guarda su hash SHA-256.
  - `key`: clave AES-GCM de 256 bits. **Nunca sale del navegador.**
- El progreso se comprime (gzip) y se cifra con `key` antes de enviarse. El servidor guarda solo `id`, el hash del token, el texto cifrado, un número de versión y la fecha.

## Modelo de amenazas

| Si alguien… | Obtiene | Por qué |
|---|---|---|
| Roba la base de datos D1 | Bloques cifrados sin ningún dato personal | No hay correos, nombres ni IPs guardadas; sin el código no hay clave |
| Conoce un `id` | Nada | Para leer o escribir hace falta el `token`, y del `id` no se puede obtener |
| Intercepta el tráfico | Nada útil | HTTPS; el cuerpo además va cifrado |
| Lee los registros del servidor | Peticiones con un `id` | El código va en el fragmento `#` del QR, que el navegador nunca envía |
| Llena la base de basura | Molestia, no datos | Límite de 96 KB por registro, límite de peticiones opcional, borrado tras 400 días sin uso |
| Tumba el servicio | Nada | El sitio sigue funcionando con el progreso local |

El sitio no maneja vouchers, pagos ni credenciales del examen, y no debe hacerlo nunca.

**El riesgo que asume el alumno:** si pierde el código, nadie puede recuperar los datos del servidor, ni siquiera el dueño del sitio. Por eso la página de sincronización lo muestra junto con su QR y ofrece una **hoja de recuperación** para descargar o imprimir, como los códigos de recuperación de la verificación en dos pasos. La hoja es una página HTML autónoma con el código, el enlace `/sincronizar/#c=…` y el QR; se genera en el navegador y nunca pasa por el servidor. Mientras el alumno no copie, descargue ni imprima el código, la página le recuerda guardarlo. Su progreso local sigue intacto.

## Respaldo sin el servidor

Dos apoyos que no dependen del Worker (`web/src/lib/respaldo.ts` y `respaldo.svelte.ts`):

- **Copia en un archivo.** En `/sincronizar`, «Descargar copia» guarda el progreso como `kcna-progreso-AAAA-MM-DD.json` (sin cifrar: es el progreso de estudio, sin datos personales). «Cargar una copia» valida el archivo, descarta todo campo que no tenga la forma del progreso y ofrece dos opciones:
  - *Combinar*: une la copia con el progreso actual con las mismas reglas de la tabla de abajo. Antes iguala las fechas de borrado, para que un «Borrar mi progreso» anterior no descarte uno de los dos lados.
  - *Reemplazar*: deja solo lo de la copia y la marca como un borrado reciente (`resetAt`), de modo que, con la sincronización activa, lo guardado en el servidor no vuelve a mezclarse y los demás dispositivos quedan igual.
- **Aviso de progreso sin respaldo.** En la portada y en el panel de preparación, cuando hay al menos 3 días de estudio o un módulo terminado y no hay respaldo: sincronización sin activar y sin copia en archivo de los últimos 14 días, o sincronización activa con el código sin guardar. «Ahora no» lo pospone 7 días. Estas fechas se guardan en `kcna.respaldo.v1` y no se sincronizan: son de cada navegador.

Además se pide al navegador **almacenamiento persistente** (`navigator.storage.persist()`), para que no borre los datos por falta de espacio o inactividad: al cargar en los navegadores que deciden sin preguntar, y con un botón en `/sincronizar` en los que muestran un permiso. No es un respaldo; solo reduce el riesgo.

## Cómo se combinan dos dispositivos

Cada sincronización descarga el registro, lo descifra, lo **combina** con el progreso local y sube el resultado. Si otro dispositivo escribió en medio, el servidor responde 409 y se repite el proceso (concurrencia optimista por `rev`).

| Dato | Regla al combinar |
|---|---|
| Estadísticas por pregunta | Gana la que tiene más intentos (`seen`); si empatan, la de repaso más reciente |
| Simulacros | Unión por fecha |
| Pasos de laboratorio, módulos terminados, flashcards dominadas, checklists, misiones de la Terminal y casos de diagnóstico | Unión |
| Lectura | Última posición: la más reciente; más lejana: la mayor |
| Días de estudio | Unión, quedándose con los últimos 120 |
| Fecha del examen | Gana el cambio más reciente (también quitarla) |
| "Borrar mi progreso" | Guarda la fecha del borrado (`resetAt`); al combinar, se descarta el lado anterior a esa fecha, así el borrado llega a todos los dispositivos |

Limitación conocida: como las listas se combinan por unión, desmarcar algo en un dispositivo no lo desmarca en los demás.

## Copias anteriores

El servidor conserva, por cada registro, **el estado con el que terminó cada uno de los últimos días con cambios**, hasta 7. Sirven para volver atrás si el progreso se borró por error o se mezcló mal.

- **Cuándo se guarda una copia:** al escribir una versión nueva, si la que se va a sobrescribir se escribió en un día anterior (UTC), esa versión pasa a la tabla `copia` antes de sobrescribirla. Varias escrituras en el mismo día no generan copias. La copia y la escritura van en la misma transacción, con la misma condición de versión: un `PUT` rechazado con 409 no archiva nada.
- **Qué contienen:** el mismo bloque cifrado que el registro. El servidor tampoco puede leerlas, y se piden con el mismo token.
- **Restaurar:** en `/sincronizar`, «Copias anteriores» lista las fechas, muestra un resumen de la copia elegida y, tras confirmar, **reemplaza** el progreso (no combina: si combinara, lo dañado volvería a entrar). Usa el mismo camino que «Reemplazar» de la copia en archivo, así que llega a los demás dispositivos.
- **Limpieza:** se descartan las copias que pasan de 7; «Borrar mis datos del servidor» las borra todas, y la limpieza diaria elimina las de registros abandonados.
- **Compatibilidad:** si la base no tiene la tabla `copia` (falta aplicar `schema.sql`), la sincronización funciona igual, sin copias, y las rutas de copias responden 404. Con un Worker sin estas rutas o sin la tabla, el sitio oculta la sección.

Limitación: lo que se hizo el mismo día de la restauración no tiene copia; por eso la confirmación sugiere descargar antes una copia en archivo.

## API del Worker

Todas las rutas exigen `Authorization: Bearer <token>`.

| Método | Ruta | Respuesta |
|---|---|---|
| `GET` | `/v1/sync/:id` | `200 {rev, iv, data, updated}` · `404` si no existe |
| `PUT` | `/v1/sync/:id` | Cuerpo `{rev, iv, data}`, donde `rev` es la versión que se leyó (0 si es nuevo). `200 {rev, updated}` · `409 {rev}` si alguien escribió antes |
| `DELETE` | `/v1/sync/:id` | `204`. Borra también las copias anteriores |
| `GET` | `/v1/sync/:id/copias` | `200 {copias: [{rev, updated}]}`, de la más reciente a la más antigua · `404` si el registro no existe |
| `GET` | `/v1/sync/:id/copias/:rev` | `200 {rev, iv, data, updated}` · `404` si esa copia no existe |

`id` son 64 caracteres hexadecimales. `data` y `iv` van en base64. El cuerpo admite como máximo 96 KB. CORS solo acepta los orígenes de `ALLOWED_ORIGINS`.

## Costes (plan gratuito, consultado el 2026-10-29)

- **Workers:** 100 000 peticiones al día y 10 ms de CPU por petición. El Worker no cifra ni descifra nada (eso lo hace el navegador), así que gasta muy poca CPU. [Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/)
- **D1:** 5 millones de filas leídas y 100 000 escritas al día, y 5 GB en total. Cada sincronización escribe una fila; la primera de cada día escribe además la copia anterior. Un progreso completo ocupa unos 11 KB cifrado (estimado con datos simulados), así que con las 7 copias cada alumno ocupa como mucho unos 85 KB. [Precios de D1](https://developers.cloudflare.com/d1/platform/pricing/)
- **Ritmo de subida:** el cliente sube como mucho cada 30 s mientras practicas y al salir de la página. Con eso, 100 000 escrituras diarias dan para miles de alumnos activos al día.

## Despliegue

Ver [sync/README.md](../sync/README.md).
