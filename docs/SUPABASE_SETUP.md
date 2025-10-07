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

### 4.6 Assessment templates, invitations, and responses
Run the following SQL to support assessment templates, questions, invitations, and response capture.

```sql
-- Assessment templates authored by HR/admins
create table if not exists public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Template questions (single_choice, multi_choice, scale)
create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.assessment_templates(id) on delete cascade,
  position int not null,
  prompt text not null,
  details text,
  question_type text not null check (question_type in ('single_choice','multi_choice','scale')),
  score_weight numeric not null default 1,
  scale_min int not null default 1,
  scale_max int not null default 5,
  scale_variant text not null default 'number' check (scale_variant in ('number','stars','hearts','custom')),
  created_at timestamptz not null default now()
);

create unique index if not exists assessment_questions_template_position_idx
  on public.assessment_questions(template_id, position);

-- Choice options for single/multi choice questions
create table if not exists public.assessment_question_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  value int not null,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

create unique index if not exists assessment_question_choices_unique
  on public.assessment_question_choices(question_id, value);

-- Optional scale value labels (per point)
create table if not exists public.assessment_scale_labels (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  scale_value int not null,
  label text,
  description text,
  unique(question_id, scale_value)
);

-- Invitations and unique tokens
create table if not exists public.assessment_invitations (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.assessment_templates(id) on delete cascade,
  invitee_email text not null,
  invitee_name text,
  token text not null unique,
  status text not null default 'draft' check (status in ('draft','pending','sent','completed','expired')),
  expires_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Assessment responses
create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.assessment_invitations(id) on delete cascade,
  respondent_profile_id uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_total numeric,
  unique(invitation_id)
);

create index if not exists assessment_responses_invitation_idx
  on public.assessment_responses(invitation_id);

-- Individual answers (JSON payload stores answer data per type)
create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.assessment_responses(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  answer jsonb not null,
  score numeric,
  created_at timestamptz not null default now(),
  unique(response_id, question_id)
);
```

Add RLS policies tailored to your workflow (draft example policies below). Adjust filters to match your RBAC design.

```sql
alter table public.assessment_templates enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_question_choices enable row level security;
alter table public.assessment_scale_labels enable row level security;
alter table public.assessment_invitations enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.assessment_answers enable row level security;

-- Owners (HR/admins) manage their templates
create policy "templates_owner_crud" on public.assessment_templates
  for all using (auth.uid() = owner_id);

-- Templates readable by owner and managers (customize as needed)
create policy "templates_read" on public.assessment_templates
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('hr_admin','manager')
    )
  );

-- Questions inherit template ownership permissions
create policy "questions_owner_crud" on public.assessment_questions
  for all using (
    exists (
      select 1 from public.assessment_templates t
      where t.id = template_id and t.owner_id = auth.uid()
    )
  );

create policy "questions_read" on public.assessment_questions
  for select using (
    exists (
      select 1 from public.assessment_templates t
      where t.id = template_id and (
        t.owner_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('hr_admin','manager')
        )
      )
    )
  );

-- Invitation access: owner or invite token holder (validated via security definer RPC later)
create policy "invitations_owner_manage" on public.assessment_invitations
  for all using (
    exists (
      select 1 from public.assessment_templates t
      where t.id = template_id and t.owner_id = auth.uid()
    )
  );

create policy "responses_owner_read" on public.assessment_responses
  for select using (
    exists (
      select 1 from public.assessment_invitations i
      join public.assessment_templates t on t.id = i.template_id
      where i.id = invitation_id and t.owner_id = auth.uid()
    )
  );
```

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
