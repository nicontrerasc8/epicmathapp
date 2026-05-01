insert into public.edu_exams (
  id,
  title,
  description,
  exam_type,
  component_key,
  block,
  block_order,
  duration_minutes,
  active
)
values (
  'cristo-examen-final-01',
  'Examen Final 1',
  'Examen final de geometria analitica, Voronoi y estadistica.',
  'Examen Final',
  'cristo/examenes/cuarto/primer-bimestre/examen-final-01',
  'Primer Bimestre',
  99,
  60,
  true
)
on conflict (component_key)
do update set
  id = excluded.id,
  title = excluded.title,
  description = excluded.description,
  exam_type = excluded.exam_type,
  component_key = excluded.component_key,
  block = excluded.block,
  block_order = excluded.block_order,
  duration_minutes = excluded.duration_minutes,
  active = excluded.active;
