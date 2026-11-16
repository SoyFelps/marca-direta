// Edge Function "cookie-consent": registra, de forma anônima, a escolha feita no banner de cookies.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://marcadireta.com.br", "https://www.marcadireta.com.br"];
const CHOICES = ["accepted", "necessary"];
const VIAS = ["banner", "close", "prefs"];

function cors(origin: string | null) {
  const ok = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  // Só aceita chamadas vindas do próprio site
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new Response("Forbidden", { status: 403, headers });
  }

  let body: { choice?: string; via?: string; page?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new Response("Bad request", { status: 400, headers });
  }

  const choice = String(body.choice ?? "");
  const via = String(body.via ?? "");
  if (!CHOICES.includes(choice) || !VIAS.includes(via)) {
    return new Response("Bad request", { status: 400, headers });
  }
  // Só o caminho (sem parâmetros de URL), limitado em tamanho
  const page = String(body.page ?? "/").split("?")[0].split("#")[0].slice(0, 120) || "/";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supabase.from("cookie_consent_log").insert({ choice, via, page });
  if (error) return new Response("Error", { status: 500, headers });

  return new Response(null, { status: 204, headers });
});
