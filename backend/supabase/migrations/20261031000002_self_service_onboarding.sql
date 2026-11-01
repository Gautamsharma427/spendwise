create or replace function public.current_user_workspace()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'organization', jsonb_build_object(
      'id', organization.id,
      'name', organization.name,
      'currency', organization.currency
    ),
    'user', jsonb_build_object(
      'id', member.id,
      'name', member.name,
      'email', member.email,
      'role', member.role
    )
  )
  from public.users as member
  join public.organizations as organization on organization.id = member.organization_id
  where member.id = (select auth.uid())
  limit 1
$$;

create or replace function public.create_organization_for_current_user(
  organization_name text,
  user_name text,
  organization_currency text default 'INR'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text := auth.email();
  organization_id uuid;
begin
  if actor_id is null or actor_email is null then
    raise exception 'A verified authenticated user is required.' using errcode = '42501';
  end if;

  if exists (select 1 from public.users where id = actor_id) then
    raise exception 'This user already belongs to a workspace.' using errcode = '23505';
  end if;

  insert into public.organizations (name, currency)
  values (organization_name, organization_currency)
  returning id into organization_id;

  insert into public.users (id, organization_id, name, email, role)
  values (actor_id, organization_id, user_name, actor_email, 'admin');

  return public.current_user_workspace();
end
$$;

revoke all on function public.current_user_workspace() from public, anon;
revoke all on function public.create_organization_for_current_user(text, text, text) from public, anon;
grant execute on function public.current_user_workspace() to authenticated;
grant execute on function public.create_organization_for_current_user(text, text, text) to authenticated;
