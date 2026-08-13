import { useState, useRef, useEffect } from "react";
import { useAgentStore } from "../../stores/agentStore";
import { MemberAvatar }           from "../../components/Common";
import { callAI }                 from "../../api/openai";
import { fetchMemberAbsences, fetchMemberMakeupCount, fetchAssignedMakeups, acknowledgeMakeup, fetchMemberAttendance, fetchRecentClassNotes, fetchUpcomingCancellations, fetchNotices, fetchMemberMakeupRequests, fetchRecentClassFeedback, updateMemberProfile } from "../../api/db";
import { COLORS, LEVEL_COLOR } from "../../constants";

// ── 회원: 홈 ──────────────────────────────────────────────
const BANK_INFO = { bank: "우리은행", account: "1002-629-447772", holder: "정흥주", amount: "월 수강료" };

const GRADE_OPTIONS_HOME = { 초등: ["1","2","3","4","5","6"], 중등: ["1","2","3"], 고등: ["1","2","3"] };

export function MemberHome({ member, classes, onBankPayment, onCardPayment, onProfileUpdate }) {
  const myClasses = classes.filter(c => member.classes.includes(c.id));
  const [payModal, setPayModal]     = useState(null);
  const [cardNum, setCardNum]       = useState("");
  const [cardPaying, setCardPaying] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm]   = useState({
    password: "", passwordConfirm: "",
    parentPhone: member.parentPhone ?? "",
    gender: member.gender ?? "",
    schoolLevel: member.schoolLevel ?? "초등",
    grade: member.grade ?? "1",
    schoolName: member.schoolName ?? "",
    note: member.note ?? "",
  });
  const setP = (key, val) => setProfileForm(p => ({ ...p, [key]: val }));
  const isAdult = profileForm.schoolLevel === "성인";

  const handleProfileSave = async () => {
    if (profileForm.password && profileForm.password !== profileForm.passwordConfirm) {
      return alert("비밀번호가 일치하지 않습니다.");
    }
    setProfileSaving(true);
    try {
      await updateMemberProfile(member.id, {
        ...profileForm,
        password: profileForm.password || member.password,
      });
      onProfileUpdate?.();
      setProfileModal(false);
      alert("정보가 수정됐습니다!");
    } catch {
      alert("저장 실패. 다시 시도해주세요.");
    }
    setProfileSaving(false);
  };
  const [cancellations, setCancellations] = useState([]);

  useEffect(() => {
    fetchUpcomingCancellations(member.classes ?? []).then(setCancellations);
  }, [member.id]);

  const handleCardSubmit = async () => {
    setCardPaying(true);
    await new Promise(r => setTimeout(r, 1200));
    onCardPayment();
    setCardPaying(false);
    setPayModal("done");
  };

  const [bankMemo, setBankMemo] = useState("");

  const handleBankSubmit = () => {
    if (!bankMemo.trim()) return alert("입금 금액과 내용을 메모에 작성해주세요.");
    onBankPayment(bankMemo.trim());
    setBankMemo("");
    setPayModal("done");
  };

  return (
    <div>
      {/* 휴강 알림 */}
      {cancellations.length > 0 && (
        <div style={{ background: "#7F1D1D33", borderRadius: 12, padding: 14, marginBottom: 16, border: "1px solid #EF444444" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#FCA5A5", marginBottom: 8 }}>🚫 휴강 안내</div>
          {cancellations.map(c => {
            const cls = classes.find(cl => cl.id === c.class_id);
            const d = new Date(c.date + "T00:00:00");
            const DAY = ["일","월","화","수","목","금","토"];
            return (
              <div key={`${c.class_id}-${c.date}`} style={{ fontSize: 12, color: "#FCA5A5", marginBottom: 4 }}>
                • {cls?.title} — {d.getMonth()+1}월 {d.getDate()}일({DAY[d.getDay()]}) 휴강
              </div>
            );
          })}
        </div>
      )}

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

      {/* ── 내 정보 수정 모달 ── */}
      {profileModal && (
        <div onClick={() => !profileSaving && setProfileModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: COLORS.NAVY, borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, border: "1px solid #ffffff22", margin: "auto" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>내 정보 수정</div>
            <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 20 }}>이름은 수정할 수 없습니다.</div>

            {[
              { label: "비밀번호 변경 (선택)", key: "password", type: "password", placeholder: "새 비밀번호" },
              { label: "비밀번호 확인", key: "passwordConfirm", type: "password", placeholder: "새 비밀번호 재입력" },
              { label: isAdult ? "본인 연락처" : "부모님 연락처", key: "parentPhone", type: "tel", placeholder: "010-0000-0000" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 5 }}>{f.label}</div>
                <input type={f.type} value={profileForm[f.key]}
                  onChange={e => setP(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 5 }}>성별</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["남", "여"].map(g => (
                  <button key={g} onClick={() => setP("gender", g)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                    border: `1.5px solid ${profileForm.gender === g ? COLORS.ORANGE : "#ffffff22"}`,
                    background: profileForm.gender === g ? `${COLORS.ORANGE}22` : "transparent",
                    color: profileForm.gender === g ? COLORS.ORANGE : "#8899AA", fontSize: 13, fontWeight: 600,
                  }}>{g}</button>
                ))}
              </div>
            </div>

            {!isAdult && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 5 }}>학년</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(GRADE_OPTIONS_HOME[profileForm.schoolLevel] ?? []).map(g => (
                      <button key={g} onClick={() => setP("grade", g)} style={{
                        padding: "7px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                        border: `1.5px solid ${profileForm.grade === g ? COLORS.ORANGE : "#ffffff22"}`,
                        background: profileForm.grade === g ? `${COLORS.ORANGE}22` : "transparent",
                        color: profileForm.grade === g ? COLORS.ORANGE : "#8899AA", fontSize: 13, fontWeight: 600,
                      }}>{g}학년</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 5 }}>학교 이름 (선택)</div>
                  <input value={profileForm.schoolName} onChange={e => setP("schoolName", e.target.value)}
                    placeholder="예: 강남초등학교"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
              </>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 5 }}>특이사항 (선택)</div>
              <textarea value={profileForm.note} onChange={e => setP("note", e.target.value)}
                placeholder="부상 이력, 알레르기 등"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, minHeight: 60, boxSizing: "border-box", fontFamily: "inherit", resize: "none" }} />
            </div>

            <button onClick={handleProfileSave} disabled={profileSaving} style={{
              width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
              background: profileSaving ? "#ffffff22" : COLORS.ORANGE, color: profileSaving ? "#8899AA" : "#fff",
              fontSize: 14, fontWeight: 700, cursor: profileSaving ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 8,
            }}>{profileSaving ? "저장 중..." : "저장"}</button>
            <button onClick={() => setProfileModal(false)} disabled={profileSaving} style={{
              width: "100%", padding: "10px 0", borderRadius: 12, background: "transparent",
              color: "#8899AA", border: "1px solid #ffffff22", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>취소</button>
          </div>
        </div>
      )}

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
                <div style={{ fontSize: 12, color: "#FCD34D", background: "#FCD34D11", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                  ⚠ 이체 완료 후 아래 메모 작성 후 신청해주세요.
                </div>
                <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 6 }}>입금 메모 <span style={{ color: "#EF4444" }}>*필수</span></div>
                <textarea
                  value={bankMemo}
                  onChange={e => setBankMemo(e.target.value)}
                  placeholder="예: 120,000원 입금했습니다"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 16, border: `1px solid ${bankMemo.trim() ? COLORS.ORANGE : "#ffffff22"}`, background: "#ffffff0D", color: "#fff", fontSize: 13, minHeight: 70, boxSizing: "border-box", fontFamily: "inherit", resize: "none" }}
                />
                <button onClick={handleBankSubmit} style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: bankMemo.trim() ? COLORS.ORANGE : "#ffffff22", color: bankMemo.trim() ? "#fff" : "#8899AA", border: "none", fontSize: 14, fontWeight: 700, cursor: bankMemo.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", marginBottom: 8 }}>
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
const TIME_SLOTS = [
  { key: "morning",   label: "오전", sub: "~12시" },
  { key: "afternoon", label: "오후", sub: "12~18시" },
  { key: "evening",   label: "저녁", sub: "18시~" },
];

export function MemberMyClasses({ member, classes, onCancel, onMakeupRequest }) {
  const myClasses = classes.filter(c => member.classes.includes(c.id));
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState({ preferredDate: "", preferredTime: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId]           = useState(null);
  const [absences, setAbsences]               = useState({});
  const [makeupCounts, setMakeupCounts]       = useState({});
  const [assignedMakeups, setAssignedMakeups] = useState([]);
  const [attendance, setAttendance]           = useState({}); // { [classId]: [{date, status}] }

  useEffect(() => {
    async function load() {
      try {
        const [abs, mkCounts, assigned, att] = await Promise.all([
          fetchMemberAbsences(member.id),
          fetchMemberMakeupCount(member.id),
          fetchAssignedMakeups(member.id),
          fetchMemberAttendance(member.id),
        ]);
        const grouped = {};
        for (const a of abs) {
          if (!grouped[a.class_id]) grouped[a.class_id] = [];
          grouped[a.class_id].push(a.date);
        }
        setAbsences(grouped);
        setMakeupCounts(mkCounts);
        setAssignedMakeups(assigned);
        setAttendance(att);
      } catch {}
    }
    load();
  }, [member.id]);

  const handleAcknowledge = async (id) => {
    setAssignedMakeups(p => p.filter(r => r.id !== id));
    try { await acknowledgeMakeup(id); } catch {}
  };

  const openModal = (cls) => {
    setModal({ classId: cls.id, classTitle: cls.title });
    setForm({ preferredDate: "", preferredTime: "", note: "" });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await onMakeupRequest({ ...form, classId: modal.classId, classTitle: modal.classTitle });
    setSubmitting(false);
    setModal(null);
  };

  return (
    <div>
      {/* 보강 배정 알림 */}
      {assignedMakeups.length > 0 && (
        <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #8B5CF633" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8B5CF6", marginBottom: 12 }}>🏀 보강 배정 알림 ({assignedMakeups.length}건)</div>
          {assignedMakeups.map(r => (
            <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #ffffff08" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.class_title}</div>
                  {r.assigned_date && (
                    <div style={{ fontSize: 12, color: "#93C5FD", marginTop: 3 }}>
                      📅 {r.assigned_date.replace(/-/g, ".")} 보강 배정
                    </div>
                  )}
                  {r.assigned_memo && (
                    <div style={{ fontSize: 12, color: "#CBD5E1", marginTop: 3 }}>💬 {r.assigned_memo}</div>
                  )}
                </div>
                <button onClick={() => handleAcknowledge(r.id)} style={{
                  padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                  background: "#166534", color: "#86EFAC", flexShrink: 0, marginLeft: 8,
                }}>확인</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {myClasses.length === 0
        ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8899AA" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏀</div>
            <div>신청한 수업이 없습니다</div>
          </div>
        )
        : myClasses.map(cls => {
          const absenceDates = absences[cls.id] ?? [];
          const used         = makeupCounts[cls.id] ?? 0;
          const remaining    = Math.max(0, absenceDates.length - used);
          const isExpanded   = expandedId === cls.id;
          return (
            <div key={cls.id} style={{ background: COLORS.NAVY, borderRadius: 12, marginBottom: 10, border: `1px solid ${isExpanded ? COLORS.ORANGE + "44" : "#ffffff11"}`, overflow: "hidden" }}>
              {/* 헤더 */}
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{cls.title}</div>
                    <div style={{ fontSize: 12, color: "#8899AA" }}>{cls.days?.join("·")}요일 · {cls.startTime}~{cls.endTime} · {cls.location}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <button onClick={() => openModal(cls)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${COLORS.ORANGE}44`, background: "transparent", color: COLORS.ORANGE, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                      보강 신청
                    </button>
                    <button onClick={() => onCancel(cls.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #EF444444", background: "transparent", color: "#EF4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                      취소
                    </button>
                  </div>
                </div>

                {/* 잔여 보강 + 펼치기 */}
                {absenceDates.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: remaining > 0 ? "#F59E0B22" : "#ffffff11", color: remaining > 0 ? "#F59E0B" : "#8899AA", fontWeight: 700 }}>
                        잔여 보강 {remaining}회
                      </span>
                      <span style={{ fontSize: 11, color: "#8899AA" }}>결석 {absenceDates.length}회</span>
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : cls.id)} style={{ fontSize: 11, color: "#8899AA", background: "none", border: "none", cursor: "pointer" }}>
                      {isExpanded ? "▲ 접기" : "▼ 출결 현황"}
                    </button>
                  </div>
                )}
              </div>

              {/* 출결 현황 */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #ffffff11", padding: "14px 16px", background: "#ffffff05" }}>
                  {(() => {
                    const records = attendance[cls.id] ?? [];
                    const attended = records.filter(r => r.status === "출석").length;
                    const absent   = records.filter(r => r.status === "결석").length;
                    const total    = records.length;
                    const rate     = total > 0 ? Math.round((attended / total) * 100) : null;
                    const rateColor = rate === null ? "#8899AA" : rate >= 80 ? "#22C55E" : rate >= 60 ? "#F59E0B" : "#EF4444";
                    return (
                      <>
                        {/* 요약 */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: "#86EFAC" }}>출석 {attended}회</div>
                          <div style={{ fontSize: 12, color: "#FCA5A5" }}>결석 {absent}회</div>
                          {rate !== null && <div style={{ fontSize: 12, color: rateColor, fontWeight: 700 }}>출석률 {rate}%</div>}
                        </div>
                        {/* 월별 그룹 */}
                        {records.length > 0 ? (() => {
                          const byMonth = {};
                          for (const r of records) {
                            const ym = r.date.slice(0, 7);
                            if (!byMonth[ym]) byMonth[ym] = [];
                            byMonth[ym].push(r);
                          }
                          return Object.entries(byMonth)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([ym, rows]) => {
                              const [y, m] = ym.split("-");
                              const att = rows.filter(r => r.status === "출석").length;
                              const abs = rows.filter(r => r.status === "결석").length;
                              return (
                                <div key={ym} style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 6, fontWeight: 600 }}>
                                    {y}년 {parseInt(m)}월 · 출석 {att}회 결석 {abs}회
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                    {rows.sort((a, b) => a.date.localeCompare(b.date)).map(r => (
                                      <span key={r.date} style={{
                                        fontSize: 11, padding: "3px 10px", borderRadius: 20,
                                        background: r.status === "출석" ? "#22C55E22" : "#EF444422",
                                        color:      r.status === "출석" ? "#86EFAC"   : "#FCA5A5",
                                      }}>
                                        {parseInt(r.date.slice(5, 7))}/{parseInt(r.date.slice(8))} {r.status}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            });
                        })() : (
                          <div style={{ fontSize: 12, color: "#ffffff33" }}>출결 기록이 없습니다</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })
      }

      {/* 보강 신청 모달 */}
      {modal && (
        <div onClick={() => !submitting && setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: COLORS.NAVY, borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, border: "1px solid #ffffff22" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>보강 신청</div>
            <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 12 }}>{modal.classTitle}</div>
            <div style={{ fontSize: 12, color: "#FCD34D", background: "#FCD34D11", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
              ⚠ 보강은 결석 발생 월 이내에 사용해야 합니다.
            </div>

            <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 6 }}>희망 날짜 (선택)</div>
            <input type="date" value={form.preferredDate}
              onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 16, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 14, boxSizing: "border-box", colorScheme: "dark" }} />

            <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 6 }}>희망 시간대 (선택)</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {TIME_SLOTS.map(ts => {
                const active = form.preferredTime === ts.key;
                return (
                  <button key={ts.key} onClick={() => setForm(f => ({ ...f, preferredTime: active ? "" : ts.key }))} style={{
                    flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                    border: `1.5px solid ${active ? COLORS.ORANGE : "#ffffff22"}`,
                    background: active ? `${COLORS.ORANGE}22` : "transparent",
                    color: active ? COLORS.ORANGE : "#8899AA", fontSize: 12, fontWeight: 600,
                  }}>
                    <div>{ts.label}</div>
                    <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>{ts.sub}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 6 }}>메모 (선택)</div>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="강사님께 전달할 내용"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, marginBottom: 20, border: "1px solid #ffffff22", background: "#ffffff0D", color: "#fff", fontSize: 13, minHeight: 70, boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }} />

            <button onClick={handleSubmit} disabled={submitting} style={{
              width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
              background: submitting ? "#ffffff22" : COLORS.ORANGE, color: submitting ? "#8899AA" : "#fff",
              fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 8,
            }}>{submitting ? "신청 중..." : "보강 신청하기"}</button>
            <button onClick={() => setModal(null)} disabled={submitting} style={{ width: "100%", padding: "10px 0", borderRadius: 12, background: "transparent", color: "#8899AA", border: "1px solid #ffffff22", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              취소
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ── 회원: AI 챗봇 ──────────────────────────────────────────
export function MemberChatbot({ member, classes }) {
  const { chatMessages: messages, chatLoading: loading, addChatMessage, setChatLoading } = useAgentStore();
  const [input, setInput]           = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const chatRef = useRef(null);

  const myClasses = classes.filter(c => (member.classes ?? []).includes(c.id));

  // 컨텍스트 한 번만 로드
  useEffect(() => {
    async function loadContext() {
      const [recentNotes, absData, mkCount, notices, attData, makeupReqs, feedbacks, cancellations] = await Promise.all([
        fetchRecentClassNotes(member.classes ?? [], 10).catch(() => []),
        fetchMemberAbsences(member.id).catch(() => []),
        fetchMemberMakeupCount(member.id).catch(() => ({})),
        fetchNotices().catch(() => []),
        fetchMemberAttendance(member.id).catch(() => ({})),
        fetchMemberMakeupRequests(member.id).catch(() => []),
        fetchRecentClassFeedback(member.classes ?? [], 5).catch(() => []),
        fetchUpcomingCancellations(member.classes ?? []).catch(() => []),
      ]);

      // 다음 수업 날짜 계산 (휴강 제외)
      const DAY_KR = ["일","월","화","수","목","금","토"];
      const cancelledDates = cancellations.map(c => c.date);
      const nextClassDates = myClasses.map(cls => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        for (let i = 0; i < 21; i++) {
          const dayName = DAY_KR[d.getDay()];
          const dateStr = d.toISOString().split('T')[0];
          if ((cls.days ?? []).includes(dayName) && !cancelledDates.includes(dateStr)) {
            return `- ${cls.title}: ${dateStr} (${dayName}) ${cls.startTime} ${cls.location}`;
          }
          d.setDate(d.getDate() + 1);
        }
        return `- ${cls.title}: 예정 없음`;
      }).join("\n") || "없음";

      const notesText = recentNotes.length > 0
        ? recentNotes.map(n => {
            const cls = classes.find(c => c.id === n.class_id);
            return `- ${n.date} ${cls?.title ?? ""}: ${n.content}`;
          }).join("\n")
        : "없음";

      const myClassSchedule = myClasses.map(c =>
        `- ${c.title}: ${c.days?.join("·")}요일 ${c.startTime}~${c.endTime} (${c.location})`
      ).join("\n") || "없음";

      const totalAbsences = absData.length;
      const usedMakeups = Object.values(mkCount).reduce((s, v) => s + v, 0);
      const remainingMakeups = Math.max(0, totalAbsences - usedMakeups);

      const noticesText = notices.slice(0, 3).map(n =>
        `- [${n.created_at?.split("T")[0]}] ${n.title}: ${n.body}`
      ).join("\n") || "없음";

      // 출결 날짜별 기록
      const attText = Object.entries(attData).map(([classId, records]) => {
        const cls = classes.find(c => c.id === parseInt(classId));
        const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
        return `- ${cls?.title ?? "수업"}: ${sorted.map(r => `${r.date.slice(5).replace("-","/")} ${r.status}`).join(", ")}`;
      }).join("\n") || "없음";

      // 강사 피드백 이력
      const feedbackText = feedbacks.length > 0
        ? feedbacks.map(f => {
            const cls = classes.find(c => c.id === f.class_id);
            return `- ${f.date} ${cls?.title ?? ""}: ${f.content}`;
          }).join("\n")
        : "없음";

      // 보강 신청 현황
      const makeupText = makeupReqs.length > 0
        ? makeupReqs.map(r =>
            `- ${r.class_title} / 희망날짜: ${r.preferred_date || "미정"} / 상태: ${r.status === "pending" ? "대기 중" : "배정완료"}${r.assigned_date ? ` (배정: ${r.assigned_date})` : ""}${r.assigned_memo ? ` / 메모: ${r.assigned_memo}` : ""}`
          ).join("\n")
        : "없음";

      setSystemPrompt(`당신은 제이크루 농구교실 AI 챗봇입니다.

[학원 기본 정보]
- 이름: 제이크루 농구교실
- 주소: 경기 고양시 일산동구 백석동 1115-4
- 전화: 010-9946-1392
- 인스타그램: @jcrew_basket (농구교실), @jcrew_legacy (동호회), @j.crew_youth (유소년)
- 카카오채널: https://pf.kakao.com/_xkMxmvxj
- 블로그: https://blog.naver.com/jcrew_basket
- 유튜브: 농구교실(https://www.youtube.com/@%EC%A0%95%ED%9D%A5%EC%A3%BC_%EC%97%B4%ED%98%88%EB%86%8D%EA%B5%AC), shooter_no.0(https://www.youtube.com/@shooter_no.0)
- 수강료: 90분 주1회 100,000원(계좌)/110,000원(카드), 120분 주1회 120,000원(계좌)/132,000원(카드), 형제 등록 시 10% 할인

[회원 정보]
- 이름: ${member.name}
- 출석률: ${member.attendance}%, 수강료: ${member.paid ? "납부완료" : "미납"}
- 총 결석: ${totalAbsences}회, 잔여 보강: ${remainingMakeups}회

[수업 시간표]
${myClassSchedule}

[다음 수업 예정일 (오늘: ${new Date().toISOString().split('T')[0]}, 휴강 제외)]
${nextClassDates}

[최근 수업 내용]
${notesText}

[납부 이력]
${(member.paymentHistory ?? []).length > 0
  ? [...(member.paymentHistory ?? [])].reverse().slice(0, 5).map(h => `- ${h.date} 납부${h.months ? ` (${h.months}개월)` : ""}`).join("\n")
  : "없음"}

[강사 피드백 이력]
${feedbackText}

[출결 날짜별 기록]
${attText}

[보강 신청 현황]
${makeupText}

[최근 공지]
${noticesText}

회원의 질문에 친근하게 2~3문장으로 한국어로 답변하세요. 수업 내용 관련 질문엔 농구 용어를 쉽게 설명해주세요. 모르는 내용이나 확인이 필요한 질문엔 "카카오톡 채널(https://pf.kakao.com/_xkMxmvxj) 또는 전화(010-9946-1392)로 문의하시면 빠르게 확인해드릴 수 있어요!" 라고 안내해주세요. URL은 반드시 https://로 시작하는 전체 주소로 작성해주세요.`);
    }
    loadContext();
  }, [member.id]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const contextReady = !!systemPrompt;

  const QUICK_QUESTIONS = [
    "내 출석률 어때?",
    "다음 수업 언제야?",
    "보강 몇 번 남았어?",
    "수강료 얼마야?",
    "최근에 뭐 배웠어?",
  ];

  const send = async (msg) => {
    const userMsg = (msg || input).trim();
    if (!userMsg || loading || !contextReady) return;
    setInput("");
    addChatMessage({ role: "user", text: userMsg });
    setChatLoading(true);
    try {
      const reply = await callAI(userMsg, systemPrompt);
      addChatMessage({ role: "agent", text: reply });
    } catch {
      addChatMessage({ role: "agent", text: "죄송해요, 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요 🙏" });
    }
    setChatLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "65vh" }}>

      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
          🏀 AI 챗봇
          {!contextReady && (
            <span style={{ fontSize: 11, color: "#8899AA" }}>불러오는 중...</span>
          )}
        </div>
        <button onClick={() => useAgentStore.getState().clearChat()} style={{
          fontSize: 11, color: "#8899AA", background: "none", border: "1px solid #ffffff22",
          borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit",
        }}>채팅 초기화</button>
      </div>


      {/* 메시지 목록 */}
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
            }}>
              {(() => {
                const processed = msg.text
                  .replace(/(?<!https?:\/\/)pf\.kakao\.com/g, 'https://pf.kakao.com')
                  .replace(/(?<!https?:\/\/)blog\.naver\.com/g, 'https://blog.naver.com')
                  .replace(/(?<!https?:\/\/)instagram\.com/g, 'https://instagram.com');
                return processed.split(/(https?:\/\/\S+)/g).map((part, j) =>
                  /^https?:\/\//.test(part)
                    ? <a key={j} href={part.replace(/[).,]+$/, '')} target="_blank" rel="noreferrer"
                        style={{ color: "#93C5FD", textDecoration: "underline", wordBreak: "break-all" }}>
                        {part.replace(/[).,]+$/, '')}
                      </a>
                    : part
                );
              })()}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${COLORS.ORANGE}22`, border: `1px solid ${COLORS.ORANGE}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏀</div>
            <div style={{ padding: "10px 14px", background: COLORS.NAVY, borderRadius: "16px 16px 16px 4px", border: "1px solid #ffffff11", fontSize: 13, color: "#8899AA" }}>답변 생성 중...</div>
          </div>
        )}
      </div>

      {/* 예시 질문 */}
      {contextReady && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 8 }} className="no-scrollbar">
          {QUICK_QUESTIONS.map(q => (
            <button key={q} onClick={() => send(q)} disabled={loading} style={{
              padding: "6px 12px", borderRadius: 20, border: `1px solid ${COLORS.ORANGE}44`,
              background: `${COLORS.ORANGE}11`, color: COLORS.ORANGE, fontSize: 12,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
            }}>{q}</button>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder={contextReady ? "궁금한 것을 물어보세요" : "정보 로딩 중..."}
          disabled={!contextReady}
          style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid #ffffff22", background: COLORS.NAVY, color: "#fff", fontSize: 13, fontFamily: "inherit", opacity: contextReady ? 1 : 0.5 }} />
        <button onClick={() => send()} disabled={loading || !contextReady} style={{
          padding: "12px 18px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
          background: loading || !contextReady ? "#ffffff11" : COLORS.ORANGE,
          color:      loading || !contextReady ? "#8899AA"   : "#fff",
          cursor: loading || !contextReady ? "not-allowed" : "pointer",
        }}>전송</button>
      </div>
    </div>
  );
}

// ── 내부 유틸 ─────────────────────────────────────────────
// ── 회원: 내 정보 ──────────────────────────────────────────
const GRADE_OPTIONS_PROFILE = { 초등: ["1","2","3","4","5","6"], 중등: ["1","2","3"], 고등: ["1","2","3"] };

export function MemberProfile({ member, onUpdate, showToast }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({
    password: "", passwordConfirm: "",
    parentPhone: member.parentPhone ?? "",
    studentPhone: member.studentPhone ?? "",
    gender: member.gender ?? "",
    schoolLevel: member.schoolLevel ?? "초등",
    grade: member.grade ?? "1",
    schoolName: member.schoolName ?? "",
    shuttle: member.shuttle ?? false,
    address: member.address ?? "",
    note: member.note ?? "",
  });
  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const isAdult = form.schoolLevel === "성인";

  const handleSave = async () => {
    if (form.password && form.password !== form.passwordConfirm)
      return showToast("비밀번호가 일치하지 않습니다.", "err");
    setSaving(true);
    try {
      await updateMemberProfile(member.id, {
        ...form,
        password: form.password || member.password,
      });
      onUpdate?.();
      showToast("내 정보가 수정됐습니다!");
      setForm(p => ({ ...p, password: "", passwordConfirm: "" }));
    } catch {
      showToast("저장 실패. 다시 시도해주세요.", "err");
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4 }}>내 정보</h2>
      <p style={{ fontSize: 13, color: "#8899AA", marginBottom: 24 }}>이름은 강사를 통해 수정 가능합니다.</p>

      <div style={{ background: COLORS.NAVY, borderRadius: 16, padding: 20, border: "1px solid #ffffff11", display: "flex", flexDirection: "column", gap: 14 }}>

        <InfoRow label="이름">
          <div style={{ fontSize: 14, color: "#8899AA" }}>{member.name} (수정 불가)</div>
        </InfoRow>

        <InfoRow label="비밀번호 변경 (선택)">
          <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
            placeholder="새 비밀번호 (변경 원할 때만 입력)" style={iStyle} />
          <input type="password" value={form.passwordConfirm} onChange={e => set("passwordConfirm", e.target.value)}
            placeholder="새 비밀번호 확인"
            style={{ ...iStyle, marginTop: 8, borderColor: form.passwordConfirm && form.password !== form.passwordConfirm ? "#EF4444" : form.password && form.password === form.passwordConfirm ? "#22C55E" : "#ffffff22" }} />
          {form.password && form.passwordConfirm && (
            <div style={{ fontSize: 11, marginTop: 4, color: form.password === form.passwordConfirm ? "#86EFAC" : "#FCA5A5" }}>
              {form.password === form.passwordConfirm ? "✓ 비밀번호가 일치합니다" : "✗ 비밀번호가 일치하지 않습니다"}
            </div>
          )}
        </InfoRow>

        <InfoRow label={isAdult ? "본인 연락처" : "부모님 연락처"}>
          <input type="tel" value={form.parentPhone} onChange={e => set("parentPhone", e.target.value)}
            placeholder="010-0000-0000" style={iStyle} />
        </InfoRow>

        {!isAdult && (
          <InfoRow label="학생 연락처 (선택)">
            <input type="tel" value={form.studentPhone} onChange={e => set("studentPhone", e.target.value)}
              placeholder="010-0000-0000" style={iStyle} />
          </InfoRow>
        )}

        <InfoRow label="성별">
          <div style={{ display: "flex", gap: 8 }}>
            {["남", "여"].map(g => (
              <button key={g} onClick={() => set("gender", g)} style={{
                flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                border: `1.5px solid ${form.gender === g ? COLORS.ORANGE : "#ffffff22"}`,
                background: form.gender === g ? `${COLORS.ORANGE}22` : "transparent",
                color: form.gender === g ? COLORS.ORANGE : "#8899AA", fontSize: 13, fontWeight: 600,
              }}>{g}</button>
            ))}
          </div>
        </InfoRow>

        <InfoRow label="구분">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["초등", "중등", "고등", "성인"].map(l => (
              <button key={l} onClick={() => set("schoolLevel", l)} style={{
                flex: 1, minWidth: 60, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                border: `1.5px solid ${form.schoolLevel === l ? COLORS.ORANGE : "#ffffff22"}`,
                background: form.schoolLevel === l ? `${COLORS.ORANGE}22` : "transparent",
                color: form.schoolLevel === l ? COLORS.ORANGE : "#8899AA", fontSize: 13, fontWeight: 600,
              }}>{l}</button>
            ))}
          </div>
        </InfoRow>

        {!isAdult && (
          <InfoRow label="학년">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(GRADE_OPTIONS_PROFILE[form.schoolLevel] ?? []).map(g => (
                <button key={g} onClick={() => set("grade", g)} style={{
                  padding: "7px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  border: `1.5px solid ${form.grade === g ? COLORS.ORANGE : "#ffffff22"}`,
                  background: form.grade === g ? `${COLORS.ORANGE}22` : "transparent",
                  color: form.grade === g ? COLORS.ORANGE : "#8899AA", fontSize: 13, fontWeight: 600,
                }}>{g}학년</button>
              ))}
            </div>
          </InfoRow>
        )}

        {!isAdult && (
          <InfoRow label="학교 이름 (선택)">
            <input value={form.schoolName} onChange={e => set("schoolName", e.target.value)}
              placeholder="예: 강남초등학교" style={iStyle} />
          </InfoRow>
        )}

        <InfoRow label="셔틀 버스">
          <div style={{ display: "flex", gap: 8 }}>
            {[{ label: "필요", val: true }, { label: "불필요", val: false }].map(opt => (
              <button key={opt.label} onClick={() => set("shuttle", opt.val)} style={{
                flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                border: `1.5px solid ${form.shuttle === opt.val ? COLORS.ORANGE : "#ffffff22"}`,
                background: form.shuttle === opt.val ? `${COLORS.ORANGE}22` : "transparent",
                color: form.shuttle === opt.val ? COLORS.ORANGE : "#8899AA", fontSize: 13, fontWeight: 600,
              }}>{opt.label}</button>
            ))}
          </div>
        </InfoRow>

        {form.shuttle && (
          <InfoRow label="주소">
            <input value={form.address} onChange={e => set("address", e.target.value)}
              placeholder="예: 경기도 고양시 일산동구 ..." style={iStyle} />
          </InfoRow>
        )}

        <InfoRow label="특이사항 (선택)">
          <textarea value={form.note} onChange={e => set("note", e.target.value)}
            placeholder="부상 이력, 알레르기 등"
            style={{ ...iStyle, minHeight: 70, resize: "none", lineHeight: 1.6 }} />
        </InfoRow>

        <button onClick={handleSave} disabled={saving} style={{
          width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
          background: saving ? "#ffffff22" : COLORS.ORANGE, color: saving ? "#8899AA" : "#fff",
          fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}>{saving ? "저장 중..." : "저장"}</button>
      </div>
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const iStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid #ffffff22", background: "#ffffff0D",
  color: "#fff", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit",
};

function LevelChip({ level }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${LEVEL_COLOR[level]}22`, color: LEVEL_COLOR[level] }}>
      {level}
    </span>
  );
}
