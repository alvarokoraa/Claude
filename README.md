# Gestoría del Ahorro — Landing de captación

Landing para captar contactos de personas y negocios que quieren pagar menos en su
factura de la luz. HTML, CSS y JavaScript sin dependencias, más una función serverless
que recibe el formulario y lo reenvía a vuestro CRM.

Diseñada siguiendo la skill oficial de Anthropic
[`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design),
instalada en `.claude/skills/frontend-design/` para que Claude Code la use en futuras páginas.

## Estructura

```
site/                  Web estática (carpeta que se publica)
  index.html           Landing
  privacidad.html      Política de privacidad (plantilla)
  aviso-legal.html     Aviso legal LSSI (plantilla)
  gracias.html         Confirmación para navegadores sin JavaScript
  _headers             Cabeceras de seguridad y caché
  assets/              CSS, JS, fuentes autoalojadas y favicon
functions/api/lead.js  Endpoint POST /api/lead: valida y envía el contacto al CRM
.claude/skills/        Skill de diseño web para Claude Code
```

## Publicar (Cloudflare Pages, plan gratuito)

1. En Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** y elige este repositorio.
2. Configuración de build: *Framework preset* `None`, *Build command* vacío,
   *Build output directory* `site`.
3. En **Settings → Environment variables** añade como *Secret*:
   - `LEAD_WEBHOOK_URL`: la URL de un webhook entrante de vuestro CRM
     (GoHighLevel → Automation → Workflow con trigger *Inbound Webhook*, o Make/Zapier/n8n).
   - `ALLOWED_ORIGINS`: vuestros dominios, separados por comas.
4. Conecta el dominio propio en **Custom domains**.
5. Recomendado: en **Security → WAF → Rate limiting rules**, limita `POST /api/lead`
   a unas 5 peticiones por minuto por IP.

Prueba en local: `cp .dev.vars.example .dev.vars` y `npx wrangler pages dev site`.

## Pendiente antes de publicar

Busca `COMPLETAR` en el proyecto (`grep -rn COMPLETAR site`):

- [ ] Dominio real en `index.html` (canonical, og:url, JSON-LD), `robots.txt` y `sitemap.xml`.
- [ ] Razón social, CIF y dirección en el pie, en `aviso-legal.html` y `privacidad.html`.
- [ ] Revisar los textos legales con vuestro asesor/DPO.
- [ ] Ajustar el rango de ahorro orientativo (`SAVING_MIN` / `SAVING_MAX` en `assets/js/main.js`)
      con el dato real de vuestros estudios.
- [ ] Confirmar que las promesas del texto son ciertas para vuestro servicio: estudio gratuito,
      llamada en menos de 24 h, prioridad a ofertas sin permanencia.
- [ ] Imagen para redes sociales (`og:image`, 1200×630).
