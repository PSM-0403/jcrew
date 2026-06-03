// ── 이탈 위험 회원 분석 ────────────────────────────────────
import { callAI } from "../api/openai";
import { fetchAllAttendanceStats, saveAgentResult, updateMemberRiskAlert } from "../api/db";

export async function runChurnAgent(members, { addLog }) {
  addLog("📊 [이탈 위험 회원 분석] 시작", "start");
  addLog("출결 데이터 분석 중...", "info");

  const stats = await fetchAllAttendanceStats();

  const memberStats = members.map(m => {
    const s = stats[m.id] ?? { total: 0, recentAbsent: 0, consecutiveAbsent: 0, rate: null };
    const rate = s.rate ?? m.attendance ?? 100;
    const hasData = s.total >= 5;

    let riskLevel = null;
    if (s.consecutiveAbsent >= 3 && !m.paid)       riskLevel = "매우높음";
    else if (s.consecutiveAbsent >= 3)              riskLevel = "높음";
    else if (!m.paid && hasData && rate < 60)       riskLevel = "높음";
    else if (hasData && rate < 50)                  riskLevel = "보통";
    else if (!m.paid && hasData && rate < 70)       riskLevel = "보통";

    return { ...m, realRate: rate, stats: s, riskLevel };
  });

  const riskMembers = memberStats
    .filter(m => m.riskLevel)
    .sort((a, b) => ({ "매우높음": 0, "높음": 1, "보통": 2 }[a.riskLevel] - { "매우높음": 0, "높음": 1, "보통": 2 }[b.riskLevel]));

  addLog(`⚠ 위험 회원 ${riskMembers.length}명 감지`, "warn");

  // 위험 회원 없음
  if (riskMembers.length === 0) {
    const result = "이탈 위험 회원이 없습니다. 모든 회원이 양호한 상태입니다! 👍";
    await saveAgentResult("churn", result);
    const updatedMembers = memberStats.map(({ stats: _s, realRate: _r, riskLevel, ...m }) => ({
      ...m, riskAlert: null, aiComment: '',
    }));
    addLog("✅ 분석 완료", "done");
    return { result, updatedMembers };
  }

  // AI 한 줄 코멘트 생성
  addLog("🤖 AI 코멘트 생성 중...", "think");

  const memberList = riskMembers.map(m =>
    `${m.name}: 출석률 ${m.realRate}%, ${m.paid ? "납부완료" : "미납"}, 연속결석 ${m.stats.consecutiveAbsent}회`
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
    `[${m.riskLevel}] ${m.name} — 출석률 ${m.realRate}%, ${m.paid ? "납부완료" : "미납"}, 연속결석 ${m.stats.consecutiveAbsent}회`
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
