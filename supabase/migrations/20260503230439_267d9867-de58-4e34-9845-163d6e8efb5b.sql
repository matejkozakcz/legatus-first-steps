ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS goal_type text NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS current_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_end date;
