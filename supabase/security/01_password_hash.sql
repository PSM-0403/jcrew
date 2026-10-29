-- 1. 비밀번호 해시 분리
-- members.password(평문)는 이 단계에서 지우지 않는다. 새 로그인 확인 후 03에서 삭제.

create extension if not exists pgcrypto with schema extensions;

-- (1) 비밀번호 전용 테이블: RLS만 켜고 정책을 주지 않아 서버(service_role)만 접근
create table if not exists public.member_credentials (
  member_id     bigint primary key references public.members(id) on delete cascade,
  password_hash text not null,
  updated_at    timestamptz not null default now()
);
alter table public.member_credentials enable row level security;
revoke all on public.member_credentials from anon, authenticated;

-- (2) 기존 평문 비밀번호를 bcrypt 해시로 옮기기
insert into public.member_credentials (member_id, password_hash)
select id, extensions.crypt(password, extensions.gen_salt('bf'))
from public.members
where coalesce(password, '') <> ''
on conflict (member_id) do nothing;

-- 새 가입은 password 열에 값을 넣지 않으므로 NOT NULL 해제
alter table public.members alter column password drop not null;

-- (3) 로그인 확인: 일치한 회원 id만 돌려준다 (서버 전용)
create or replace function public.verify_member_login(p_name text, p_phone4 text, p_password text)
returns bigint
language sql stable security definer set search_path = ''
as $$
  select m.id
  from public.members m
  join public.member_credentials c on c.member_id = m.id
  where m.status = 'active'
    and m.name = trim(p_name)
    and right(regexp_replace(coalesce(m.phone, ''), '\D', '', 'g'), 4) = p_phone4
    and c.password_hash = extensions.crypt(p_password, c.password_hash)
  limit 1;
$$;

-- (4) 가입 신청: 회원 행과 해시를 한 트랜잭션으로 저장 (서버 전용)
create or replace function public.register_member(p jsonb)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  new_id bigint;
begin
  insert into public.members (name, phone, category, school_level, school_name, grade, gender,
                              student_phone, shuttle, address, paid, attendance, note, status)
  values (p->>'name', coalesce(p->>'phone', ''), coalesce(p->>'category', '성인'),
          coalesce(p->>'school_level', ''), coalesce(p->>'school_name', ''), coalesce(p->>'grade', ''),
          coalesce(p->>'gender', ''), coalesce(p->>'student_phone', ''),
          coalesce((p->>'shuttle')::boolean, false), coalesce(p->>'address', ''),
          false, 100, coalesce(p->>'note', ''), 'pending')
  returning id into new_id;

  insert into public.member_credentials (member_id, password_hash)
  values (new_id, extensions.crypt(p->>'password', extensions.gen_salt('bf')));

  return new_id;
end;
$$;

-- 두 함수는 서버(service_role)만 실행
revoke execute on function public.verify_member_login(text, text, text) from public, anon, authenticated;
revoke execute on function public.register_member(jsonb) from public, anon, authenticated;
grant execute on function public.verify_member_login(text, text, text) to service_role;
grant execute on function public.register_member(jsonb) to service_role;

-- 확인: 해시 건수 = 비밀번호가 있는 회원 수, 해시는 $2a$ 로 시작
select
  (select count(*) from public.members where coalesce(password, '') <> '') as members_with_pw,
  (select count(*) from public.member_credentials)                         as hashed,
  (select left(password_hash, 4) from public.member_credentials limit 1)    as hash_prefix;
