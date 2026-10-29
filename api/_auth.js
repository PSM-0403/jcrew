import crypto from 'node:crypto';

// Supabase가 검증하는 JWT를 서버에서 직접 발급한다 (HS256, Legacy JWT secret).
// app_role(coach/member)과 member_id를 넣어 두면 RLS 정책에서 auth.jwt()로 읽는다.
const COACH_SUB = 'c0ac0000-0000-4000-8000-000000000001';
const TOKEN_TTL_SEC = 60 * 60 * 12;

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function secret() {
  const s = process.env.SUPABASE_JWT_SECRET;
  if (!s) throw new Error('SUPABASE_JWT_SECRET not configured');
  return s;
}

function sign(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function issueToken({ appRole, memberId = null }) {
  const now = Math.floor(Date.now() / 1000);
  // sub는 uuid 형식이어야 Storage 등에서 오류가 나지 않는다
  const sub = appRole === 'coach'
    ? COACH_SUB
    : `00000000-0000-4000-8000-${String(memberId).padStart(12, '0')}`;
  return sign({
    role: 'authenticated',
    aud: 'authenticated',
    sub,
    app_role: appRole,
    ...(memberId !== null && { member_id: memberId }),
    iat: now,
    exp: now + TOKEN_TTL_SEC,
  });
}

// Authorization: Bearer <token> 검증, 실패하면 null
export function verifyRequest(req) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const [header, body, sig] = token.split('.');
  if (!header || !body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(`${header}.${body}`).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// 서버 전용 키로 DB 함수(RPC) 호출
export async function callRpc(name, args) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  const resp = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(data?.message ?? `rpc ${name} failed`);
  return data;
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
