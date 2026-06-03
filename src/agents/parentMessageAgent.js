// ── 에이전트 ④ 학부모/회원 알림 메시지 생성 ──────────────
import { callAI } from "../api/openai";

export async function runParentMessageAgent(cls, attendedMembers, absentMembers, memo, { addLog }) {
  const isAdult   = cls?.category === "성인";
  const recipient = isAdult ? "회원 본인" : "학부모";
  addLog(`🤖 [${isAdult ? "회원" : "학부모"} 알림 에이전트] ${cls?.title}`, "start");
  addLog(`👥 출석 ${attendedMembers.length}명 / 결석 ${absentMembers.length}명`, "info");
  addLog(`✍️ ${recipient} 알림 문자 생성 중...`, "think");

  const prompt = `농구교실 수업 후 ${recipient}에게 보낼 문자 초안을 작성해주세요.

수업명: ${cls?.title}
출석 회원: ${attendedMembers.map(m => m.name).join(", ") || "없음"}
결석 회원: ${absentMembers.map(m => m.name).join(", ") || "없음"}
강사 메모: ${memo || "없음"}

출석 회원과 결석 회원 각각에게 보낼 문자를 [이름] 형식으로 구분해서 작성해주세요. 따뜻하고 간결하게, 각 문자는 3~4문장으로 작성해주세요.`;

  const result = await callAI(prompt, "당신은 농구교실 코치입니다. 학부모와 회원에게 친근하고 전문적인 메시지를 작성합니다.");

  addLog(`✅ ${recipient} 알림 문자 생성 완료`, "done");
  return { result };
}
