begin;

do $$
declare
  new_admin_id uuid := '3ff3ba19-5676-4b3f-9c82-9dbdc58f96e9';
begin
  if not exists (
    select 1
    from auth.users
    where id = new_admin_id
  ) then
    raise exception 'Crea primero este usuario en Supabase Authentication > Users.';
  end if;

  if exists (
    select 1
    from public.teacher_profiles
    where login_username = 'sistemas123'
      and user_id <> new_admin_id
  ) then
    raise exception 'El nombre de usuario sistemas123 ya está asignado a otro perfil.';
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
values (
  '3ff3ba19-5676-4b3f-9c82-9dbdc58f96e9',
  'sistemas123',
  'Administrador General',
  array[1, 2, 3, 4, 5]::smallint[],
  array[]::text[],
  '{}'::jsonb,
  true,
  true,
  true,
  false,
  false,
  true,
  true,
  true,
  true
)
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
