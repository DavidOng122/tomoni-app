-- Private chat image storage and image message support.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create or replace function public.is_active_conversation_member(p_conversation_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id::text = p_conversation_id
      and cm.user_id = auth.uid()
      and cm.left_at is null
  );
$$;

revoke all on function public.is_active_conversation_member(text) from public, anon;
grant execute on function public.is_active_conversation_member(text) to authenticated, service_role;

create policy "Conversation members can read chat images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'chat-images'
  and public.is_active_conversation_member((storage.foldername(name))[2])
);

create policy "Conversation members can upload their chat images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_conversation_member((storage.foldername(name))[2])
  and exists (
    select 1
    from public.conversations c
    where c.conversation_id::text = (storage.foldername(name))[2]
      and c.conversation_status = 'active'
  )
);

create policy "Users can delete their own chat images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

alter table public.messages drop constraint if exists messages_type_check;
alter table public.messages add constraint messages_type_check check (
  message_type in ('text', 'system', 'image')
);

alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check check (
  (
    message_type = 'text'
    and content is not null
    and length(trim(content)) > 0
    and char_length(content) <= 500
  )
  or (
    message_type = 'image'
    and content is not null
    and content = trim(content)
    and content ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|jpeg|png|webp|gif)$'
  )
  or message_type = 'system'
);

drop policy if exists messages_insert_member on public.messages;
create policy messages_insert_member on public.messages for insert to authenticated with check (
  sender_user_id = auth.uid()
  and message_type in ('text', 'image')
  and (
    message_type <> 'image'
    or content like auth.uid()::text || '/' || conversation_id::text || '/%'
  )
  and exists (
    select 1
    from public.conversations
    where conversations.conversation_id = messages.conversation_id
      and conversations.conversation_status = 'active'
  )
  and exists (
    select 1
    from public.conversation_members
    where conversation_members.conversation_id = messages.conversation_id
      and conversation_members.user_id = auth.uid()
      and conversation_members.left_at is null
  )
);
