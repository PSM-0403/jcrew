// ── 에이전트 ⑥ 수업 추천 ────────────────────────────────────

const TIME_LABELS = {
  morning:   "오전(~12시)",
  afternoon: "오후(12~18시)",
  evening:   "저녁(18시~)",
};

export async function runRecommendAgent(info, classes, { addLog }) {
  addLog("🤖 [수업 추천 에이전트] 시작", "start");
  addLog(`👤 신규 회원 정보 분석 중... (${info.category}, ${info.ageLabel})`, "info");
  await delay(500);

  let candidates = classes.filter(c => c.category === info.category);

  if (info.ageLabel === "초등학생") {
    const filtered = candidates.filter(c => c.title.includes("초등"));
    if (filtered.length > 0) candidates = filtered;
  } else if (info.ageLabel === "중학생" || info.ageLabel === "고등학생") {
    const filtered = candidates.filter(c => c.title.includes("중등") || c.title.includes("고등"));
    if (filtered.length > 0) candidates = filtered;
  }

  if (info.days?.length > 0) {
    const filtered = candidates.filter(c => c.days?.some(d => info.days.includes(d)));
    if (filtered.length > 0) candidates = filtered;
  }

  const available = candidates.filter(c => c.enrolled < c.capacity);

  addLog(`📋 조건 맞는 수업 ${available.length}개 발견`, "info");

  if (available.length === 0) {
    addLog("❌ 조건에 맞는 수업 없음", "warn");
    return { result: "선택한 조건에 맞는 수업이 없습니다. 조건을 바꿔 다시 시도해 보세요." };
  }

  addLog("🧠 AI — 최적 수업 판단 중...", "think");
  await delay(900);

  const top = available[0];
  const result = `✅ 추천 수업: ${top.title} (${top.days?.join("/")}요일 ${top.startTime}~${top.endTime})
→ ${info.ageLabel} 회원에게 적합한 레벨이며, 현재 잔여 자리가 ${top.capacity - top.enrolled}석 있습니다. 첫 수업 참여 후 레벨 조정도 가능합니다.${available[1] ? `\n\n차선 추천: ${available[1].title} (${available[1].days?.join("/")}요일 ${available[1].startTime}~${available[1].endTime})\n→ 요일이 달라 일정 선택의 폭이 넓습니다.` : ""}`;

  addLog("✅ 수업 추천 완료", "done");
  return { result };
}

const delay = ms => new Promise(r => setTimeout(r, ms));
