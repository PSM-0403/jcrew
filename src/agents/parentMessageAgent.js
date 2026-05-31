// ── 에이전트 ④ 학부모/회원 알림 메시지 생성 ──────────────

export async function runParentMessageAgent(cls, attendedMembers, absentMembers, memo, { addLog }) {
  const isAdult = cls?.category === "성인";
  const agentName = isAdult ? "회원 알림 에이전트" : "학부모 알림 에이전트";
  const recipient = isAdult ? "회원 본인" : "학부모";

  addLog(`🤖 [${agentName}] ${cls?.title} 수업 종료 처리`, "start");
  addLog(`👥 출석 ${attendedMembers.length}명 / 결석 ${absentMembers.length}명 확인`, "info");
  addLog(`✍️ 회원별 ${recipient} 알림 문자 생성 중...`, "think");
  await delay(1100);

  const attended = attendedMembers.map(m =>
    `[${m.name}]\n안녕하세요! 오늘 ${cls?.title} 수업에 성실히 참여해주셔서 감사합니다. 오늘은 기본기 위주로 진행됐으며 ${m.name}${isAdult ? "님께서" : " 학생이"} 특히 적극적으로 참여해 주셨습니다. 다음 수업도 기대하겠습니다! 🏀`
  ).join("\n\n");

  const absent = absentMembers.map(m =>
    `[${m.name}]\n안녕하세요! 오늘 ${cls?.title} 수업에 불참하셨네요. 보강 수업 신청은 앱에서 편리하게 하실 수 있습니다. 궁금한 점은 언제든지 연락 주세요!`
  ).join("\n\n");

  const result = [attended, absent].filter(Boolean).join("\n\n─────────────\n\n") || "해당 회원이 없습니다.";

  addLog(`📱 ${recipient} 알림 문자 초안 생성 완료`, "done");
  return { result };
}

const delay = ms => new Promise(r => setTimeout(r, ms));
