grant update on public.organizations to authenticated;

create policy "organization admins can update their organization"
  on public.organizations for update to authenticated
  using (
    id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  )
  with check (
    id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );

create policy "organization admins can delete recommendations"
  on public.recommendations for delete to authenticated
  using (
    organization_id = (select public.current_organization_id())
    and (select public.current_user_role()) = 'admin'
  );
