// ── 에이전트 ① 이탈 위험 감지 ────────────────────────────
import { callAI } from "../api/openai";
import { fetchAllAttendanceStats, saveAgentResult, updateMemberRiskAlert } from "../api/db";

export async function runChurnAgent(members, { addLog }) {
  addLog("🤖 [이탈 감지 에이전트] 시작", "start");
  addLog("📊 실제 출결 데이터 분석 중...", "info");

  const stats = await fetchAllAttendanceStats();

  // 회원별 위험도 계산 (엄격한 기준)
  const memberStats = members.map(m => {
    const s = stats[m.id] ?? { total: 0, attended: 0, absent: 0, recentAbsent: 0, consecutiveAbsent: 0, rate: null };
    const rate = s.rate ?? m.attendance ?? 100;
    const hasEnoughData = s.total >= 5; // 최소 5회 이상 수업 기록 있어야 판단

    let riskLevel = null;
    if (s.consecutiveAbsent >= 3 && !m.paid) riskLevel = "매우높음";
    else if (s.consecutiveAbsent >= 3) riskLevel = "높음";
    else if (!m.paid && hasEnoughData && rate < 60) riskLevel = "높음";
    else if (hasEnoughData && rate < 50) riskLevel = "보통";
    else if (!m.paid && hasEnoughData && rate < 70) riskLevel = "보통";

    return { ...m, realRate: rate, stats: s, riskLevel };
  });

  const riskMembers = memberStats.filter(m => m.riskLevel);
  addLog(`⚠ 위험 회원 ${riskMembers.length}명 감지`, "warn");

  if (riskMembers.length === 0) {
    addLog("✅ 이탈 위험 회원 없음", "done");
    const result = "현재 이탈 위험 회원이 없습니다. 모든 회원이 양호한 상태입니다! 👍";
    await saveAgentResult("churn", result);
    const updatedMembers = members.map(m => ({ ...m, riskAlert: null }));
    return { result, updatedMembers };
  }

  addLog("🧠 AI — 개인별 대응 방안 생성 중...", "think");

  const memberData = riskMembers.map(m =>
    `• ${m.name} (${m.schoolLevel}${m.grade ? ` ${m.grade}학년` : ""}/${m.gender || "미등록"})\n` +
    `  - 출석률: ${m.realRate}% | 수강료: ${m.paid ? "납부완료" : "⚠ 미납"}\n` +
    `  - 연속 결석: ${m.stats.consecutiveAbsent}회 | 최근 30일 결석: ${m.stats.recentAbsent}회\n` +
    `  - 위험도: ${m.riskLevel}`
  ).join("\n\n");

  const prompt = `농구교실 이탈 위험 회원입니다. 각 회원에 대해 한 줄로 강사가 취해야 할 조치만 작성해주세요.

${memberData}`;

  const result = await callAI(prompt,
    "당신은 농구교실 운영 전문가입니다. 회원과의 신뢰 관계를 중시하며, 이탈 방지를 위한 구체적이고 실행 가능한 조언을 제공합니다."
  );

  addLog("💾 결과 저장 중...", "info");

  // DB에 결과 저장 + 회원별 위험도 업데이트
  await saveAgentResult("churn", result);
  await Promise.all(
    memberStats.map(m => updateMemberRiskAlert(m.id, m.riskLevel))
  );

  addLog("✅ 분석 완료 및 저장됨", "done");

  const updatedMembers = memberStats.map(({ stats: _s, realRate: _r, ...m }) => m);
  return { result, updatedMembers };
}
