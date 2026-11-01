create table if not exists public.monitoring_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code_hash text not null unique,
  employee_email text not null,
  device_name text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.monitoring_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  employee_email text not null,
  device_name text not null,
  token_hash text not null unique,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table if not exists public.monitoring_ingestion_batches (
  device_id uuid not null references public.monitoring_devices (id) on delete cascade,
  batch_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (device_id, batch_id)
);

create table if not exists public.app_usage_daily (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  device_id uuid not null,
  employee_email text not null,
  app_id text not null check (length(app_id) between 1 and 120),
  activity_date date not null,
  active_seconds integer not null check (active_seconds between 0 and 86400),
  updated_at timestamptz not null default now(),
  primary key (device_id, app_id, activity_date),
  foreign key (organization_id, device_id)
    references public.monitoring_devices (organization_id, id) on delete cascade
);

create table if not exists public.monitoring_app_mappings (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  app_id text not null check (length(app_id) between 1 and 120),
  subscription_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, app_id),
  foreign key (organization_id, subscription_id)
    references public.subscriptions (organization_id, id) on delete cascade
);

create index if not exists app_usage_daily_org_date_idx on public.app_usage_daily (organization_id, activity_date desc);
create index if not exists monitoring_devices_org_idx on public.monitoring_devices (organization_id, created_at desc);
create index if not exists monitoring_app_mappings_subscription_idx on public.monitoring_app_mappings (organization_id, subscription_id);
create index if not exists monitoring_enrollments_expiry_idx on public.monitoring_enrollments (expires_at);
create index if not exists monitoring_batches_received_idx on public.monitoring_ingestion_batches (received_at);

alter table public.monitoring_enrollments enable row level security;
alter table public.monitoring_devices enable row level security;
alter table public.monitoring_ingestion_batches enable row level security;
alter table public.app_usage_daily enable row level security;
alter table public.monitoring_app_mappings enable row level security;

revoke all on public.monitoring_enrollments, public.monitoring_devices,
  public.monitoring_ingestion_batches, public.app_usage_daily, public.monitoring_app_mappings
  from public, anon, authenticated;

create or replace function public.create_monitoring_enrollment(
  enrollment_code_hash text,
  target_employee_email text,
  target_device_name text,
  enrollment_expires_at timestamptz
)
returns table(enrollment_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (select public.current_user_role()) is distinct from 'admin' then
    raise exception 'Only organization admins can enroll monitoring devices.' using errcode = '42501';
  end if;
  if enrollment_expires_at <= now() or enrollment_expires_at > now() + interval '25 hours' then
    raise exception 'Enrollment codes must expire within 24 hours.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.licenses
    where organization_id = (select public.current_organization_id())
      and lower(employee_email) = lower(target_employee_email)
      and assigned
      and reclaimed_at is null
  ) then
    raise exception 'The employee must have an existing workspace license before device enrollment.' using errcode = '22023';
  end if;

  return query
  insert into public.monitoring_enrollments (
    organization_id, code_hash, employee_email, device_name, expires_at, created_by
  )
  values (
    (select public.current_organization_id()),
    enrollment_code_hash,
    lower(target_employee_email),
    target_device_name,
    enrollment_expires_at,
    auth.uid()
  )
  returning id;
end
$$;

create or replace function public.consume_monitoring_enrollment(
  enrollment_code_hash text,
  device_token_hash text
)
returns table(device_id uuid, employee_email text, device_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  enrollment public.monitoring_enrollments%rowtype;
  created_device_id uuid;
begin
  update public.monitoring_enrollments as pending
  set consumed_at = now()
  where pending.code_hash = enrollment_code_hash
    and pending.consumed_at is null
    and pending.expires_at > now()
  returning pending.* into enrollment;

  if not found then
    raise exception 'Enrollment code is invalid, expired, or already used.' using errcode = '42501';
  end if;

  insert into public.monitoring_devices (
    organization_id, employee_email, device_name, token_hash
  )
  values (
    enrollment.organization_id,
    enrollment.employee_email,
    enrollment.device_name,
    device_token_hash
  )
  returning id into created_device_id;

  return query select created_device_id, enrollment.employee_email, enrollment.device_name;
end
$$;

create or replace function public.ingest_monitoring_activity(
  device_token_hash text,
  request_batch_id uuid,
  usage_records jsonb
)
returns table(accepted boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  device public.monitoring_devices%rowtype;
  inserted_batch uuid;
begin
  select * into device
  from public.monitoring_devices
  where token_hash = device_token_hash and revoked_at is null
  for update;
  if not found then
    raise exception 'Monitoring device is not authorized.' using errcode = '42501';
  end if;

  if jsonb_typeof(usage_records) is distinct from 'array' then
    raise exception 'Usage records must be an array.' using errcode = '22023';
  end if;

  if jsonb_array_length(usage_records) > 250 then
    raise exception 'Usage batches must contain at most 250 app summaries.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(usage_records) as item(app_id text, activity_date date, active_seconds integer)
    where item.app_id is null
      or item.app_id !~ '^[A-Za-z0-9._ -]{1,120}$'
      or item.activity_date is null
      or item.activity_date > current_date
      or item.activity_date < current_date - 30
      or item.active_seconds is null
      or item.active_seconds < 0
      or item.active_seconds > 86400
  ) then
    raise exception 'Usage records contain invalid app identifiers, dates, or durations.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(usage_records)
      as item(app_id text, activity_date date, active_seconds integer)
    group by item.app_id, item.activity_date having count(*) > 1
  ) then
    raise exception 'Each app can appear only once per day in an activity batch.' using errcode = '22023';
  end if;

  insert into public.monitoring_ingestion_batches (device_id, batch_id)
  values (device.id, request_batch_id)
  on conflict do nothing
  returning batch_id into inserted_batch;
  if inserted_batch is null then
    return query select false;
    return;
  end if;

  insert into public.app_usage_daily (
    organization_id, device_id, employee_email, app_id, activity_date, active_seconds
  )
  select
    device.organization_id,
    device.id,
    device.employee_email,
    item.app_id,
    item.activity_date,
    item.active_seconds
  from jsonb_to_recordset(usage_records)
    as item(app_id text, activity_date date, active_seconds integer)
  on conflict (device_id, app_id, activity_date)
  do update set
    active_seconds = least(public.app_usage_daily.active_seconds + excluded.active_seconds, 86400),
    updated_at = now();

  update public.licenses as license
  set last_active = activity.last_active
  from (
    select mapping.subscription_id, usage.employee_email, max(usage.activity_date) as last_active
    from public.app_usage_daily as usage
    join public.monitoring_app_mappings as mapping
      on mapping.organization_id = usage.organization_id
      and mapping.app_id = usage.app_id
    where usage.device_id = device.id
      and usage.organization_id = device.organization_id
      and lower(usage.employee_email) = lower(device.employee_email)
      and usage.activity_date >= current_date - 30
      and usage.active_seconds >= 60
    group by mapping.subscription_id, usage.employee_email
  ) as activity
  where license.organization_id = device.organization_id
    and license.subscription_id = activity.subscription_id
    and lower(license.employee_email) = lower(activity.employee_email)
    and license.assigned
    and license.reclaimed_at is null
    and (license.last_active is null or license.last_active < activity.last_active);

  update public.monitoring_devices set last_seen_at = now() where id = device.id;
  delete from public.app_usage_daily
  where organization_id = device.organization_id and activity_date < current_date - 90;
  delete from public.monitoring_ingestion_batches
  where device_id = device.id and received_at < now() - interval '31 days';
  return query select true;
end
$$;

create or replace function public.get_monitoring_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := (select public.current_organization_id());
begin
  if v_org_id is null or (select public.current_user_role()) is distinct from 'admin' then
    raise exception 'Only organization admins can view monitoring data.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'employeeEmail', employee_email,
        'deviceName', device_name,
        'lastSeenAt', last_seen_at,
        'revokedAt', revoked_at,
        'createdAt', created_at
      ) order by created_at desc)
      from public.monitoring_devices where monitoring_devices.organization_id = v_org_id
    ), '[]'::jsonb),
    'mappings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'appId', mapping.app_id,
        'subscriptionId', mapping.subscription_id,
        'subscriptionAppName', subscription.app_name
      ) order by mapping.app_id)
      from public.monitoring_app_mappings as mapping
      join public.subscriptions as subscription
        on subscription.organization_id = mapping.organization_id
        and subscription.id = mapping.subscription_id
      where mapping.organization_id = v_org_id
    ), '[]'::jsonb),
    'usage', coalesce((
      select jsonb_agg(jsonb_build_object(
        'employeeEmail', activity.employee_email,
        'appId', activity.app_id,
        'subscriptionAppName', activity.subscription_app_name,
        'activeSeconds', activity.active_seconds,
        'activeDays', activity.active_days,
        'lastActivityDate', activity.last_activity_date,
        'subscriptionId', activity.subscription_id
      ) order by activity.active_seconds desc)
      from (
        select daily.employee_email, daily.app_id, sum(daily.active_seconds)::integer as active_seconds,
          count(*)::integer as active_days, max(daily.activity_date) as last_activity_date,
          mapping.subscription_id, subscription.app_name as subscription_app_name
        from (
          select organization_id, employee_email, app_id, activity_date,
            least(sum(active_seconds), 86400)::integer as active_seconds
          from public.app_usage_daily
          where organization_id = v_org_id
            and activity_date >= current_date - 30
          group by organization_id, employee_email, app_id, activity_date
        ) as daily
        left join public.monitoring_app_mappings as mapping
          on mapping.organization_id = daily.organization_id and mapping.app_id = daily.app_id
        left join public.subscriptions as subscription
          on subscription.organization_id = mapping.organization_id
          and subscription.id = mapping.subscription_id
        where daily.organization_id = v_org_id
        group by daily.employee_email, daily.app_id, mapping.subscription_id, subscription.app_name
        order by sum(daily.active_seconds) desc
        limit 500
      ) as activity
    ), '[]'::jsonb)
  );
end
$$;

create or replace function public.upsert_monitoring_app_mapping(
  target_app_id text,
  target_subscription_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (select public.current_user_role()) is distinct from 'admin' then
    raise exception 'Only organization admins can map monitored applications.' using errcode = '42501';
  end if;
  if target_app_id !~ '^[A-Za-z0-9._ -]{1,120}$' then
    raise exception 'The application process identifier is invalid.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.subscriptions
    where id = target_subscription_id
      and organization_id = (select public.current_organization_id())
  ) then
    raise exception 'The subscription does not belong to this workspace.' using errcode = '22023';
  end if;

  insert into public.monitoring_app_mappings (organization_id, app_id, subscription_id)
  values ((select public.current_organization_id()), target_app_id, target_subscription_id)
  on conflict (organization_id, app_id)
  do update set subscription_id = excluded.subscription_id;

  update public.licenses as license
  set last_active = activity.last_active
  from (
    select usage.employee_email, max(usage.activity_date) as last_active
    from public.app_usage_daily as usage
    where usage.organization_id = (select public.current_organization_id())
      and usage.app_id = target_app_id
      and usage.activity_date >= current_date - 30
      and usage.active_seconds >= 60
    group by usage.employee_email
  ) as activity
  where license.organization_id = (select public.current_organization_id())
    and license.subscription_id = target_subscription_id
    and lower(license.employee_email) = lower(activity.employee_email)
    and license.assigned
    and license.reclaimed_at is null
    and (license.last_active is null or license.last_active < activity.last_active);

  return true;
end
$$;

create or replace function public.revoke_monitoring_device(target_device_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (select public.current_user_role()) is distinct from 'admin' then
    raise exception 'Only organization admins can revoke monitoring devices.' using errcode = '42501';
  end if;

  update public.monitoring_devices
  set revoked_at = coalesce(revoked_at, now())
  where id = target_device_id
    and organization_id = (select public.current_organization_id());

  return found;
end
$$;

create or replace function public.cleanup_monitoring_retention()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.app_usage_daily where activity_date < current_date - 90;
  delete from public.monitoring_ingestion_batches where received_at < now() - interval '31 days';
  delete from public.monitoring_enrollments
    where expires_at < now() - interval '1 day'
      and (consumed_at is null or consumed_at < now() - interval '1 day');
end
$$;

revoke all on function public.create_monitoring_enrollment(text, text, text, timestamptz) from public, anon;
revoke all on function public.consume_monitoring_enrollment(text, text) from public, authenticated;
revoke all on function public.ingest_monitoring_activity(text, uuid, jsonb) from public, authenticated;
revoke all on function public.get_monitoring_overview() from public, anon;
revoke all on function public.upsert_monitoring_app_mapping(text, uuid) from public, anon;
revoke all on function public.revoke_monitoring_device(uuid) from public, anon;
revoke all on function public.cleanup_monitoring_retention() from public, authenticated;
grant execute on function public.create_monitoring_enrollment(text, text, text, timestamptz) to authenticated;
grant execute on function public.consume_monitoring_enrollment(text, text) to anon;
grant execute on function public.ingest_monitoring_activity(text, uuid, jsonb) to anon;
grant execute on function public.get_monitoring_overview() to authenticated;
grant execute on function public.upsert_monitoring_app_mapping(text, uuid) to authenticated;
grant execute on function public.revoke_monitoring_device(uuid) to authenticated;
grant execute on function public.cleanup_monitoring_retention() to anon;
