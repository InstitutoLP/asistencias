insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'material-academico',
  'material-academico',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.academic_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (
    category in ('Plan de Evaluación', 'Material de Apoyo', 'Guía de Estudio', 'Otro')
  ),
  school_year text not null check (school_year in ('1', '2', '3', '4', '5', 'todos')),
  subject text not null default '',
  file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  storage_path text not null unique,
  uploaded_by text not null,
  status text not null default 'pending' check (status in ('pending', 'ready')),
  created_at timestamptz not null default now()
);

create index if not exists academic_materials_year_created_idx
  on public.academic_materials (school_year, created_at desc);

alter table public.academic_materials enable row level security;
