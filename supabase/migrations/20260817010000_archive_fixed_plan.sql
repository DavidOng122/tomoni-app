-- Soft-delete one of the caller's fixed plans while preserving accepted meetups.
-- Pending invitations are cancelled through their existing terminal state and
-- their pending conversations are closed in the same transaction.
create or replace function public.archive_fixed_plan(
  p_fixed_plan_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_rows integer;
  v_cancelled_invitation_ids uuid[] := '{}';
begin
  if v_user_id is null then
    raise exception 'Unauthenticated';
  end if;

  update public.fixed_plans
  set
    plan_status = 'deleted',
    updated_at = now()
  where fixed_plan_id = p_fixed_plan_id
    and user_id = v_user_id
    and plan_status <> 'deleted';

  get diagnostics v_plan_rows = row_count;
  if v_plan_rows = 0 then
    raise exception 'Fixed plan not found or already deleted';
  end if;

  with cancelled_invitations as (
    update public.invitations
    set
      invitation_status = 'cancelled',
      responded_at = now()
    where fixed_plan_id = p_fixed_plan_id
      and sender_user_id = v_user_id
      and invitation_status = 'pending'
    returning invitation_id
  )
  select coalesce(array_agg(invitation_id), '{}')
  into v_cancelled_invitation_ids
  from cancelled_invitations;

  update public.conversations
  set
    conversation_status = 'closed',
    closed_at = now(),
    updated_at = now()
  where related_invitation_id = any(v_cancelled_invitation_ids)
    and conversation_status = 'active';

  return jsonb_build_object(
    'fixed_plan_id', p_fixed_plan_id,
    'cancelled_invitation_count', cardinality(v_cancelled_invitation_ids)
  );
end;
$$;

revoke execute on function public.archive_fixed_plan(uuid) from public;
revoke execute on function public.archive_fixed_plan(uuid) from anon;
grant execute on function public.archive_fixed_plan(uuid) to authenticated;
