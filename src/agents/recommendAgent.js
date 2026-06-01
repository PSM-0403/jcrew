// ── 에이전트 ⑥ 수업 추천 ────────────────────────────────────
import { callGemini } from "../api/gemini";

export async function runRecommendAgent(info, classes, { addLog }) {
  addLog("🤖 [수업 추천 에이전트] 시작", "start");
  addLog(`👤 ${info.ageLabel} 분석 중...`, "info");

  let candidates = classes.filter(c => c.enrolled < c.capacity);

  if (info.days?.length > 0) {
    const filtered = candidates.filter(c => c.days?.some(d => info.days.includes(d)));
    if (filtered.length > 0) candidates = filtered;
  }

  addLog(`📋 가용 수업 ${candidates.length}개 확인`, "info");

  if (candidates.length === 0) {
    addLog("❌ 가용 수업 없음", "warn");
    return { result: "현재 등록 가능한 수업이 없습니다." };
  }

  addLog("🧠 AI — 최적 수업 판단 중...", "think");

  const classList = candidates.map(c =>
    `- ${c.title} (${c.days?.join("/")}요일 ${c.startTime}~${c.endTime}, 잔여 ${c.capacity - c.enrolled}석, 레벨: ${c.level})`
  ).join("\n");

  const prompt = `신규 농구교실 회원에게 수업을 추천해주세요.

회원 정보:
- 구분: ${info.ageLabel}
- 선호 요일: ${info.days?.join(", ") || "상관없음"}
- 선호 시간대: ${info.timeSlot || "상관없음"}

현재 등록 가능한 수업 목록:
${classList}

가장 적합한 수업 1~2개를 추천하고, 추천 이유를 간결하게 설명해주세요.`;

  const result = await callGemini(prompt, "당신은 농구교실 수업 배정 전문가입니다.");

  addLog("✅ 수업 추천 완료", "done");
  return { result };
}
