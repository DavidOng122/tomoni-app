-- Provide one authoritative snapshot-first display contract for historical Fixed Plan invitations.

create or replace function public.get_fixed_plan_invitation_display(
  p_invitation_id uuid
)
returns table (
  invitation_id uuid,
  invitation_status text,
  sender_fixed_plan_id uuid,
  receiver_fixed_plan_id uuid,
  sender_activity_type text,
  sender_custom_activity_name text,
  sender_days_of_week text[],
  sender_start_time time,
  sender_place_id text,
  sender_place_name text,
  sender_latitude double precision,
  sender_longitude double precision,
  receiver_activity_type text,
  receiver_custom_activity_name text,
  receiver_days_of_week text[],
  receiver_start_time time,
  receiver_place_id text,
  receiver_place_name text,
  receiver_latitude double precision,
  receiver_longitude double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    invitation.invitation_id,
    invitation.invitation_status,
    pair.sender_fixed_plan_id,
    pair.receiver_fixed_plan_id,
    coalesce(pair.sender_plan_snapshot->>'activity_type', sender_plan.activity_type),
    case
      when pair.sender_plan_snapshot ? 'custom_activity_name' then pair.sender_plan_snapshot->>'custom_activity_name'
      else sender_plan.custom_activity_name
    end,
    case
      when pair.sender_plan_snapshot ? 'days_of_week' then array(
        select jsonb_array_elements_text(pair.sender_plan_snapshot->'days_of_week')
      )
      else sender_plan.days_of_week
    end,
    coalesce(nullif(pair.sender_plan_snapshot->>'start_time', '')::time, sender_plan.start_time),
    case
      when pair.sender_plan_snapshot ? 'place_id' then pair.sender_plan_snapshot->>'place_id'
      else sender_plan.place_id
    end,
    coalesce(pair.sender_plan_snapshot->>'place_name', sender_plan.place_name),
    case
      when pair.sender_plan_snapshot ? 'latitude' then nullif(pair.sender_plan_snapshot->>'latitude', '')::double precision
      else sender_plan.latitude
    end,
    case
      when pair.sender_plan_snapshot ? 'longitude' then nullif(pair.sender_plan_snapshot->>'longitude', '')::double precision
      else sender_plan.longitude
    end,
    coalesce(pair.receiver_plan_snapshot->>'activity_type', receiver_plan.activity_type),
    case
      when pair.receiver_plan_snapshot ? 'custom_activity_name' then pair.receiver_plan_snapshot->>'custom_activity_name'
      else receiver_plan.custom_activity_name
    end,
    case
      when pair.receiver_plan_snapshot ? 'days_of_week' then array(
        select jsonb_array_elements_text(pair.receiver_plan_snapshot->'days_of_week')
      )
      else receiver_plan.days_of_week
    end,
    coalesce(nullif(pair.receiver_plan_snapshot->>'start_time', '')::time, receiver_plan.start_time),
    case
      when pair.receiver_plan_snapshot ? 'place_id' then pair.receiver_plan_snapshot->>'place_id'
      else receiver_plan.place_id
    end,
    coalesce(pair.receiver_plan_snapshot->>'place_name', receiver_plan.place_name),
    case
      when pair.receiver_plan_snapshot ? 'latitude' then nullif(pair.receiver_plan_snapshot->>'latitude', '')::double precision
      else receiver_plan.latitude
    end,
    case
      when pair.receiver_plan_snapshot ? 'longitude' then nullif(pair.receiver_plan_snapshot->>'longitude', '')::double precision
      else receiver_plan.longitude
    end
  from public.invitation_plan_pairs pair
  join public.invitations invitation
    on invitation.invitation_id = pair.invitation_id
    and invitation.invitation_type = 'fixed_plan'
  left join public.fixed_plans sender_plan
    on sender_plan.fixed_plan_id = pair.sender_fixed_plan_id
  left join public.fixed_plans receiver_plan
    on receiver_plan.fixed_plan_id = pair.receiver_fixed_plan_id
  where pair.invitation_id = p_invitation_id
    and auth.uid() in (invitation.sender_user_id, invitation.receiver_user_id);
$$;

revoke all on function public.get_fixed_plan_invitation_display(uuid) from public, anon;
grant execute on function public.get_fixed_plan_invitation_display(uuid) to authenticated, service_role;

create or replace function public.get_my_fixed_plan_invitation_displays()
returns table (
  invitation_id uuid,
  invitation_status text,
  sender_fixed_plan_id uuid,
  receiver_fixed_plan_id uuid,
  sender_activity_type text,
  sender_custom_activity_name text,
  sender_days_of_week text[],
  sender_start_time time,
  sender_place_id text,
  sender_place_name text,
  sender_latitude double precision,
  sender_longitude double precision,
  receiver_activity_type text,
  receiver_custom_activity_name text,
  receiver_days_of_week text[],
  receiver_start_time time,
  receiver_place_id text,
  receiver_place_name text,
  receiver_latitude double precision,
  receiver_longitude double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select display.*
  from public.invitations invitation
  cross join lateral public.get_fixed_plan_invitation_display(invitation.invitation_id) display
  where invitation.invitation_type = 'fixed_plan'
    and auth.uid() in (invitation.sender_user_id, invitation.receiver_user_id);
$$;

revoke all on function public.get_my_fixed_plan_invitation_displays() from public, anon;
grant execute on function public.get_my_fixed_plan_invitation_displays() to authenticated, service_role;
