-- Donation leaderboard: payment kind + optional public donor message
alter table public.payments
  add column if not exists kind text;

alter table public.payments
  add column if not exists donor_message text;

alter table public.payments
  drop constraint if exists payments_donor_message_len;

alter table public.payments
  add constraint payments_donor_message_len
  check (donor_message is null or char_length(donor_message) <= 120);

create index if not exists payments_kind_status_idx
  on public.payments (kind, status)
  where kind is not null;

-- Backfill MVP+ donation rows created before kind existed
update public.payments
set kind = 'mvp_donation'
where kind is null
  and project_id is null
  and status in ('pending', 'paid');
