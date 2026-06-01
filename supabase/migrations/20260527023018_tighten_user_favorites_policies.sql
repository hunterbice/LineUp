drop policy if exists "Users can manage own favorites" on public.user_favorites;
create policy "Users can insert own favorites" on public.user_favorites for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users can update own favorites" on public.user_favorites for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users can delete own favorites" on public.user_favorites for delete to authenticated using (user_id = (select auth.uid()));;
