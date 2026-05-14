create table if not exists public.edu_tasks (
  id uuid not null default uuid_generate_v4(),
  classroom_id uuid not null,
  institution_id uuid,
  title text not null,
  description text,
  task_type text not null default 'task'
    check (task_type = any (array['task'::text, 'homework'::text, 'quiz'::text])),
  mode text not null default 'exam'
    check (mode = any (array['exam'::text, 'practice'::text])),
  attempts_allowed integer not null default 1,
  duration_minutes integer,
  status text not null default 'draft'
    check (status = any (array['draft'::text, 'published'::text, 'closed'::text, 'archived'::text])),
  available_from timestamp with time zone,
  available_until timestamp with time zone,
  content_json jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  order_index numeric not null default 0,
  created_by uuid,
  created_at timestamp with time zone not null default now(),
  constraint edu_tasks_pkey primary key (id),
  constraint edu_tasks_classroom_id_fkey foreign key (classroom_id) references public.edu_classrooms(id),
  constraint edu_tasks_institution_id_fkey foreign key (institution_id) references public.edu_institutions(id),
  constraint edu_tasks_created_by_fkey foreign key (created_by) references public.edu_profiles(id),
  constraint edu_tasks_content_json_is_object check (
    content_json is null or jsonb_typeof(content_json) = 'object'
  )
);

create table if not exists public.edu_task_questions (
  id uuid not null default uuid_generate_v4(),
  task_id uuid not null,
  exercise_id text not null,
  sort_order integer not null default 0,
  points numeric not null default 1,
  created_at timestamp with time zone not null default now(),
  constraint edu_task_questions_pkey primary key (id),
  constraint edu_task_questions_task_id_fkey foreign key (task_id) references public.edu_tasks(id) on delete cascade,
  constraint edu_task_questions_exercise_id_fkey foreign key (exercise_id) references public.edu_exercises(id) on delete cascade
);

create table if not exists public.edu_student_tasks (
  id uuid not null default uuid_generate_v4(),
  task_id uuid not null,
  student_id uuid not null,
  classroom_id uuid not null,
  attempt_number integer not null default 1,
  answers jsonb,
  score numeric,
  max_score numeric,
  correct_count integer default 0,
  wrong_count integer default 0,
  time_seconds numeric,
  started_at timestamp with time zone default now(),
  submitted_at timestamp with time zone,
  status text not null default 'started'
    check (status = any (array['started'::text, 'submitted'::text, 'graded'::text])),
  created_at timestamp with time zone not null default now(),
  constraint edu_student_tasks_pkey primary key (id),
  constraint edu_student_tasks_task_id_fkey foreign key (task_id) references public.edu_tasks(id) on delete cascade,
  constraint edu_student_tasks_student_id_fkey foreign key (student_id) references public.edu_profiles(id),
  constraint edu_student_tasks_classroom_id_fkey foreign key (classroom_id) references public.edu_classrooms(id)
);

create table if not exists public.edu_task_practice_sessions (
  id uuid not null default uuid_generate_v4(),
  task_id uuid not null,
  student_id uuid not null,
  classroom_id uuid not null,
  mode text not null default 'reinforcement'
    check (mode = any (array['reinforcement'::text, 'retry_wrong'::text, 'free_practice'::text])),
  total_questions integer default 0,
  correct_count integer default 0,
  wrong_count integer default 0,
  accuracy numeric,
  started_at timestamp with time zone default now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  constraint edu_task_practice_sessions_pkey primary key (id),
  constraint edu_task_practice_sessions_task_id_fkey foreign key (task_id) references public.edu_tasks(id) on delete cascade,
  constraint edu_task_practice_sessions_student_id_fkey foreign key (student_id) references public.edu_profiles(id),
  constraint edu_task_practice_sessions_classroom_id_fkey foreign key (classroom_id) references public.edu_classrooms(id)
);

create table if not exists public.edu_task_practice_answers (
  id uuid not null default uuid_generate_v4(),
  practice_session_id uuid not null,
  exercise_id text not null,
  answer text,
  correct boolean,
  time_seconds numeric,
  created_at timestamp with time zone default now(),
  constraint edu_task_practice_answers_pkey primary key (id),
  constraint edu_task_practice_answers_session_id_fkey foreign key (practice_session_id) references public.edu_task_practice_sessions(id) on delete cascade,
  constraint edu_task_practice_answers_exercise_id_fkey foreign key (exercise_id) references public.edu_exercises(id)
);

create table if not exists public.edu_task_feedback (
  id uuid not null default uuid_generate_v4(),
  task_id uuid not null,
  student_id uuid not null,
  teacher_id uuid not null,
  comment text not null,
  created_at timestamp with time zone default now(),
  constraint edu_task_feedback_pkey primary key (id),
  constraint edu_task_feedback_task_id_fkey foreign key (task_id) references public.edu_tasks(id) on delete cascade,
  constraint edu_task_feedback_student_id_fkey foreign key (student_id) references public.edu_profiles(id),
  constraint edu_task_feedback_teacher_id_fkey foreign key (teacher_id) references public.edu_profiles(id)
);

create index if not exists idx_edu_tasks_classroom on public.edu_tasks(classroom_id);
create index if not exists idx_edu_tasks_status on public.edu_tasks(status);
create index if not exists idx_edu_tasks_content_json on public.edu_tasks using gin (content_json);
create index if not exists idx_edu_task_questions_task on public.edu_task_questions(task_id);
create index if not exists idx_edu_student_tasks_student on public.edu_student_tasks(student_id);
create index if not exists idx_edu_student_tasks_task on public.edu_student_tasks(task_id);
create index if not exists idx_edu_task_practice_student on public.edu_task_practice_sessions(student_id);
create index if not exists idx_edu_task_practice_task on public.edu_task_practice_sessions(task_id);
