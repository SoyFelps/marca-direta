import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Lead = {
  company_name?: string | null;
  industry?: string | null;
  contact_name?: string | null;
  whatsapp?: string | null;
};

type Payload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: Lead | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const html = (value: unknown) =>
  String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return json({ error: "Telegram secrets are not configured" }, 500);
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  if (
    payload.type !== "INSERT" ||
    payload.schema !== "public" ||
    payload.table !== "leads" ||
    !payload.record
  ) {
    return json({ ignored: true });
  }

  const lead = payload.record;
  const text = [
    "<b>Novo lead recebido</b>",
    "",
    `<b>Marca:</b> ${html(lead.company_name)}`,
    `<b>Ramo:</b> ${html(lead.industry)}`,
    `<b>Nome:</b> ${html(lead.contact_name)}`,
    `<b>Telefone:</b> ${html(lead.whatsapp)}`,
  ].join("\n");

  const response = await fetch(
    `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    console.error("Telegram API error", result);
    return json({ error: "Telegram API error" }, 502);
  }

  return json({
    ok: true,
    telegram_message_id: result.result?.message_id ?? null,
  });
});
