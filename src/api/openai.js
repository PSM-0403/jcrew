// ── AI 클라이언트 (OpenAI gpt-4o-mini) ────────────────────
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function callAI(prompt, systemPrompt = "") {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.5,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`OpenAI error: ${res.status} — ${errBody?.error?.message ?? ""}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}
