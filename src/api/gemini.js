// ── Gemini API 클라이언트 ──────────────────────────────────
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL   = "gemini-2.0-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

export async function callGemini(prompt, systemPrompt = "") {
  const contents = [];

  if (systemPrompt) {
    contents.push({ role: "user",  parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "알겠습니다." }] });
  }
  contents.push({ role: "user", parts: [{ text: prompt }] });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
