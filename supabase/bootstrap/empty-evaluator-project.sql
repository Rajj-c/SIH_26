-- NEW EMPTY EVALUATOR PROJECT ONLY. Then apply migrations in filename order.
-- Intentionally fails if profiles already exists; never run against the team DB.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text check (role in ('student','industry','academician','institution')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
-- No authenticated access until the first platform migration installs policies.
commit;
