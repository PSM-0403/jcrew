import { useState, useRef, useEffect } from "react";
import { useAgentStore } from "../../stores/agentStore";
import { fetchNotices, insertNotice, deleteNotice, fetchLatestAgentResult, saveClassNote, fetchClassNote, saveClassFeedback, fetchClassFeedback, sendMessage } from "../../api/db";
import { StatCard, MemberAvatar, AgentLog } from "../../components/Common";
import { runChurnAgent }          from "../../agents/churnAgent";
import { runFeedbackAgent }       from "../../agents/feedbackAgent";
import { runParentMessageAgent }  from "../../agents/parentMessageAgent";
import { runMonthlyReportAgent }  from "../../agents/monthlyReportAgent";
import { COLORS, fmtDate }  from "../../constants";


// ── 강사: 대시보드 ─────────────────────────────────────────
export function CoachDashboard({ members, classes = [], pendingMembers = [], onApprove, onReject, onTogglePaid, pendingPayments = [], onConfirmPayment, makeupRequests = [], onAssignMakeup }) {
  const todayName = ["일","월","화","수","목","금","토"][new Date().getDay()];
  const todayClasses = classes.filter(c => (c.days ?? []).includes(todayName));
  const [assignModal, setAssignModal]   = useState(null);
  const [assignForm, setAssignForm]     = useState({ classId: "", date: "", memo: "" });
  const [lastChurnResult, setLastChurnResult]   = useState(null);
  const [lastReportResult, setLastReportResult] = useState(null);

  useEffect(() => {
    fetchLatestAgentResult("churn").then(r => { if (r) setLastChurnResult(r); });
    fetchLatestAgentResult("report").then(r => { if (r) setLastReportResult(r); });
  }, []);

  const openAssign = (r) => { setAssignModal(r); setAssignForm({ classId: "", date: "", memo: "" }); };
  const handleAssign = () => {
    onAssignMakeup(assignModal.id, {
      assignedClassId: assignForm.classId ? Number(assignForm.classId) : null,
      assignedDate: assignForm.date || null,
      assignedMemo: assignForm.memo,
    });
    setAssignModal(null);
  };

  return (
    <div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        <StatCard label="전체 회원"   value={`${members.length}명`}                        color="#3B82F6" />
        <StatCard label="미납 회원"   value={`${members.filter(m => !m.paid).length}명`}   color="#EF4444" />
        <StatCard label="오늘 수업"    value={`${todayClasses.length}개`}                    color={COLORS.ORANGE} />
      </div>

      {/* 가입 승인 대기 */}
      {pendingMembers.length > 0 && (
        <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.ORANGE}55`, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 12 }}>
            🔔 가입 승인 대기 ({pendingMembers.length}명)
          </div>
          {pendingMembers.map(m => (
            <div key={m.pendingId} style={{ padding: "12px 0", borderBottom: "1px solid #ffffff08" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#8899AA", marginTop: 2 }}>
                    {m.schoolLevel}{m.schoolLevel !== "성인" && ` ${m.schoolName ? `${m.schoolName} · ` : ""}${m.grade}학년`} · {m.parentPhone}
                    {m.studentPhone && ` / ${m.studentPhone}`}
                    {m.shuttle && ` · 셔틀(${m.address})`}
                  </div>
                  {m.note && (
                    <div style={{ fontSize: 11, marginTop: 4, padding: "4px 8px", borderRadius: 6, background: "#ffffff08", color: "#FCD34D" }}>
                      ⚠ 특이사항: {m.note}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onApprove(m.pendingId)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#166534", color: "#86EFAC", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>승인</button>
                  <button onClick={() => onReject(m.pendingId)}  style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#7F1D1D", color: "#FCA5A5", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>반려</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 계좌이체 납부 확인 대기 */}
      {pendingPayments.length > 0 && (
        <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: "1px solid #3B82F633", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3B82F6", marginBottom: 12 }}>
            🏦 계좌이체 확인 대기 ({pendingPayments.length}건)
          </div>
          {pendingPayments.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #ffffff08" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.memberName}</div>
                <div style={{ fontSize: 11, color: "#8899AA", marginTop: 2 }}>이체 완료 신청 · {p.requestedAt}</div>
                {p.memo && <div style={{ fontSize: 12, color: "#FCD34D", marginTop: 3 }}>💬 {p.memo}</div>}
              </div>
              <button onClick={() => onConfirmPayment(p.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#166534", color: "#86EFAC", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                납부 확인
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 보강 신청 목록 */}
      {makeupRequests.length > 0 && (
        <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: "1px solid #8B5CF633", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8B5CF6", marginBottom: 12 }}>
            🏀 보강 신청 ({makeupRequests.length}건)
          </div>
          {makeupRequests.map(r => (
            <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #ffffff08" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.member_name}</div>
                  <div style={{ fontSize: 11, color: "#8899AA", marginTop: 2 }}>{r.class_title}</div>
                  <div style={{ fontSize: 11, color: "#8899AA", marginTop: 2 }}>
                    {r.preferred_date && `📅 ${r.preferred_date}`}
                    {r.preferred_time && ` · ${r.preferred_time === "morning" ? "오전" : r.preferred_time === "afternoon" ? "오후" : "저녁"}`}
                  </div>
                  {r.note && <div style={{ fontSize: 11, color: "#FCD34D", marginTop: 4 }}>💬 {r.note}</div>}
                </div>
                <button onClick={() => openAssign(r)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: "#166534", color: "#86EFAC", flexShrink: 0, marginLeft: 8 }}>
                  배정
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 월간 리포트 */}
      {lastReportResult && (
        <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: "1px solid #8B5CF633", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#8B5CF6" }}>
              📋 {new Date(lastReportResult.created_at).getMonth() + 1}월 운영 리포트
            </div>
            <div style={{ fontSize: 11, color: "#8899AA" }}>
              {new Date(lastReportResult.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
            {lastReportResult.result}
          </div>
        </div>
      )}

      {/* 마지막 이탈 감지 분석 결과 */}
      {lastChurnResult && (
        <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: "1px solid #EF444433", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444" }}>📊 이탈 위험 회원 분석</div>
            <div style={{ fontSize: 11, color: "#8899AA" }}>
              {new Date(lastChurnResult.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {lastChurnResult.result}
          </div>
        </div>
      )}

      {/* 위험 회원 현황 */}
      <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: "1px solid #ffffff11" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 4 }}>⚡ 위험 회원 현황</div>
        <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 12 }}>출결·납부 데이터 분석 기반 · AI 코멘트 포함</div>
        {members.filter(m => m.riskAlert).length === 0 ? (
          <div style={{ fontSize: 13, color: "#8899AA", textAlign: "center", padding: "16px 0" }}>
            이탈 위험 회원이 없거나 아직 에이전트를 실행하지 않았습니다.
          </div>
        ) : (
          members.filter(m => m.riskAlert).map(m => {
            const riskColor = m.riskAlert === "매우높음" ? "#EF4444" : m.riskAlert === "높음" ? "#F97316" : "#F59E0B";
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #ffffff08" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
                  <MemberAvatar member={m} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</span>
                      <Badge label={`위험 ${m.riskAlert}`} color={riskColor} />
                      <Badge label={m.paid ? "납부" : "미납"} color={m.paid ? "#22C55E" : "#EF4444"} />
                    </div>
                    <div style={{ fontSize: 11, color: "#8899AA" }}>출석 {m.attendance}%</div>
                    {m.aiComment && (
                      <div style={{ fontSize: 12, color: "#FCD34D", marginTop: 4 }}>💬 {m.aiComment}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 보강 배정 모달 */}
      {assignModal && (
        <div onClick={() => setAssignModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: COLORS.NAVY, borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, border: "1px solid #ffffff22" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>보강 배정</div>
            <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 20 }}>
              {assignModal.member_name} · {assignModal.class_title}
              {assignModal.preferred_date && <span style={{ marginLeft: 6, color: "#93C5FD" }}>희망 {assignModal.preferred_date}</span>}
            </div>

            <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 6 }}>배정 수업</div>
            <select value={assignForm.classId} onChange={e => setAssignForm(f => ({ ...f, classId: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, marginBottom: 14, border: "1px solid #ffffff22", background: COLORS.DARK, color: "#fff", fontSize: 13, boxSizing: "border-box" }}>
              <option value="">수업 선택</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.title} ({c.days?.join("/")} {c.startTime})</option>
              ))}
            </select>

            <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 6 }}>배정 날짜</div>
            <input type="date" value={assignForm.date} onChange={e => setAssignForm(f => ({ ...f, date: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, marginBottom: 14, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, boxSizing: "border-box", colorScheme: "dark" }} />

            <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 6 }}>메모</div>
            <textarea value={assignForm.memo} onChange={e => setAssignForm(f => ({ ...f, memo: e.target.value }))}
              placeholder="예: 6월 15일 토요일 10시 초등반으로 배정했습니다"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, marginBottom: 20, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, minHeight: 70, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />

            <button onClick={handleAssign} style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: COLORS.ORANGE, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
              배정 완료 및 알림 전송
            </button>
            <button onClick={() => setAssignModal(null)} style={{ width: "100%", padding: "10px 0", borderRadius: 12, background: "transparent", color: "#8899AA", border: "1px solid #ffffff22", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 강사: 출석 체크 ────────────────────────────────────────
const DAY_NAMES = ["일","월","화","수","목","금","토"];

function getClassDates(days, year, month) {
  const result = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if ((days ?? []).includes(DAY_NAMES[date.getDay()])) {
      const pad = (n) => String(n).padStart(2, "0");
      result.push(`${year}-${pad(month)}-${pad(d)}`);
    }
  }
  return result;
}

export function CoachAttendance({ members, classes, attendance, cancellations, year, month, onMark, onCancellation, onMonthChange, onFeedback, feedback }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDate, setSelectedDate]   = useState(null);
  const [filterDay, setFilterDay]         = useState(null);
  const [memo, setMemo]                   = useState("");
  const [classNote, setClassNote]         = useState("");
  const [noteSaving, setNoteSaving]       = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [agentRunning, setAgentRunning]   = useState(false);
  const [agentLog, setAgentLog]           = useState([]);
  const [parentMsg, setParentMsg]         = useState({});
  const [parsedMessages, setParsedMessages] = useState([]);
  const [sending, setSending]             = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (!selectedClass || !selectedDate) { setClassNote(""); setMemo(""); return; }
    fetchClassNote(selectedClass, selectedDate).then(setClassNote);
    fetchClassFeedback(selectedClass, selectedDate).then(setMemo);
  }, [selectedClass, selectedDate]);

  const handleSaveNote = async () => {
    if (!classNote.trim()) return;
    setNoteSaving(true);
    try { await saveClassNote(selectedClass, selectedDate, classNote.trim()); }
    finally { setNoteSaving(false); }
  };

  const cls            = classes.find(c => c.id === selectedClass);
  const classDates     = getClassDates(cls?.days, year, month);
  const cancelled      = cancellations[selectedClass] ?? [];
  const enrolledMembers = selectedClass ? members.filter(m => (m.classes ?? []).includes(selectedClass)) : [];
  const dateAtt        = attendance[selectedClass]?.[selectedDate] ?? {};
  const isCancelled    = selectedDate && cancelled.includes(selectedDate);

  const getAttended = () => Object.entries(dateAtt).filter(([,v]) => v === "출석").map(([id]) => members.find(m => m.id === parseInt(id))).filter(Boolean);
  const getAbsent   = () => Object.entries(dateAtt).filter(([,v]) => v === "결석").map(([id]) => members.find(m => m.id === parseInt(id))).filter(Boolean);

  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setAgentLog(prev => [...prev.slice(-50), { msg, type, time }]);
  };

  const handleFeedback = async () => {
    if (!selectedClass || !selectedDate) return;
    setAgentRunning(true);
    const { result } = await runFeedbackAgent(cls, getAttended(), memo, { addLog });
    onFeedback(selectedClass, result);
    setAgentRunning(false);
  };

  const handleParentMessage = async () => {
    if (!selectedClass || !selectedDate) return;
    setAgentRunning(true);
    setParsedMessages([]);
    const { result, parsedMessages: pm } = await runParentMessageAgent(cls, getAttended(), getAbsent(), memo, classNote, { addLog });
    setParentMsg(p => ({ ...p, [selectedClass]: result }));
    setParsedMessages(pm ?? []);
    setAgentRunning(false);
  };

  const handleSendAll = async () => {
    setSending(true);
    try {
      await Promise.all(parsedMessages.map(pm => sendMessage(pm.memberId, pm.content, 'coach')));
      setParsedMessages([]);
      addLog(`✅ ${parsedMessages.length}명에게 전송 완료`, "done");
    } catch {
      addLog("전송 실패", "warn");
    }
    setSending(false);
  };

  const changeMonth = (dir) => {
    const d = new Date(year, month - 1 + dir, 1);
    onMonthChange(d.getFullYear(), d.getMonth() + 1);
    setSelectedDate(null);
  };

  const visibleClasses = filterDay ? classes.filter(c => (c.days ?? []).includes(filterDay)) : classes;

  return (
    <div>
      {/* 월 선택 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.NAVY, borderRadius: 12, padding: "12px 20px", marginBottom: 16 }}>
        <button onClick={() => changeMonth(-1)} style={{ background: "none", border: "none", color: "#8899AA", fontSize: 20, cursor: "pointer", padding: "0 8px" }}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{year}년 {month}월</span>
        <button onClick={() => changeMonth(1)}  style={{ background: "none", border: "none", color: "#8899AA", fontSize: 20, cursor: "pointer", padding: "0 8px" }}>›</button>
      </div>

      {/* 요일 필터 */}
      <DayFilter selected={filterDay} onChange={(d) => { setFilterDay(d); setSelectedClass(null); setSelectedDate(null); }} />

      {/* 수업 선택 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {visibleClasses.map(c => (
          <button key={c.id} onClick={() => { setSelectedClass(c.id); setSelectedDate(null); }} style={{
            padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
            border: `1.5px solid ${selectedClass === c.id ? COLORS.ORANGE : "#ffffff22"}`,
            background: selectedClass === c.id ? `${COLORS.ORANGE}22` : "transparent",
            color: selectedClass === c.id ? COLORS.ORANGE : "#8899AA", fontSize: 13,
          }}>
            {c.title}
            {c.startTime && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>{c.startTime}</span>}
          </button>
        ))}
      </div>

      {selectedClass && (
        <>
          {/* 날짜 칩 */}
          {classDates.length === 0
            ? <div style={{ color: "#8899AA", fontSize: 13, marginBottom: 16 }}>이번 달 수업 날짜가 없습니다.</div>
            : (
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {classDates.map(date => {
                  const isCanc = cancelled.includes(date);
                  const isSel  = selectedDate === date;
                  const d      = new Date(date + "T00:00:00");
                  const label  = `${d.getMonth() + 1}/${d.getDate()}(${DAY_NAMES[d.getDay()]})`;
                  return (
                    <button key={date} onClick={() => setSelectedDate(date)} style={{
                      padding: "7px 13px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                      border: `1.5px solid ${isSel ? COLORS.ORANGE : isCanc ? "#EF444444" : "#ffffff22"}`,
                      background: isSel ? `${COLORS.ORANGE}22` : isCanc ? "#7F1D1D33" : "transparent",
                      color: isSel ? COLORS.ORANGE : isCanc ? "#FCA5A5" : "#8899AA",
                      fontSize: 12, textDecoration: isCanc ? "line-through" : "none",
                    }}>
                      {label}{isCanc ? " 휴강" : ""}
                    </button>
                  );
                })}
              </div>
            )
          }

          {selectedDate && (
            <>
              {/* 날짜 헤더 + 휴강 버튼 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {(() => { const d = new Date(selectedDate + "T00:00:00"); return `${d.getMonth()+1}/${d.getDate()}(${DAY_NAMES[d.getDay()]})`; })()}
                  <span style={{ fontSize: 12, color: "#8899AA", marginLeft: 8 }}>{cls?.startTime} ~ {cls?.endTime}</span>
                </div>
                <button onClick={() => onCancellation(selectedClass, selectedDate, !isCancelled)} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                  background: isCancelled ? "#166534" : "#7F1D1D",
                  color:      isCancelled ? "#86EFAC" : "#FCA5A5",
                }}>
                  {isCancelled ? "휴강 취소" : "휴강 처리"}
                </button>
              </div>

              {isCancelled ? (
                <div style={{ background: "#7F1D1D33", borderRadius: 12, padding: 20, textAlign: "center", color: "#FCA5A5", fontSize: 13, marginBottom: 16 }}>
                  휴강 처리된 날짜입니다.
                </div>
              ) : (
                <div style={{ background: COLORS.NAVY, borderRadius: 12, overflow: "hidden", border: "1px solid #ffffff11", marginBottom: 16 }}>
                  {enrolledMembers.length === 0
                    ? <div style={{ padding: 20, textAlign: "center", color: "#8899AA", fontSize: 13 }}>배정된 회원이 없습니다</div>
                    : enrolledMembers.map(m => {
                        const status = dateAtt[m.id];
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #ffffff08" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <MemberAvatar member={m} />
                              <div style={{ fontSize: 14 }}>{m.name}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                              {["출석", "결석"].map(s => (
                                <button key={s} onClick={() => onMark(selectedClass, m.id, selectedDate, s)} style={{
                                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                                  background: status === s ? (s === "출석" ? "#166534" : "#7F1D1D") : "#ffffff11",
                                  color:      status === s ? (s === "출석" ? "#86EFAC" : "#FCA5A5") : "#8899AA",
                                }}>{s}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              )}

              {/* 수업 내용 메모 */}
              {!isCancelled && (
                <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: "1px solid #3B82F633", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#3B82F6", marginBottom: 8 }}>📝 수업 내용</div>
                  <textarea
                    value={classNote}
                    onChange={e => setClassNote(e.target.value)}
                    placeholder="오늘 수업에서 배운 내용을 간략히 적어주세요&#13;&#10;예: 드리블 기초 - 체인지 오브 페이스, 크로스오버 연습"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, minHeight: 80, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
                  />
                  <button onClick={handleSaveNote} disabled={noteSaving || !classNote.trim()} style={{
                    marginTop: 8, padding: "8px 18px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, cursor: noteSaving || !classNote.trim() ? "not-allowed" : "pointer", fontFamily: "inherit",
                    background: noteSaving || !classNote.trim() ? "#ffffff11" : "#3B82F6",
                    color:      noteSaving || !classNote.trim() ? "#8899AA"   : "#fff",
                  }}>{noteSaving ? "저장 중..." : "저장"}</button>
                </div>
              )}

              {/* 피드백 */}
              {!isCancelled && (
                <>
                  <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.ORANGE}33`, marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 8 }}>✏️ 피드백</div>
                    <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 10 }}>수업별 회원 피드백을 작성하면 챗봇에서도 확인할 수 있습니다.</div>
                    <textarea value={memo} onChange={e => setMemo(e.target.value)}
                      placeholder="예: 김민준 - 드리블 향상, 크로스오버 잘 됨&#13;&#10;이서연 - 슛 자세 개선 필요, 팔꿈치 각도 신경쓰기"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, minHeight: 100, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
                    <button onClick={async () => {
                      setFeedbackSaving(true);
                      try { await saveClassFeedback(selectedClass, selectedDate, memo.trim()); }
                      finally { setFeedbackSaving(false); }
                    }} disabled={!memo.trim() || feedbackSaving} style={{
                      marginTop: 8, padding: "8px 18px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, cursor: memo.trim() && !feedbackSaving ? "pointer" : "not-allowed", fontFamily: "inherit",
                      background: memo.trim() && !feedbackSaving ? COLORS.ORANGE : "#ffffff11",
                      color:      memo.trim() && !feedbackSaving ? "#fff" : "#8899AA",
                    }}>{feedbackSaving ? "저장 중..." : "저장"}</button>
                  </div>

                  <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: "1px solid #3B82F633", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#3B82F6", marginBottom: 10 }}>
                      {cls?.category === "성인" ? "회원 알림 에이전트" : "학부모 알림 에이전트"}
                    </div>
                    <button onClick={handleParentMessage} disabled={agentRunning} style={{
                      padding: "9px 18px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, cursor: agentRunning ? "not-allowed" : "pointer", fontFamily: "inherit",
                      background: agentRunning ? "#ffffff11" : "#3B82F6",
                      color:      agentRunning ? "#8899AA"   : "#fff",
                    }}>{agentRunning ? "실행 중..." : cls?.category === "성인" ? "회원 알림 문자 생성" : "학부모 알림 문자 생성"}</button>
                    {/* 생성된 메시지 미리보기 + 전송 */}
                    {parentMsg[selectedClass] && parsedMessages.length === 0 && (
                      <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: "#ffffff08", fontSize: 13, color: "#CBD5E1", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                        {parentMsg[selectedClass]}
                      </div>
                    )}
                    {parsedMessages.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 8 }}>생성된 메시지 미리보기 ({parsedMessages.length}명)</div>
                        {parsedMessages.map((pm, i) => (
                          <div key={i} style={{ padding: "10px 14px", borderRadius: 10, background: "#ffffff08", marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 6 }}>{pm.name}</div>
                            <textarea
                              value={pm.content}
                              onChange={e => setParsedMessages(prev => prev.map((m, j) => j === i ? { ...m, content: e.target.value } : m))}
                              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#CBD5E1", fontSize: 12, lineHeight: 1.7, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", minHeight: 70 }}
                            />
                          </div>
                        ))}
                        <button onClick={handleSendAll} disabled={sending} style={{
                          width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                          fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit",
                          background: sending ? "#ffffff11" : "#3B82F6",
                          color:      sending ? "#8899AA"   : "#fff",
                        }}>{sending ? "전송 중..." : `📤 전체 전송 (${parsedMessages.length}명)`}</button>
                      </div>
                    )}
                  </div>

                  <AgentLog logs={agentLog} logRef={logRef} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── 강사: 수업 관리 ────────────────────────────────────────
const EMPTY_CLASS = { title: "", category: "초등", days: [], dates: [], startTime: "", endTime: "", capacity: "", level: "취미반", location: "" };
const WEEKDAYS = ["일","월","화","수","목","금","토"];
const WEEKDAYS_FILTER = ["월","화","수","목","금","토","일"];

const CATEGORY_LEVELS = {
  초등: ["취미반", "집중훈련반", "대표팀"],
  중등: ["취미반", "집중훈련반", "대표팀"],
  고등: ["취미반", "집중훈련반", "대표팀"],
  성인: ["입문", "기초", "중급", "남성팀", "여성팀"],
};
const CATEGORIES = ["초등", "중등", "고등", "성인"];

const LEVEL_BADGE_COLOR = {
  취미반: "#3B82F6", 집중훈련반: "#F59E0B", 대표팀: "#EF4444",
  입문: "#8B5CF6", 기초: "#22C55E", 중급: "#F97316", 남성팀: "#06B6D4", 여성팀: "#EC4899",
};

function DayFilter({ selected, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
      <button onClick={() => onChange(null)} style={dayBtn(selected === null)}>전체</button>
      {WEEKDAYS_FILTER.map(d => (
        <button key={d} onClick={() => onChange(d)} style={dayBtn(selected === d)}>{d}요일</button>
      ))}
    </div>
  );
}

const dayBtn = (active) => ({
  padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${active ? COLORS.ORANGE : "#ffffff22"}`,
  background: active ? `${COLORS.ORANGE}22` : "transparent",
  color: active ? COLORS.ORANGE : "#8899AA",
  fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit",
});

function MultiDatePicker({ selected, onChange }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const toggle = (dateStr) => {
    onChange(selected.includes(dateStr)
      ? selected.filter(d => d !== dateStr)
      : [...selected, dateStr].sort()
    );
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
  }

  return (
    <div style={{ background: "#ffffff08", borderRadius: 10, padding: 12 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={prevMonth} style={navBtn}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{year}년 {month+1}월</span>
        <button onClick={nextMonth} style={navBtn}>›</button>
      </div>
      {/* 요일 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, color: i===0 ? "#EF4444" : i===6 ? "#3B82F6" : "#8899AA", padding: "2px 0" }}>{w}</div>
        ))}
      </div>
      {/* 날짜 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const day = parseInt(dateStr.split("-")[2]);
          const dow = new Date(dateStr).getDay();
          const sel = selected.includes(dateStr);
          return (
            <button key={dateStr} onClick={() => toggle(dateStr)} style={{
              padding: "6px 0", borderRadius: 6, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: sel ? 700 : 400,
              background: sel ? COLORS.ORANGE : "transparent",
              color: sel ? "#fff" : dow===0 ? "#EF4444" : dow===6 ? "#93C5FD" : "#CBD5E1",
            }}>{day}</button>
          );
        })}
      </div>
      {/* 선택된 날짜 칩 */}
      {selected.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {selected.map(d => (
            <span key={d} onClick={() => toggle(d)} style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 20,
              background: `${COLORS.ORANGE}33`, color: COLORS.ORANGE, cursor: "pointer",
            }}>
              {d.slice(5).replace("-","/")} ✕
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const navBtn = {
  background: "none", border: "none", color: "#8899AA", fontSize: 18,
  cursor: "pointer", padding: "0 8px", lineHeight: 1,
};

export function CoachClasses({ classes, onAdd, onUpdate, onDelete }) {
  const [form, setForm]             = useState(EMPTY_CLASS);
  const [open, setOpen]             = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const openNew = () => { setForm(EMPTY_CLASS); setEditingId(null); setOpen(true); };
  const openEdit = (cls) => {
    setForm({ title: cls.title, category: cls.category ?? "초등", days: [...(cls.days ?? [])], dates: [...(cls.dates ?? [])], startTime: cls.startTime, endTime: cls.endTime, capacity: String(cls.capacity), level: cls.level, location: cls.location });
    setEditingId(cls.id);
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const closeForm = () => { setOpen(false); setEditingId(null); setForm(EMPTY_CLASS); };

  const handleSubmit = () => {
    if (!form.title || form.days.length === 0 || !form.startTime || !form.endTime || !form.capacity || !form.location)
      return alert("모든 항목을 입력해주세요. (요일을 1개 이상 선택)");
    if (editingId) {
      const original = classes.find(c => c.id === editingId);
      onUpdate({ ...original, ...form, capacity: Number(form.capacity) });
    } else {
      onAdd({ ...form, capacity: Number(form.capacity) });
    }
    closeForm();
  };

  const [filterDay, setFilterDay] = useState(null);
  const visibleClasses = filterDay
    ? classes.filter(c => (c.days ?? []).includes(filterDay))
    : classes;

  return (
    <div>
      <button onClick={() => open ? closeForm() : openNew()} style={{
        width: "100%", padding: "12px 0", borderRadius: 12, marginBottom: 16,
        background: open ? "#ffffff11" : COLORS.ORANGE, color: open ? "#8899AA" : "#fff",
        border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      }}>
        {open ? "취소" : "+ 새 수업 개설"}
      </button>

      {open && (
        <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.ORANGE}44`, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 16 }}>
            {editingId ? "수업 수정" : "수업 정보 입력"}
          </div>

          <FormRow label="카테고리">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => {
                const active = form.category === cat;
                return (
                  <button key={cat} onClick={() => { set("category", cat); set("level", CATEGORY_LEVELS[cat][0]); }} style={{
                    padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    border: `1.5px solid ${active ? COLORS.ORANGE : "#ffffff22"}`,
                    background: active ? `${COLORS.ORANGE}22` : "transparent",
                    color: active ? COLORS.ORANGE : "#8899AA",
                    fontSize: 13, fontWeight: active ? 700 : 400,
                  }}>{cat}</button>
                );
              })}
            </div>
          </FormRow>

          <FormRow label="수업명">
            <input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="예: 초등 취미반" style={fi} />
          </FormRow>

          <FormRow label="수업 요일 (복수 선택 가능)">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {WEEKDAYS_FILTER.map(d => {
                const active = form.days.includes(d);
                return (
                  <button key={d} onClick={() => set("days", active ? form.days.filter(x => x !== d) : [...form.days, d])} style={{
                    padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                    border: `1.5px solid ${active ? COLORS.ORANGE : "#ffffff22"}`,
                    background: active ? `${COLORS.ORANGE}22` : "transparent",
                    color: active ? COLORS.ORANGE : "#8899AA",
                    fontSize: 13, fontWeight: active ? 700 : 400,
                  }}>{d}</button>
                );
              })}
            </div>
          </FormRow>


          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="시작 시간">
              <input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} style={fi} />
            </FormRow>
            <FormRow label="종료 시간">
              <input type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} style={fi} />
            </FormRow>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormRow label="정원">
              <input type="number" value={form.capacity} onChange={e => set("capacity", e.target.value)}
                placeholder="12" min="1" style={fi} />
            </FormRow>
            <FormRow label="장소">
              <input value={form.location} onChange={e => set("location", e.target.value)}
                placeholder="코트 1" style={fi} />
            </FormRow>
          </div>

          <FormRow label="레벨">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(CATEGORY_LEVELS[form.category] ?? []).map(l => (
                <button key={l} onClick={() => set("level", l)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  border: `1.5px solid ${form.level === l ? COLORS.ORANGE : "#ffffff22"}`,
                  background: form.level === l ? `${COLORS.ORANGE}22` : "transparent",
                  color: form.level === l ? COLORS.ORANGE : "#8899AA",
                  fontSize: 12, fontWeight: 600, minWidth: 60,
                }}>{l}</button>
              ))}
            </div>
          </FormRow>

          <button onClick={handleSubmit} style={{
            width: "100%", marginTop: 4, padding: "11px 0", borderRadius: 10,
            background: COLORS.ORANGE, color: "#fff", border: "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>{editingId ? "수정 완료" : "수업 개설"}</button>
        </div>
      )}

      {/* 요일 필터 */}
      <DayFilter selected={filterDay} onChange={setFilterDay} />

      {/* 수업 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visibleClasses.map(cls => (
          <div key={cls.id} style={{ background: COLORS.NAVY, borderRadius: 12, padding: "14px 16px", border: "1px solid #ffffff11" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{cls.title}</span>
                  {LEVEL_BADGE_COLOR[cls.level] && <Badge label={cls.level} color={LEVEL_BADGE_COLOR[cls.level]} />}
                  {(cls.days ?? []).map(d => (
                    <span key={d} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: "#ffffff11", color: "#93C5FD", fontWeight: 600 }}>{d}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#8899AA" }}>
                  {cls.startTime} ~ {cls.endTime} · {cls.location}
                </div>
                <div style={{ fontSize: 12, color: "#8899AA", marginTop: 2 }}>
                  정원 {cls.enrolled}/{cls.capacity}명 · {cls.dates?.length ?? 1}회
                </div>
                {/* 날짜 칩 */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {(cls.dates ?? []).filter(Boolean).map(d => (
                    <span key={d} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20, background: "#ffffff0D", color: "#8899AA" }}>
                      {d.slice(5).replace("-","/")}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                {confirmDeleteId === cls.id ? (
                  <>
                    <span style={{ fontSize: 12, color: "#FCA5A5", alignSelf: "center", whiteSpace: "nowrap" }}>삭제할까요?</span>
                    <button onClick={() => { onDelete(cls.id); setConfirmDeleteId(null); }} style={{
                      padding: "5px 12px", borderRadius: 8, border: "none",
                      background: "#7F1D1D", color: "#FCA5A5", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}>확인</button>
                    <button onClick={() => setConfirmDeleteId(null)} style={{
                      padding: "5px 12px", borderRadius: 8, border: "1px solid #ffffff22",
                      background: "transparent", color: "#8899AA", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                    }}>취소</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => openEdit(cls)} style={{
                      padding: "5px 12px", borderRadius: 8, border: `1px solid ${COLORS.ORANGE}44`,
                      background: "transparent", color: COLORS.ORANGE, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                    }}>수정</button>
                    <button onClick={() => setConfirmDeleteId(cls.id)} style={{
                      padding: "5px 12px", borderRadius: 8, border: "1px solid #EF444433",
                      background: "transparent", color: "#EF4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                    }}>삭제</button>
                  </>
                )}
              </div>
            </div>
            <div style={{ marginTop: 10, height: 3, borderRadius: 3, background: "#ffffff11" }}>
              <div style={{ height: "100%", borderRadius: 3, background: cls.enrolled >= cls.capacity ? "#EF4444" : COLORS.ORANGE, width: `${Math.min((cls.enrolled / cls.capacity) * 100, 100)}%`, transition: "width 0.4s" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const fi = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ffffff22",
  background: "#ffffff0D", color: "#fff", fontSize: 13, boxSizing: "border-box",
  fontFamily: "'Trebuchet MS', sans-serif",
};

function FormRow({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

// ── 강사: 회원 현황 ────────────────────────────────────────
export function CoachMembers({ members, classes, onTogglePaid, onAssign, onUpdateNote, onDelete, onUpdateGender, onChat }) {
  const [expandedId, setExpandedId]         = useState(null);
  const [payingId, setPayingId]             = useState(null);
  const [search, setSearch]                 = useState("");
  const [assignDay, setAssignDay]           = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterDay, setFilterDay]           = useState(null);
  const [filterClassId, setFilterClassId]   = useState(null); // null=전체, -1=미배정, classId=해당수업

  const dayClasses = filterDay
    ? classes.filter(c => (c.days ?? []).includes(filterDay))
    : classes;

  const dayClassIds = dayClasses.map(c => c.id);

  const filtered = [...members]
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .filter(m => m.name.includes(search.trim()))
    .filter(m => {
      if (filterClassId === -1) return (m.classes ?? []).length === 0;
      if (filterClassId !== null) return (m.classes ?? []).includes(filterClassId);
      if (filterDay) return (m.classes ?? []).some(id => dayClassIds.includes(id));
      return true;
    });

  return (
    <div>
      {/* 검색 */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="이름 검색"
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 12,
          border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff",
          fontSize: 14, boxSizing: "border-box", fontFamily: "inherit",
        }}
      />

      {/* 요일 + 미배정 필터 */}
      <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
        {[null, "월","화","수","목","금","토","일"].map(d => (
          <button key={d ?? "전체"} onClick={() => { setFilterDay(d); setFilterClassId(null); }} style={{
            padding: "5px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
            border: `1.5px solid ${filterDay === d && filterClassId !== -1 ? COLORS.ORANGE : "#ffffff22"}`,
            background: filterDay === d && filterClassId !== -1 ? `${COLORS.ORANGE}22` : "transparent",
            color: filterDay === d && filterClassId !== -1 ? COLORS.ORANGE : "#8899AA",
            fontSize: 11, fontWeight: filterDay === d && filterClassId !== -1 ? 700 : 400,
          }}>{d ? `${d}요일` : "전체"}</button>
        ))}
        <button onClick={() => setFilterClassId(-1)} style={{
          padding: "5px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
          border: `1.5px solid ${filterClassId === -1 ? "#EF4444" : "#ffffff22"}`,
          background: filterClassId === -1 ? "#EF444422" : "transparent",
          color: filterClassId === -1 ? "#EF4444" : "#8899AA", fontSize: 11, fontWeight: filterClassId === -1 ? 700 : 400,
        }}>미배정</button>
      </div>

      {/* 수업 필터 — 요일 선택 시만 표시 */}
      {filterDay && filterClassId !== -1 && (
        <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
          {dayClasses.map(c => (
            <button key={c.id} onClick={() => setFilterClassId(filterClassId === c.id ? null : c.id)} style={{
              padding: "5px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
              border: `1.5px solid ${filterClassId === c.id ? COLORS.ORANGE : "#ffffff22"}`,
              background: filterClassId === c.id ? `${COLORS.ORANGE}22` : "transparent",
              color: filterClassId === c.id ? COLORS.ORANGE : "#8899AA", fontSize: 11, fontWeight: filterClassId === c.id ? 700 : 400,
            }}>{c.title} {c.startTime}</button>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 10 }}>{filtered.length}명</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {filtered.map(m => {
        const myClasses = (classes ?? []).filter(c => (m.classes ?? []).includes(c.id));
        const attendColor = m.attendance >= 80 ? "#22C55E" : m.attendance >= 60 ? "#F59E0B" : "#EF4444";
        const isExpanded = expandedId === m.id;
        return (
          <div key={m.id} style={{ background: COLORS.NAVY, borderRadius: 12, border: `1px solid ${isExpanded ? COLORS.ORANGE + "55" : "#ffffff11"}`, overflow: "hidden" }}>

            {/* 카드 요약 (항상 표시) */}
            <div style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} onClick={() => setExpandedId(isExpanded ? null : m.id)}>
              <MemberAvatar member={m} size={32} />
              <div style={{ width: 80, flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                <div style={{ fontSize: 10, color: "#8899AA", marginTop: 1 }}>
                  {m.gender && <span>{m.gender} </span>}
                  {m.schoolLevel && <span>{m.schoolLevel}{m.grade ? ` ${m.grade}학년` : ""}</span>}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: "#8899AA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {myClasses.length > 0 ? myClasses.map(c => c.title).join(" · ") : "수업 없음"}
                <span style={{ color: attendColor, marginLeft: 6 }}>{m.attendance}%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {payingId === m.id ? (
                  <>
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => { onTogglePaid(m.id, n); setPayingId(null); }} style={{
                        padding: "4px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                        background: "#166534", color: "#86EFAC",
                      }}>{n}개월</button>
                    ))}
                    <button onClick={() => setPayingId(null)} style={{
                      padding: "4px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: 11, background: "#ffffff11", color: "#8899AA",
                    }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => { m.paid ? onTogglePaid(m.id, 0) : setPayingId(m.id); }} style={{
                    padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                    background: m.paid ? "#166534" : "#7F1D1D",
                    color:      m.paid ? "#86EFAC" : "#FCA5A5",
                  }}>
                    {m.paid ? "납부" : "미납"}
                  </button>
                )}
                <span style={{ fontSize: 11, color: "#8899AA", cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : m.id)}>{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* 펼침 패널 */}
            {isExpanded && (
              <div style={{ borderTop: `1px solid ${COLORS.ORANGE}33`, background: "#ffffff05" }}>

                {/* 수업 배정 */}
                <div style={{ padding: "12px 14px", borderBottom: "1px solid #ffffff08" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 8 }}>수업 배정</div>
                  {/* 요일 필터 */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                    {[null, "월","화","수","목","금","토","일"].map(d => (
                      <button key={d ?? "전체"} onClick={() => setAssignDay(d)} style={{
                        padding: "4px 9px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                        border: `1.5px solid ${assignDay === d ? COLORS.ORANGE : "#ffffff22"}`,
                        background: assignDay === d ? `${COLORS.ORANGE}22` : "transparent",
                        color: assignDay === d ? COLORS.ORANGE : "#8899AA",
                        fontSize: 11, fontWeight: assignDay === d ? 700 : 400,
                      }}>{d ? `${d}` : "전체"}</button>
                    ))}
                  </div>
                  {/* 수업 목록 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 140, overflowY: "auto" }}>
                    {(classes ?? [])
                      .filter(c => !assignDay || (c.days ?? []).includes(assignDay))
                      .map(c => {
                        const enrolled = (m.classes ?? []).includes(c.id);
                        return (
                          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 8, background: enrolled ? `${COLORS.ORANGE}11` : "#ffffff08", border: `1px solid ${enrolled ? COLORS.ORANGE + "44" : "#ffffff11"}` }}>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{c.title}</span>
                              <span style={{ fontSize: 11, color: "#8899AA", marginLeft: 6 }}>{c.days?.join("·")} · {c.startTime}</span>
                            </div>
                            <button onClick={() => onAssign(m.id, c.id, !enrolled)} style={{
                              padding: "4px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                              fontFamily: "inherit", fontSize: 11, fontWeight: 700, flexShrink: 0,
                              background: enrolled ? "#7F1D1D" : "#166534",
                              color:      enrolled ? "#FCA5A5" : "#86EFAC",
                            }}>{enrolled ? "해제" : "배정"}</button>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>

                {/* 납부 이력 */}
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #ffffff08" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#8899AA", marginBottom: 8 }}>납부 이력</div>
                  {(m.paymentHistory ?? []).length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {[...(m.paymentHistory ?? [])].reverse().slice(0, 5).map((h, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "#8899AA" }}>{h.date}</span>
                          <span style={{ color: "#86EFAC", fontWeight: 600 }}>납부 {h.months ? `· ${h.months}개월` : ""}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "#ffffff33" }}>이력 없음</span>
                  )}
                </div>

                {/* 메모 */}
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #ffffff08" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#8899AA", marginBottom: 8 }}>강사 메모</div>
                  <textarea
                    value={m.note ?? ""}
                    onChange={e => onUpdateNote(m.id, e.target.value)}
                    placeholder="부상, 주의사항, 특이사항 등 메모"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 12, minHeight: 70, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }}
                  />
                </div>

                {/* 회원 삭제 */}
                <div style={{ padding: "12px 16px" }}>
                  {confirmDeleteId === m.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#FCA5A5", flex: 1 }}>정말 삭제할까요?</span>
                      <button onClick={() => { onDelete(m.id); setConfirmDeleteId(null); setExpandedId(null); }} style={{
                        padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                        background: "#7F1D1D", color: "#FCA5A5",
                      }}>삭제</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{
                        padding: "5px 12px", borderRadius: 8, border: "1px solid #ffffff22",
                        background: "transparent", color: "#8899AA", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      }}>취소</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => onChat(m.id)} style={{
                        padding: "6px 14px", borderRadius: 8, border: `1px solid ${COLORS.ORANGE}44`,
                        background: "transparent", color: COLORS.ORANGE, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      }}>💬 채팅</button>
                      <button onClick={() => setConfirmDeleteId(m.id)} style={{
                        padding: "6px 14px", borderRadius: 8, border: "1px solid #EF444433",
                        background: "transparent", color: "#EF4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                      }}>회원 삭제</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ── 강사: AI 에이전트 패널 ─────────────────────────────────
export function CoachAgentPanel({ members, classes, onMembersUpdate }) {
  const { runningKey, logs, results, setRunningKey, addLog, setResult, clearLogs } = useAgentStore();
  const logRef = useRef(null);
  const running = runningKey !== null;

  const run = async (key, fn) => {
    clearLogs();
    setRunningKey(key);
    setResult(key, "");
    const r = await fn();
    setResult(key, r);
    setRunningKey(null);
  };

  const handleChurn = () => run("churn", async () => {
    const { result: r, updatedMembers } = await runChurnAgent(members, { addLog });
    onMembersUpdate(updatedMembers);
    return r;
  });

  const handleMonthlyReport = () => run("report", async () => {
    const { result: r } = await runMonthlyReportAgent(members, classes, { addLog });
    return r;
  });

  const AGENTS = [
    { key: "churn",  num: "①", title: "이탈 위험 회원 분석", desc: "전체 회원 출석률·납부·연속결석 데이터를 분석해 이탈 위험 회원을 감지합니다.", color: "#EF4444",  action: handleChurn },
    { key: "report", num: "②", title: "월간 리포트 자동 생성",   desc: "이달의 출석·납부·수업 현황을 종합 분석해 운영 리포트를 자동으로 작성합니다.", color: "#8B5CF6", action: handleMonthlyReport },
  ];

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {AGENTS.map(a => (
          <div key={a.key}>
            <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: `1px solid ${a.color}33` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: a.color, marginBottom: 4 }}>{a.num} {a.title}</div>
                  <div style={{ fontSize: 12, color: "#8899AA", lineHeight: 1.6 }}>{a.desc}</div>
                </div>
                <div style={{ display: "flex", gap: 6, marginLeft: 12, flexShrink: 0 }}>
                  {runningKey === a.key ? (
                    <>
                      <span style={{ fontSize: 12, color: "#8899AA", alignSelf: "center", whiteSpace: "nowrap" }}>실행 중...</span>
                      <button onClick={() => setRunningKey(null)} style={{
                        padding: "7px 12px", borderRadius: 8, border: "1px solid #ffffff22",
                        background: "transparent", color: "#FCA5A5", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      }}>취소</button>
                    </>
                  ) : (
                    <button onClick={a.action} style={{
                      padding: "7px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                      background: a.color, color: "#fff", cursor: "pointer", whiteSpace: "nowrap",
                    }}>실행</button>
                  )}
                </div>
              </div>
            </div>
            {results[a.key] && (
              <div style={{ background: COLORS.NAVY, borderRadius: "0 0 12px 12px", padding: 16, borderTop: "none", border: `1px solid ${a.color}33`, marginTop: -1 }}>
                <div style={{ fontSize: 11, color: a.color, fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>결과</div>
                <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{results[a.key]}</div>
              </div>
            )}
          </div>
        ))}
      </div>


      <AgentLog logs={logs} logRef={logRef} />
    </div>
  );
}

// ── 공지 (강사 + 회원 공용) ────────────────────────────────
export function NoticePage({ isCoach, showToast }) {
  const [notices, setNotices]     = useState([]);
  const [title, setTitle]         = useState("");
  const [body, setBody]           = useState("");
  const [important, setImportant] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetchNotices()
      .then(setNotices)
      .catch(() => showToast("공지 로드 실패", "err"))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!title.trim() || !body.trim()) return showToast("제목과 내용을 입력하세요.", "err");
    try {
      await insertNotice(title.trim(), body.trim(), important);
      setNotices(await fetchNotices());
      setTitle(""); setBody(""); setImportant(false);
      showToast("공지가 등록되었습니다!");
    } catch {
      showToast("등록 실패", "err");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotice(id);
      setNotices(prev => prev.filter(n => n.id !== id));
      showToast("공지가 삭제되었습니다.", "err");
    } catch {
      showToast("삭제 실패", "err");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {isCoach && (
        <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.ORANGE}33`, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 10 }}>공지 작성</div>
          <input
            placeholder="제목"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", marginBottom: 8 }}
          />
          <textarea
            placeholder="내용"
            value={body}
            onChange={e => setBody(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, minHeight: 80, boxSizing: "border-box", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <label style={{ fontSize: 13, color: "#8899AA", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)} />
              중요 공지
            </label>
            <button onClick={handleAdd} style={{ marginLeft: "auto", padding: "9px 18px", borderRadius: 10, background: COLORS.ORANGE, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              등록
            </button>
          </div>
        </div>
      )}
      {loading
        ? <div style={{ textAlign: "center", color: "#8899AA", padding: 20 }}>로딩 중...</div>
        : notices.length === 0
          ? <div style={{ textAlign: "center", color: "#8899AA", padding: 20 }}>등록된 공지가 없습니다.</div>
          : notices.map(n => (
              <div key={n.id} style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: `1px solid ${n.important ? COLORS.ORANGE : "#ffffff11"}` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  {n.important && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${COLORS.ORANGE}33`, color: COLORS.ORANGE, fontWeight: 700 }}>중요</span>}
                  <span style={{ fontSize: 11, color: "#8899AA" }}>{n.created_at ? new Date(n.created_at).toLocaleString("ko-KR", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  {isCoach && (
                    <button onClick={() => handleDelete(n.id)} style={{ marginLeft: "auto", fontSize: 11, color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>삭제</button>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: "#8899AA", lineHeight: 1.6 }}>{n.body}</div>
              </div>
            ))
      }
    </div>
  );
}

// ── 내부 유틸 ─────────────────────────────────────────────
function Badge({ label, color }) {
  return (
    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: `${color}22`, color, fontWeight: 600 }}>
      {label}
    </span>
  );
}
