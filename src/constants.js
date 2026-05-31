// ── 공통 상수 & 유틸 ───────────────────────────────────────

export const COLORS = {
  ORANGE:        "#F97316",
  NAVY:          "#1E3A5F",
  DARK:          "#0F1F35",
  TEXT_MUTED:    "#8899AA",
  BORDER_SUBTLE: "#ffffff11",
  DANGER_BG:     "#7F1D1D",
  DANGER_TEXT:   "#FCA5A5",
};

export const LEVEL_COLOR = {
  입문:   "#22C55E",
  초급:   "#3B82F6",
  중급:   "#F59E0B",
  대표팀: "#EF4444",
};

export const LOG_COLOR = {
  start: "#F97316",
  done:  "#86EFAC",
  warn:  "#FCD34D",
  think: "#A78BFA",
  info:  "#8899AA",
};

export const fmtDate = d =>
  new Date(d).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
