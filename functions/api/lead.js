/**
 * POST /api/lead — recibe el formulario de la landing (Cloudflare Pages Functions).
 *
 * Variables de entorno (Pages > Settings > Environment variables, tipo "Secret"):
 *   LEAD_WEBHOOK_URL    Obligatoria. Webhook de destino (GoHighLevel, Make, Zapier, n8n, CRM...).
 *   ALLOWED_ORIGINS     Opcional. Orígenes permitidos separados por comas,
 *                       p. ej. "https://www.gestoriadelahorro.es,https://gestoriadelahorro.es".
 *
 * La URL del webhook nunca llega al navegador. Todos los datos se validan aquí
 * aunque ya se validen en el cliente, porque el cliente se puede saltar.
 */

const MAX_BODY_BYTES = 4096;
const MIN_FILL_MS = 2500;             // un humano tarda más de 2,5 s en rellenar el formulario
const MAX_FORM_AGE_MS = 24 * 3600e3;
const PHONE_RE = /^(?:\+34|0034)?[6789]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIPOS = new Set(["hogar", "negocio"]);
const FACTURAS = new Set(["", "menos-50", "50-100", "100-200", "200-500", "mas-500"]);

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get("content-type") || "").includes("application/json");

  // 1. Origen: rechaza envíos desde otras webs (CSRF / abuso del endpoint).
  const origin = request.headers.get("origin");
  const self = new URL(request.url).origin;
  const allowed = new Set([self, ...String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean)]);
  if (origin && !allowed.has(origin)) return reply(403, "Origen no permitido", wantsJson);

  // 2. Tamaño del cuerpo.
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return reply(413, "Solicitud demasiado grande", wantsJson);

  // 3. Parseo (JSON desde JS o urlencoded si el navegador no ejecuta JS).
  let data;
  try {
    data = wantsJson ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return reply(400, "Formato no válido", wantsJson);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return reply(400, "Formato no válido", wantsJson);

  // 4. Anti-bots: campo trampa y tiempo de rellenado. Respondemos 200 para no dar pistas.
  if (str(data.empresa_web)) return reply(200, "ok", wantsJson);
  const ts = Number(data.ts);
  if (Number.isFinite(ts) && ts > 0) {
    const age = Date.now() - ts;
    if (age < MIN_FILL_MS || age > MAX_FORM_AGE_MS) return reply(200, "ok", wantsJson);
  }

  // 5. Validación estricta con lista blanca de campos.
  const nombre = clean(str(data.nombre), 80);
  const telefono = str(data.telefono).replace(/[\s.\-()]/g, "").slice(0, 20);
  const email = clean(str(data.email), 120).toLowerCase();
  const tipo = str(data.tipo);
  const factura = str(data.factura);
  const consentimiento = str(data.consentimiento) === "si";

  const errors = [];
  if (nombre.length < 2) errors.push("nombre");
  if (!PHONE_RE.test(telefono)) errors.push("telefono");
  if (email && !EMAIL_RE.test(email)) errors.push("email");
  if (!TIPOS.has(tipo)) errors.push("tipo");
  if (!FACTURAS.has(factura)) errors.push("factura");
  if (!consentimiento) errors.push("consentimiento");
  if (errors.length) return reply(422, "Datos no válidos: " + errors.join(", "), wantsJson);

  if (!env.LEAD_WEBHOOK_URL) {
    console.error("LEAD_WEBHOOK_URL no está configurada");
    return reply(500, "Servicio no disponible", wantsJson);
  }

  const lead = {
    nombre,
    telefono,
    email: email || null,
    tipo,
    factura_mensual: factura || null,
    consentimiento: true,
    // Prueba del consentimiento (RGPD art. 7.1): cuándo y con qué texto.
    consentimiento_fecha: new Date().toISOString(),
    consentimiento_texto: "He leído la política de privacidad y acepto que me contactéis para estudiar mi factura.",
    origen: "landing-factura-luz",
  };

  try {
    const res = await fetch(env.LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    if (!res.ok) throw new Error("Webhook respondió " + res.status);
  } catch (err) {
    // No se registran los datos personales, solo el error.
    console.error("Error enviando lead:", err.message);
    return reply(502, "No se pudo registrar la solicitud", wantsJson);
  }

  return reply(200, "ok", wantsJson);
}

export function onRequest() {
  return new Response("Método no permitido", { status: 405, headers: { Allow: "POST" } });
}

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// Elimina caracteres de control y etiquetas para que nada llegue como HTML al CRM.
function clean(v, max) {
  return v.replace(/[\u0000-\u001F\u007F<>]/g, "").slice(0, max);
}

function reply(status, message, json) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (json) {
    return new Response(JSON.stringify({ ok: status < 300, message }), {
      status,
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  }
  // Sin JavaScript: redirige a la página de gracias o vuelve al formulario.
  if (status < 300) return new Response(null, { status: 303, headers: { ...headers, Location: "/gracias.html" } });
  return new Response(null, { status: 303, headers: { ...headers, Location: "/#contacto" } });
}
