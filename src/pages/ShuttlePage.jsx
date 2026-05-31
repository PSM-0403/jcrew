import { useState } from "react";
import { COLORS } from "../constants";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function ShuttlePage({ classes, members, shuttleBoard, onBoard }) {
  const [selectedClass, setSelectedClass] = useState(null);

  const today     = WEEKDAY_KO[new Date().getDay()];
  const todayStr  = new Date().toISOString().split("T")[0];

  // 오늘 수업 우선 표시
  const sortedClasses = [...classes].sort((a, b) => {
    const aToday = (a.days ?? []).includes(today) ? 0 : 1;
    const bToday = (b.days ?? []).includes(today) ? 0 : 1;
    return aToday - bToday;
  });

  const cls            = classes.find(c => c.id === selectedClass);
  const shuttleMembers = selectedClass
    ? members.filter(m => m.shuttle && m.classes.includes(selectedClass))
    : [];

  const boardCount = shuttleMembers.filter(m => shuttleBoard[selectedClass]?.[m.id] === "탑승").length;

  return (
    <div style={{ padding: "16px 20px", maxWidth: 480, margin: "0 auto", fontFamily: "'Trebuchet MS', sans-serif" }}>

      {/* 오늘 날짜 */}
      <div style={{ marginBottom: 16, padding: "10px 14px", background: COLORS.NAVY, borderRadius: 10, border: "1px solid #ffffff11" }}>
        <span style={{ fontSize: 12, color: "#8899AA" }}>오늘 </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ORANGE }}>{todayStr} ({today}요일)</span>
      </div>

      {/* 수업 선택 */}
      <div style={{ fontSize: 12, color: "#8899AA", marginBottom: 8 }}>수업 선택</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {sortedClasses.map(c => {
          const isToday = (c.days ?? []).includes(today);
          return (
            <button key={c.id} onClick={() => setSelectedClass(c.id)} style={{
              padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
              border: `1.5px solid ${selectedClass === c.id ? COLORS.ORANGE : isToday ? "#22C55E44" : "#ffffff22"}`,
              background: selectedClass === c.id ? `${COLORS.ORANGE}22` : isToday ? "#22C55E11" : "transparent",
              color: selectedClass === c.id ? COLORS.ORANGE : isToday ? "#22C55E" : "#8899AA",
              fontSize: 13,
            }}>
              {c.title}
              {isToday && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700 }}>오늘</span>}
            </button>
          );
        })}
      </div>

      {!selectedClass ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#8899AA" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚌</div>
          <div>수업을 선택하면 셔틀 명단이 표시됩니다</div>
        </div>
      ) : (
        <>
          {/* 헤더 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{cls?.title} 셔틀 명단</div>
              <div style={{ fontSize: 12, color: "#8899AA", marginTop: 2 }}>{cls?.startTime} ~ {cls?.endTime} · {cls?.location}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.ORANGE }}>{boardCount}<span style={{ fontSize: 13, color: "#8899AA" }}>/{shuttleMembers.length}</span></div>
              <div style={{ fontSize: 11, color: "#8899AA" }}>탑승 완료</div>
            </div>
          </div>

          {/* 탑승 진행 바 */}
          {shuttleMembers.length > 0 && (
            <div style={{ height: 4, borderRadius: 4, background: "#ffffff11", marginBottom: 16, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, background: "#22C55E", width: `${(boardCount / shuttleMembers.length) * 100}%`, transition: "width 0.4s" }} />
            </div>
          )}

          {/* 명단 */}
          {shuttleMembers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", background: COLORS.NAVY, borderRadius: 12, border: "1px solid #ffffff11", color: "#8899AA", fontSize: 13 }}>
              이 수업 셔틀 신청 회원이 없습니다
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {shuttleMembers.map(m => {
                const status = shuttleBoard[selectedClass]?.[m.id] ?? null;
                return (
                  <div key={m.id} style={{
                    background: COLORS.NAVY, borderRadius: 12, padding: "12px 16px",
                    border: `1px solid ${status === "탑승" ? "#22C55E44" : status === "미탑승" ? "#EF444433" : "#ffffff11"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: "#8899AA" }}>📍 {m.address || "주소 미입력"}</div>
                        {m.parentPhone && <div style={{ fontSize: 12, color: "#8899AA" }}>📞 {m.parentPhone}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {["탑승", "미탑승"].map(s => (
                          <button key={s} onClick={() => onBoard(selectedClass, m.id, s)} style={{
                            padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                            fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                            background: status === s
                              ? (s === "탑승" ? "#166534" : "#7F1D1D")
                              : "#ffffff11",
                            color: status === s
                              ? (s === "탑승" ? "#86EFAC" : "#FCA5A5")
                              : "#8899AA",
                          }}>{s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 전체 탑승 완료 */}
          {shuttleMembers.length > 0 && boardCount === shuttleMembers.length && (
            <div style={{ marginTop: 16, padding: "14px", borderRadius: 12, background: "#166534", border: "1px solid #22C55E44", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#86EFAC" }}>
              ✅ 전원 탑승 완료!
            </div>
          )}
        </>
      )}
    </div>
  );
}
