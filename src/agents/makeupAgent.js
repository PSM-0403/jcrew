// ── 에이전트 ② 보강 자동 매칭 ────────────────────────────
import { callGemini } from "../api/gemini";

const TIME_RANGES = {
  morning:   { label: "오전(~12시)",   start: "00:00", end: "12:00" },
  afternoon: { label: "오후(12~18시)", start: "12:00", end: "18:00" },
  evening:   { label: "저녁(18시~)",   start: "18:00", end: "23:59" },
};

export async function runMakeupAgent(member, absentClass, classes, { addLog }, prefs = {}) {
  addLog(`🤖 [보강 매칭 에이전트] ${member.name} 보강 신청`, "start");
  addLog("🔍 가용 보강 수업 조회 중...", "info");

  const sameCategory = absentClass?.category;
  let available = classes.filter(
    c => (!sameCategory || c.category === sameCategory) &&
         !member.classes.includes(c.id) &&
         c.enrolled < c.capacity
  );

  if (prefs.days?.length > 0) {
    const filtered = available.filter(c => c.days?.some(d => prefs.days.includes(d)));
    if (filtered.length > 0) available = filtered;
  }

  if (prefs.timeSlot) {
    const range = TIME_RANGES[prefs.timeSlot];
    const filtered = available.filter(c => c.startTime >= range.start && c.startTime < range.end);
    if (filtered.length > 0) available = filtered;
  }

  addLog(`📋 가용 수업 ${available.length}개 발견`, "info");

  if (available.length === 0) {
    addLog("❌ 조건에 맞는 보강 수업 없음", "warn");
    return { result: "선택하신 조건에 맞는 보강 수업이 없습니다. 조건을 바꿔서 다시 시도해보세요.", available: [] };
  }

  addLog("🧠 AI — 최적 보강 수업 판단 중...", "think");

  const classList = available.map(c =>
    `- ${c.title} (${c.days?.join("/")}요일 ${c.startTime}~${c.endTime}, 레벨: ${c.level}, 잔여 ${c.capacity - c.enrolled}석)`
  ).join("\n");

  const prompt = `농구교실 보강 수업을 추천해주세요.

회원: ${member.name}
결석한 수업: ${absentClass?.title || "미지정"}
선호 요일: ${prefs.days?.join(", ") || "상관없음"}
선호 시간대: ${prefs.timeSlot ? TIME_RANGES[prefs.timeSlot]?.label : "상관없음"}

보강 가능한 수업:
${classList}

가장 적합한 보강 수업을 1~2개 추천하고 이유를 간결하게 설명해주세요.`;

  const result = await callGemini(prompt, "당신은 농구교실 보강 수업 매칭 전문가입니다.");

  addLog(`✅ ${member.name}에게 보강 수업 추천 완료`, "done");
  return { result, available };
}
