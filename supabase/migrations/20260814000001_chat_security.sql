-- 1. Modify messages_content_check
alter table public.messages drop constraint if exists messages_content_check;

alter table public.messages add constraint messages_content_check check (
  (message_type = 'text' and content is not null and length(trim(content)) > 0 and char_length(content) <= 500) or
  (message_type != 'text')
);

-- 2. Update messages_insert_member RLS policy
drop policy if exists messages_insert_member on public.messages;

create policy messages_insert_member on public.messages for insert to authenticated with check (
  sender_user_id = auth.uid() and 
  message_type = 'text' and
  exists (
    select 1 from public.conversations 
    where conversations.conversation_id = messages.conversation_id 
      and conversations.conversation_status = 'active'
  ) and
  exists (
    select 1 from public.conversation_members 
    where conversation_members.conversation_id = messages.conversation_id 
      and conversation_members.user_id = auth.uid() 
      and conversation_members.left_at is null
  )
);

-- 3. Enable Supabase Realtime for public.messages
alter publication supabase_realtime add table public.messages;
