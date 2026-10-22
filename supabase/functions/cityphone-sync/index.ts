import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const allowedOrigins = new Set([
  "https://marbellsantana.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const PROTECTED_PRODUCTS_KEY = "cityphone_products_v1";

const cameraRows: Array<[string, number]> = [
  ["Protector cámara completo iPhone 13",4],["Protector cámara completo iPhone 14/14 Plus",6],["Protector cámara completo iPhone 15/15 Plus",3],["Protector cámara completo iPhone 12",1],["Protector cámara completo iPhone 11 Pro Max",1],["Protector cámara completo iPhone 16/16 Plus",1],
  ["Protector cámara iPhone 11 Pro/12 Pro/11 Pro Max Rosa",1],["Protector cámara iPhone 11 Pro/12 Pro/11 Pro Max Plateado",2],["Protector cámara iPhone 12 Pro Max Brillo plateado",1],["Protector cámara iPhone 12 Pro Max Brillo negro",1],["Protector cámara iPhone 12/12 Mini/11 Negro",4],["Protector cámara iPhone 12/12 Mini/11 Plateado",2],
  ["Protector cámara iPhone 14/14 Plus/15/15 Plus Dorado",4],["Protector cámara iPhone 14/14 Plus/15/15 Plus Negro",1],["Protector cámara iPhone 14/14 Plus/15/15 Plus Rosado",2],["Protector cámara iPhone 14/14 Plus/15/15 Plus Plateado",1],["Protector cámara iPhone 14/14 Plus/15/15 Plus Verde",2],["Protector cámara iPhone 14/14 Plus/15/15 Plus Azul",1],["Protector cámara iPhone 14/14 Plus/15/15 Plus Brillo lila",1],["Protector cámara iPhone 14/14 Plus/15/15 Plus Brillo plateado",5],["Protector cámara iPhone 14/14 Plus/15/15 Plus Brillo negro",2],["Protector cámara iPhone 14/14 Plus/15/15 Plus Brillo rosado",1],
  ["Protector cámara iPhone 14 Pro Max Plateado",4],["Protector cámara iPhone 14 Pro Max Rojo",1],["Protector cámara iPhone 14 Pro Max Dorado",1],["Protector cámara iPhone 14 Pro Max Brillo plateado",7],["Protector cámara iPhone 14 Pro Max Brillo negro",2],["Protector cámara iPhone 14 Pro Max Brillo violeta",1],["Protector cámara iPhone 14 Pro Max Brillo dorado",1],
  ["Protector cámara iPhone 15 Pro/15 Pro Max Brillo plateado",3],["Protector cámara iPhone 13/13 Mini Plateado",3],["Protector cámara iPhone 13/13 Mini Rosado",2],["Protector cámara iPhone 13 Pro Max Dorado",1],["Protector cámara iPhone 13 Pro Max Negro",1],["Protector cámara iPhone 13 Pro Max Grafito",1],
  ["Protector cámara iPhone 16/16 Plus/17 Negro",4],["Protector cámara iPhone 16/16 Plus/17 Plateado",1],["Protector cámara iPhone 16/16 Plus/17 Azul",1],["Protector cámara iPhone 16/16 Plus/17 Azul brillo",1],["Protector cámara iPhone 17 Pro Max Negro",1],["Protector cámara iPhone 17 Pro Max Dorado",1],["Protector cámara iPhone 17 Pro Max Plateado",1],["Protector cámara Samsung S24 Plus Grafito",6],["Protector cámara Samsung S24 Ultra Grafito",1],
];
const CAMERA_PRODUCTS = cameraRows.map(([name, stock], index) => ({
  id: 1791000000000 + index, name, category: "Protectores de cámara",
  cost: 0, price: 14000, stock, minStock: 5,
}));

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
async function push(key: string, value: unknown) {
  if (key === PROTECTED_PRODUCTS_KEY && Array.isArray(value) && value.length === 0) {
    return { key, protected: true, ignored: true };
  }
  const r = await fetch(`${REST}?on_conflict=key`, {
    method: "POST",
    headers: restHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify([{ key, value, updated_at: new Date().toISOString() }]),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`No se pudo guardar en la nube (${r.status}): ${text}`);
  return JSON.parse(text || "[]")[0] ?? null;
}
async function insertMissing(localState: Record<string, unknown>) {
  const current = await pull();
  const missingKeys = Object.keys(localState).filter((key) => !(key in current.state));
  if (!missingKeys.length) return;
  const rows = missingKeys
    .filter((key) => !(key === PROTECTED_PRODUCTS_KEY && Array.isArray(localState[key]) && (localState[key] as unknown[]).length === 0))
    .map((key) => ({ key, value: localState[key], updated_at: new Date().toISOString() }));
  if (!rows.length) return;
  const r = await fetch(`${REST}?on_conflict=key`, {
    method: "POST", headers: restHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`No se pudo migrar a la nube (${r.status}): ${text}`);
}
async function bootstrap(localState: Record<string, unknown>, dirtyKeys: string[]) {
  for (const key of dirtyKeys) if (key in localState) await push(key, localState[key]);
  await insertMissing(localState);
  return await pull();
}
async function seedCamera() {
  const current = await pull();
  const products = Array.isArray(current.state[PROTECTED_PRODUCTS_KEY])
    ? current.state[PROTECTED_PRODUCTS_KEY] as Array<Record<string, unknown>> : [];
  const names = new Set(products.map((p) => String(p?.name ?? "")));
  const missing = CAMERA_PRODUCTS.filter((p) => !names.has(p.name));
  if (missing.length) await push(PROTECTED_PRODUCTS_KEY, [...products, ...missing]);
  return { added: missing.length, total: products.length + missing.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    await authorize(req);
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase no está configurado");
    const url = new URL(req.url);
    if (req.method === "GET" && url.searchParams.get("action") === "seed-camera") {
      const data = await seedCamera();
      return json(req, { ok: true, ...data });
    }
    if (req.method !== "POST") return json(req, { ok: false, error: "Método no permitido" }, 405);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "pull");
    if (action === "pull") return json(req, { ok: true, ...await pull() });
    if (action === "push") {
      const key = String(body?.key ?? "").trim();
      if (!key) return json(req, { ok: false, error: "Falta la clave" }, 400);
      return json(req, { ok: true, row: await push(key, body?.value ?? null) });
    }
    if (action === "bootstrap") {
      const localState = body?.state && typeof body.state === "object" && !Array.isArray(body.state)
        ? body.state as Record<string, unknown> : {};
      const dirtyKeys = Array.isArray(body?.dirtyKeys)
        ? body.dirtyKeys.map((x: unknown) => String(x)).filter(Boolean) : [];
      return json(req, { ok: true, ...await bootstrap(localState, dirtyKeys) });
    }
    if (action === "seed-camera") return json(req, { ok: true, ...await seedCamera() });
    return json(req, { ok: false, error: "Acción no válida" }, 400);
  } catch (error) {
    if (error instanceof Response) return json(req, { ok: false, error: await error.text() }, error.status);
    return json(req, { ok: false, error: error instanceof Error ? error.message : "Error inesperado" }, 500);
  }
});
