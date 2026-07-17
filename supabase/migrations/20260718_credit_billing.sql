-- Credit-based billing: accounts, ledger, atomic RPCs (service_role only for mutations)

create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  subscription_credits integer not null default 0 check (subscription_credits >= 0),
  topup_credits integer not null default 0 check (topup_credits >= 0),
  plan_id text check (plan_id in ('starter', 'pro', 'business')),
  plan_status text not null default 'none'
    check (plan_status in ('none', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credit_accounts_plan_status_idx
  on public.credit_accounts (plan_status)
  where plan_status = 'active';

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'subscription_grant', 'topup_grant', 'deduct', 'refund', 'subscription_reset'
  )),
  amount integer not null check (amount > 0),
  subscription_delta integer not null default 0,
  topup_delta integer not null default 0,
  balance_subscription integer not null,
  balance_topup integer not null,
  reason text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions (user_id, created_at desc);

-- Ensure account exists when profile is created
create or replace function public.ensure_credit_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.ensure_credit_account(uuid) from public, anon, authenticated;
grant execute on function public.ensure_credit_account(uuid) to service_role;

-- Backfill accounts for existing users
insert into public.credit_accounts (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Migrate legacy MVP+ subscribers to starter plan with zero credits until renewal
update public.credit_accounts ca
set
  plan_id = coalesce(ca.plan_id, 'starter'),
  plan_status = 'active'
from public.profiles p
where p.id = ca.user_id
  and p.mvp_plus = true
  and ca.plan_status = 'none';

drop trigger if exists credit_accounts_updated_at on public.credit_accounts;
create trigger credit_accounts_updated_at
  before update on public.credit_accounts
  for each row execute function public.set_updated_at();

alter table public.credit_accounts enable row level security;
alter table public.credit_transactions enable row level security;

drop policy if exists credit_accounts_select_own on public.credit_accounts;
create policy credit_accounts_select_own on public.credit_accounts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists credit_transactions_select_own on public.credit_transactions;
create policy credit_transactions_select_own on public.credit_transactions
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.credit_accounts from anon;
revoke all on table public.credit_transactions from anon;
grant select on table public.credit_accounts to authenticated;
grant select on table public.credit_transactions to authenticated;
grant all on table public.credit_accounts to service_role;
grant all on table public.credit_transactions to service_role;

-- Grant subscription credits (checkout or renewal). Resets subscription bucket.
create or replace function public.credits_grant_subscription(
  p_user_id uuid,
  p_credits integer,
  p_plan_id text,
  p_idempotency_key text,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.credit_accounts%rowtype;
  v_existing uuid;
begin
  if p_credits < 0 then
    raise exception 'credits must be non-negative';
  end if;

  select id into v_existing
  from public.credit_transactions
  where idempotency_key = p_idempotency_key;

  if v_existing is not null then
    select * into v_row from public.credit_accounts where user_id = p_user_id;
    return jsonb_build_object(
      'duplicate', true,
      'subscriptionCredits', v_row.subscription_credits,
      'topupCredits', v_row.topup_credits,
      'totalCredits', v_row.subscription_credits + v_row.topup_credits,
      'planId', v_row.plan_id,
      'planStatus', v_row.plan_status
    );
  end if;

  perform public.ensure_credit_account(p_user_id);

  update public.credit_accounts
  set
    subscription_credits = p_credits,
    plan_id = p_plan_id,
    plan_status = 'active',
    stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
    stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id),
    period_start = coalesce(p_period_start, period_start),
    period_end = coalesce(p_period_end, period_end)
  where user_id = p_user_id
  returning * into v_row;

  insert into public.credit_transactions (
    user_id, kind, amount, subscription_delta, topup_delta,
    balance_subscription, balance_topup, reason, idempotency_key, metadata
  ) values (
    p_user_id, 'subscription_grant', p_credits, p_credits, 0,
    v_row.subscription_credits, v_row.topup_credits,
    'subscription_grant', p_idempotency_key,
    jsonb_build_object('plan_id', p_plan_id)
  );

  update public.profiles
  set mvp_plus = true
  where id = p_user_id;

  return jsonb_build_object(
    'duplicate', false,
    'subscriptionCredits', v_row.subscription_credits,
    'topupCredits', v_row.topup_credits,
    'totalCredits', v_row.subscription_credits + v_row.topup_credits,
    'planId', v_row.plan_id,
    'planStatus', v_row.plan_status
  );
end;
$$;

revoke all on function public.credits_grant_subscription(uuid, integer, text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.credits_grant_subscription(uuid, integer, text, text, text, text, timestamptz, timestamptz) to service_role;

-- Grant top-up credits (never expire)
create or replace function public.credits_grant_topup(
  p_user_id uuid,
  p_credits integer,
  p_idempotency_key text,
  p_stripe_customer_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.credit_accounts%rowtype;
  v_existing uuid;
begin
  if p_credits <= 0 then
    raise exception 'credits must be positive';
  end if;

  select id into v_existing
  from public.credit_transactions
  where idempotency_key = p_idempotency_key;

  if v_existing is not null then
    select * into v_row from public.credit_accounts where user_id = p_user_id;
    return jsonb_build_object(
      'duplicate', true,
      'subscriptionCredits', v_row.subscription_credits,
      'topupCredits', v_row.topup_credits,
      'totalCredits', v_row.subscription_credits + v_row.topup_credits
    );
  end if;

  perform public.ensure_credit_account(p_user_id);

  update public.credit_accounts
  set
    topup_credits = topup_credits + p_credits,
    stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id)
  where user_id = p_user_id
  returning * into v_row;

  insert into public.credit_transactions (
    user_id, kind, amount, subscription_delta, topup_delta,
    balance_subscription, balance_topup, reason, idempotency_key
  ) values (
    p_user_id, 'topup_grant', p_credits, 0, p_credits,
    v_row.subscription_credits, v_row.topup_credits,
    'topup_grant', p_idempotency_key
  );

  return jsonb_build_object(
    'duplicate', false,
    'subscriptionCredits', v_row.subscription_credits,
    'topupCredits', v_row.topup_credits,
    'totalCredits', v_row.subscription_credits + v_row.topup_credits
  );
end;
$$;

revoke all on function public.credits_grant_topup(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.credits_grant_topup(uuid, integer, text, text) to service_role;

-- Deduct credits: subscription bucket first, then top-up
create or replace function public.credits_deduct(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_reason text default 'usage'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.credit_accounts%rowtype;
  v_existing uuid;
  v_from_sub integer;
  v_from_top integer;
  v_total integer;
begin
  if p_amount <= 0 then
    raise exception 'deduct amount must be positive';
  end if;

  select id into v_existing
  from public.credit_transactions
  where idempotency_key = p_idempotency_key;

  if v_existing is not null then
    select * into v_row from public.credit_accounts where user_id = p_user_id;
    return jsonb_build_object(
      'duplicate', true,
      'subscriptionCredits', v_row.subscription_credits,
      'topupCredits', v_row.topup_credits,
      'totalCredits', v_row.subscription_credits + v_row.topup_credits
    );
  end if;

  perform public.ensure_credit_account(p_user_id);

  select * into v_row
  from public.credit_accounts
  where user_id = p_user_id
  for update;

  v_total := v_row.subscription_credits + v_row.topup_credits;
  if v_total < p_amount then
    raise exception 'insufficient_credits'
      using errcode = 'P0001',
            detail = format('need %s have %s', p_amount, v_total);
  end if;

  v_from_sub := least(v_row.subscription_credits, p_amount);
  v_from_top := p_amount - v_from_sub;

  update public.credit_accounts
  set
    subscription_credits = subscription_credits - v_from_sub,
    topup_credits = topup_credits - v_from_top
  where user_id = p_user_id
  returning * into v_row;

  insert into public.credit_transactions (
    user_id, kind, amount, subscription_delta, topup_delta,
    balance_subscription, balance_topup, reason, idempotency_key
  ) values (
    p_user_id, 'deduct', p_amount, -v_from_sub, -v_from_top,
    v_row.subscription_credits, v_row.topup_credits,
    p_reason, p_idempotency_key
  );

  return jsonb_build_object(
    'duplicate', false,
    'subscriptionCredits', v_row.subscription_credits,
    'topupCredits', v_row.topup_credits,
    'totalCredits', v_row.subscription_credits + v_row.topup_credits,
    'deductedFromSubscription', v_from_sub,
    'deductedFromTopup', v_from_top
  );
end;
$$;

revoke all on function public.credits_deduct(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.credits_deduct(uuid, integer, text, text) to service_role;

-- Refund credits back to top-up bucket
create or replace function public.credits_refund(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_reason text default 'refund'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.credit_accounts%rowtype;
  v_existing uuid;
begin
  if p_amount <= 0 then
    raise exception 'refund amount must be positive';
  end if;

  select id into v_existing
  from public.credit_transactions
  where idempotency_key = p_idempotency_key;

  if v_existing is not null then
    select * into v_row from public.credit_accounts where user_id = p_user_id;
    return jsonb_build_object(
      'duplicate', true,
      'subscriptionCredits', v_row.subscription_credits,
      'topupCredits', v_row.topup_credits,
      'totalCredits', v_row.subscription_credits + v_row.topup_credits
    );
  end if;

  perform public.ensure_credit_account(p_user_id);

  update public.credit_accounts
  set topup_credits = topup_credits + p_amount
  where user_id = p_user_id
  returning * into v_row;

  insert into public.credit_transactions (
    user_id, kind, amount, subscription_delta, topup_delta,
    balance_subscription, balance_topup, reason, idempotency_key
  ) values (
    p_user_id, 'refund', p_amount, 0, p_amount,
    v_row.subscription_credits, v_row.topup_credits,
    p_reason, p_idempotency_key
  );

  return jsonb_build_object(
    'duplicate', false,
    'subscriptionCredits', v_row.subscription_credits,
    'topupCredits', v_row.topup_credits,
    'totalCredits', v_row.subscription_credits + v_row.topup_credits
  );
end;
$$;

revoke all on function public.credits_refund(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.credits_refund(uuid, integer, text, text) to service_role;

-- Deactivate subscription plan (keep top-up credits)
create or replace function public.credits_deactivate_plan(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.credit_accounts
  set
    plan_status = 'canceled',
    subscription_credits = 0,
    stripe_subscription_id = null
  where user_id = p_user_id;

  update public.profiles
  set mvp_plus = false
  where id = p_user_id;
end;
$$;

revoke all on function public.credits_deactivate_plan(uuid) from public, anon, authenticated;
grant execute on function public.credits_deactivate_plan(uuid) to service_role;
