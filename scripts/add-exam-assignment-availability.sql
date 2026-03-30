begin;

alter table public.edu_exam_assignments
  add column if not exists available_from timestamp with time zone null,
  add column if not exists available_until timestamp with time zone null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'edu_exam_assignments_availability_check'
  ) then
    alter table public.edu_exam_assignments
      add constraint edu_exam_assignments_availability_check
      check (
        available_until is null
        or available_from is null
        or available_until > available_from
      );
  end if;
end $$;

create index if not exists edu_exam_assignments_availability_idx
  on public.edu_exam_assignments (classroom_id, active, available_from, available_until);

commit;
