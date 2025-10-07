-- Enable required extensions
create extension if not exists "pgcrypto";

-- Organizational hierarchy tables
create table if not exists public.org_units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  parent_id uuid references public.org_units(id) on delete set null
);

create table if not exists public.job_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.competencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table if not exists public.role_requirements (
  role_id uuid not null references public.job_roles(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  required_level int not null check (required_level between 1 and 5),
  primary key (role_id, competency_id)
);

-- Profiles linked to Supabase auth
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  org_unit_id uuid references public.org_units(id) on delete set null,
  role text not null default 'employee' check (role in ('hr_admin','manager','employee')),
  created_at timestamptz not null default now()
);

-- Evaluation cycles and related data
create table if not exists public.evaluation_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','active','closed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.evaluation_cycles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  evaluator_id uuid not null references public.profiles(id) on delete cascade,
  relationship text not null check (relationship in ('self','manager','direct_report','peer')),
  created_at timestamptz not null default now(),
  unique (cycle_id, subject_id, evaluator_id, relationship)
);

create table if not exists public.evaluation_ratings (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  unique (evaluation_id, competency_id)
);

create table if not exists public.evaluation_feedback (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  question text not null,
  answer text
);

-- Auto-create profile trigger for new auth users
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

-- Assessment templates, questions, invitations, and responses
create table if not exists public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.assessment_question_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  value int not null,
  label text not null,
  description text,
  created_at timestamptz not null default now(),
  unique(question_id, value)
);

create table if not exists public.assessment_scale_labels (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  scale_value int not null,
  label text,
  description text,
  unique(question_id, scale_value)
);

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

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.assessment_responses(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  answer jsonb not null,
  score numeric,
  created_at timestamptz not null default now(),
  unique(response_id, question_id)
);

-- Enable Row Level Security
alter table public.org_units enable row level security;
alter table public.job_roles enable row level security;
alter table public.competencies enable row level security;
alter table public.role_requirements enable row level security;
alter table public.profiles enable row level security;
alter table public.evaluation_cycles enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_ratings enable row level security;
alter table public.evaluation_feedback enable row level security;
alter table public.assessment_templates enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_question_choices enable row level security;
alter table public.assessment_scale_labels enable row level security;
alter table public.assessment_invitations enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.assessment_answers enable row level security;

-- Reference data readable by authenticated users
drop policy if exists "org_units_read_authenticated" on public.org_units;
create policy "org_units_read_authenticated" on public.org_units
  for select using (auth.role() = 'authenticated');

drop policy if exists "job_roles_read_authenticated" on public.job_roles;
create policy "job_roles_read_authenticated" on public.job_roles
  for select using (auth.role() = 'authenticated');

drop policy if exists "competencies_read_authenticated" on public.competencies;
create policy "competencies_read_authenticated" on public.competencies
  for select using (auth.role() = 'authenticated');

drop policy if exists "role_requirements_read_authenticated" on public.role_requirements;
create policy "role_requirements_read_authenticated" on public.role_requirements
  for select using (auth.role() = 'authenticated');

-- Helper to check HR admin role without triggering profiles RLS recursively
create or replace function public.is_hr_admin(user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  select p.role into user_role from public.profiles p where p.id = user_id;
  return user_role = 'hr_admin';
end;
$$;

grant execute on function public.is_hr_admin(uuid) to authenticated;

-- Profiles policies
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_hr_manage" on public.profiles;
create policy "profiles_hr_manage" on public.profiles
  for all using (public.is_hr_admin(auth.uid()));

-- Evaluation cycle policies
drop policy if exists "cycles_read" on public.evaluation_cycles;
create policy "cycles_read" on public.evaluation_cycles
  for select using (auth.role() = 'authenticated');

drop policy if exists "cycles_hr_manage" on public.evaluation_cycles;
create policy "cycles_hr_manage" on public.evaluation_cycles
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hr_admin'
  ));

-- Evaluations policies
drop policy if exists "evaluations_read_self" on public.evaluations;
create policy "evaluations_read_self" on public.evaluations
  for select using (auth.uid() in (evaluator_id, subject_id));

drop policy if exists "evaluations_hr_manage" on public.evaluations;
create policy "evaluations_hr_manage" on public.evaluations
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hr_admin'
  ));

-- Ratings and feedback policies
drop policy if exists "ratings_rw" on public.evaluation_ratings;
create policy "ratings_rw" on public.evaluation_ratings
  for all using (
    exists (
      select 1 from public.evaluations e
      where e.id = evaluation_id
        and (e.evaluator_id = auth.uid() or e.subject_id = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hr_admin')
  );

drop policy if exists "feedback_rw" on public.evaluation_feedback;
create policy "feedback_rw" on public.evaluation_feedback
  for all using (
    exists (
      select 1 from public.evaluations e
      where e.id = evaluation_id
        and (e.evaluator_id = auth.uid() or e.subject_id = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'hr_admin')
  );

-- Assessment template policies
drop policy if exists "assessment_templates_owner_manage" on public.assessment_templates;
create policy "assessment_templates_owner_manage" on public.assessment_templates
  for all using (auth.uid() = owner_id);

drop policy if exists "assessment_templates_read" on public.assessment_templates;
create policy "assessment_templates_read" on public.assessment_templates
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('hr_admin','manager')
    )
  );

-- Questions inherit template permissions
drop policy if exists "assessment_questions_owner_manage" on public.assessment_questions;
create policy "assessment_questions_owner_manage" on public.assessment_questions
  for all using (
    exists (
      select 1 from public.assessment_templates t
      where t.id = template_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "assessment_questions_read" on public.assessment_questions;
create policy "assessment_questions_read" on public.assessment_questions
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

-- Choices and scale labels share question policy
drop policy if exists "assessment_question_choices_manage" on public.assessment_question_choices;
create policy "assessment_question_choices_manage" on public.assessment_question_choices
  for all using (
    exists (
      select 1 from public.assessment_questions q
      join public.assessment_templates t on t.id = q.template_id
      where q.id = question_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "assessment_question_choices_read" on public.assessment_question_choices;
create policy "assessment_question_choices_read" on public.assessment_question_choices
  for select using (
    exists (
      select 1 from public.assessment_questions q
      join public.assessment_templates t on t.id = q.template_id
      where q.id = question_id and (
        t.owner_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('hr_admin','manager')
        )
      )
    )
  );

drop policy if exists "assessment_scale_labels_manage" on public.assessment_scale_labels;
create policy "assessment_scale_labels_manage" on public.assessment_scale_labels
  for all using (
    exists (
      select 1 from public.assessment_questions q
      join public.assessment_templates t on t.id = q.template_id
      where q.id = question_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "assessment_scale_labels_read" on public.assessment_scale_labels;
create policy "assessment_scale_labels_read" on public.assessment_scale_labels
  for select using (
    exists (
      select 1 from public.assessment_questions q
      join public.assessment_templates t on t.id = q.template_id
      where q.id = question_id and (
        t.owner_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('hr_admin','manager')
        )
      )
    )
  );

-- Invitations and responses policies
drop policy if exists "assessment_invitations_owner_manage" on public.assessment_invitations;
create policy "assessment_invitations_owner_manage" on public.assessment_invitations
  for all using (
    exists (
      select 1 from public.assessment_templates t
      where t.id = template_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "assessment_invitations_owner_read" on public.assessment_invitations;
create policy "assessment_invitations_owner_read" on public.assessment_invitations
  for select using (
    exists (
      select 1 from public.assessment_templates t
      where t.id = template_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "assessment_responses_owner_read" on public.assessment_responses;
create policy "assessment_responses_owner_read" on public.assessment_responses
  for select using (
    exists (
      select 1 from public.assessment_invitations i
      join public.assessment_templates t on t.id = i.template_id
      where i.id = invitation_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "assessment_answers_owner_read" on public.assessment_answers;
create policy "assessment_answers_owner_read" on public.assessment_answers
  for select using (
    exists (
      select 1 from public.assessment_responses r
      join public.assessment_invitations i on i.id = r.invitation_id
      join public.assessment_templates t on t.id = i.template_id
      where r.id = response_id and t.owner_id = auth.uid()
    )
  );
