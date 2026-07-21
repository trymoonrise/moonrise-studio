-- One pending/running generation job per user at a time.
create unique index if not exists generation_jobs_one_active_per_user_idx
  on public.generation_jobs (user_id)
  where status in ('pending', 'running');
