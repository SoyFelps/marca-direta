import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Lead = {
  id?: string;
  company_name?: string | null;
  industry?: string | null;
  contact_name?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

type Payload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Lead | null;
};

type SearchResult = {
  mark_name?: { raw?: string | null };
  process_number?: { raw?: string | null };
  holders?: { raw?: Array<{ name?: string | null }> | null };
  status?: { raw?: string | null };
  specifications?: { raw?: Array<{ nice_class_code?: string | null }> | null };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SECRET_KEY = (() => {
  const value = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed.default === "string") return parsed.default;
    } catch {
      // Fall through to the legacy variable.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
})();
const INPI_SEARCH_URL = "https://api-servicos.busca.inpi.gov.br/api/trademarks/search";
const INPI_LINK = "https://servicos.busca.inpi.gov.br/marcas";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const escapeHtml = (value: unknown) =>
  String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

const supabasePatch = async (id: string, values: Record<string, unknown>) => {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Supabase server credentials are not configured");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(values),
  });
  if (!response.ok) throw new Error(`Supabase update failed: ${response.status}`);
};

const searchInpi = async (term: string): Promise<{ total: number; results: SearchResult[] }> => {
  const payload = {
    state: { current: 1, resultsPerPage: 50, searchTerm: term, filters: [] },
    queryConfig: {
      search_fields: { mark_name: { weight: 3 } },
      result_fields: {
        mark_name: { snippet: { size: 120, fallback: true } },
        process_number: { raw: {} },
        holders: { raw: {} },
        status: { raw: {} },
        specifications: { raw: {} },
      },
      facets: {},
    },
  };
  const response = await fetch(INPI_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`INPI API returned ${response.status}`);
  const data = await response.json();
  return { total: Number(data.totalResults ?? 0), results: data.results ?? [] };
};

const formatResult = (result: SearchResult) => {
  const name = result.mark_name?.raw ?? "—";
  const process = result.process_number?.raw ?? "—";
  const classes = (result.specifications?.raw ?? [])
    .map((item) => item.nice_class_code)
    .filter(Boolean)
    .join(", ") || "não informada";
  const holder = (result.holders?.raw ?? []).map((item) => item.name).filter(Boolean).join(", ") || "não informado";
  const status = result.status?.raw ?? "não informada";
  return `• ${name} — processo ${process}; classe(s) ${classes}; titular: ${holder}; situação: ${status}.`;
};

const sendTelegram = async (text: string) => {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID") ?? "8717002224";
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  for (let start = 0; start < text.length; start += 3900) {
    const chunk = text.slice(start, start + 3900);
    const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error("Telegram API error");
  }
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }
  if (payload.type !== "INSERT" || payload.schema !== "public" || payload.table !== "leads" || !payload.record) {
    return json({ ignored: true });
  }

  const lead = payload.record;
  const id = lead.id;
  const brand = String(lead.company_name ?? "").trim();
  if (!id || !brand) return json({ error: "Lead id and brand are required" }, 422);

  try {
    await supabasePatch(id, { research_status: "running", research_started_at: new Date().toISOString(), research_error: null });
    const exact = await searchInpi(brand);
    const exactNormalized = normalize(brand);
    const exactMatches = exact.results.filter((result) => normalize(String(result.mark_name?.raw ?? "")) === exactNormalized);
    const relevant = exact.results.filter((result) => {
      const classes = (result.specifications?.raw ?? []).map((item) => String(item.nice_class_code ?? ""));
      return classes.some((value) => ["09", "9", "35", "38", "42"].includes(value));
    }).slice(0, 8);
    const visibleResults = exactMatches.length > 0 ? exactMatches.slice(0, 8) : relevant;
    const classes = "Não informadas no formulário; para tecnologia, a classe dependerá dos produtos/serviços, normalmente podendo envolver 09, 38, 42 ou outras.";
    const risk = exactMatches.some((result) => ["Registro de marca em vigor", "Pedido de registro publicado"].includes(String(result.status?.raw)))
      ? "alto"
      : visibleResults.length > 0 ? "moderado" : "preliminarmente baixo quanto a coincidência nominativa exata";
    const report = [
      "<b>PESQUISA DE ANTERIORIDADE — " + escapeHtml(brand) + "</b>",
      `Titular informado: ${escapeHtml(lead.contact_name)} | Ramo: ${escapeHtml(lead.industry)}`,
      `Contato: ${escapeHtml(lead.whatsapp)} | E-mail: ${escapeHtml(lead.email)}`,
      "",
      `Consulta nominativa no portal oficial do INPI: ${exact.total} resultado(s) retornado(s).`,
      exactMatches.length > 0 ? "Foram encontradas coincidências nominativas exatas:" : "Não foi localizada coincidência nominativa exata na listagem analisada.",
      ...(visibleResults.length > 0 ? visibleResults.map(formatResult) : ["• Não foram selecionados resultados próximos nas classes de tecnologia/negócios digitais na triagem realizada."]),
      "",
      `Risco preliminar: <b>${risk}</b>.`,
      `Classes: ${escapeHtml(classes)}`,
      "",
      "Limitações: a consulta é uma triagem pública, sem classe formal informada, e não substitui pesquisa fonética, análise de afinidade mercadológica, exame de especificações, uso anterior ou parecer jurídico.",
      `Fonte oficial: ${INPI_LINK}?q=${encodeURIComponent(brand)}&size=n_50_n`,
    ].join("\n");
    await sendTelegram(report);
    await supabasePatch(id, { research_status: "completed", research_completed_at: new Date().toISOString(), research_report: report, research_error: null });
    return json({ ok: true, id, status: "completed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown research error";
    console.error("Lead research failed", message);
    try {
      await supabasePatch(id, { research_status: "error", research_error: message, research_completed_at: new Date().toISOString() });
    } catch (patchError) {
      console.error("Could not persist research error", patchError);
    }
    return json({ error: "Research failed", id }, 502);
  }
});
