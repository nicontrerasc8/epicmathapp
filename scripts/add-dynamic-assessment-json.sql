begin;

alter table public.edu_exams
  add column if not exists content_json jsonb,
  add column if not exists settings_json jsonb not null default '{}'::jsonb;

alter table public.edu_exams
  alter column component_key drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'edu_exams_content_json_is_object'
      and conrelid = 'public.edu_exams'::regclass
  ) then
    alter table public.edu_exams
      add constraint edu_exams_content_json_is_object
      check (content_json is null or jsonb_typeof(content_json) = 'object');
  end if;
end $$;

alter table public.edu_tasks
  add column if not exists content_json jsonb,
  add column if not exists settings_json jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'edu_tasks_content_json_is_object'
      and conrelid = 'public.edu_tasks'::regclass
  ) then
    alter table public.edu_tasks
      add constraint edu_tasks_content_json_is_object
      check (content_json is null or jsonb_typeof(content_json) = 'object');
  end if;
end $$;

create index if not exists idx_edu_exams_content_json
  on public.edu_exams using gin (content_json);

create index if not exists idx_edu_tasks_content_json
  on public.edu_tasks using gin (content_json);

commit;
