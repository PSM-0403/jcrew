// ── AI API ─────────────────────────────────────────────────
// 모든 AI API 호출은 이 파일을 통해서만 함
// AI 제공사 변경 시 이 파일만 수정하면 됨

const API_KEY = import.meta.env.VITE_AI_API_KEY;
const MODEL   = import.meta.env.VITE_AI_MODEL   || "claude-sonnet-4-20250514";
const API_URL = import.meta.env.VITE_AI_API_URL  || "https://api.anthropic.com/v1/messages";

export async function callClaude(userPrompt, systemPrompt = "") {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt || "당신은 제이크루 농구교실 AI 에이전트입니다. 간결하고 실용적으로 답변하세요.",
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  return data.content?.find(b => b.type === "text")?.text || "";
}
