// ── 에이전트 ⑤ 월간 리포트 자동 생성 ─────────────────────

export async function runMonthlyReportAgent(members, classes, { addLog }) {
  addLog("🤖 [월간 리포트 에이전트] 시작", "start");
  addLog("📊 전체 데이터 수집 중...", "info");
  await delay(600);

  const totalMembers  = members.length;
  const paidCount     = members.filter(m => m.paid).length;
  const unpaidCount   = totalMembers - paidCount;
  const avgAttendance = Math.round(members.reduce((s, m) => s + m.attendance, 0) / totalMembers);
  const riskCount     = members.filter(m => m.attendance < 60 || !m.paid).length;

  addLog(`📋 회원 ${totalMembers}명 / 평균 출석률 ${avgAttendance}% / 위험 ${riskCount}명`, "info");
  addLog("🧠 AI — 리포트 작성 중...", "think");
  await delay(1400);

  const result = `📋 제이크루 농구교실 5월 운영 리포트

1. 이달의 한줄 요약
전반적으로 안정적인 운영이 이루어졌으나, 미납 회원 관리와 출석률 개선이 필요합니다.

2. 출석 현황 분석
• 전체 평균 출석률 ${avgAttendance}% — 목표(80%) 대비 ${avgAttendance >= 80 ? "달성" : "미달"}
• 잘된 점: 박도윤(92%), 김민준(85%) 등 우수 출석 회원 다수
• 우려되는 점: 최아린(40%), 이서연(48%) 출석률 급락 → 개별 면담 필요

3. 수강료 납부 현황
• 납부 ${paidCount}명 / 미납 ${unpaidCount}명 (납부율 ${Math.round(paidCount/totalMembers*100)}%)
• 미납 회원 개별 연락 및 납부 독려 권장

4. 수업 운영 현황
• 총 ${classes.length}개 수업 운영 중
• 초등취미반(화/목) 정원 대비 높은 등록률 — 증반 검토 필요
• 고등집중반(금) 등록 저조 — 홍보 강화 필요

5. 다음 달 중점 관리 대상
• 최아린 — 출석률 40%, 미납, 즉시 연락 필요
• 이서연 — 출석률 48%, 미납, 이탈 위험 높음

6. 강사에게 드리는 한마디
이달 수고 많으셨습니다. 미납·저출석 회원 집중 케어와 함께 우수 회원에 대한 칭찬도 잊지 마세요! 🏀`;

  addLog("✅ 월간 리포트 생성 완료", "done");
  return { result };
}

const delay = ms => new Promise(r => setTimeout(r, ms));
