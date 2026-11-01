create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (position('@' in email) > 1),
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  app_name text not null check (length(trim(app_name)) between 1 and 120),
  vendor text not null check (length(trim(vendor)) between 1 and 120),
  category text not null check (length(trim(category)) between 1 and 80),
  monthly_cost numeric(14, 2) not null check (monthly_cost >= 0),
  billing_frequency text not null default 'monthly' check (billing_frequency in ('monthly', 'quarterly', 'annually')),
  total_seats integer not null check (total_seats > 0),
  assigned_seats integer not null default 0 check (assigned_seats >= 0 and assigned_seats <= total_seats),
  renewal_date date not null,
  department text not null default '',
  owner text not null default '',
  status text not null default 'Active' check (status in ('Active', 'Trial', 'Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, app_name),
  unique (organization_id, id)
);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid not null,
  employee_email text not null default '',
  employee_name text not null default '',
  department text not null default '',
  license_type text not null check (length(trim(license_type)) between 1 and 80),
  assigned boolean not null default true,
  last_active date,
  monthly_cost numeric(14, 2) check (monthly_cost is null or monthly_cost >= 0),
  excluded_from_optimization boolean not null default false,
  under_review boolean not null default false,
  reclaimed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, subscription_id)
    references public.subscriptions (organization_id, id) on delete cascade,
  unique (organization_id, subscription_id, employee_email)
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  subscription_id uuid,
  type text not null check (length(trim(type)) between 1 and 80),
  title text not null check (length(trim(title)) between 1 and 200),
  explanation text not null default '',
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  suggested_action text not null default '',
  estimated_savings numeric(14, 2) not null default 0 check (estimated_savings >= 0),
  priority text not null check (priority in ('Critical', 'High', 'Medium', 'Low')),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Dismissed', 'Completed')),
  verified_monthly_savings numeric(14, 2) check (verified_monthly_savings is null or verified_monthly_savings >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, subscription_id)
    references public.subscriptions (organization_id, id) on delete set null (subscription_id),
  unique (organization_id, id),
  check (status <> 'Completed' or verified_monthly_savings is not null)
);

create table if not exists public.optimization_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recommendation_id uuid not null,
  action text not null check (action in ('approved', 'dismissed', 'completed')),
  approved_by uuid not null references public.users (id),
  completed_at timestamptz,
  verified_monthly_savings numeric(14, 2) check (verified_monthly_savings is null or verified_monthly_savings >= 0),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (organization_id, recommendation_id)
    references public.recommendations (organization_id, id) on delete cascade,
  check (
    (action = 'completed' and completed_at is not null and verified_monthly_savings is not null)
    or (action <> 'completed' and completed_at is null and verified_monthly_savings is null)
  )
);

create index if not exists subscriptions_organization_renewal_idx on public.subscriptions (organization_id, renewal_date);
create index if not exists subscriptions_organization_category_idx on public.subscriptions (organization_id, category);
create index if not exists licenses_organization_subscription_idx on public.licenses (organization_id, subscription_id);
create index if not exists licenses_organization_activity_idx on public.licenses (organization_id, assigned, last_active);
create index if not exists recommendations_organization_status_idx on public.recommendations (organization_id, status, priority);
create index if not exists optimization_history_organization_date_idx on public.optimization_history (organization_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

drop trigger if exists recommendations_touch_updated_at on public.recommendations;
create trigger recommendations_touch_updated_at
  before update on public.recommendations
  for each row execute function public.touch_updated_at();

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from public.users
  where id = (select auth.uid())
  limit 1
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.users
  where id = (select auth.uid())
  limit 1
$$;

revoke all on function public.current_organization_id() from public, anon;
revoke all on function public.current_user_role() from public, anon;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

revoke all on public.organizations, public.users, public.subscriptions, public.licenses, public.recommendations, public.optimization_history from anon;
grant select on public.organizations, public.users, public.subscriptions, public.licenses, public.recommendations, public.optimization_history to authenticated;
grant insert, update, delete on public.users, public.subscriptions, public.licenses, public.recommendations to authenticated;
grant insert on public.optimization_history to authenticated;

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.licenses enable row level security;
alter table public.recommendations enable row level security;
alter table public.optimization_history enable row level security;

create policy "organization members can read their organization"
  on public.organizations for select to authenticated
  using (id = (select public.current_organization_id()));

create policy "organization members can read organization users"
  on public.users for select to authenticated
  using (organization_id = (select public.current_organization_id()));

create policy "organization admins can manage organization users"
  on public.users for all to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  )
  with check (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );

create policy "organization members can read subscriptions"
  on public.subscriptions for select to authenticated
  using (organization_id = (select public.current_organization_id()));
create policy "organization admins can insert subscriptions"
  on public.subscriptions for insert to authenticated
  with check (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );
create policy "organization admins can update subscriptions"
  on public.subscriptions for update to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  )
  with check (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );
create policy "organization admins can delete subscriptions"
  on public.subscriptions for delete to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );

create policy "organization members can read licenses"
  on public.licenses for select to authenticated
  using (organization_id = (select public.current_organization_id()));
create policy "organization admins can insert licenses"
  on public.licenses for insert to authenticated
  with check (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );
create policy "organization admins can update licenses"
  on public.licenses for update to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  )
  with check (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );
create policy "organization admins can delete licenses"
  on public.licenses for delete to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and exists (select 1 from public.users as actor where actor.id = (select auth.uid()) and actor.role = 'admin')
  );

create policy "organization members can read recommendations"
  on public.recommendations for select to authenticated
  using (organization_id = (select public.current_organization_id()));
create policy "organization admins can create recommendations"
  on public.recommendations for insert to authenticated
  with check (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );
create policy "organization admins can update recommendations"
  on public.recommendations for update to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  )
  with check (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );

create policy "organization members can read optimization history"
  on public.optimization_history for select to authenticated
  using (organization_id = (select public.current_organization_id()));
create policy "organization admins can record optimization history"
  on public.optimization_history for insert to authenticated
  with check (
    organization_id = (select public.current_organization_id())
    and approved_by = (select auth.uid())
    and (select public.current_user_role()) = 'admin'
  );
