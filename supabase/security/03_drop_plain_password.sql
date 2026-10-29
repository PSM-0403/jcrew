-- 3. 평문 비밀번호 열 삭제
-- 새 로그인(해시 비교)으로 회원 로그인이 되는 것을 확인한 뒤에만 실행

-- 삭제 전 확인: 비밀번호가 있는 회원은 모두 해시가 있어야 한다 (0이어야 함)
select count(*) as missing_hash
from public.members m
where coalesce(m.password, '') <> ''
  and not exists (select 1 from public.member_credentials c where c.member_id = m.id);

alter table public.members drop column password;
