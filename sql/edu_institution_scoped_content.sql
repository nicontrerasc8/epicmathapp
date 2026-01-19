-- Add institution scoping for academic content tables.
-- Run manually in Supabase SQL editor.

alter table public.edu_academic_blocks
  add column if not exists institution_id uuid;

alter table public.edu_academic_subblocks
  add column if not exists institution_id uuid;

alter table public.edu_areas
  add column if not exists institution_id uuid;

alter table public.edu_temas
  add column if not exists institution_id uuid;

alter table public.edu_academic_blocks
  add constraint if not exists edu_academic_blocks_institution_id_fkey
  foreign key (institution_id) references public.edu_institutions (id);

alter table public.edu_academic_subblocks
  add constraint if not exists edu_academic_subblocks_institution_id_fkey
  foreign key (institution_id) references public.edu_institutions (id);

alter table public.edu_areas
  add constraint if not exists edu_areas_institution_id_fkey
  foreign key (institution_id) references public.edu_institutions (id);

alter table public.edu_temas
  add constraint if not exists edu_temas_institution_id_fkey
  foreign key (institution_id) references public.edu_institutions (id);

create index if not exists idx_edu_academic_blocks_institution_id
  on public.edu_academic_blocks (institution_id);

create index if not exists idx_edu_academic_subblocks_institution_id
  on public.edu_academic_subblocks (institution_id);

create index if not exists idx_edu_areas_institution_id
  on public.edu_areas (institution_id);

create index if not exists idx_edu_temas_institution_id
  on public.edu_temas (institution_id);

