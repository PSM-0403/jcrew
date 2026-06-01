// ── 에이전트 ③ 피드백 자동 생성 ──────────────────────────
import { callGemini } from "../api/gemini";

export async function runFeedbackAgent(cls, attendedMembers, memo, { addLog }) {
  addLog(`🤖 [피드백 에이전트] ${cls?.title} 수업`, "start");
  addLog(`👥 출석 회원 ${attendedMembers.length}명 확인`, "info");
  addLog("✍️ 개인별 피드백 생성 중...", "think");

  if (attendedMembers.length === 0) {
    addLog("출석 회원 없음", "warn");
    return { result: "출석 회원이 없습니다." };
  }

  const names = attendedMembers.map(m => m.name).join(", ");
  const prompt = `농구 수업 피드백을 작성해주세요.
수업명: ${cls?.title}
출석 회원: ${names}
강사 메모: ${memo || "없음"}

각 회원에게 보낼 격려와 개선점이 담긴 짧은 피드백을 작성해주세요. 따뜻하고 동기부여가 되는 톤으로, 이름을 포함해 개인별로 작성해주세요.`;

  const result = await callGemini(prompt, "당신은 농구교실 전문 코치입니다. 회원들에게 긍정적이고 구체적인 피드백을 제공합니다.");

  addLog("✅ 피드백 생성 완료", "done");
  return { result };
}
