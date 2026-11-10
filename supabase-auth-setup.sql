begin;

create table if not exists public.teacher_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_username text,
  display_name text not null,
  allowed_years smallint[] not null default '{}',
  allowed_subjects text[] not null default '{}',
  allowed_subjects_by_year jsonb not null default '{}'::jsonb,
  can_add_students boolean not null default false,
  can_view_personal_data boolean not null default false,
  is_admin boolean not null default false,
  solo_admin boolean not null default false,
  solo_reports boolean not null default false,
  can_view_reports boolean not null default false,
  can_manage_activities boolean not null default false,
  can_manage_report_cards boolean not null default false,
  can_manage_pending_subjects boolean not null default false
);

alter table public.teacher_profiles
  add column if not exists login_username text,
  add column if not exists display_name text,
  add column if not exists allowed_years smallint[] not null default '{}',
  add column if not exists allowed_subjects text[] not null default '{}',
  add column if not exists allowed_subjects_by_year jsonb not null default '{}'::jsonb,
  add column if not exists can_add_students boolean not null default false,
  add column if not exists can_view_personal_data boolean not null default false,
  add column if not exists is_admin boolean not null default false,
  add column if not exists solo_admin boolean not null default false,
  add column if not exists solo_reports boolean not null default false,
  add column if not exists can_view_reports boolean not null default false,
  add column if not exists can_manage_activities boolean not null default false,
  add column if not exists can_manage_report_cards boolean not null default false,
  add column if not exists can_manage_pending_subjects boolean not null default false;

create unique index if not exists teacher_profiles_login_username_uidx
  on public.teacher_profiles (login_username)
  where login_username is not null;

alter table public.teacher_profiles enable row level security;

drop policy if exists "Teachers can read own profile"
  on public.teacher_profiles;

create policy "Teachers can read own profile"
  on public.teacher_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.teacher_profiles from anon, authenticated;
grant select on public.teacher_profiles to authenticated;

create temporary table teacher_seed (
  user_id text not null,
  login_username text not null,
  display_name text not null,
  allowed_years smallint[] not null,
  allowed_subjects text[] not null,
  allowed_subjects_by_year jsonb not null,
  can_add_students boolean not null,
  can_view_personal_data boolean not null,
  is_admin boolean not null,
  solo_admin boolean not null,
  solo_reports boolean not null,
  can_view_reports boolean not null,
  can_manage_activities boolean not null,
  can_manage_report_cards boolean not null,
  can_manage_pending_subjects boolean not null
) on commit drop;

insert into teacher_seed values
  ('bd45f2eb-e560-45ba-a3b0-80bcf223b756', 'Patricia Salinas', 'Prof: Patricia',
    ARRAY[1,2,3,4,5]::smallint[], ARRAY[]::text[], '{}'::jsonb,
    true, true, false, false, false, false, false, false, false),
  ('fd7d1578-abe1-41db-a395-008f5b509be4', 'Abraham Ramirez', 'Prof: Abrahan',
    ARRAY[1,2,3,4,5]::smallint[], ARRAY[]::text[], '{}'::jsonb,
    true, true, false, false, false, false, false, false, false),
  ('cb43a4d3-5807-4959-8cd6-7ba8de1b2adb', 'Sara Romero', 'Administrador de Sistema',
    ARRAY[]::smallint[], ARRAY[]::text[], '{}'::jsonb,
    false, true, true, true, false, false, false, false, false),
  ('750bc135-f272-45b7-88c3-21c4ed9e97f4', 'Nestor Pérez', 'Prof: Néstor',
    ARRAY[1,2,3,4,5]::smallint[], ARRAY[]::text[], '{}'::jsonb,
    true, true, true, false, false, true, false, true, true),
  ('3bbc9a2d-26ec-4278-adbd-36c7cec46316', 'Andy Suárez', 'Prof: Andy',
    ARRAY[1,2,3,4,5]::smallint[], ARRAY[]::text[], '{}'::jsonb,
    true, true, false, false, false, true, true, false, true),
  ('f902a562-e9b6-4361-904c-d395786f628b', 'Miriam Ariza', 'Prof: Miriam',
    ARRAY[1,2,3,4,5]::smallint[],
    ARRAY['orientacion-convivencia']::text[],
    '{"3":["orientacion-convivencia","crp"]}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('01b7485e-bafa-4939-8d54-1d305837c091', 'Tibisay Plaza', 'Prof: Tibisay',
    ARRAY[1,2]::smallint[], ARRAY['matematicas']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('REEMPLAZAR_UID_NANCY', 'Nancy Figueredo', 'Prof: Nancy',
    ARRAY[5]::smallint[],
    ARRAY['biologia','ciencias-tierra']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('1a9f8e4a-29ae-4546-b25d-11705bea5dd3', 'Yudisay Hernández', 'Prof: Yudisay',
    ARRAY[1,2,3,4,5]::smallint[], ARRAY['castellano']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('5f931f49-e734-414d-9a75-5965ad2d2d20', 'Lenis Ávila', 'Prof: Lenis',
    ARRAY[3,4,5]::smallint[], ARRAY['ingles']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('c60dc502-d43d-408a-b507-0401c0b9ad95', 'Johana Pedron', 'Prof: Johana',
    ARRAY[1,2,3,4,5]::smallint[], ARRAY['frances']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('1de596b5-8426-4464-a948-aeb3587b5e8d', 'Lidis Hernández', 'Prof: Lidis',
    ARRAY[1,2]::smallint[], ARRAY['ingles']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('16084d39-1b13-4771-b269-4ba9baf46815', 'Yoxelith Camaripano', 'Prof: Yoxelith',
    ARRAY[1,2,3,4]::smallint[],
    ARRAY['ciencias-naturales','biologia']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('11da0f1a-e432-4a47-a556-41f0b3b49f22', 'Alexis Serrano', 'Prof: Alexis',
    ARRAY[1,2,3,4,5]::smallint[], ARRAY['ghc']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('3513663f-1fd8-454f-a21d-b8bc483b9960', 'Oriana Blanco', 'Prof: Oriana',
    ARRAY[1,2]::smallint[], ARRAY['arte-patrimonio']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('a303f325-0ba9-4f05-ad9e-e371fec36ea2', 'Leidy Gonzalez', 'Prof: Leidy',
    ARRAY[3,4,5]::smallint[], ARRAY['quimica']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false),
  ('f67cad74-2adf-49bf-a823-bc2c33c2878a', 'Ricardo Salcedo', 'Prof: Ricardo',
    ARRAY[1,2,3,4,5]::smallint[],
    ARRAY['educacion-fisica','formacion-soberania']::text[], '{}'::jsonb,
    false, false, false, false, false, false, false, false, false);

do $$
begin
  if exists (
    select 1 from teacher_seed
    where user_id like 'REEMPLAZAR_UID_%'
  ) then
    raise exception 'Reemplaza REEMPLAZAR_UID_NANCY por el UID correcto de Nancy.';
  end if;

  if exists (
    select user_id from teacher_seed group by user_id having count(*) > 1
  ) then
    raise exception 'Hay un UID repetido. Cada profesor debe tener su propia cuenta de Supabase Auth.';
  end if;

  if exists (
    select 1
    from teacher_seed p
    where not exists (
      select 1 from auth.users u where u.id::text = p.user_id
    )
  ) then
    raise exception 'Uno o más UID no existen en Authentication > Users. No se asignaron los perfiles.';
  end if;
end
$$;

insert into public.teacher_profiles (
  user_id,
  login_username,
  display_name,
  allowed_years,
  allowed_subjects,
  allowed_subjects_by_year,
  can_add_students,
  can_view_personal_data,
  is_admin,
  solo_admin,
  solo_reports,
  can_view_reports,
  can_manage_activities,
  can_manage_report_cards,
  can_manage_pending_subjects
)
select
  p.user_id::uuid,
  p.login_username,
  p.display_name,
  p.allowed_years,
  p.allowed_subjects,
  p.allowed_subjects_by_year,
  p.can_add_students,
  p.can_view_personal_data,
  p.is_admin,
  p.solo_admin,
  p.solo_reports,
  p.can_view_reports,
  p.can_manage_activities,
  p.can_manage_report_cards,
  p.can_manage_pending_subjects
from teacher_seed p
on conflict (user_id) do update set
  login_username = excluded.login_username,
  display_name = excluded.display_name,
  allowed_years = excluded.allowed_years,
  allowed_subjects = excluded.allowed_subjects,
  allowed_subjects_by_year = excluded.allowed_subjects_by_year,
  can_add_students = excluded.can_add_students,
  can_view_personal_data = excluded.can_view_personal_data,
  is_admin = excluded.is_admin,
  solo_admin = excluded.solo_admin,
  solo_reports = excluded.solo_reports,
  can_view_reports = excluded.can_view_reports,
  can_manage_activities = excluded.can_manage_activities,
  can_manage_report_cards = excluded.can_manage_report_cards,
  can_manage_pending_subjects = excluded.can_manage_pending_subjects;

commit;
