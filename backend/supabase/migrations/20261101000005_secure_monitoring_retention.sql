revoke all on function public.cleanup_monitoring_retention() from public, anon, authenticated;
grant execute on function public.cleanup_monitoring_retention() to service_role;
