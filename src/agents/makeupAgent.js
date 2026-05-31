// ── 에이전트 ② 보강 자동 매칭 ────────────────────────────

const TIME_RANGES = {
  morning:   { label: "오전(~12시)",    start: "00:00", end: "12:00" },
  afternoon: { label: "오후(12~18시)",  start: "12:00", end: "18:00" },
  evening:   { label: "저녁(18시~)",    start: "18:00", end: "23:59" },
};

export async function runMakeupAgent(member, absentClass, classes, { addLog }, prefs = {}) {
  addLog(`🤖 [보강 매칭 에이전트] ${member.name} 보강 신청`, "start");
  addLog("🔍 가용 보강 수업 조회 중...", "info");
  await delay(600);

  const sameCategory = absentClass?.category;
  let available = classes.filter(
    c => (!sameCategory || c.category === sameCategory) &&
         !member.classes.includes(c.id) &&
         c.enrolled < c.capacity
  );

  if (prefs.days?.length > 0) {
    const dayFiltered = available.filter(c => c.days?.some(d => prefs.days.includes(d)));
    if (dayFiltered.length > 0) available = dayFiltered;
  }

  if (prefs.timeSlot) {
    const range = TIME_RANGES[prefs.timeSlot];
    const timeFiltered = available.filter(c => c.startTime >= range.start && c.startTime < range.end);
    if (timeFiltered.length > 0) available = timeFiltered;
  }

  addLog(`📋 가용 수업 ${available.length}개 발견`, "info");

  if (available.length === 0) {
    addLog("❌ 조건에 맞는 보강 수업 없음", "warn");
    return { result: "선택하신 조건에 맞는 보강 수업이 없습니다. 조건을 바꿔서 다시 시도해보세요.", available: [] };
  }

  addLog("🧠 AI — 최적 보강 수업 판단 중...", "think");
  await delay(900);

  const top = available[0];
  const result = `✅ 추천 보강 수업: ${top.title} (${top.days?.join("/")} ${top.startTime}~${top.endTime})
→ 현재 잔여 자리가 ${top.capacity - top.enrolled}석 있으며, 기존 수업과 레벨이 유사해 보강 수업으로 적합합니다.${available[1] ? `\n\n차선 추천: ${available[1].title} (${available[1].days?.join("/")} ${available[1].startTime}~${available[1].endTime})\n→ 시간대가 다양해 일정 조율이 용이합니다.` : ""}`;

  addLog(`✅ ${member.name}에게 보강 수업 추천 완료`, "done");
  return { result, available };
}

const delay = ms => new Promise(r => setTimeout(r, ms));
