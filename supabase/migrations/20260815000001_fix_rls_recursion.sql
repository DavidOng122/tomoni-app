-- Fix infinite recursion in conversation_members and conversations policies

-- 1. Create a security definer function to check membership
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = p_conversation_id
    and user_id = auth.uid()
  );
$$;

-- 2. Update the conversations policy
drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member" on public.conversations
  for select to authenticated
  using (public.is_conversation_member(conversation_id));

-- 3. Update the conversation_members policy
drop policy if exists "conversation_members_select_member" on public.conversation_members;
create policy "conversation_members_select_member" on public.conversation_members
  for select to authenticated
  using (public.is_conversation_member(conversation_id));
