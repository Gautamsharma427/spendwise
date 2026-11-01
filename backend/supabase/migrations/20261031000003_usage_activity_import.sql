create or replace function public.import_license_activity(activity_records jsonb)
returns table(matched_count integer, updated_count integer)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or (select public.current_user_role()) is distinct from 'admin' then
    raise exception 'Only organization admins can import employee usage activity.' using errcode = '42501';
  end if;

  if jsonb_typeof(activity_records) is distinct from 'array' then
    raise exception 'Usage activity must be an array.' using errcode = '22023';
  end if;

  if jsonb_array_length(activity_records) > 10000 then
    raise exception 'Usage activity must contain at most 10,000 records.' using errcode = '22023';
  end if;

  return query
  with imported as (
    select records.license_id, records.last_active
    from jsonb_to_recordset(activity_records) as records(license_id uuid, last_active date)
  ),
  matched as (
    select license.id, imported.last_active
    from public.licenses as license
    join imported on imported.license_id = license.id
    where license.organization_id = (select public.current_organization_id())
  ),
  updated as (
    update public.licenses as license
    set last_active = matched.last_active
    from matched
    where license.id = matched.id
      and license.organization_id = (select public.current_organization_id())
      and (license.last_active is null or license.last_active < matched.last_active)
    returning license.id
  )
  select
    (select count(*)::integer from matched),
    (select count(*)::integer from updated);
end
$$;

revoke all on function public.import_license_activity(jsonb) from public, anon;
grant execute on function public.import_license_activity(jsonb) to authenticated;
