export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone4, password } = req.body ?? {};
  if (!name || !phone4 || !password) return res.status(400).json({ error: 'Missing fields' });

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/members?status=eq.active&select=id,name,phone,password`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  const members = await resp.json();
  const found = members.find(m => {
    const last4 = (m.phone ?? '').replace(/\D/g, '').slice(-4);
    return m.name === name.trim() && last4 === phone4 && m.password === password;
  });

  if (found) return res.status(200).json({ id: found.id });
  return res.status(401).json({ error: '이름, 연락처 뒷 4자리 또는 비밀번호가 올바르지 않습니다.' });
}
