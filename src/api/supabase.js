import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 로그인 때 서버가 발급한 토큰(역할·회원 id 포함). 토큰이 없으면 anon으로 접근 → RLS로 차단
let accessToken = null;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  accessToken: async () => accessToken ?? SUPABASE_ANON,
});

export function setAccessToken(token) {
  accessToken = token;
  supabase.realtime.setAuth(token ?? SUPABASE_ANON);
}

export const getAccessToken = () => accessToken;
