import { COLORS } from "../constants";

// ── Toast 알림 ─────────────────────────────────────────────
export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      padding: "12px 22px", borderRadius: 12, fontSize: 13, fontWeight: 600,
      zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      fontFamily: "'Trebuchet MS', sans-serif",
      background: toast.type === "err" ? "#7F1D1D" : COLORS.NAVY,
      color:      toast.type === "err" ? "#FCA5A5" : "#fff",
      border: `1px solid ${toast.type === "err" ? "#EF444444" : "#F9731644"}`,
    }}>
      {toast.msg}
    </div>
  );
}

// ── TabBar 네비게이션 ──────────────────────────────────────
export function TabBar({ tabs, active, onChange }) {
  return (
    <nav role="tablist" aria-label="메인 메뉴" style={{ display: "flex", background: COLORS.NAVY, borderBottom: "1px solid #ffffff11", overflowX: "auto" }}>
      {tabs.map(t => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          aria-label={t.label}
          onClick={() => onChange(t.key)}
          style={{
            padding: "12px 18px", fontSize: 13, background: "none", border: "none",
            borderBottom: active === t.key ? `2px solid ${COLORS.ORANGE}` : "2px solid transparent",
            color: active === t.key ? COLORS.ORANGE : "#8899AA",
            fontWeight: active === t.key ? 700 : 400,
            cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
          }}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}

// ── AgentLog 에이전트 실행 로그 ────────────────────────────
export function AgentLog({ logs, logRef }) {
  return (
    <div style={{ background: "#000", borderRadius: 12, padding: 16, border: "1px solid #ffffff11" }}>
      <div style={{ fontSize: 12, color: COLORS.ORANGE, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
        AGENT LOG
      </div>
      <div ref={logRef} style={{ height: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {logs.length === 0 && (
          <div style={{ fontSize: 12, color: "#4B5563", textAlign: "center", paddingTop: 40 }}>
            에이전트 실행 시 로그가 표시됩니다
          </div>
        )}
        {logs.map((log, i) => (
          <div key={i} style={{
            fontSize: 12, fontFamily: "monospace",
            color: log.type === "done"  ? "#86EFAC"
                 : log.type === "warn"  ? "#FCD34D"
                 : log.type === "start" ? COLORS.ORANGE
                 : log.type === "think" ? "#A78BFA"
                 : "#8899AA",
          }}>
            <span style={{ opacity: 0.5, marginRight: 8 }}>{log.time}</span>
            {log.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── StatCard 수치 카드 ─────────────────────────────────────
export function StatCard({ label, value, color }) {
  return (
    <div style={{ background: COLORS.NAVY, borderRadius: 12, padding: "14px 16px", border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 11, color: "#8899AA", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ── MemberAvatar 회원 아바타 ───────────────────────────────
export function MemberAvatar({ member, size = 32 }) {
  const AVATAR_COLORS = ["#F97316","#3B82F6","#22C55E","#F59E0B","#8B5CF6","#EC4899","#06B6D4","#EF4444"];
  const color = AVATAR_COLORS[member.id % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${color}22`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color,
    }}>
      {member.name[0]}
    </div>
  );
}
