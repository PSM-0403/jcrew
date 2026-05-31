import { useState } from "react";
import { COLORS } from "../constants";
import logo from "../assets/logo.png";

const COACH_PASSWORD = "jcrew1234";

export function LoginPage({ onCoach, onMember, onSignup, members }) {
  const [mode, setMode]         = useState(null); // null | "coach" | "member"
  const [name, setName]         = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [pw, setPw]             = useState("");
  const [error, setError]       = useState("");

  const reset = () => { setMode(null); setName(""); setBirthdate(""); setPw(""); setError(""); };

  const handleCoachSubmit = () => {
    if (pw === COACH_PASSWORD) { onCoach(); }
    else { setError("비밀번호가 올바르지 않습니다."); setPw(""); }
  };

  const handleMemberSubmit = () => {
    const found = members.find(m =>
      m.name === name.trim() &&
      m.birthdate === birthdate &&
      m.password === pw
    );
    if (found) { onMember(found.id); }
    else { setError("이름, 생년월일 또는 비밀번호가 올바르지 않습니다."); setPw(""); }
  };

  const isCoachMode  = mode === "coach";
  const isMemberMode = mode === "member";
  const handleSubmit = isCoachMode ? handleCoachSubmit : handleMemberSubmit;

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.DARK,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Trebuchet MS', sans-serif",
    }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "16px 24px", marginBottom: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        <img src={logo} alt="제이크루 농구교실" style={{ width: 160, display: "block" }} />
      </div>
      <div style={{ fontSize: 11, letterSpacing: 4, color: COLORS.ORANGE, textTransform: "uppercase", marginBottom: 6 }}>AI Agent</div>
      <p style={{ color: "#8899AA", fontSize: 13, marginBottom: 36 }}>J-CREW Basketball Academy</p>

      {!mode ? (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
            {[
              { label: "관리자/강사", icon: "📋", desc: "수업 관리 · AI 에이전트", color: COLORS.ORANGE, onClick: () => setMode("coach") },
              { label: "회원",        icon: "🏃", desc: "수업 신청 · AI 챗봇",    color: "#3B82F6",     onClick: () => setMode("member") },
            ].map(r => (
              <button key={r.label} onClick={r.onClick} style={{
                padding: "20px 32px", borderRadius: 14,
                border: `1.5px solid ${r.color}22`, background: `${r.color}11`,
                cursor: "pointer", textAlign: "center", minWidth: 160, transition: "all 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = `${r.color}22`}
                onMouseLeave={e => e.currentTarget.style.background = `${r.color}11`}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{r.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: "#8899AA" }}>{r.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={onSignup} style={{ fontSize: 13, color: COLORS.ORANGE, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            처음 오셨나요? 회원 가입
          </button>
        </>
      ) : null}

      {/* 연락처 정보 */}
      {!mode && (
        <div style={{ marginTop: 48, width: "100%", maxWidth: 360, borderTop: "1px solid #ffffff11", paddingTop: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <ContactItem icon="📍" label="주소" value="경기 고양시 일산동구 백석동 1115-4" href="https://map.kakao.com/?q=경기 고양시 일산동구 백석동 1115-4" />
            <ContactItem icon="📞" label="전화" value="010-9946-1392" />
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            <InstagramButton />
            <SnsButton icon="💬" label="카카오" href="https://pf.kakao.com/_xkMxmvxj" color="#FEE500" textColor="#3C1E1E" />
            <SnsButton icon="📝" label="블로그" href="https://blog.naver.com/jcrew_basket" color="#03C75A" />
            <YoutubeButton />
          </div>
        </div>
      )}

      {mode && (
        <div style={{ width: "100%", maxWidth: 340, background: COLORS.NAVY, borderRadius: 20, padding: 28, border: `1px solid ${isCoachMode ? COLORS.ORANGE : "#3B82F6"}33` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isCoachMode ? COLORS.ORANGE : "#3B82F6", marginBottom: 4 }}>
            {isCoachMode ? "관리자/강사 로그인" : "회원 로그인"}
          </div>
          <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 20 }}>
            {isMemberMode ? "이름과 비밀번호를 입력해주세요" : "비밀번호를 입력해주세요"}
          </div>

          {isMemberMode && (
            <>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="이름"
                autoFocus
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <input
                type="date"
                value={birthdate}
                onChange={e => { setBirthdate(e.target.value); setError(""); }}
                style={{ ...inputStyle, marginBottom: 10, colorScheme: "dark" }}
              />
            </>
          )}
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="비밀번호"
            autoFocus={isCoachMode}
            style={{ ...inputStyle, marginBottom: error ? 6 : 16 }}
          />
          {error && (
            <div style={{ fontSize: 12, color: "#FCA5A5", marginBottom: 12 }}>{error}</div>
          )}
          <button onClick={handleSubmit} style={{ width: "100%", padding: "12px 0", borderRadius: 12, background: isCoachMode ? COLORS.ORANGE : "#3B82F6", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10, fontFamily: "inherit" }}>
            로그인
          </button>
          <button onClick={reset} style={{ width: "100%", padding: "10px 0", borderRadius: 12, background: "transparent", color: "#8899AA", border: "1px solid #ffffff22", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            돌아가기
          </button>
        </div>
      )}
    </div>
  );
}

// ── 회원 가입 ──────────────────────────────────────────────
const GRADE_OPTIONS = { 초등: ["1","2","3","4","5","6"], 중등: ["1","2","3"], 고등: ["1","2","3"] };
const SCHOOL_LEVELS = ["초등", "중등", "고등", "성인"];

export function SignupPage({ onSignup, onBack }) {
  const [form, setForm] = useState({
    name: "", password: "", passwordConfirm: "",
    gender: "",
    birthdate: "",
    parentPhone: "", studentPhone: "",
    schoolLevel: "초등", schoolName: "", grade: "1",
    address: "", shuttle: false, note: "",
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const isAdult = form.schoolLevel === "성인";

  const handleSchoolLevel = (level) => {
    setForm(p => ({ ...p, schoolLevel: level, schoolName: "", grade: level === "성인" ? "" : "1", studentPhone: "" }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.parentPhone) return alert(isAdult ? "이름과 본인 연락처를 입력해주세요." : "이름과 부모님 연락처를 입력해주세요.");
    if (!form.birthdate) return alert("생년월일을 입력해주세요.");
    if (!form.password) return alert("비밀번호를 입력해주세요.");
    if (form.password !== form.passwordConfirm) return alert("비밀번호가 일치하지 않습니다.");
    onSignup(form);
  };

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.DARK,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Trebuchet MS', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420, background: COLORS.NAVY, borderRadius: 20, padding: 32, border: "1px solid #ffffff11" }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>🏀</div>
        <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>회원 가입</h2>
        <p style={{ color: "#8899AA", fontSize: 13, marginBottom: 24 }}>제이크루 농구교실에 오신 걸 환영합니다</p>

        {/* 이름 */}
        <Field label="이름">
          <input value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="홍길동" style={inputStyle} />
        </Field>

        {/* 생년월일 */}
        <Field label="생년월일">
          <input
            type="date"
            value={form.birthdate}
            onChange={e => set("birthdate", e.target.value)}
            style={{ ...inputStyle, colorScheme: "dark" }}
          />
        </Field>

        {/* 성별 */}
        <Field label="성별">
          <div style={{ display: "flex", gap: 8 }}>
            {["남", "여"].map(g => (
              <button key={g} onClick={() => set("gender", g)} style={{
                flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                border: `1.5px solid ${form.gender === g ? COLORS.ORANGE : "#ffffff22"}`,
                background: form.gender === g ? `${COLORS.ORANGE}22` : "transparent",
                color: form.gender === g ? COLORS.ORANGE : "#8899AA",
                fontSize: 13, fontWeight: 600,
              }}>{g}</button>
            ))}
          </div>
        </Field>

        {/* 비밀번호 */}
        <Field label="비밀번호">
          <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
            placeholder="비밀번호 설정" style={inputStyle} />
          <div style={{ fontSize: 11, color: "#8899AA", marginTop: 4 }}>숫자 4자리로 설정해주세요 (예: 1234)</div>
        </Field>

        {/* 비밀번호 확인 */}
        <Field label="비밀번호 확인">
          <input type="password" value={form.passwordConfirm} onChange={e => set("passwordConfirm", e.target.value)}
            placeholder="비밀번호 재입력"
            style={{ ...inputStyle, borderColor: form.passwordConfirm && form.password !== form.passwordConfirm ? "#EF4444" : "#ffffff22" }} />
          {form.passwordConfirm && form.password !== form.passwordConfirm && (
            <div style={{ fontSize: 11, color: "#FCA5A5", marginTop: 4 }}>비밀번호가 일치하지 않습니다.</div>
          )}
        </Field>

        {/* 구분 — 성인/학생에 따라 연락처 다르게 */}
        <Field label="구분">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SCHOOL_LEVELS.map(l => (
              <button key={l} onClick={() => handleSchoolLevel(l)} style={{
                flex: 1, minWidth: 60, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                border: `1.5px solid ${form.schoolLevel === l ? COLORS.ORANGE : "#ffffff22"}`,
                background: form.schoolLevel === l ? `${COLORS.ORANGE}22` : "transparent",
                color: form.schoolLevel === l ? COLORS.ORANGE : "#8899AA",
                fontSize: 13, fontWeight: 600,
              }}>{l}</button>
            ))}
          </div>
        </Field>

        {/* 연락처 — 성인: 본인만 / 학생: 부모님 + 학생 */}
        {isAdult ? (
          <Field label="본인 연락처">
            <input value={form.parentPhone} onChange={e => set("parentPhone", e.target.value)}
              placeholder="010-0000-0000" style={inputStyle} />
          </Field>
        ) : (
          <>
            <Field label="부모님 연락처">
              <input value={form.parentPhone} onChange={e => set("parentPhone", e.target.value)}
                placeholder="010-0000-0000" style={inputStyle} />
            </Field>
            <Field label="학생 연락처 (선택)">
              <input value={form.studentPhone} onChange={e => set("studentPhone", e.target.value)}
                placeholder="010-0000-0000" style={inputStyle} />
            </Field>
          </>
        )}

        {/* 학교 이름 & 학년 — 학생만 표시 */}
        {!isAdult && (
          <>
            <Field label="학교 이름 (선택)">
              <input value={form.schoolName} onChange={e => set("schoolName", e.target.value)}
                placeholder="예: 강남초등학교" style={inputStyle} />
            </Field>
            <Field label="학년">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {GRADE_OPTIONS[form.schoolLevel].map(g => (
                  <button key={g} onClick={() => set("grade", g)} style={{
                    padding: "7px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                    border: `1.5px solid ${form.grade === g ? COLORS.ORANGE : "#ffffff22"}`,
                    background: form.grade === g ? `${COLORS.ORANGE}22` : "transparent",
                    color: form.grade === g ? COLORS.ORANGE : "#8899AA",
                    fontSize: 13, fontWeight: 600,
                  }}>{g}학년</button>
                ))}
              </div>
            </Field>
          </>
        )}

        {/* 특이사항 */}
        <Field label="특이사항 (선택)">
          <textarea value={form.note} onChange={e => set("note", e.target.value)}
            placeholder="예: 무릎 부상 이력, 천식, 알레르기 등"
            style={{ ...inputStyle, minHeight: 80, resize: "vertical", lineHeight: 1.6 }} />
        </Field>

        {/* 셔틀 */}
        <Field label="셔틀 버스">
          <div style={{ display: "flex", gap: 8 }}>
            {[{ label: "필요", val: true }, { label: "불필요", val: false }].map(opt => (
              <button key={opt.label} onClick={() => set("shuttle", opt.val)} style={{
                flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                border: `1.5px solid ${form.shuttle === opt.val ? COLORS.ORANGE : "#ffffff22"}`,
                background: form.shuttle === opt.val ? `${COLORS.ORANGE}22` : "transparent",
                color: form.shuttle === opt.val ? COLORS.ORANGE : "#8899AA",
                fontSize: 13, fontWeight: 600,
              }}>{opt.label}</button>
            ))}
          </div>
        </Field>

        {/* 주소 — 셔틀 필요 시만 표시 */}
        {form.shuttle && (
          <Field label="주소">
            <input value={form.address} onChange={e => set("address", e.target.value)}
              placeholder="예: 서울시 강남구 테헤란로 123" style={inputStyle} />
          </Field>
        )}

        <button onClick={handleSubmit} style={{ width: "100%", padding: "13px 0", borderRadius: 12, background: COLORS.ORANGE, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10, fontFamily: "inherit" }}>
          가입하기
        </button>
        <button onClick={onBack} style={{ width: "100%", padding: "10px 0", borderRadius: 12, background: "transparent", color: "#8899AA", border: "1px solid #ffffff22", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          돌아가기
        </button>
      </div>
    </div>
  );
}

function ContactItem({ icon, label, value, href }) {
  const content = (
    <div style={{ background: "#ffffff08", borderRadius: 10, padding: "10px 12px", cursor: href ? "pointer" : "default" }}>
      <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 3 }}>{icon} {label}</div>
      <div style={{ fontSize: 12, color: href ? "#FCD34D" : "#CBD5E1", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
  return href
    ? <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{content}</a>
    : content;
}

function InstagramButton() {
  const [open, setOpen] = useState(false);
  const accounts = [
    { label: "제이크루 동호회",   id: "jcrew_legacy",   href: "https://instagram.com/jcrew_legacy" },
    { label: "제이크루 농구교실", id: "jcrew_basket",   href: "https://instagram.com/jcrew_basket" },
    { label: "제이크루 유소년",   id: "j.crew_youth",   href: "https://instagram.com/j.crew_youth" },
  ];
  return (
    <div style={{ flex: 1, position: "relative" }}>
      <button onClick={() => setOpen(p => !p)} style={{
        width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
        background: open ? "#E1306C33" : "#E1306C22", border: "1px solid #E1306C44",
      }}>
        <span style={{ fontSize: 20 }}>📸</span>
        <span style={{ fontSize: 10, color: "#E1306C", fontWeight: 600 }}>인스타그램</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0,
          width: 200, background: COLORS.NAVY, borderRadius: 12,
          border: "1px solid #E1306C44", overflow: "hidden", zIndex: 100,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          <div style={{ padding: "8px 12px 6px", fontSize: 11, color: "#E1306C", fontWeight: 700, letterSpacing: 0.5 }}>
            인스타그램 계정 선택
          </div>
          {accounts.map((a, i) => (
            <a key={a.id} href={a.href} target="_blank" rel="noreferrer"
              onClick={() => setOpen(false)}
              style={{
                display: "flex", flexDirection: "column", gap: 2,
                padding: "10px 12px", fontSize: 12, color: "#CBD5E1",
                textDecoration: "none",
                borderTop: i === 0 ? "1px solid #ffffff11" : "none",
                borderBottom: i < accounts.length - 1 ? "1px solid #ffffff08" : "none",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#ffffff0D"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontWeight: 600 }}>{a.label}</span>
              <span style={{ fontSize: 10, color: "#E1306C" }}>@{a.id}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function YoutubeButton() {
  const [open, setOpen] = useState(false);
  const channels = [
    { label: "농구교실", href: "https://www.youtube.com/@농구교실" },
    { label: "shooter_no.0", href: "https://www.youtube.com/@shooter_no.0" },
  ];
  return (
    <div style={{ flex: 1, position: "relative" }}>
      <button onClick={() => setOpen(p => !p)} style={{
        width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "10px 8px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
        background: open ? "#FF000033" : "#FF000022", border: `1px solid #FF000044`,
      }}>
        <span style={{ fontSize: 20 }}>▶</span>
        <span style={{ fontSize: 10, color: "#FF4444", fontWeight: 600 }}>유튜브</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", right: 0,
          width: 200, background: COLORS.NAVY, borderRadius: 12,
          border: "1px solid #FF000044", overflow: "hidden", zIndex: 100,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          <div style={{ padding: "8px 12px 6px", fontSize: 11, color: "#FF4444", fontWeight: 700, letterSpacing: 0.5 }}>
            유튜브 채널 선택
          </div>
          {channels.map((c, i) => (
            <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
              onClick={() => setOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 12px", fontSize: 12, color: "#CBD5E1",
                textDecoration: "none",
                borderTop: i === 0 ? "1px solid #ffffff11" : "none",
                borderBottom: i < channels.length - 1 ? "1px solid #ffffff08" : "none",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#ffffff0D"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ color: "#FF4444", fontSize: 10 }}>▶</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SnsButton({ icon, label, href, color, textColor = "#fff" }) {
  return (
    <div style={{ flex: 1 }}>
      <a href={href} target="_blank" rel="noreferrer" style={{
        width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "10px 8px", borderRadius: 10, textDecoration: "none", boxSizing: "border-box",
        background: `${color}22`, border: `1px solid ${color}44`,
      }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 10, color, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
      </a>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid #ffffff22", background: "#ffffff0D",
  color: "#fff", fontSize: 14, boxSizing: "border-box",
  fontFamily: "'Trebuchet MS', sans-serif",
};
