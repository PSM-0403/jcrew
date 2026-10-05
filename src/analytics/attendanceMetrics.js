// ── 출결 지표 정의 ─────────────────────────────────────────────
// 출석률과 이탈 위험을 한 곳에서 정의한다. 회원 목록, 이탈 위험 에이전트, 운영 지표 카드가
// 모두 이 함수들을 써서, 같은 지표가 화면마다 다르게 계산되지 않게 한다.
//
// 지표를 두 개로 나눈 이유
// - 출석률: "수업을 얼마나 받고 있나". 정규 수업을 빠졌어도 보강을 들었으면 채운 것으로 본다.
// - 연속 무단 결석: "학원과 연락이 끊겼나". 결석 자체보다 연락 없이 빠지는 것이 이탈 신호였다
//   (3년간 코치로 일하며 본 패턴: 말없이 2번 빠지고 돌아오는 아이는 많았지만, 말없이 3번 이상
//   빠진 아이는 대부분 그만뒀다).

export const RISK_RULES = {
  // 핵심 규칙: 연속 무단 결석 3회. 주 1회 수업 기준으로 약 3주 동안 연락 없이 안 나온 것.
  consecutiveUnexcused: 3,
  // 보조 규칙: 최근 5회 중 무단 결석 3회. 말없이 빠지다가 부모님 손에 한 번 나오고
  // 다시 안 나오는 경우는 연속 기록이 끊겨 핵심 규칙에 안 잡히기 때문에 따로 본다.
  recentWindow: 5,
  recentUnexcused: 3,
  // 출석률 기준은 수업 기록이 이 횟수 이상일 때만 적용한다.
  minSessionsForRate: 5,
};

export const RISK_ORDER = { 매우높음: 0, 높음: 1, 보통: 2 };

// 사유가 비어 있는 예전 결석은 무단으로 본다 (사유 기록 기능이 생기기 전 데이터).
export function isUnexcusedAbsence(row) {
  return row.status === '결석' && row.absence_type !== '사전연락';
}

// rows: attendance 행 (member_id, date, status, absence_type, is_makeup)
// 반환: { [memberId]: stats }
export function computeAttendanceStats(rows) {
  const byMember = {};
  for (const row of rows ?? []) {
    (byMember[row.member_id] ??= []).push(row);
  }

  const stats = {};
  for (const [memberId, memberRows] of Object.entries(byMember)) {
    const sorted = [...memberRows].sort((a, b) => a.date.localeCompare(b.date));
    const regular = sorted.filter(r => !r.is_makeup);
    const regularAttended = regular.filter(r => r.status === '출석').length;
    const regularAbsent = regular.filter(r => r.status === '결석').length;
    const makeupAttended = sorted.filter(r => r.is_makeup && r.status === '출석').length;
    // 보강 1회는 정규 결석 1회를 채운다 (빠진 수업보다 많이 채울 수는 없음).
    const filledByMakeup = Math.min(makeupAttended, regularAbsent);

    // 연속 무단 결석: 가장 최근 기록부터 거꾸로 세다가, 출석이나 사전 연락 결석이 나오면 멈춘다.
    // 보강 수업도 포함한다 (직접 잡은 보강을 말없이 빠진 것도 같은 기준으로 본다).
    let consecutiveUnexcused = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (isUnexcusedAbsence(sorted[i])) consecutiveUnexcused++;
      else break;
    }
    const recentUnexcused = sorted.slice(-RISK_RULES.recentWindow).filter(isUnexcusedAbsence).length;

    stats[memberId] = {
      total: regular.length,
      attended: regularAttended,
      absent: regularAbsent,
      makeupAttended: filledByMakeup,
      unexcusedAbsent: sorted.filter(isUnexcusedAbsence).length,
      consecutiveUnexcused,
      recentUnexcused,
      rate: regular.length > 0
        ? Math.round(((regularAttended + filledByMakeup) / regular.length) * 100)
        : null,
    };
  }
  return stats;
}

// 위험 단계: 무단 결석 규칙이 핵심이고, 기존의 미납·출석률 조건은 그대로 유지한다.
export function classifyRisk(member, stats) {
  const s = stats ?? { total: 0, consecutiveUnexcused: 0, recentUnexcused: 0, rate: null };
  const rate = s.rate ?? member.attendance ?? 100;
  const hasData = s.total >= RISK_RULES.minSessionsForRate;
  const longSilence = s.consecutiveUnexcused >= RISK_RULES.consecutiveUnexcused;
  const onAndOff = s.recentUnexcused >= RISK_RULES.recentUnexcused;

  if (longSilence && !member.paid)               return "매우높음";
  if (longSilence)                               return "높음";
  if (!member.paid && hasData && rate < 60)      return "높음";
  if (onAndOff)                                  return "보통";
  if (hasData && rate < 50)                      return "보통";
  if (!member.paid && hasData && rate < 70)      return "보통";
  return null;
}

// ── 운영 지표 (코치 대시보드 카드) ─────────────────────────────
// 월별로 출석률과 무단 결석 비율을 계산한다.
// - 출석률: (정규 출석 + 보강 출석) ÷ 정규 수업 수 (보강이 결석보다 많아도 100%를 넘지 않게 자름)
// - 무단 결석 비율: 결석 중 연락 없는 결석의 비율. 결석이 많은지보다 "말없이 빠지는지"를 본다.
export function computeMonthlyOperations(rows) {
  const byMonth = {};
  for (const row of rows ?? []) {
    const m = (byMonth[row.date.slice(0, 7)] ??= { regular: 0, attended: 0, makeupAttended: 0, absent: 0, unexcused: 0 });
    if (row.is_makeup) {
      if (row.status === '출석') m.makeupAttended++;
      if (isUnexcusedAbsence(row)) m.unexcused++;
      if (row.status === '결석') m.absent++;
      continue;
    }
    m.regular++;
    if (row.status === '출석') m.attended++;
    if (row.status === '결석') m.absent++;
    if (isUnexcusedAbsence(row)) m.unexcused++;
  }
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, m]) => ({
      month,
      sessions: m.regular,
      attendanceRate: m.regular ? Math.min(100, Math.round(((m.attended + m.makeupAttended) / m.regular) * 100)) : null,
      absences: m.absent,
      unexcusedShare: m.absent ? Math.round((m.unexcused / m.absent) * 100) : null,
    }));
}

export function countRiskLevels(members, stats) {
  const counts = { 매우높음: 0, 높음: 0, 보통: 0, 정상: 0 };
  for (const m of members ?? []) {
    counts[classifyRisk(m, stats[m.id]) ?? '정상']++;
  }
  return counts;
}
