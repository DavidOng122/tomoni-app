create or replace function public.get_same_event_people(
  p_event_id uuid
)
returns table (
  user_id uuid,
  nickname text,
  avatar_url text,
  compatibility_label text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := auth.uid();
  v_caller_participation public.event_participations%rowtype;
  v_event public.events%rowtype;
  v_caller_datetime timestamptz;
begin
  if v_caller_id is null then
    return;
  end if;

  select * into v_event
  from public.events
  where event_id = p_event_id
    and event_status = 'scheduled'
    and (end_at is null or end_at > now());

  if not found then
    return;
  end if;

  select * into v_caller_participation
  from public.event_participations
  where event_id = p_event_id
    and public.event_participations.user_id = v_caller_id
    and participation_status = 'going'
    and participation_date is not null
    and arrival_time is not null;

  if not found then
    return;
  end if;

  v_caller_datetime :=
    (v_caller_participation.participation_date + v_caller_participation.arrival_time)
    at time zone 'Asia/Tokyo';

  return query
  select
    candidate.user_id,
    profile.nickname,
    profile.avatar_url,
    case
      when abs(extract(epoch from (
        v_caller_datetime -
        ((candidate.participation_date + candidate.arrival_time) at time zone 'Asia/Tokyo')
      ))) <= 900 then '同じ時間帯'
      else '近い時間に参加予定'
    end as compatibility_label
  from public.event_participations candidate
  join public.profiles profile on profile.user_id = candidate.user_id
  where candidate.event_id = p_event_id
    and candidate.user_id <> v_caller_id
    and candidate.participation_status = 'going'
    and candidate.participation_date is not null
    and candidate.arrival_time is not null
    and profile.profile_status = 'active'
    and abs(extract(epoch from (
      v_caller_datetime -
      ((candidate.participation_date + candidate.arrival_time) at time zone 'Asia/Tokyo')
    ))) <= 3600
    and not exists (
      select 1
      from public.connections connection
      where connection.connection_status = 'active'
        and (
          (connection.user_a_id = v_caller_id and connection.user_b_id = candidate.user_id)
          or
          (connection.user_a_id = candidate.user_id and connection.user_b_id = v_caller_id)
        )
    )
    and not exists (
      select 1
      from public.invitations invitation
      where invitation.event_id = p_event_id
        and invitation.invitation_type = 'event'
        and (
          (invitation.sender_user_id = v_caller_id and invitation.receiver_user_id = candidate.user_id)
          or
          (invitation.sender_user_id = candidate.user_id and invitation.receiver_user_id = v_caller_id)
        )
    )
  order by
    abs(extract(epoch from (
      v_caller_datetime -
      ((candidate.participation_date + candidate.arrival_time) at time zone 'Asia/Tokyo')
    ))) asc,
    candidate.user_id asc
  limit 5;
end;
$$;

revoke all on function public.get_same_event_people(uuid) from public, anon;
grant execute on function public.get_same_event_people(uuid) to authenticated;
