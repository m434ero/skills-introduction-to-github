# Eslabón Social Ecuador · sitio informativo

Sitio web independiente (no oficial) sobre la **Fundación Eslabón Social Ecuador (FUNESEC)**, hecho con fuentes públicas. Cada dato lleva una etiqueta de certeza: *confirmado*, *fuente única* o *por confirmar*.

## Cómo ejecutarlo

Requiere Node.js 20 o superior.

```bash
npm install
npm start          # http://localhost:3000
npm test           # 13 pruebas automáticas
npm run mensajes   # ver los mensajes del formulario de contacto
```

Para producción, copia `.env.example` como `.env`, rellena `SESSION_SECRET` y `SITE_URL`, y arranca con:

```bash
node --env-file=.env server.js
```

El sitio debe servirse por HTTPS en producción: las cookies llevan `Secure` y el prefijo `__Host-`.

## Páginas

| Ruta | Contenido |
| --- | --- |
| `/` | Resumen, cifras clave y áreas de trabajo |
| `/historia` | Línea de tiempo |
| `/personas` | Fundadores y gobernanza |
| `/proyectos` | Educación, salud, agricultura e intercambio |
| `/financiamiento` | Fuentes de ingresos, Casita Belga y el asunto abierto de Grupo Campana |
| `/presencia` | Lugares en Ecuador y Bélgica, y sitios web de la organización |
| `/verificacion` | Qué está confirmado, qué falta y cómo comprobarlo |
| `/preguntas`, `/fuentes` | Preguntas frecuentes y lista de fuentes |
| `/contacto` | Formulario para enviar correcciones |
| `/buscar` | Buscador interno (ignora tildes) |
| `/cookies`, `/privacidad` | Políticas y panel de preferencias |

API de solo lectura: `/api/contenido`, `/api/buscar?q=`, `/api/salud`. También hay `/sitemap.xml` y `/robots.txt`.

## Estructura

```
content/sitio.json   Todo el texto del sitio. Se valida al arrancar.
src/app.js           Rutas, cabeceras de seguridad y manejo de errores
src/security.js      CSRF, consentimiento de cookies y tema
src/views.js         Plantillas HTML con escape automático (src/html.js)
src/search.js        Índice y búsqueda
src/store.js         Validación y guardado de mensajes (data/mensajes.jsonl)
public/              CSS, JavaScript e iconos, sin recursos de terceros
test/                Pruebas con el ejecutor integrado de Node
```

Para cambiar el contenido basta editar `content/sitio.json`; no hace falta tocar el código.

## Seguridad

- Política de seguridad de contenido estricta (`default-src 'none'`), sin estilos ni guiones en línea.
- HSTS, `nosniff`, `frame-ancestors 'none'`, `Referrer-Policy` y `Permissions-Policy`.
- Protección CSRF con token firmado (HMAC), más comprobación de `Origin` y `Sec-Fetch-Site`.
- Cookies `HttpOnly`, `SameSite=Lax` y, en producción, `Secure` con prefijo `__Host-`.
- Límite de peticiones global y uno más estricto para el formulario.
- Validación en el servidor, campo trampa contra robots y cuerpo máximo de 10 kB.
- Todo el HTML se genera con escape automático.
- Los mensajes se guardan sin dirección IP.

## Cookies

| Cookie | Tipo | Uso | Duración |
| --- | --- | --- | --- |
| `es_csrf` | Necesaria | Protege los formularios | Sesión |
| `es_consent` | Necesaria | Recuerda la elección sobre cookies | 180 días |
| `es_tema` | Preferencias | Recuerda el tema claro u oscuro; solo con permiso | 180 días |

No hay analítica, publicidad ni recursos de terceros.

## Compatibilidad

El sitio funciona completo sin JavaScript. Usa HTML y CSS estándar (flexbox y grid), tipografías del sistema, tema claro y oscuro, y respeta las preferencias de movimiento reducido y alto contraste.

## Desplegar en Netlify

El repositorio incluye `netlify.toml` (en la raíz) y un adaptador en `netlify/functions/server.js` que ejecuta la misma aplicación como función.

1. En Netlify: **Add new site → Import an existing project → GitHub** y elige este repositorio.
2. En **Branch to deploy** elige la rama que quieras probar. El resto de la configuración se lee de `netlify.toml`.
3. En **Environment variables** añade `SESSION_SECRET` con un valor aleatorio de 32 caracteres o más.
4. Pulsa **Deploy**. Netlify da una dirección `https://…netlify.app` para probar.

Límites en Netlify: los mensajes del formulario se escriben en `/tmp` y **no se conservan**, y el límite de peticiones se cuenta por instancia. Para uso real conviene guardar los mensajes en un almacén persistente o usar un servidor Node normal.
