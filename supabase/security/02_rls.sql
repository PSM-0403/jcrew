-- 2. 역할별 RLS 정책
-- 토큰(JWT)의 app_role(coach/member)과 member_id로 접근 범위를 나눈다.
-- 토큰이 없는 anon은 모든 테이블 접근 불가.

-- (1) 정책에서 쓰는 함수 (API로 노출되지 않는 app 스키마)
create schema if not exists app;
grant usage on schema app to anon, authenticated;

create or replace function app.is_coach() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'app_role', '') = 'coach'
$$;

create or replace function app.member_id() returns bigint
language sql stable as $$
  select case when auth.jwt() ->> 'app_role' = 'member'
              then (auth.jwt() ->> 'member_id')::bigint end
$$;

-- (2) 기존 정책 삭제 → RLS 켜기 → anon 권한 회수 → 강사 전체 허용
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'members', 'classes', 'enrollments', 'attendance', 'payments', 'pending_payments',
    'class_notes', 'class_feedback', 'makeup_requests', 'messages', 'notices', 'gallery',
    'agent_results', 'class_cancellations'
  ] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy coach_all on public.%I for all to authenticated using (app.is_coach()) with check (app.is_coach())', t);
  end loop;
end $$;

-- (3) 회원: 모두에게 공개되는 정보는 읽기만
create policy member_read on public.classes             for select to authenticated using (app.member_id() is not null);
create policy member_read on public.notices             for select to authenticated using (app.member_id() is not null);
create policy member_read on public.gallery             for select to authenticated using (app.member_id() is not null);
create policy member_read on public.class_cancellations for select to authenticated using (app.member_id() is not null);

-- (4) 회원: 자기 수업의 수업 내용·피드백만 읽기
create policy member_read on public.class_notes for select to authenticated
  using (class_id in (select class_id from public.enrollments where member_id = app.member_id()));
create policy member_read on public.class_feedback for select to authenticated
  using (class_id in (select class_id from public.enrollments where member_id = app.member_id()));

-- (5) 회원: 자기 행만
create policy member_self on public.members for select to authenticated using (id = app.member_id());
create policy member_self_update on public.members for update to authenticated
  using (id = app.member_id()) with check (id = app.member_id() and status = 'active');

create policy member_self on public.enrollments for select to authenticated using (member_id = app.member_id());
create policy member_self_cancel on public.enrollments for delete to authenticated using (member_id = app.member_id());

create policy member_self on public.attendance for select to authenticated using (member_id = app.member_id());

create policy member_self on public.payments for select to authenticated using (member_id = app.member_id());
create policy member_self_insert on public.payments for insert to authenticated with check (member_id = app.member_id());

create policy member_self on public.pending_payments for select to authenticated using (member_id = app.member_id());
create policy member_self_insert on public.pending_payments for insert to authenticated with check (member_id = app.member_id());

create policy member_self on public.makeup_requests for select to authenticated using (member_id = app.member_id());
create policy member_self_insert on public.makeup_requests for insert to authenticated with check (member_id = app.member_id());
create policy member_self_update on public.makeup_requests for update to authenticated
  using (member_id = app.member_id()) with check (member_id = app.member_id());

create policy member_self on public.messages for select to authenticated using (member_id = app.member_id());
create policy member_self_insert on public.messages for insert to authenticated
  with check (member_id = app.member_id() and sender_type = 'member');
create policy member_self_update on public.messages for update to authenticated
  using (member_id = app.member_id()) with check (member_id = app.member_id());
-- agent_results는 강사만 (coach_all)

-- (6) 수강 인원(classes.enrolled)은 트리거로 갱신 (회원은 classes를 수정할 수 없으므로)
create or replace function public.sync_class_enrolled() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.classes set enrolled = coalesce(enrolled, 0) + 1 where id = new.class_id;
  elsif tg_op = 'DELETE' then
    update public.classes set enrolled = greatest(coalesce(enrolled, 0) - 1, 0) where id = old.class_id;
  end if;
  return null;
end;
$$;
revoke execute on function public.sync_class_enrolled() from public, anon, authenticated;

drop trigger if exists enrollments_sync_enrolled on public.enrollments;
create trigger enrollments_sync_enrolled
  after insert or delete on public.enrollments
  for each row execute function public.sync_class_enrolled();

-- (7) 갤러리 Storage: 업로드·삭제는 강사만 (공개 버킷이라 읽기는 공개 URL)
-- 기존 정책은 public 역할에 조건 없이(true) 모든 버킷을 허용하고 있었음
drop policy if exists "allow all JCREW_gallery" on storage.objects;
create policy jcrew_gallery_coach on storage.objects for all to authenticated
  using (bucket_id = 'JCREW_gallery' and app.is_coach())
  with check (bucket_id = 'JCREW_gallery' and app.is_coach());

-- 확인: 테이블별 정책 수
select tablename, count(*) as policies, string_agg(policyname, ', ' order by policyname) as names
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;
