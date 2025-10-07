drop policy if exists "profiles_hr_manage" on public.profiles;
create policy "profiles_hr_manage" on public.profiles
  for all using (public.is_hr_admin(auth.uid()));
