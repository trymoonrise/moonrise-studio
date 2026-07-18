-- One security card (Stripe fingerprint) per Moonrise account.
alter table public.profiles
  add column if not exists security_card_fingerprint text;

create unique index if not exists profiles_security_card_fingerprint_unique
  on public.profiles (security_card_fingerprint)
  where security_card_fingerprint is not null and security_card_fingerprint <> '';

comment on column public.profiles.security_card_fingerprint is
  'Stripe card.fingerprint from creator security card — at most one profile per fingerprint.';

-- Backfill from existing payout_profile JSON when present.
update public.profiles
set security_card_fingerprint = nullif(trim(payout_profile #>> '{securityCard,fingerprint}'), '')
where security_card_fingerprint is null
  and nullif(trim(payout_profile #>> '{securityCard,fingerprint}'), '') is not null;
