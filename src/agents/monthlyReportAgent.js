// ── 월간 리포트 자동 생성 ──────────────────────────────────
import { callAI } from "../api/openai";
import { fetchAllAttendanceStats, saveAgentResult } from "../api/db";

export async function runMonthlyReportAgent(members, classes, { addLog }) {
  addLog("📊 [월간 리포트] 데이터 수집 중...", "start");

  const now   = new Date();
  const month = now.getMonth() + 1;

  // 실제 출결 데이터
  const attStats = await fetchAllAttendanceStats();

  // 회원 통계
  const total   = members.length;
  const paid    = members.filter(m => m.paid).length;
  const unpaid  = total - paid;
  const payRate = total > 0 ? Math.round(paid / total * 100) : 0;

  // 실제 출석률 계산
  const attRates = members.map(m => {
    const s = attStats[m.id];
    return s && s.total >= 1 ? s.rate : null;
  }).filter(n => n !== null);
  const avgAtt = attRates.length > 0 ? Math.round(attRates.reduce((a, b) => a + b, 0) / attRates.length) : 0;

  // 위험 회원
  const riskMembers = members.filter(m => m.riskAlert);
  const highRisk    = riskMembers.filter(m => m.riskAlert === "매우높음" || m.riskAlert === "높음");

  // 수업별 현황
  const classStats = classes.map(c => {
    const rate = c.capacity > 0 ? Math.round((c.enrolled / c.capacity) * 100) : 0;
    return `${c.title}(${c.enrolled}/${c.capacity}명, ${rate}%)`;
  }).join(", ");

  addLog(`📋 회원 ${total}명 / 납부율 ${payRate}% / 평균출석 ${avgAtt}%`, "info");
  addLog("🤖 AI 리포트 작성 중...", "think");

  const prompt = `제이크루 농구교실 ${month}월 운영 리포트를 간결하게 작성해주세요.

[데이터]
- 전체 회원: ${total}명 | 납부 ${paid}명 / 미납 ${unpaid}명 (납부율 ${payRate}%)
- 평균 출석률: ${avgAtt}% (실측 기반)
- 이탈 위험: 총 ${riskMembers.length}명 (고위험 ${highRisk.length}명)
- 수업 현황: ${classStats || "없음"}

[형식] 아래 4개 항목을 각 2~3줄로:
① 이달 한줄 요약
② 출석·참여 현황
③ 수강료 현황
④ 다음달 중점 관리`;

  const result = await callAI(prompt, "농구교실 운영 전문가. 데이터 기반 간결한 리포트 작성.");

  addLog("💾 저장 중...", "info");
  await saveAgentResult("report", result);

  addLog("✅ 리포트 생성 완료", "done");
  return { result };
}
