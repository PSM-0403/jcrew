export async function callAI(prompt, systemPrompt = "") {
  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(`AI error: ${res.status} — ${errBody?.error ?? ""}`);
    }

    const data = await res.json();
    return data.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}
