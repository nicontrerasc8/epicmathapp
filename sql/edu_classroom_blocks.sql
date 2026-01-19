-- Link classrooms to academic blocks
CREATE TABLE IF NOT EXISTS public.edu_classroom_blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id uuid NOT NULL,
  block_id uuid NOT NULL,
  active boolean DEFAULT true,
  started_at date,
  ended_at date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (classroom_id, block_id),
  CONSTRAINT edu_classroom_blocks_classroom_id_fkey
    FOREIGN KEY (classroom_id) REFERENCES public.edu_classrooms(id),
  CONSTRAINT edu_classroom_blocks_block_id_fkey
    FOREIGN KEY (block_id) REFERENCES public.edu_academic_blocks(id)
);

CREATE INDEX IF NOT EXISTS edu_classroom_blocks_classroom_id_idx
  ON public.edu_classroom_blocks (classroom_id);

CREATE INDEX IF NOT EXISTS edu_classroom_blocks_block_id_idx
  ON public.edu_classroom_blocks (block_id);

CREATE INDEX IF NOT EXISTS edu_classroom_blocks_active_idx
  ON public.edu_classroom_blocks (classroom_id, active);
