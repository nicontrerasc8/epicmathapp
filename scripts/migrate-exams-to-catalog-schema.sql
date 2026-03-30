-- Migration: move exams to the same conceptual model as exercises
-- Goal:
-- 1. Keep a catalog of exam contents/routable components in edu_exams
-- 2. Assign those exams to classrooms through edu_exam_assignments
-- 3. Store student attempts/results in edu_student_exams
--
-- Notes:
-- - This migration is additive and safe to run before refactoring the app.
-- - Existing tables edu_exam_sessions / edu_exam_exercises are left untouched for now.
-- - Once the app is migrated, the legacy tables can be removed in a later cleanup migration.

begin;

create table if not exists public.edu_exams (
  id text primary key,
  title text not null,
  description text,
  exam_type text not null,
  component_key text not null unique,
  institution_id uuid references public.edu_institutions(id),
  block text,
  block_order integer,
  duration_minutes integer,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create index if not exists edu_exams_institution_idx
  on public.edu_exams (institution_id);

create index if not exists edu_exams_type_block_idx
  on public.edu_exams (exam_type, block);

create table if not exists public.edu_exam_assignments (
  id uuid primary key default uuid_generate_v4(),
  exam_id text not null references public.edu_exams(id) on delete cascade,
  classroom_id uuid not null references public.edu_classrooms(id) on delete cascade,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  "order" numeric not null default 0,
  unique (exam_id, classroom_id)
);

create index if not exists edu_exam_assignments_classroom_idx
  on public.edu_exam_assignments (classroom_id, active);

create index if not exists edu_exam_assignments_exam_idx
  on public.edu_exam_assignments (exam_id);

create table if not exists public.edu_student_exams (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.edu_profiles(id) on delete cascade,
  classroom_id uuid not null references public.edu_classrooms(id) on delete cascade,
  exam_id text not null references public.edu_exams(id) on delete cascade,
  assignment_id uuid references public.edu_exam_assignments(id) on delete set null,
  answers jsonb,
  score numeric,
  correct_count integer,
  wrong_count integer,
  time_seconds numeric,
  status text not null default 'submitted'
    check (status = any (array['started'::text, 'submitted'::text, 'graded'::text])),
  created_at timestamp with time zone not null default now()
);

create index if not exists edu_student_exams_student_idx
  on public.edu_student_exams (student_id, created_at desc);

create index if not exists edu_student_exams_exam_idx
  on public.edu_student_exams (exam_id, classroom_id);

create index if not exists edu_student_exams_assignment_idx
  on public.edu_student_exams (assignment_id);

create or replace function public.assign_exam_to_classrooms(
  p_exam_id text,
  p_classroom_ids uuid[]
)
returns void
language plpgsql
as $$
begin
  insert into public.edu_exam_assignments (exam_id, classroom_id, active, "order")
  select p_exam_id, classroom_id, true, 0
  from unnest(p_classroom_ids) as classroom_id
  on conflict (exam_id, classroom_id)
  do update set active = true;
end;
$$;

comment on table public.edu_exams is
  'Catalog of exam contents. Mirrors edu_exercises but for routable exams.';

comment on table public.edu_exam_assignments is
  'Assignments of catalog exams to classrooms. Mirrors edu_exercise_assignments.';

comment on table public.edu_student_exams is
  'Student attempts/results for exams. Mirrors edu_student_exercises at exam level.';

commit;

-- Optional cleanup, only after the app no longer uses the legacy model:
-- drop table if exists public.edu_exam_exercises;
-- drop table if exists public.edu_exam_sessions;
