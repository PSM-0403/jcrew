import { supabase } from './supabase';

// ── Transform helpers ─────────────────────────────────────────

function toMember(row, enrollments = [], payments = []) {
  return {
    id: row.id,
    name: row.name,
    password: row.password ?? '1234',
    parentPhone: row.phone ?? '',
    joinDate: row.created_at?.split('T')[0] ?? '',
    category: row.category ?? '성인',
    paid: row.paid ?? false,
    attendance: row.attendance ?? 100,
    note: row.note ?? '',
    status: row.status ?? 'active',
    schoolLevel: row.school_level ?? '',
    schoolName: row.school_name ?? '',
    grade: row.grade ?? '',
    gender: row.gender ?? '',
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

// ── Members ───────────────────────────────────────────────────

export async function fetchMembers() {
  const [
    { data: rows,        error: e1 },
    { data: enrollments, error: e2 },
    { data: payments,    error: e3 },
  ] = await Promise.all([
    supabase.from('members').select('*').eq('status', 'active').order('id'),
    supabase.from('enrollments').select('member_id, class_id'),
    supabase.from('payments').select('*').order('paid_at'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  return (rows ?? []).map(r => toMember(r, enrollments ?? [], payments ?? []));
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
    grade: data.grade ?? '',
    gender: data.gender ?? '',
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

// ── Makeup Requests (보강 신청) ───────────────────────────────

export async function fetchMakeupRequests() {
  const { data, error } = await supabase
    .from('makeup_requests').select('*').eq('status', 'pending').order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function insertMakeupRequest({ memberId, memberName, classId, classTitle, preferredDate, preferredTime, note }) {
  const { error } = await supabase.from('makeup_requests').insert({
    member_id: memberId, member_name: memberName,
    class_id: classId, class_title: classTitle,
    preferred_date: preferredDate || null,
    preferred_time: preferredTime || '',
    note: note || '',
  });
  if (error) throw error;
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

export async function insertPendingPayment(memberId, memberName, requestedAt) {
  const { data, error } = await supabase.from('pending_payments')
    .insert({ member_id: memberId, member_name: memberName, requested_at: requestedAt })
    .select().single();
  if (error) throw error;
  return { id: data.id, memberId, memberName, requestedAt };
}

export async function deletePendingPayment(id) {
  const { error } = await supabase.from('pending_payments').delete().eq('id', id);
  if (error) throw error;
}

// ── Attendance ────────────────────────────────────────────────

export async function saveAttendance(memberId, classId, status, date) {
  const d = date ?? new Date().toISOString().split('T')[0];
  if (!status) {
    const { error } = await supabase.from('attendance')
      .delete().eq('member_id', memberId).eq('class_id', classId).eq('date', d);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('attendance').upsert(
    { member_id: memberId, class_id: classId, date: d, status },
    { onConflict: 'member_id,class_id,date' }
  );
  if (error) throw error;
}

export async function fetchMonthAttendance(year, month) {
  const pad     = (n) => String(n).padStart(2, '0');
  const start   = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end     = `${year}-${pad(month)}-${pad(lastDay)}`;
  const { data, error } = await supabase.from('attendance')
    .select('*').gte('date', start).lte('date', end);
  if (error) throw error;
  const result = {};
  for (const row of data ?? []) {
    if (!result[row.class_id]) result[row.class_id] = {};
    if (!result[row.class_id][row.date]) result[row.class_id][row.date] = {};
    result[row.class_id][row.date][row.member_id] = row.status;
  }
  return result;
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
