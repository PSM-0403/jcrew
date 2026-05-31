import { useState, useRef, useEffect } from "react";
import { MemberAvatar }     from "../../components/Common";
import { callClaude }       from "../../api/claude";
import { COLORS, LEVEL_COLOR } from "../../constants";

// ── 회원: 홈 ──────────────────────────────────────────────
const BANK_INFO = { bank: "우리은행", account: "1002-629-447772", holder: "정흥주", amount: "월 수강료" };

export function MemberHome({ member, classes, onBankPayment, onCardPayment }) {
  const myClasses = classes.filter(c => member.classes.includes(c.id));
  const [payModal, setPayModal] = useState(null); // null | "select" | "bank" | "card" | "done"
  const [cardNum, setCardNum]   = useState("");
  const [cardPaying, setCardPaying] = useState(false);

  const handleCardSubmit = async () => {
    setCardPaying(true);
    await new Promise(r => setTimeout(r, 1200));
    onCardPayment();
    setCardPaying(false);
    setPayModal("done");
  };

  const handleBankSubmit = () => {
    onBankPayment();
    setPayModal("done");
  };

  return (
    <div>
      <div style={{ background: COLORS.NAVY, borderRadius: 16, padding: 20, marginBottom: 16, border: `1px solid ${COLORS.ORANGE}33` }}>
        <div style={{ fontSize: 12, color: COLORS.ORANGE, letterSpacing: 1, marginBottom: 4 }}>WELCOME BACK</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{member.name}님 👋</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "출석률",    value: `${member.attendance}%`,           color: member.attendance >= 70 ? "#86EFAC" : "#FCA5A5" },
            { label: "수강료",    value: member.paid ? "납부완료" : "미납", color: member.paid ? "#86EFAC" : "#FCA5A5" },
            { label: "신청 수업", value: `${(member.classes ?? []).length}개`, color: "#93C5FD" },
            { label: "가입일",    value: member.joinDate,                    color: "#8899AA" },
          ].map(s => (
            <div key={s.label} style={{ background: "#ffffff08", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 미납 시 납부 버튼 */}
        {!member.paid && (
          <button onClick={() => setPayModal("select")} style={{
            marginTop: 14, width: "100%", padding: "11px 0", borderRadius: 12,
            background: COLORS.ORANGE, color: "#fff", border: "none",
            fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>수강료 납부하기</button>
        )}
      </div>

      {/* 이번 주 수업 일정 */}
      {myClasses.length > 0 && (() => {
        const DAY_MAP = { 일:0, 월:1, 화:2, 수:3, 목:4, 금:5, 토:6 };
        const today = new Date();
        const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1);
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
          return d;
        });
        const schedule = weekDays.map(d => {
          const dayNames = ["일","월","화","수","목","금","토"];
          const dayName  = dayNames[d.getDay()];
          const clsToday = myClasses.filter(c => (c.days ?? []).includes(dayName));
          return { date: d, dayName, classes: clsToday };
        }).filter(d => d.classes.length > 0);

        if (schedule.length === 0) return null;
        return (
          <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #ffffff11" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 12 }}>이번 주 수업</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {schedule.map(({ date, dayName, classes: cls }) => (
                <div key={dayName} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 36, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#8899AA" }}>{date.getMonth()+1}/{date.getDate()}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: today.getDay() === date.getDay() ? COLORS.ORANGE : "#fff" }}>{dayName}</div>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    {cls.map(c => (
                      <div key={c.id} style={{ padding: "7px 12px", borderRadius: 8, background: "#ffffff08", border: today.getDay() === date.getDay() ? `1px solid ${COLORS.ORANGE}44` : "1px solid #ffffff11" }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</span>
                        <span style={{ fontSize: 11, color: "#8899AA", marginLeft: 8 }}>{c.startTime}~{c.endTime} · {c.location}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: "1px solid #ffffff11" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 10 }}>신청한 수업</div>
        {myClasses.length === 0
          ? <div style={{ fontSize: 13, color: "#8899AA", textAlign: "center", padding: "20px 0" }}>신청한 수업이 없습니다</div>
          : myClasses.map(cls => (
              <div key={cls.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #ffffff08" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{cls.title}</div>
                  <div style={{ fontSize: 12, color: "#8899AA" }}>{cls.days?.join("·")}요일 · {cls.startTime}~{cls.endTime} · {cls.location}</div>
                </div>
                <LevelChip level={cls.level} />
              </div>
            ))
        }
      </div>

      {/* ── 납부 모달 ── */}
      {payModal && (
        <div onClick={() => !cardPaying && setPayModal(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: COLORS.NAVY, borderRadius: 20, padding: 28,
            width: "100%", maxWidth: 360, border: "1px solid #ffffff22",
          }}>

            {/* 결제 수단 선택 */}
            {payModal === "select" && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>수강료 납부</div>
                <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 14 }}>납부 방법을 선택해주세요</div>

                {/* 수강료 안내 */}
                <div style={{ background: "#ffffff08", borderRadius: 12, padding: 14, marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: COLORS.ORANGE, fontWeight: 700, marginBottom: 10 }}>📋 수강료 안내</div>
                  {[
                    { label: "90분 · 주 1회", bank: "100,000원", card: "110,000원" },
                    { label: "120분 · 주 1회", bank: "120,000원", card: "132,000원" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #ffffff08" }}>
                      <span style={{ fontSize: 12, color: "#CBD5E1" }}>{r.label}</span>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>계좌 {r.bank}</div>
                        <div style={{ fontSize: 11, color: "#8899AA" }}>카드 {r.card} (수수료 10%)</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, padding: "7px 10px", borderRadius: 8, background: "#3B82F611", border: "1px solid #3B82F633", fontSize: 12, color: "#93C5FD" }}>
                    👨‍👩‍👧 형제 등록 시 10% 할인 적용
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button onClick={() => setPayModal("bank")} style={{
                    padding: "16px", borderRadius: 14, border: "1px solid #ffffff22",
                    background: "#ffffff08", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 4 }}>🏦 계좌이체</div>
                    <div style={{ fontSize: 12, color: "#8899AA" }}>계좌번호 확인 후 직접 이체 · 강사 확인 후 처리</div>
                  </button>
                  <div style={{
                    padding: "16px", borderRadius: 14, border: "1px solid #ffffff11",
                    background: "#ffffff05", opacity: 0.45,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#8899AA", marginBottom: 4 }}>💳 카드결제</div>
                    <div style={{ fontSize: 12, color: "#8899AA" }}>준비 중입니다</div>
                  </div>
                </div>
                <button onClick={() => setPayModal(null)} style={{ marginTop: 14, width: "100%", padding: "10px 0", borderRadius: 12, background: "transparent", color: "#8899AA", border: "1px solid #ffffff22", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  취소
                </button>
              </>
            )}

            {/* 계좌이체 */}
            {payModal === "bank" && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>🏦 계좌이체</div>
                <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 20 }}>아래 계좌로 수강료를 이체해주세요</div>
                <div style={{ background: "#ffffff08", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  {[
                    { label: "은행", value: BANK_INFO.bank },
                    { label: "계좌번호", value: BANK_INFO.account },
                    { label: "예금주", value: BANK_INFO.holder },
                    { label: "금액", value: BANK_INFO.amount },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #ffffff08" }}>
                      <span style={{ fontSize: 12, color: "#8899AA" }}>{r.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#FCD34D", background: "#FCD34D11", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
                  ⚠ 이체 완료 후 아래 버튼을 눌러주세요. 강사 확인 후 납부 처리됩니다.
                </div>
                <button onClick={handleBankSubmit} style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: COLORS.ORANGE, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
                  이체 완료 신청
                </button>
                <button onClick={() => setPayModal("select")} style={{ width: "100%", padding: "10px 0", borderRadius: 12, background: "transparent", color: "#8899AA", border: "1px solid #ffffff22", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  돌아가기
                </button>
              </>
            )}

            {/* 카드결제 */}
            {payModal === "card" && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>💳 카드결제</div>
                <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 20 }}>카드 번호를 입력해주세요</div>
                <input
                  value={cardNum}
                  onChange={e => setCardNum(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 16, letterSpacing: 2, boxSizing: "border-box", fontFamily: "monospace", marginBottom: 16 }}
                />
                <button
                  onClick={handleCardSubmit}
                  disabled={cardNum.replace(/\s/g, "").length < 16 || cardPaying}
                  style={{
                    width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
                    fontSize: 14, fontWeight: 700, cursor: cardNum.replace(/\s/g, "").length < 16 || cardPaying ? "not-allowed" : "pointer",
                    fontFamily: "inherit", marginBottom: 8,
                    background: cardNum.replace(/\s/g, "").length < 16 || cardPaying ? "#ffffff22" : COLORS.ORANGE,
                    color: cardNum.replace(/\s/g, "").length < 16 || cardPaying ? "#8899AA" : "#fff",
                  }}
                >
                  {cardPaying ? "결제 처리 중..." : "결제하기"}
                </button>
                <button onClick={() => setPayModal("select")} disabled={cardPaying} style={{ width: "100%", padding: "10px 0", borderRadius: 12, background: "transparent", color: "#8899AA", border: "1px solid #ffffff22", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  돌아가기
                </button>
              </>
            )}

            {/* 완료 */}
            {payModal === "done" && (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                  {member.paid ? "납부 완료!" : "이체 완료 신청됨"}
                </div>
                <div style={{ fontSize: 13, color: "#8899AA", marginBottom: 24, lineHeight: 1.6 }}>
                  {member.paid
                    ? "수강료 납부가 완료됐습니다."
                    : "강사 확인 후 납부 처리됩니다.\n보통 1영업일 이내 처리됩니다."}
                </div>
                <button onClick={() => setPayModal(null)} style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: COLORS.ORANGE, color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 회원: 수업 신청 ────────────────────────────────────────
export function MemberClasses({ member, classes, onEnroll, onCancel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {classes.map(cls => {
        const enrolled = member.classes.includes(cls.id);
        const full     = cls.enrolled >= cls.capacity;
        return (
          <div key={cls.id} style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, border: `1px solid ${enrolled ? COLORS.ORANGE + "44" : "#ffffff11"}`, opacity: full && !enrolled ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{cls.title}</span>
                  <LevelChip level={cls.level} />
                </div>
                <div style={{ fontSize: 12, color: "#8899AA" }}>{cls.days?.join("·")}요일 · {cls.startTime}~{cls.endTime} · {cls.location}</div>
                <div style={{ fontSize: 12, color: "#8899AA", marginTop: 4 }}>{cls.enrolled}/{cls.capacity}명</div>
              </div>
              <button
                onClick={() => enrolled ? onCancel(cls.id) : onEnroll(cls.id)}
                disabled={full && !enrolled}
                style={{
                  padding: "8px 16px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  cursor: full && !enrolled ? "not-allowed" : "pointer",
                  background: enrolled ? "#7F1D1D" : full ? "#ffffff11" : COLORS.ORANGE,
                  color:      enrolled ? "#FCA5A5" : full ? "#8899AA"   : "#fff",
                }}>
                {enrolled ? "취소" : full ? "마감" : "신청"}
              </button>
            </div>
            {/* 정원 바 */}
            <div style={{ marginTop: 10, height: 3, borderRadius: 3, background: "#ffffff11", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: full ? "#EF4444" : COLORS.ORANGE, width: `${(cls.enrolled / cls.capacity) * 100}%`, transition: "width 0.4s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 회원: 내 수업 ──────────────────────────────────────────
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const TIME_SLOTS = [
  { key: "morning",   label: "오전", sub: "~12시" },
  { key: "afternoon", label: "오후", sub: "12~18시" },
  { key: "evening",   label: "저녁", sub: "18시~" },
];

export function MemberMyClasses({ member, classes, onCancel, onMakeup }) {
  const myClasses = classes.filter(c => member.classes.includes(c.id));
  const [modal, setModal] = useState(null);
  // modal: null | { classId, step: "form"|"loading"|"result", prefs, result }

  const openModal = (classId) =>
    setModal({ classId, step: "form", prefs: { days: [], timeSlot: "", date: "" }, result: null });

  const toggleDay = (day) =>
    setModal(m => ({
      ...m,
      prefs: {
        ...m.prefs,
        days: m.prefs.days.includes(day)
          ? m.prefs.days.filter(d => d !== day)
          : [...m.prefs.days, day],
      },
    }));

  const setTimeSlot = (key) =>
    setModal(m => ({ ...m, prefs: { ...m.prefs, timeSlot: m.prefs.timeSlot === key ? "" : key } }));

  const handleSubmit = async () => {
    setModal(m => ({ ...m, step: "loading" }));
    const result = await onMakeup(member.id, modal.classId, modal.prefs);
    setModal(m => ({ ...m, step: "result", result }));
  };

  const modalCls = myClasses.find(c => c.id === modal?.classId);

  return (
    <div>
      {myClasses.length === 0
        ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8899AA" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏀</div>
            <div>신청한 수업이 없습니다</div>
          </div>
        )
        : myClasses.map(cls => (
          <div key={cls.id} style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, marginBottom: 10, border: "1px solid #ffffff11" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{cls.title}</div>
                <div style={{ fontSize: 12, color: "#8899AA" }}>{cls.days?.join("·")}요일 · {cls.startTime}~{cls.endTime} · {cls.location}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openModal(cls.id)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${COLORS.ORANGE}44`, background: "transparent", color: COLORS.ORANGE, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  보강 신청
                </button>
                <button onClick={() => onCancel(cls.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #EF444444", background: "transparent", color: "#EF4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  취소
                </button>
              </div>
            </div>
          </div>
        ))
      }

      {/* ── 보강 신청 모달 ── */}
      {modal && (
        <div onClick={() => modal.step !== "loading" && setModal(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: COLORS.NAVY, borderRadius: 20, padding: 28,
            width: "100%", maxWidth: 380, border: "1px solid #ffffff22",
          }}>

            {/* 폼 */}
            {modal.step === "form" && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>보강 수업 신청</div>
                <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 20 }}>
                  {modalCls?.title} · 원하는 조건을 선택하세요 (모두 선택사항)
                </div>

                {/* 요일 */}
                <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 8 }}>요일</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                  {DAYS.map(day => {
                    const active = modal.prefs.days.includes(day);
                    return (
                      <button key={day} onClick={() => toggleDay(day)} style={{
                        width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${active ? COLORS.ORANGE : "#ffffff22"}`,
                        background: active ? `${COLORS.ORANGE}22` : "transparent",
                        color: active ? COLORS.ORANGE : "#8899AA",
                        fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}>{day}</button>
                    );
                  })}
                </div>

                {/* 시간대 */}
                <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 8 }}>시간대</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                  {TIME_SLOTS.map(ts => {
                    const active = modal.prefs.timeSlot === ts.key;
                    return (
                      <button key={ts.key} onClick={() => setTimeSlot(ts.key)} style={{
                        flex: 1, padding: "10px 0", borderRadius: 10,
                        border: `1.5px solid ${active ? COLORS.ORANGE : "#ffffff22"}`,
                        background: active ? `${COLORS.ORANGE}22` : "transparent",
                        color: active ? COLORS.ORANGE : "#8899AA",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        textAlign: "center",
                      }}>
                        <div>{ts.label}</div>
                        <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{ts.sub}</div>
                      </button>
                    );
                  })}
                </div>

                {/* 날짜 */}
                <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 8 }}>날짜 (선택)</div>
                <input
                  type="date"
                  value={modal.prefs.date}
                  onChange={e => setModal(m => ({ ...m, prefs: { ...m.prefs, date: e.target.value } }))}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 20,
                    border: "1px solid #ffffff22", background: "#ffffff0D",
                    color: "#fff", fontSize: 14, boxSizing: "border-box",
                    fontFamily: "'Trebuchet MS', sans-serif",
                    colorScheme: "dark",
                  }}
                />

                <button onClick={handleSubmit} style={{
                  width: "100%", padding: "13px 0", borderRadius: 12,
                  background: COLORS.ORANGE, color: "#fff", border: "none",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8,
                }}>AI 보강 수업 추천받기</button>
                <button onClick={() => setModal(null)} style={{
                  width: "100%", padding: "10px 0", borderRadius: 12,
                  background: "transparent", color: "#8899AA", border: "1px solid #ffffff22",
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                }}>취소</button>
              </>
            )}

            {/* 로딩 */}
            {modal.step === "loading" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>🏀</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>AI가 최적 보강 수업을 찾고 있습니다</div>
                <div style={{ fontSize: 12, color: "#8899AA" }}>잠시만 기다려주세요...</div>
              </div>
            )}

            {/* 결과 */}
            {modal.step === "result" && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>보강 수업 추천 결과</div>
                <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 16 }}>{modalCls?.title} 보강</div>

                <div style={{
                  background: "#ffffff08", borderRadius: 12, padding: 16, marginBottom: 16,
                  fontSize: 13, lineHeight: 1.8, color: "#CBD5E1", whiteSpace: "pre-wrap",
                }}>
                  {modal.result?.result || "추천 결과를 불러올 수 없습니다."}
                </div>

                {modal.result?.available?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 8 }}>신청 가능한 수업</div>
                    {modal.result.available.map(c => (
                      <div key={c.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", borderRadius: 10, background: "#ffffff08", marginBottom: 6,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{c.title}</div>
                          <div style={{ fontSize: 11, color: "#8899AA", marginTop: 2 }}>
                            {c.days?.join("/")} · {c.startTime}~{c.endTime} · 잔여 {c.capacity - c.enrolled}명
                          </div>
                        </div>
                        <LevelChip level={c.level} />
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={() => setModal(null)} style={{
                  width: "100%", padding: "12px 0", borderRadius: 12,
                  background: COLORS.ORANGE, color: "#fff", border: "none",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>확인</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 회원: AI 챗봇 ──────────────────────────────────────────
export function MemberChatbot({ member, classes }) {
  const [messages, setMessages] = useState([
    { role: "agent", text: "안녕하세요! 제이크루 농구교실 AI입니다. 무엇이든 물어보세요 🏀" }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    const myClassTitles = (member.classes ?? []).map(id => {
      const c = classes.find(c => c.id === id);
      return c ? `${c.title}(${c.days?.join("·")})` : null;
    }).filter(Boolean).join(", ");
    const systemPrompt = `당신은 제이크루 농구교실 AI 챗봇입니다.
현재 회원 정보:
- 이름: ${member.name}
- 출석률: ${member.attendance}%, 수강료: ${member.paid ? "납부완료" : "미납"}
- 수강 중인 수업: ${myClassTitles || "없음"}
- 신청 가능한 수업: ${classes.filter(c => !(member.classes ?? []).includes(c.id) && c.enrolled < c.capacity).map(c => c.title).join(", ")}

회원의 질문에 친근하게 2~3문장으로 답변하세요.`;

    await new Promise(r => setTimeout(r, 900));
    const MOCK_REPLIES = [
      `안녕하세요! 궁금하신 내용 확인했습니다. 출석률은 현재 ${member.attendance}%로 ${member.attendance >= 70 ? "양호한 편입니다 👍" : "조금 아쉽네요. 꾸준히 참석해 보세요!"}`,
      "수강료 관련 문의는 강사님께 직접 연락하시거나 카카오 채널을 이용해 주세요! 빠르게 답변해 드릴게요 😊",
      "보강 신청은 '내 수업' 탭에서 결석한 수업 옆 보강 신청 버튼을 누르시면 AI가 최적 수업을 추천해 드립니다 🏀",
      "제이크루 농구교실은 초등/중등/고등/성인반으로 나뉘어 운영되고 있습니다. 더 궁금한 점 있으시면 편하게 물어보세요!",
      "네, 확인했습니다! 추가로 궁금하신 점이 있으시면 언제든지 질문해 주세요 😄",
    ];
    const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    setMessages(prev => [...prev, { role: "agent", text: reply }]);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "60vh" }}>
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "agent" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${COLORS.ORANGE}22`, border: `1px solid ${COLORS.ORANGE}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 8, flexShrink: 0, marginTop: 2 }}>🏀</div>
            )}
            <div style={{
              maxWidth: "75%", padding: "10px 14px", fontSize: 13, lineHeight: 1.7, color: "#fff",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? COLORS.ORANGE : COLORS.NAVY,
              border: msg.role === "user" ? "none" : "1px solid #ffffff11",
            }}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${COLORS.ORANGE}22`, border: `1px solid ${COLORS.ORANGE}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏀</div>
            <div style={{ padding: "10px 14px", background: COLORS.NAVY, borderRadius: "16px 16px 16px 4px", border: "1px solid #ffffff11", fontSize: 13, color: "#8899AA" }}>답변 생성 중...</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="궁금한 것을 물어보세요 (예: 내 출석률 어때요?)"
          style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid #ffffff22", background: COLORS.NAVY, color: "#fff", fontSize: 13, fontFamily: "inherit" }} />
        <button onClick={send} disabled={loading} style={{
          padding: "12px 18px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
          background: loading ? "#ffffff11" : COLORS.ORANGE,
          color:      loading ? "#8899AA"   : "#fff",
          cursor: loading ? "not-allowed" : "pointer",
        }}>전송</button>
      </div>
    </div>
  );
}

// ── 내부 유틸 ─────────────────────────────────────────────
function LevelChip({ level }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${LEVEL_COLOR[level]}22`, color: LEVEL_COLOR[level] }}>
      {level}
    </span>
  );
}
