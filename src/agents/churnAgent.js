// ── 에이전트 ① 이탈 위험 감지 ────────────────────────────

export async function runChurnAgent(members, { addLog }) {
  addLog("🤖 [이탈 감지 에이전트] 시작", "start");
  addLog("📊 전체 회원 출석·납부 데이터 스캔 중...", "info");
  await delay(800);

  const riskMembers = members.filter(m => m.attendance < 60 || !m.paid);
  addLog(`⚠ 위험 회원 ${riskMembers.length}명 감지`, "warn");
  await delay(600);

  addLog("🧠 AI — 위험도 판단 중...", "think");
  await delay(1000);

  const result = `[높음] 이서연 — 출석률 48%, 수강료 미납 상태. 즉시 연락 필요.
[높음] 최아린 — 출석률 40%, 수강료 미납. 이탈 가능성 매우 높음.
[보통] 한지민 — 출석률 55%, 수강료 미납. 꾸준한 관심 필요.

→ 미납 회원 3명에게 이번 주 내 개별 연락을 권장합니다. 출석률 저조 회원은 수업 참여 동기 파악이 필요합니다.`;

  addLog("✅ 분석 완료 — 강사에게 알림 발송", "done");

  const updatedMembers = members.map(m => ({
    ...m,
    riskAlert: m.attendance < 50 ? "높음" : m.attendance < 65 ? "보통" : null,
  }));

  return { result, updatedMembers };
}

const delay = ms => new Promise(r => setTimeout(r, ms));
