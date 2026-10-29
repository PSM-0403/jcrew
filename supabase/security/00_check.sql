-- 0. 작업 전 현재 상태 확인 (읽기 전용)

-- (1) 회원 id 타입, password 열 NOT NULL 여부
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (column_name in ('id', 'member_id', 'password', 'enrolled'))
order by table_name, column_name;

-- (2) 지금 걸려 있는 정책 (public 테이블 + 갤러리 Storage)
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- (3) RLS 켜짐 여부
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
