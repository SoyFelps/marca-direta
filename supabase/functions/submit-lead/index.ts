import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://marcadireta.com.br",
  "https://www.marcadireta.com.br",
]);

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdyERrdkY4xWKUwrcwKsq9qpMzHYnTvuh_88bVoHJVtSL3lSA/formResponse";
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const json = (body: unknown, status = 200, origin?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin ?? "https://marcadireta.com.br",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    },
  });

type LeadInput = {
  company_name?: unknown;
  industry?: unknown;
  contact_name?: unknown;
  whatsapp?: unknown;
  email?: unknown;
  source?: unknown;
  page_url?: unknown;
  gclid?: unknown;
  user_agent?: unknown;
  turnstile_token?: unknown;
};

const text = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const getSecretKey = () => {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      if (typeof parsed.default === "string") return parsed.default;
    } catch {
      // Fall through to the legacy variable for older projects.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const responseOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://marcadireta.com.br";

  if (req.method === "OPTIONS") return json({ ok: true }, 200, responseOrigin);
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, responseOrigin);
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "Origin not allowed" }, 403, responseOrigin);
  }

  let input: LeadInput;
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400, responseOrigin);
  }

  const turnstileToken = text(input.turnstile_token, 4096);
  if (!turnstileToken) {
    return json({ error: "Turnstile verification is required" }, 400, responseOrigin);
  }

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
  if (!turnstileSecret) {
    console.error("TURNSTILE_SECRET is not configured");
    return json({ error: "Protection is not configured" }, 500, responseOrigin);
  }

  const clientIp = req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const verificationBody = new URLSearchParams({
    secret: turnstileSecret,
    response: turnstileToken,
  });
  if (clientIp) verificationBody.set("remoteip", clientIp);

  const verificationResponse = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verificationBody,
  });
  const verification = await verificationResponse.json().catch(() => null);

  if (!verificationResponse.ok || !verification?.success) {
    return json({ error: "Turnstile verification failed" }, 403, responseOrigin);
  }

  const lead = {
    company_name: text(input.company_name, 120),
    industry: text(input.industry, 120),
    contact_name: text(input.contact_name, 120),
    whatsapp: text(input.whatsapp, 30),
    email: text(input.email, 254).toLowerCase(),
    source: text(input.source, 500) || "direct",
    page_url: text(input.page_url, 2000),
    gclid: text(input.gclid, 200),
    user_agent: text(input.user_agent, 1000),
  };

  if (
    !lead.company_name ||
    !lead.industry ||
    !lead.contact_name ||
    !/^\(\d{2}\) \d{5}-\d{4}$/.test(lead.whatsapp) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)
  ) {
    return json({ error: "Invalid lead fields" }, 422, responseOrigin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseSecretKey = getSecretKey();
  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("Supabase server credentials are not configured");
    return json({ error: "Submission is not configured" }, 500, responseOrigin);
  }

  const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/leads`, {
    method: "POST",
    headers: {
      apikey: supabaseSecretKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(lead),
  });

  if (!supabaseResponse.ok) {
    console.error("Supabase lead insert failed", supabaseResponse.status);
    return json({ error: "Could not save submission" }, 502, responseOrigin);
  }

  const googleFormBody = new URLSearchParams({
    "entry.1409856353": lead.company_name,
    "entry.1676182226": lead.industry,
    "entry.553468063": lead.contact_name,
    "entry.1394606880": lead.whatsapp,
    "entry.1646529745": lead.email,
  });

  const googleResponse = await fetch(GOOGLE_FORM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: googleFormBody,
  });

  if (!googleResponse.ok) {
    console.error("Google Forms submission failed", googleResponse.status);
    return json({ error: "Could not forward submission" }, 502, responseOrigin);
  }

  return json({ ok: true }, 200, responseOrigin);
});
