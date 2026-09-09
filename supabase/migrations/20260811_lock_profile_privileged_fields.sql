-- Prevent clients from self-granting mvp_plus or forging security-card verification.
-- Only service_role (worker / Stripe RPCs) may change these fields.

create or replace function public.profiles_protect_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.role(), '');
begin
  -- service_role (worker) and postgres may update anything.
  if jwt_role in ('service_role', 'postgres') then
    return new;
  end if;

  -- Preserve privileged columns from any authenticated/anon client update.
  if tg_op = 'UPDATE' then
    new.mvp_plus := old.mvp_plus;
    new.security_card_fingerprint := old.security_card_fingerprint;

    -- Keep payout_profile but strip forgeable securityCard blob from client writes.
    if new.payout_profile is distinct from old.payout_profile then
      if old.payout_profile ? 'securityCard' then
        new.payout_profile :=
          coalesce(new.payout_profile, '{}'::jsonb) || jsonb_build_object(
            'securityCard', old.payout_profile->'securityCard'
          );
      elsif new.payout_profile ? 'securityCard' then
        new.payout_profile := new.payout_profile - 'securityCard';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_columns on public.profiles;
create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row
  execute function public.profiles_protect_privileged_columns();

comment on function public.profiles_protect_privileged_columns() is
  'Blocks client UPDATEs from changing mvp_plus / security_card_fingerprint / forged securityCard JSON.';
