// ── 에이전트 ④ 학부모/회원 알림 메시지 생성 ──────────────
import { callAI } from "../api/openai";

export async function runParentMessageAgent(cls, attendedMembers, absentMembers, memo, classNote, { addLog }) {
  const isAdult   = cls?.category === "성인";
  const recipient = isAdult ? "회원 본인" : "학부모";
  const allMembers = [...attendedMembers, ...absentMembers];

  addLog(`🤖 [${isAdult ? "회원" : "학부모"} 알림] ${cls?.title}`, "start");
  addLog(`👥 출석 ${attendedMembers.length}명 / 결석 ${absentMembers.length}명`, "info");
  addLog("✍️ 개인별 메시지 생성 중...", "think");

  const prompt = `농구교실 수업 후 ${recipient}에게 보낼 메시지를 작성해주세요.

수업명: ${cls?.title}
오늘 수업 내용: ${classNote || "없음"}
강사 피드백 메모 (이름: 내용 형식으로 특정 회원 피드백): ${memo || "없음"}
출석 회원: ${attendedMembers.map(m => m.name).join(", ") || "없음"}
결석 회원: ${absentMembers.map(m => m.name).join(", ") || "없음"}

작성 규칙:
- 피드백 메모에 이름 있으면 → 수업 내용 + 개인 피드백 포함
- 이름 없으면 → 수업 내용만
- 결석 회원 → 결석 안내 + 보강 신청 안내
- 따뜻하고 간결하게 2~3문장

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
[{"name":"실제회원이름","message":"메시지내용"}]

중요: name 필드에는 반드시 위에 명시된 회원의 실제 이름(예: 이한결, 김민준)을 그대로 써야 합니다. "학부모님" 같은 호칭은 절대 사용하지 마세요.`;

  const aiResult = await callAI(prompt, "당신은 농구교실 코치입니다. 학부모와 회원에게 친근하고 전문적인 메시지를 작성합니다.");

  // JSON 파싱
  let parsedMessages = [];
  try {
    const jsonStr = aiResult.match(/\[[\s\S]*\]/)?.[0] ?? aiResult;
    const items = JSON.parse(jsonStr);
    parsedMessages = items
      .map(item => {
        const member = allMembers.find(m => m.name === item.name || item.name?.includes(m.name));
        if (!member || !item.message) return null;
        return { memberId: member.id, name: member.name, content: item.message };
      })
      .filter(Boolean);
  } catch {
    addLog("메시지 파싱 실패 - 원본 텍스트 표시", "warn");
  }

  addLog("✅ 메시지 생성 완료 — 강사 확인 후 전송하세요", "done");
  return { result: aiResult, parsedMessages };
}
