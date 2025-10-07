-- Backfill missing profile rows for existing auth users
insert into public.profiles (id, full_name, role, created_at)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  'employee',
  coalesce(u.created_at, now())
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);
