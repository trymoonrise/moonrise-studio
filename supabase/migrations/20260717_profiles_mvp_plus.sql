-- MVP+ subscriber access ($5/mo)
alter table public.profiles
  add column if not exists mvp_plus boolean not null default false;

comment on column public.profiles.mvp_plus is
  'MVP+ subscriber access ($5/mo): download HTML, view code, lead scraper, name color, profile hat';
