import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowedOrigins = new Set([
  "https://marbellsantana.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const PROTECTED_PRODUCTS_KEY = "cityphone_products_v1";
const ALLOWED_KEYS = new Set([
  "cityphone_products_v1", "cityphone_sales_v1", "cityphone_cash_v1",
  "cityphone_cash_closures_v1", "cityphone_funds_v1", "cityphone_repairs_v1",
  "cityphone_quotes_v1", "cityphone_parts_v1", "cityphone_local_loans_v1",
  "cityphone_stock_movements_v1", "cityphone_loyalty_customers_v1",
]);
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_VALUE_BYTES = 1024 * 1024;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ALLOWED_EMAILS = new Set(
  (Deno.env.get("CITYPHONE_ALLOWED_EMAILS") ?? "")
    .split(",").map((email) => email.trim().toLowerCase()).filter(Boolean),
);
const REST = `${SUPABASE_URL}/rest/v1/cityphone_state`;

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
  if (allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
function assertOrigin(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) throw new Response("Origen no autorizado", { status: 403 });
}
function restHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`,
    "Content-Type": "application/json", ...extra,
  };
}

async function authorize(req: Request) {
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY || ALLOWED_EMAILS.size === 0) {
    throw new Response("Falta configurar la autenticación segura de City Phone", { status: 500 });
  }
  assertOrigin(req);
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Response("Debes iniciar sesión", { status: 401 });

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${match[1]}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Response("Sesión inválida o vencida", { status: 401 });
  const user = await response.json() as { email?: string; email_confirmed_at?: string | null };
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email || !ALLOWED_EMAILS.has(email) || !user.email_confirmed_at) {
    throw new Response("Esta cuenta no está autorizada para City Phone", { status: 403 });
  }
}

async function pull() {
  const r = await fetch(`${REST}?select=key,value,updated_at&order=key.asc`, {
    headers: restHeaders(), cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`No se pudo leer la nube (${r.status}): ${text}`);
  const rows = JSON.parse(text || "[]") as Array<{ key: string; value: unknown; updated_at: string }>;
  const state: Record<string, unknown> = {};
  const updatedAt: Record<string, string> = {};
  for (const row of rows) { state[row.key] = row.value; updatedAt[row.key] = row.updated_at; }
  return { state, updatedAt };
}
function validateKey(key: string) {
  if (!ALLOWED_KEYS.has(key)) throw new Response("Clave de City Phone no permitida", { status: 400 });
}
function validateValue(key: string, value: unknown) {
  validateKey(key);
  let serialized: string;
  try { serialized = JSON.stringify(value); } catch { throw new Response("Valor no válido", { status: 400 }); }
  if (serialized === undefined || new TextEncoder().encode(serialized).length > MAX_VALUE_BYTES) {
    throw new Response("El valor supera el tamaño permitido o no es válido", { status: 413 });
  }
  if (key === "cityphone_funds_v1") {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Response("Formato inválido para fondos", { status: 400 });
  } else if (!Array.isArray(value)) {
    throw new Response("Esta clave debe contener una lista", { status: 400 });
  }
}
async function push(key: string, value: unknown) {
  validateValue(key, value);
  if (key === PROTECTED_PRODUCTS_KEY && Array.isArray(value) && value.length === 0) return { key, protected: true, ignored: true };
  const r = await fetch(`${REST}?on_conflict=key`, {
    method: "POST", headers: restHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify([{ key, value, updated_at: new Date().toISOString() }]),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`No se pudo guardar en la nube (${r.status}): ${text}`);
  return JSON.parse(text || "[]")[0] ?? null;
}
async function insertMissing(localState: Record<string, unknown>) {
  const current = await pull();
  const missingKeys = Object.keys(localState).filter((key) => ALLOWED_KEYS.has(key) && !(key in current.state));
  if (!missingKeys.length) return;
  const rows = missingKeys
    .filter((key) => !(key === PROTECTED_PRODUCTS_KEY && Array.isArray(localState[key]) && (localState[key] as unknown[]).length === 0))
    .map((key) => { validateValue(key, localState[key]); return { key, value: localState[key], updated_at: new Date().toISOString() }; });
  if (!rows.length) return;
  const r = await fetch(`${REST}?on_conflict=key`, {
    method: "POST", headers: restHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`No se pudo migrar a la nube (${r.status}): ${text}`);
}
async function bootstrap(localState: Record<string, unknown>) {
  // Login never overwrites an existing cloud value; timestamp reconciliation happens in the client.
  await insertMissing(localState);
  return await pull();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "Método no permitido" }, 405);
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) return json(req, { ok: false, error: "Solicitud demasiado grande" }, 413);
  try {
    await authorize(req);
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase no está configurado");
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "pull");
    if (action === "pull") return json(req, { ok: true, ...await pull() });
    if (action === "push") {
      const key = String(body?.key ?? "").trim();
      if (!key) return json(req, { ok: false, error: "Falta la clave" }, 400);
      validateKey(key);
      return json(req, { ok: true, row: await push(key, body?.value ?? null) });
    }
    if (action === "bootstrap") {
      const localState = body?.state && typeof body.state === "object" && !Array.isArray(body.state)
        ? body.state as Record<string, unknown> : {};
      if (Object.keys(localState).some((key) => !ALLOWED_KEYS.has(key))) return json(req, { ok: false, error: "La solicitud contiene claves no permitidas" }, 400);
      return json(req, { ok: true, ...await bootstrap(localState) });
    }
    return json(req, { ok: false, error: "Acción no válida" }, 400);
  } catch (error) {
    if (error instanceof Response) return json(req, { ok: false, error: await error.text() }, error.status);
    return json(req, { ok: false, error: error instanceof Error ? error.message : "Error inesperado" }, 500);
  }
});
