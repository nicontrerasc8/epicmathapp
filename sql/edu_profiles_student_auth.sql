ALTER TABLE public.edu_profiles
ADD COLUMN username text;

ALTER TABLE public.edu_profiles
ADD COLUMN password_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS edu_profiles_username_unique
ON public.edu_profiles (username)
WHERE global_role = 'student';

ALTER TABLE public.edu_profiles
ADD CONSTRAINT edu_profiles_username_required_student
CHECK (
  (global_role <> 'student') OR (username IS NOT NULL)
);
