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

## Cómo se combinan dos dispositivos

Cada sincronización descarga el registro, lo descifra, lo **combina** con el progreso local y sube el resultado. Si otro dispositivo escribió en medio, el servidor responde 409 y se repite el proceso (concurrencia optimista por `rev`).

| Dato | Regla al combinar |
|---|---|
| Estadísticas por pregunta | Gana la que tiene más intentos (`seen`); si empatan, la de repaso más reciente |
| Simulacros | Unión por fecha |
| Pasos de laboratorio, módulos terminados, flashcards dominadas, checklists | Unión |
| Lectura | Última posición: la más reciente; más lejana: la mayor |
| Días de estudio | Unión, quedándose con los últimos 120 |
| Fecha del examen | Gana el cambio más reciente (también quitarla) |
| "Borrar mi progreso" | Guarda la fecha del borrado (`resetAt`); al combinar, se descarta el lado anterior a esa fecha, así el borrado llega a todos los dispositivos |

Limitación conocida: como las listas se combinan por unión, desmarcar algo en un dispositivo no lo desmarca en los demás.

## API del Worker

Todas las rutas exigen `Authorization: Bearer <token>`.

| Método | Ruta | Respuesta |
|---|---|---|
| `GET` | `/v1/sync/:id` | `200 {rev, iv, data, updated}` · `404` si no existe |
| `PUT` | `/v1/sync/:id` | Cuerpo `{rev, iv, data}`, donde `rev` es la versión que se leyó (0 si es nuevo). `200 {rev, updated}` · `409 {rev}` si alguien escribió antes |
| `DELETE` | `/v1/sync/:id` | `204` |

`id` son 64 caracteres hexadecimales. `data` y `iv` van en base64. El cuerpo admite como máximo 96 KB. CORS solo acepta los orígenes de `ALLOWED_ORIGINS`.

## Costes (plan gratuito, consultado el 2026-10-29)

- **Workers:** 100 000 peticiones al día y 10 ms de CPU por petición. El Worker no cifra ni descifra nada (eso lo hace el navegador), así que gasta muy poca CPU. [Límites de Workers](https://developers.cloudflare.com/workers/platform/limits/)
- **D1:** 5 millones de filas leídas y 100 000 escritas al día, y 5 GB en total. Cada sincronización escribe una fila. [Precios de D1](https://developers.cloudflare.com/d1/platform/pricing/)
- **Ritmo de subida:** el cliente sube como mucho cada 30 s mientras practicas y al salir de la página. Con eso, 100 000 escrituras diarias dan para miles de alumnos activos al día.

## Despliegue

Ver [sync/README.md](../sync/README.md).
