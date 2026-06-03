// ── 에이전트 ⑤ 월간 리포트 자동 생성 ─────────────────────
import { callAI } from "../api/openai";

export async function runMonthlyReportAgent(members, classes, { addLog }) {
  addLog("🤖 [월간 리포트 에이전트] 시작", "start");
  addLog("📊 전체 데이터 수집 중...", "info");

  const total       = members.length;
  const paid        = members.filter(m => m.paid).length;
  const avgAtt      = total > 0 ? Math.round(members.reduce((s, m) => s + m.attendance, 0) / total) : 0;
  const riskCount   = members.filter(m => m.attendance < 60 || !m.paid).length;
  const riskMembers = members.filter(m => m.attendance < 60 || !m.paid)
    .map(m => `${m.name}(출석${m.attendance}%, ${m.paid ? "납부" : "미납"})`).join(", ");

  addLog(`📋 회원 ${total}명 / 평균 출석 ${avgAtt}% / 위험 ${riskCount}명`, "info");
  addLog("🧠 AI — 리포트 작성 중...", "think");

  const now = new Date();
  const prompt = `제이크루 농구교실 ${now.getMonth() + 1}월 운영 리포트를 작성해주세요.

데이터:
- 전체 회원: ${total}명
- 수강료 납부: ${paid}명 / 미납: ${total - paid}명 (납부율 ${total > 0 ? Math.round(paid / total * 100) : 0}%)
- 평균 출석률: ${avgAtt}%
- 위험 회원(${riskCount}명): ${riskMembers || "없음"}
- 운영 중인 수업: ${classes.length}개

위 데이터를 바탕으로 ①이달의 한줄 요약 ②출석 현황 분석 ③수강료 납부 현황 ④다음 달 중점 관리 항목을 포함한 리포트를 작성해주세요.`;

  const result = await callAI(prompt, "당신은 농구교실 운영을 분석하는 전문 에이전트입니다. 데이터 기반으로 실용적인 리포트를 작성합니다.");

  addLog("✅ 월간 리포트 생성 완료", "done");
  return { result };
}
