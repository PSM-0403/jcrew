-- 4. 회원 비밀번호 변경
-- 토큰의 member_id로 본인만 바꿀 수 있고, 저장은 bcrypt 해시로

create or replace function public.change_my_password(p_new text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me bigint := app.member_id();
begin
  if me is null then
    raise exception 'not a member' using errcode = '42501';
  end if;
  if coalesce(p_new, '') = '' then
    raise exception 'empty password';
  end if;

  insert into public.member_credentials (member_id, password_hash, updated_at)
  values (me, extensions.crypt(p_new, extensions.gen_salt('bf')), now())
  on conflict (member_id)
  do update set password_hash = excluded.password_hash, updated_at = now();
end;
$$;

revoke execute on function public.change_my_password(text) from public, anon;
grant execute on function public.change_my_password(text) to authenticated;
