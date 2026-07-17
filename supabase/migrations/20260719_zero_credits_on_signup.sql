-- Every new user starts with 0 credits; plans/top-ups grant credits only after Stripe payment.

-- Create a zero-balance credit account when a profile is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
  display text;
begin
  base_handle := coalesce(
    nullif(
      regexp_replace(
        lower(coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1))),
        '[^a-z0-9_]',
        '',
        'g'
      ),
      ''
    ),
    'user'
  );
  if public.handle_is_reserved(base_handle) then
    base_handle := 'user';
  end if;
  final_handle := left(base_handle, 18) || '_' || left(replace(new.id::text, '-', ''), 6);
  display := coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1));
  if public.handle_is_reserved(display) then
    display := split_part(new.email, '@', 1);
    if public.handle_is_reserved(display) then
      display := 'User';
    end if;
  end if;
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    final_handle,
    display
  )
  on conflict (id) do nothing;

  perform public.ensure_credit_account(new.id);

  return new;
end;
$$;

-- Remove auto-activated plans that were never paid through Stripe.
update public.credit_accounts
set
  plan_id = null,
  plan_status = 'none'
where plan_status = 'active'
  and coalesce(stripe_subscription_id, '') = '';
