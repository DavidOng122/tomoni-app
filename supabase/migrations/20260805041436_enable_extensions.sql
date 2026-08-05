create schema if not exists extensions;
create extension if not exists postgis schema extensions;

create or replace function extensions.is_array_unique(arr text[])
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select cardinality(arr) = (
    select count(distinct item)
    from unnest(arr) as item
  );
$$;

revoke execute on function extensions.is_array_unique(text[]) from public;
revoke execute on function extensions.is_array_unique(text[]) from anon;
revoke execute on function extensions.is_array_unique(text[]) from authenticated;
