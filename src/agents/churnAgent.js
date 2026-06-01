// ── 에이전트 ① 이탈 위험 감지 ────────────────────────────
import { callGemini } from "../api/gemini";

export async function runChurnAgent(members, { addLog }) {
  addLog("🤖 [이탈 감지 에이전트] 시작", "start");
  addLog("📊 전체 회원 출석·납부 데이터 스캔 중...", "info");

  const riskMembers = members.filter(m => m.attendance < 70 || !m.paid);
  addLog(`⚠ 위험 회원 ${riskMembers.length}명 감지`, "warn");
  addLog("🧠 AI — 위험도 판단 중...", "think");

  const memberData = riskMembers.map(m =>
    `- ${m.name}: 출석률 ${m.attendance}%, 수강료 ${m.paid ? "납부" : "미납"}`
  ).join("\n");

  const prompt = `다음은 농구교실 위험 회원 목록입니다:\n${memberData}\n\n각 회원의 이탈 위험도(높음/보통/낮음)를 판단하고, 강사가 취해야 할 구체적인 조치를 제안해주세요. 한국어로 간결하게 작성하세요.`;

  const result = riskMembers.length === 0
    ? "현재 이탈 위험 회원이 없습니다. 모든 회원이 양호한 상태입니다! 👍"
    : await callGemini(prompt, "당신은 농구교실 운영을 돕는 AI 에이전트입니다.");

  addLog("✅ 분석 완료", "done");

  const updatedMembers = members.map(m => ({
    ...m,
    riskAlert: m.attendance < 50 ? "높음" : m.attendance < 65 ? "보통" : null,
  }));

  return { result, updatedMembers };
}
