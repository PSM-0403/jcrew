// ── 에이전트 ③ 피드백 자동 생성 ──────────────────────────

export async function runFeedbackAgent(cls, attendedMembers, memo, { addLog }) {
  addLog(`🤖 [피드백 에이전트] ${cls?.title} 수업 종료`, "start");
  addLog(`👥 출석 회원 ${attendedMembers.length}명 확인`, "info");
  addLog("✍️ 강사 메모 기반 개인별 피드백 생성 중...", "think");
  await delay(1200);

  const feedbacks = attendedMembers.length > 0
    ? attendedMembers.map(m => `[${m.name}]\n오늘 수업 정말 열심히 참여해줬어요! 특히 드리블 동작이 지난번보다 훨씬 안정적으로 보였습니다. 다음 수업에서는 패스 타이밍을 조금 더 신경써보면 더욱 발전할 수 있을 것 같아요. 계속 이 열정 유지해주세요! 💪`).join("\n\n")
    : "출석 회원이 없습니다.";

  addLog("📱 회원별 피드백 자동 발송 완료", "done");
  return { result: feedbacks };
}

const delay = ms => new Promise(r => setTimeout(r, ms));
