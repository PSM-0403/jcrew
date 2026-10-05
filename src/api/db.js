import { supabase } from './supabase';
import { computeAttendanceStats } from '../analytics/attendanceMetrics';

const ATTENDANCE_STAT_COLUMNS = 'member_id, date, status, absence_type, is_makeup';

// ── Transform helpers ─────────────────────────────────────────

function toMember(row, enrollments = [], payments = [], attendance = null) {
  return {
    id: row.id,
    name: row.name,
    parentPhone: row.phone ?? '',
    joinDate: row.created_at?.split('T')[0] ?? '',
    category: row.category ?? '성인',
    paid: row.paid ?? false,
    attendance: attendance ?? row.attendance ?? 100,
    note: row.note ?? '',
    status: row.status ?? 'active',
    schoolLevel: row.school_level ?? '',
    schoolName: row.school_name ?? '',
    grade: row.grade ?? '',
    gender: row.gender ?? '',
    studentPhone: row.student_phone ?? '',
    shuttle: row.shuttle ?? false,
    address: row.address ?? '',
    riskAlert: row.risk_alert ?? null,
    aiComment: row.ai_comment ?? '',
    classes: enrollments.filter(e => e.member_id === row.id).map(e => e.class_id),
    paymentHistory: payments
      .filter(p => p.member_id === row.id)
      .map(p => ({ date: p.paid_at?.split('T')[0], months: p.months })),
  };
}

function toClass(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? '성인',
    level: row.level ?? '',
    days: row.days ?? [],
    startTime: row.start_time ?? '',
    endTime: row.end_time ?? '',
    location: row.court ?? '',
    capacity: row.capacity ?? 15,
    enrolled: row.enrolled ?? 0,
  };
}

// Supabase는 한 번에 최대 1,000행까지만 돌려주므로, 출결처럼 계속 쌓이는 테이블은
// 나눠서 끝까지 읽는다. (예전에는 1,650건 중 최근 1,000건만 읽혀 출석률이 일부 기간으로만 계산됐다.)
const PAGE_SIZE = 1000;

async function fetchAllAttendanceRows(columns) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('attendance')
      .select(columns)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

// ── Members ───────────────────────────────────────────────────

export async function fetchMembers() {
  const [
    { data: rows,        error: e1 },
    { data: enrollments, error: e2 },
    { data: payments,    error: e3 },
    attData,
  ] = await Promise.all([
    supabase.from('members').select('*').eq('status', 'active').order('id'),
    supabase.from('enrollments').select('member_id, class_id'),
    supabase.from('payments').select('*').order('paid_at'),
    fetchAllAttendanceRows(ATTENDANCE_STAT_COLUMNS),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  // 실제 출결 데이터로 출석률 계산 (정의는 analytics/attendanceMetrics.js)
  const attStats = computeAttendanceStats(attData);

  return (rows ?? []).map(r => {
    const s = attStats[r.id];
    const attendance = s && s.rate !== null ? s.rate : (r.attendance ?? 100);
    return toMember(r, enrollments ?? [], payments ?? [], attendance);
  });
}

export async function fetchPendingMembers() {
  const { data, error } = await supabase
    .from('members').select('*').eq('status', 'pending').order('created_at');
  if (error) throw error;
  return (data ?? []).map(r => ({ ...toMember(r), pendingId: r.id }));
}

export async function insertMember(data) {
  const { error } = await supabase.from('members').insert({
    name: data.name,
    password: data.password,
    phone: data.parentPhone || data.studentPhone || '',
    category: data.schoolLevel || data.category || '성인',
    school_level: data.schoolLevel ?? '',
    school_name: data.schoolName ?? '',
    grade: data.grade ?? '',
    gender: data.gender ?? '',
    student_phone: data.studentPhone ?? '',
    shuttle: data.shuttle ?? false,
    address: data.address ?? '',
    paid: false,
    attendance: 100,
    note: data.note ?? '',
    status: 'pending',
  });
  if (error) throw error;
}

export async function approveMember(id) {
  const { error } = await supabase.from('members').update({ status: 'active' }).eq('id', id);
  if (error) throw error;
}

export async function rejectMember(id) {
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
}

export async function updateMemberPaid(id, paid) {
  const { error } = await supabase.from('members').update({ paid }).eq('id', id);
  if (error) throw error;
}

export async function updateMemberGender(id, gender) {
  const { error } = await supabase.from('members').update({ gender }).eq('id', id);
  if (error) throw error;
}

export async function deleteMember(id) {
  const { error } = await supabase.from('members').update({ status: 'deleted' }).eq('id', id);
  if (error) throw error;
}

export async function updateMemberProfile(id, data) {
  const fields = {
    phone:         data.parentPhone,
    gender:        data.gender,
    school_level:  data.schoolLevel,
    grade:         data.grade,
    school_name:   data.schoolName,
    student_phone: data.studentPhone,
    shuttle:       data.shuttle,
    address:       data.address,
    note:          data.note,
  };
  if (data.password) fields.password = data.password;
  const { error } = await supabase.from('members').update(fields).eq('id', id);
  if (error) throw error;
}

export async function updateMemberInfo(id, data) {
  const { error } = await supabase.from('members').update({
    name:          data.name,
    phone:         data.parentPhone,
    student_phone: data.studentPhone,
    gender:        data.gender,
    school_level:  data.schoolLevel,
    school_name:   data.schoolName,
    grade:         data.grade,
    shuttle:       data.shuttle,
    address:       data.address,
  }).eq('id', id);
  if (error) throw error;
}

export async function updateMemberNote(id, note) {
  const { error } = await supabase.from('members').update({ note }).eq('id', id);
  if (error) throw error;
}

// ── Classes ───────────────────────────────────────────────────

export async function fetchClasses() {
  const { data, error } = await supabase.from('classes').select('*').order('id');
  if (error) throw error;
  return (data ?? []).map(toClass);
}

export async function insertClass(data) {
  const { data: row, error } = await supabase.from('classes').insert({
    title: data.title,
    category: data.category,
    level: data.level,
    days: data.days,
    start_time: data.startTime,
    end_time: data.endTime,
    court: data.location,
    capacity: data.capacity,
    enrolled: 0,
  }).select().single();
  if (error) throw error;
  return toClass(row);
}

export async function editClass(id, data) {
  const { error } = await supabase.from('classes').update({
    title: data.title,
    category: data.category,
    level: data.level,
    days: data.days,
    start_time: data.startTime,
    end_time: data.endTime,
    court: data.location,
    capacity: data.capacity,
  }).eq('id', id);
  if (error) throw error;
}

export async function removeClass(id) {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) throw error;
}

// ── Enrollments ───────────────────────────────────────────────

export async function enrollMember(memberId, classId) {
  const { error } = await supabase.from('enrollments')
    .insert({ member_id: memberId, class_id: classId });
  if (error) throw error;
  const { data } = await supabase.from('classes').select('enrolled').eq('id', classId).single();
  await supabase.from('classes').update({ enrolled: (data?.enrolled ?? 0) + 1 }).eq('id', classId);
}

export async function unenrollMember(memberId, classId) {
  const { error } = await supabase.from('enrollments')
    .delete().eq('member_id', memberId).eq('class_id', classId);
  if (error) throw error;
  const { data } = await supabase.from('classes').select('enrolled').eq('id', classId).single();
  await supabase.from('classes').update({ enrolled: Math.max(0, (data?.enrolled ?? 1) - 1) }).eq('id', classId);
}

// ── Payments ──────────────────────────────────────────────────

export async function addPayment(memberId, months) {
  const month = new Date().toISOString().slice(0, 7);
  const { error } = await supabase.from('payments').insert({ member_id: memberId, month, months });
  if (error) throw error;
}

// ── Gallery ───────────────────────────────────────────────────

export async function fetchGallery(classId) {
  const { data, error } = await supabase.from('gallery')
    .select('*').eq('class_id', classId).order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => {
    const { data: { publicUrl } } = supabase.storage.from('JCREW_gallery').getPublicUrl(row.file_path);
    return {
      id: row.id,
      filePath: row.file_path,
      type: row.file_type,
      url: publicUrl,
      uploadedAt: new Date(row.uploaded_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
  });
}

export async function uploadGalleryFile(classId, file) {
  const ext  = file.name.split('.').pop();
  const path = `${classId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('JCREW_gallery').upload(path, file);
  if (uploadError) throw uploadError;
  const type = file.type.startsWith('video') ? 'video' : 'image';
  const { data: row, error } = await supabase.from('gallery')
    .insert({ class_id: classId, file_path: path, file_type: type })
    .select().single();
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('JCREW_gallery').getPublicUrl(path);
  return {
    id: row.id,
    filePath: path,
    type,
    url: publicUrl,
    uploadedAt: new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };
}

export async function deleteGalleryFile(id, filePath) {
  await supabase.storage.from('JCREW_gallery').remove([filePath]);
  const { error } = await supabase.from('gallery').delete().eq('id', id);
  if (error) throw error;
}

// ── Notices ───────────────────────────────────────────────────

export async function fetchNotices() {
  const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertNotice(title, body, important) {
  const { error } = await supabase.from('notices').insert({ title, body, important });
  if (error) throw error;
}

export async function deleteNotice(id) {
  const { error } = await supabase.from('notices').delete().eq('id', id);
  if (error) throw error;
}

// ── Messages (채팅) ───────────────────────────────────────────

export async function sendMessage(memberId, content, senderType) {
  const { error } = await supabase.from('messages')
    .insert({ member_id: memberId, content, sender_type: senderType });
  if (error) throw error;
}

export async function fetchMessages(memberId, forCoach = false) {
  let query = supabase.from('messages').select('*').eq('member_id', memberId).order('created_at');
  if (forCoach) query = query.eq('hidden_by_coach', false);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function markMessagesRead(memberId, senderType) {
  const { error } = await supabase.from('messages')
    .update({ is_read: true })
    .eq('member_id', memberId)
    .eq('sender_type', senderType)
    .eq('is_read', false);
  if (error) throw error;
}

export async function fetchAllConversations() {
  const { data, error } = await supabase.from('messages')
    .select('member_id, is_read, sender_type, created_at, content, hidden_by_coach')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const map = {};
  for (const row of data ?? []) {
    if (row.hidden_by_coach) continue; // 강사가 숨긴 메시지 제외
    if (!map[row.member_id]) {
      map[row.member_id] = {
        memberId: row.member_id,
        unread: 0,
        lastAt: row.created_at,
        lastMessage: row.content,
        lastSender: row.sender_type,
      };
    }
    if (!row.is_read && row.sender_type === 'member') map[row.member_id].unread++;
  }
  return Object.values(map).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function deleteMessage(id) {
  const { error } = await supabase.from('messages').delete().eq('id', id);
  if (error) throw error;
}

export async function hideConversation(memberId) {
  const { error } = await supabase.from('messages')
    .update({ hidden_by_coach: true }).eq('member_id', memberId);
  if (error) throw error;
}

export async function fetchMemberUnreadCount(memberId) {
  const { count, error } = await supabase.from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .eq('sender_type', 'coach')
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

// ── Agent Results ─────────────────────────────────────────────

export async function saveAgentResult(agentType, result) {
  const { error } = await supabase.from('agent_results')
    .insert({ agent_type: agentType, result });
  if (error) throw error;
}

export async function fetchLatestAgentResult(agentType) {
  const { data, error } = await supabase.from('agent_results')
    .select('*').eq('agent_type', agentType)
    .order('created_at', { ascending: false }).limit(1).single();
  if (error) return null;
  return data;
}

export async function updateMemberRiskAlert(memberId, riskAlert, aiComment = '') {
  const { error } = await supabase.from('members')
    .update({ risk_alert: riskAlert, ai_comment: aiComment }).eq('id', memberId);
  if (error) throw error;
}

// ── Makeup Requests (보강 신청) ───────────────────────────────

export async function fetchMakeupRequests() {
  const { data, error } = await supabase
    .from('makeup_requests').select('*').eq('status', 'pending').order('created_at');
  if (error) throw error;
  return data ?? [];
}

// classId: 결석한 원래 수업, requestedClassId + preferredDate: 회원이 목록에서 고른 보강 수업과 날짜
export async function insertMakeupRequest({ memberId, memberName, classId, classTitle, requestedClassId, preferredDate, preferredTime, note }) {
  const { error } = await supabase.from('makeup_requests').insert({
    member_id: memberId, member_name: memberName,
    class_id: classId, class_title: classTitle,
    requested_class_id: requestedClassId || null,
    preferred_date: preferredDate || null,
    preferred_time: preferredTime || '',
    note: note || '',
  });
  if (error) throw error;
}

// 승인된 보강을 보강 수업 날짜별로 묶는다: { [classId]: { [date]: [memberId, ...] } }
// 출석 체크 화면에서 그 날짜의 그 수업에만 보강 회원을 함께 보여주기 위함.
export async function fetchMonthMakeups(year, month) {
  const pad   = (n) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month)}-01`;
  const end   = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;
  const { data, error } = await supabase.from('makeup_requests')
    .select('member_id, assigned_class_id, assigned_date')
    .in('status', ['assigned', 'done'])
    .gte('assigned_date', start).lte('assigned_date', end);
  if (error) throw error;
  const result = {};
  for (const row of data ?? []) {
    if (!row.assigned_class_id || !row.assigned_date) continue;
    const byDate = (result[row.assigned_class_id] ??= {});
    (byDate[row.assigned_date] ??= []).push(row.member_id);
  }
  return result;
}

export async function fetchAllAttendanceStats() {
  const data = await fetchAllAttendanceRows(ATTENDANCE_STAT_COLUMNS);
  return computeAttendanceStats(data);
}

// 운영 지표 카드용: 회원별 통계와 월별 집계를 함께 계산할 수 있게 원본 행을 돌려준다.
export async function fetchAttendanceRowsForMetrics() {
  return fetchAllAttendanceRows(ATTENDANCE_STAT_COLUMNS);
}

export async function fetchMemberAttendance(memberId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('class_id, date, status')
    .eq('member_id', memberId)
    .order('date', { ascending: false });
  if (error) throw error;
  const grouped = {};
  for (const row of data ?? []) {
    if (!grouped[row.class_id]) grouped[row.class_id] = [];
    grouped[row.class_id].push({ date: row.date, status: row.status });
  }
  return grouped;
}

export async function fetchMemberMakeupRequests(memberId) {
  const { data, error } = await supabase.from('makeup_requests')
    .select('*').eq('member_id', memberId)
    .in('status', ['pending', 'assigned'])
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function fetchMemberAbsences(memberId) {
  const { data, error } = await supabase
    .from('attendance')
    .select('class_id, date')
    .eq('member_id', memberId)
    .eq('status', '결석')
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMemberMakeupCount(memberId) {
  const { data, error } = await supabase
    .from('makeup_requests')
    .select('class_id')
    .eq('member_id', memberId)
    .in('status', ['assigned', 'done']); // 강사가 배정 완료한 것만 차감
  if (error) throw error;
  const counts = {};
  for (const r of data ?? []) {
    counts[r.class_id] = (counts[r.class_id] ?? 0) + 1;
  }
  return counts;
}

export async function assignMakeupRequest(id, { assignedClassId, assignedDate, assignedMemo }) {
  const { error } = await supabase.from('makeup_requests').update({
    status: 'assigned',
    assigned_class_id: assignedClassId || null,
    assigned_date: assignedDate || null,
    assigned_memo: assignedMemo || '',
  }).eq('id', id);
  if (error) throw error;
}

export async function fetchAssignedMakeups(memberId) {
  const { data, error } = await supabase.from('makeup_requests')
    .select('*').eq('member_id', memberId).eq('status', 'assigned')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function acknowledgeMakeup(id) {
  const { error } = await supabase.from('makeup_requests').update({ status: 'done' }).eq('id', id);
  if (error) throw error;
}

// ── Pending Payments (계좌이체 대기) ─────────────────────────

export async function fetchPendingPayments() {
  const { data, error } = await supabase
    .from('pending_payments').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map(r => ({
    id: r.id,
    memberId: r.member_id,
    memberName: r.member_name,
    requestedAt: r.requested_at,
  }));
}

export async function insertPendingPayment(memberId, memberName, requestedAt, memo = '') {
  const { data, error } = await supabase.from('pending_payments')
    .insert({ member_id: memberId, member_name: memberName, requested_at: requestedAt, memo })
    .select().single();
  if (error) throw error;
  return { id: data.id, memberId, memberName, requestedAt, memo };
}

export async function deletePendingPayment(id) {
  const { error } = await supabase.from('pending_payments').delete().eq('id', id);
  if (error) throw error;
}

// ── Class Notes ───────────────────────────────────────────────

export async function saveClassFeedback(classId, date, content) {
  const { error } = await supabase.from('class_feedback').upsert(
    { class_id: classId, date, content },
    { onConflict: 'class_id,date' }
  );
  if (error) throw error;
}

export async function fetchClassFeedback(classId, date) {
  const { data, error } = await supabase.from('class_feedback')
    .select('content').eq('class_id', classId).eq('date', date).single();
  if (error) return '';
  return data?.content ?? '';
}

export async function fetchRecentClassFeedback(classIds, limit = 5) {
  if (!classIds?.length) return [];
  const { data, error } = await supabase.from('class_feedback')
    .select('class_id, date, content')
    .in('class_id', classIds)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

export async function saveClassNote(classId, date, content) {
  const { error } = await supabase.from('class_notes').upsert(
    { class_id: classId, date, content },
    { onConflict: 'class_id,date' }
  );
  if (error) throw error;
}

export async function fetchClassNote(classId, date) {
  const { data, error } = await supabase.from('class_notes')
    .select('content').eq('class_id', classId).eq('date', date).single();
  if (error) return '';
  return data?.content ?? '';
}

export async function fetchRecentClassNotes(classIds, limit = 5) {
  if (!classIds?.length) return [];
  const { data, error } = await supabase.from('class_notes')
    .select('class_id, date, content')
    .in('class_id', classIds)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

// ── Attendance ────────────────────────────────────────────────

// absenceType: 결석일 때만 '사전연락' | '무단', isMakeup: 보강 수업 출결이면 true
export async function saveAttendance(memberId, classId, status, date, { absenceType = null, isMakeup = false } = {}) {
  const d = date ?? new Date().toISOString().split('T')[0];
  if (!status) {
    const { error } = await supabase.from('attendance')
      .delete().eq('member_id', memberId).eq('class_id', classId).eq('date', d);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('attendance').upsert(
    {
      member_id: memberId, class_id: classId, date: d, status,
      absence_type: status === '결석' ? absenceType : null,
      is_makeup: isMakeup,
    },
    { onConflict: 'member_id,class_id,date' }
  );
  if (error) throw error;
}

// attendance: { [classId]: { [date]: { [memberId]: status } } }
// absenceTypes: 같은 구조로 결석 사유('사전연락' | '무단')만 담는다
export async function fetchMonthAttendance(year, month) {
  const pad     = (n) => String(n).padStart(2, '0');
  const start   = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end     = `${year}-${pad(month)}-${pad(lastDay)}`;
  const { data, error } = await supabase.from('attendance')
    .select('*').gte('date', start).lte('date', end);
  if (error) throw error;
  const attendance = {};
  const absenceTypes = {};
  for (const row of data ?? []) {
    ((attendance[row.class_id] ??= {})[row.date] ??= {})[row.member_id] = row.status;
    if (row.status === '결석') {
      // 사유가 비어 있는 예전 결석은 무단으로 본다 (attendanceMetrics.isUnexcusedAbsence와 같은 기준)
      ((absenceTypes[row.class_id] ??= {})[row.date] ??= {})[row.member_id] = row.absence_type ?? '무단';
    }
  }
  return { attendance, absenceTypes };
}

export async function fetchCancellations(year, month) {
  const pad     = (n) => String(n).padStart(2, '0');
  const start   = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end     = `${year}-${pad(month)}-${pad(lastDay)}`;
  const { data, error } = await supabase.from('class_cancellations')
    .select('*').gte('date', start).lte('date', end);
  if (error) throw error;
  const result = {};
  for (const row of data ?? []) {
    if (!result[row.class_id]) result[row.class_id] = [];
    result[row.class_id].push(row.date);
  }
  return result;
}

export async function fetchUpcomingCancellations(classIds) {
  if (!classIds?.length) return [];
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.from('class_cancellations')
    .select('class_id, date')
    .in('class_id', classIds)
    .gte('date', today)
    .order('date');
  if (error) return [];
  return data ?? [];
}

export async function toggleCancellation(classId, date, cancel) {
  if (cancel) {
    const { error } = await supabase.from('class_cancellations')
      .insert({ class_id: classId, date });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('class_cancellations')
      .delete().eq('class_id', classId).eq('date', date);
    if (error) throw error;
  }
}
