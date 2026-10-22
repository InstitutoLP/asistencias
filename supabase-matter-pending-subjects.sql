alter table public.students
add column if not exists matter_pending_subjects jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
