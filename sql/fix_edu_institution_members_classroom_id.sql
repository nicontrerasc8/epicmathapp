-- Fix trigger errors that reference NEW.classroom_id on edu_institution_members.
-- Safe to run multiple times.

ALTER TABLE public.edu_institution_members
  ADD COLUMN IF NOT EXISTS classroom_id uuid;
