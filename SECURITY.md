# Seguridad

Si encuentras una vulnerabilidad en esta web, escríbenos a [COMPLETAR email de seguridad]
en lugar de abrir un issue público. Respondemos en un máximo de 72 horas.

## Medidas aplicadas

- **Sin secretos en el código.** La URL del webhook del CRM vive solo como variable de
  entorno cifrada en el hosting (`LEAD_WEBHOOK_URL`). `.env` y `.dev.vars` están en `.gitignore`.
- **Validación en servidor** (`functions/api/lead.js`): lista blanca de campos, límite de
  tamaño, formato de teléfono/email, consentimiento obligatorio y limpieza de HTML.
- **Protección del formulario:** comprobación de `Origin`, campo trampa (honeypot) y tiempo
  mínimo de rellenado contra bots.
- **Cabeceras** (`site/_headers`): CSP estricta sin scripts en línea ni de terceros, HSTS,
  `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`.
- **Sin terceros:** fuentes autoalojadas, sin analítica ni cookies, sin CDNs externas.
- **XSS:** los datos del usuario se insertan en la página con `textContent`, nunca como HTML.
