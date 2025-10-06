# Supabase Console Setup

This guide walks you through creating the Supabase project and configuring Auth, Database, RLS, and Storage for the Employee Performance Review System.

## 1) Create a new Supabase project
- Go to https://app.supabase.com
- Create or select an organization.
- Click "New project".
- Choose a project name (e.g., `employee-reviews`) and strong database password.
- Select region and compute size (Free/Tier as needed).
- Wait for provisioning to complete.

## 2) Retrieve API keys and URL
- In your project, open `Settings → API`.
- Copy:
  - Project URL (Rest URL)
  - `anon` public API key
- In the app repo, create a local env file:

```bash
# /home/shirk3y/assessments/.env.local
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 4.5 Auto-create profiles on user signup
```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'employee')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

These variables will be used by the Supabase client in the frontend.

## 3) Configure Auth
- Go to `Authentication → Providers`:
  - Enable Email (recommended) and optionally OAuth providers (Google, GitHub, etc.).
- Go to `Authentication → URL Configuration`:
  - Add `http://localhost:5173` to allowed redirect URLs for local development.
- Optional: Customize email templates in `Authentication → Templates`.

## 4) Initialize database schema
Open `SQL Editor` and run the following scripts in order.

### 4.1 Enable required extension
```sql
create extension if not exists "pgcrypto";
```

### 4.2 Core reference tables
```sql
-- Organizational units (departments/teams)
create table if not exists public.org_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  parent_id uuid references public.org_units(id) on delete set null
);

-- Job roles / positions
create table if not exists public.job_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Competencies and descriptions
create table if not exists public.competencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

-- Required levels of competencies for job roles
create table if not exists public.role_requirements (
  role_id uuid not null references public.job_roles(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  required_level int not null check (required_level between 1 and 5),
  primary key (role_id, competency_id)
);
```

### 4.3 Users profile and roles
```sql
-- Each profile links to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  org_unit_id uuid references public.org_units(id) on delete set null,
  role text not null default 'employee' check (role in ('hr_admin','manager','employee')),
  created_at timestamptz not null default now()
);
```

### 4.4 Evaluation cycles and submissions
```sql
-- Evaluation cycles (e.g., 2025 Q1)
create table if not exists public.evaluation_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','active','closed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Individual evaluations per subject and evaluator
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.evaluation_cycles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  evaluator_id uuid not null references public.profiles(id) on delete cascade,
  relationship text not null check (relationship in ('self','manager','direct_report','peer')),
  created_at timestamptz not null default now(),
  unique (cycle_id, subject_id, evaluator_id, relationship)
);

-- Numeric ratings for competencies within an evaluation
create table if not exists public.evaluation_ratings (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  unique (evaluation_id, competency_id)
);

-- Qualitative answers (open-ended questions)
create table if not exists public.evaluation_feedback (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  question text not null,
  answer text
);
```

## 5) Enable Row Level Security (RLS)
```sql
alter table public.org_units enable row level security;
alter table public.job_roles enable row level security;
alter table public.competencies enable row level security;
alter table public.role_requirements enable row level security;
alter table public.profiles enable row level security;
alter table public.evaluation_cycles enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_ratings enable row level security;
alter table public.evaluation_feedback enable row level security;
```

### 5.1 Helper predicate to check HR admin
For policies below we check whether the current user is an HR admin using a subquery on `profiles`.

```sql
-- Read access for all authenticated users to reference data
create policy "read_reference_authenticated" on public.org_units
  for select using (auth.role() = 'authenticated');
create policy "read_reference_authenticated" on public.job_roles
  for select using (auth.role() = 'authenticated');
create policy "read_reference_authenticated" on public.competencies
  for select using (auth.role() = 'authenticated');
create policy "read_reference_authenticated" on public.role_requirements
  for select using (auth.role() = 'authenticated');

-- Profiles: user can read all, update own; HR can manage all
create policy "profiles_read_all" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_hr_manage" on public.profiles
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hr_admin'
  ));

-- Evaluation cycles: HR manage, everyone authenticated can read active/closed
create policy "cycles_read" on public.evaluation_cycles
  for select using (auth.role() = 'authenticated');
create policy "cycles_hr_manage" on public.evaluation_cycles
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hr_admin'
  ));

-- Evaluations: HR manage; evaluator and subject can read their own
create policy "eval_read_self" on public.evaluations
  for select using (
    auth.uid() in (evaluator_id, subject_id)
  );
create policy "eval_hr_manage" on public.evaluations
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hr_admin'
  ));

-- Ratings and feedback: visible to evaluator, subject, HR; inserts by evaluator only
create policy "ratings_rw" on public.evaluation_ratings
  for all using (
    exists (
      select 1 from public.evaluations e
      where e.id = evaluation_id
        and (e.evaluator_id = auth.uid() or e.subject_id = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hr_admin')
  );

create policy "feedback_rw" on public.evaluation_feedback
  for all using (
    exists (
      select 1 from public.evaluations e
      where e.id = evaluation_id
        and (e.evaluator_id = auth.uid() or e.subject_id = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hr_admin')
  );
```

Note: These initial policies are intentionally permissive for read access to speed up development. We will refine them during implementation.

## 6) Storage for report exports
- Go to `Storage → Buckets` and create a bucket named `reports`.
- Set as `Private`.
- Add RLS policies (in Storage policies) to allow only users with `hr_admin` role to read/write.

## 7) Seed sample data (optional)
Use `SQL Editor` to create a few org units, roles, competencies, and a test user profile for development.

## 8) Next steps
- Keep your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` private.
- We’ll wire up the frontend Supabase client in `src/lib/supabaseClient.ts` and implement auth flows next.
