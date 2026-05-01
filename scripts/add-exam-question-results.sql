alter table public.edu_student_exams
  add column if not exists question_results jsonb;

comment on column public.edu_student_exams.question_results is
  'Per-question exam grading snapshot. Array items include question_id, title, subtitle, selected_key, correct_key, and is_correct.';

create index if not exists edu_student_exams_question_results_gin_idx
  on public.edu_student_exams using gin (question_results);
