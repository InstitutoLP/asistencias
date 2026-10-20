alter table public.students
add column if not exists pending_subjects jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
