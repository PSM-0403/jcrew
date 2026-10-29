import { callRpc } from './_auth.js';

// 가입 신청: 회원 행과 bcrypt 해시를 DB 함수 하나로 함께 저장 (pending 상태)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = req.body ?? {};
  if (!data.name?.trim() || !data.password) return res.status(400).json({ error: 'Missing fields' });

  try {
    await callRpc('register_member', {
      p: {
        name: data.name.trim(),
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
        note: data.note ?? '',
      },
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
