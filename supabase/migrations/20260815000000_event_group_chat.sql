-- 1. Uniqueness Guarantee for Event Group Conversation
-- Ensures that for any given event, there is at most ONE group conversation.
create unique index if not exists idx_conversations_unique_event_group on public.conversations (event_id)
where event_id is not null and related_invitation_id is null and fixed_plan_id is null;


-- 2. Secure RPC for getting or creating the Event Group Chat
create or replace function public.get_or_join_event_group_chat(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_participation_status text;
  v_conversation_id uuid;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate caller has 'going' status for this event
  select participation_status into v_participation_status
  from public.event_participations
  where event_id = p_event_id and user_id = v_user_id;

  if not found or v_participation_status != 'going' then
    raise exception 'User is not an eligible going participant for this event';
  end if;

  -- Get existing or create conversation
  -- We use a loop to safely handle race conditions if two people try to create concurrently
  loop
    -- Try to find existing conversation
    select conversation_id into v_conversation_id
    from public.conversations
    where event_id = p_event_id 
      and related_invitation_id is null 
      and fixed_plan_id is null;

    if found then
      exit;
    end if;

    -- If not found, try to insert
    begin
      insert into public.conversations (event_id, conversation_status)
      values (p_event_id, 'active')
      returning conversation_id into v_conversation_id;
      
      exit; -- Successfully inserted
    exception when unique_violation then
      -- Someone else just created it, loop around and SELECT it
    end;
  end loop;

  -- Ensure caller is a member
  if not exists (
    select 1 from public.conversation_members 
    where conversation_id = v_conversation_id and user_id = v_user_id
  ) then
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, v_user_id);
  else
    -- Update left_at = null in case they rejoined (though cancellation lifecycle isn't fully implemented yet)
    update public.conversation_members
    set left_at = null
    where conversation_id = v_conversation_id and user_id = v_user_id;
  end if;

  return v_conversation_id;
end;
$$;

revoke all on function public.get_or_join_event_group_chat(uuid) from public, anon;
grant execute on function public.get_or_join_event_group_chat(uuid) to authenticated;
