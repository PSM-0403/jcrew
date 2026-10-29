import { issueToken, callRpc, safeEqual } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { mode, name, phone4, password } = req.body ?? {};

  try {
    // 강사 비밀번호는 코드에 두지 않고 Vercel 환경 변수로만 관리
    if (mode === 'coach') {
      const coachPw = process.env.COACH_PASSWORD;
      if (!coachPw || !password || !safeEqual(password, coachPw)) {
        return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
      }
      return res.status(200).json({ token: issueToken({ appRole: 'coach' }) });
    }

    if (!name || !phone4 || !password) return res.status(400).json({ error: 'Missing fields' });

    // 비밀번호 비교는 DB 안에서 bcrypt 해시로 처리하고, 일치한 회원 id만 돌려받는다
    const id = await callRpc('verify_member_login', {
      p_name: name, p_phone4: phone4, p_password: password,
    });
    if (!id) return res.status(401).json({ error: '이름, 연락처 뒷 4자리 또는 비밀번호가 올바르지 않습니다.' });

    return res.status(200).json({ id, token: issueToken({ appRole: 'member', memberId: id }) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
