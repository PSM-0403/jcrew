// ── 이탈 위험 회원 분석 ────────────────────────────────────
import { callAI } from "../api/openai";
import { fetchAllAttendanceStats, saveAgentResult, updateMemberRiskAlert } from "../api/db";
import { classifyRisk, RISK_ORDER } from "../analytics/attendanceMetrics";

export async function runChurnAgent(members, { addLog }) {
  addLog("📊 [이탈 위험 회원 분석] 시작", "start");
  addLog("출결 데이터 분석 중...", "info");

  const stats = await fetchAllAttendanceStats();

  // 위험 단계 규칙은 analytics/attendanceMetrics.js의 classifyRisk에 정의돼 있다.
  const memberStats = members.map(m => {
    const s = stats[m.id] ?? { total: 0, consecutiveUnexcused: 0, recentUnexcused: 0, rate: null };
    const rate = s.rate ?? m.attendance ?? 100;
    return { ...m, realRate: rate, stats: s, riskLevel: classifyRisk(m, s) };
  });

  const riskMembers = memberStats
    .filter(m => m.riskLevel)
    .sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel]);

  addLog(`⚠ 위험 회원 ${riskMembers.length}명 감지`, "warn");

  // 위험 회원 없음
  if (riskMembers.length === 0) {
    const result = "이탈 위험 회원이 없습니다. 모든 회원이 양호한 상태입니다! 👍";
    addLog("💾 저장 중...", "info");
    await saveAgentResult("churn", result);
    // 이전에 위험으로 표시됐던 회원들의 기록도 DB에서 초기화
    await Promise.all(
      members.filter(m => m.riskAlert).map(m => updateMemberRiskAlert(m.id, null, ''))
    );
    const updatedMembers = memberStats.map(({ stats: _s, realRate: _r, riskLevel, ...m }) => ({
      ...m, riskAlert: null, aiComment: '',
    }));
    addLog("✅ 분석 완료", "done");
    return { result, updatedMembers };
  }

  // AI 한 줄 코멘트 생성
  addLog("🤖 AI 코멘트 생성 중...", "think");

  const memberList = riskMembers.map(m =>
    `${m.name}: 출석률 ${m.realRate}%, ${m.paid ? "납부완료" : "미납"}, 연속 무단결석 ${m.stats.consecutiveUnexcused}회, 최근 5회 중 무단 ${m.stats.recentUnexcused}회`
  ).join("\n");

  let aiLines = [];
  try {
    const aiResponse = await callAI(
      `농구교실 이탈 위험 회원입니다. 각 회원에 대해 "이름: 한 줄 코멘트" 형식으로만 답변하세요.\n${memberList}`,
      "농구교실 운영 전문가. 각 회원에 대해 강사가 취해야 할 조치를 한 줄로 작성."
    );
    aiLines = aiResponse.split("\n").filter(l => l.includes(":"));
  } catch {
    addLog("AI 코멘트 생성 실패, 기본값 사용", "warn");
  }

  // 회원별 코멘트 매핑
  const commentMap = {};
  for (const line of aiLines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const name = line.slice(0, colonIdx).trim().replace(/^\[.*?\]\s*/, "");
    const comment = line.slice(colonIdx + 1).trim();
    const member = riskMembers.find(m => m.name === name || name.includes(m.name));
    if (member) commentMap[member.id] = comment;
  }

  const result = riskMembers.map(m =>
    `[${m.riskLevel}] ${m.name} — 출석률 ${m.realRate}%, ${m.paid ? "납부완료" : "미납"}, 연속 무단결석 ${m.stats.consecutiveUnexcused}회, 최근 5회 중 무단 ${m.stats.recentUnexcused}회`
  ).join("\n");

  addLog("💾 저장 중...", "info");
  await saveAgentResult("churn", result);
  await Promise.all(
    memberStats.map(m => updateMemberRiskAlert(m.id, m.riskLevel, commentMap[m.id] ?? ''))
  );

  addLog("✅ 분석 완료", "done");

  const updatedMembers = memberStats.map(({ stats: _s, realRate: _r, riskLevel, ...m }) => ({
    ...m,
    riskAlert: riskLevel,
    aiComment: commentMap[m.id] ?? '',
  }));
  return { result, updatedMembers };
}
