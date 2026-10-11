begin;
create table public.learning_tracks (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id),
 publisher_name text not null,
 title text not null check(length(trim(title)) between 5 and 160),
 category text not null check(length(trim(category)) between 2 and 100),
 description text not null check(length(trim(description)) between 20 and 4000),
 modules jsonb not null check(jsonb_typeof(modules)='array'),
 resources jsonb not null check(jsonb_typeof(resources)='array'),
 status text not null default 'Published' check(status in ('Published','Archived')),
 created_at timestamptz not null default now(),
 archived_at timestamptz
);
create index learning_tracks_owner on public.learning_tracks(owner_id);
alter table public.learning_tracks enable row level security;
create policy tracks_read on public.learning_tracks for select to authenticated using(status='Published' or owner_id=auth.uid());
revoke all on public.learning_tracks from public,anon,authenticated;
grant select on public.learning_tracks to authenticated;
grant all on public.learning_tracks to service_role;

create function public.publish_learning_track(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; publisher text; m jsonb; t jsonb; r jsonb; module_ids text[]:='{}'; topic_ids text[]; role_name text;
begin
 role_name:=private.current_role();
 if auth.uid() is null or role_name is null or role_name not in ('industry','academician','institution') then raise exception 'Publisher account required'; end if;
 select coalesce(nullif(trim(organization),''),nullif(trim(full_name),'')) into publisher from public.profiles where id=auth.uid();
 if publisher is null then raise exception 'Complete your publisher profile first'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>100000 then raise exception 'Invalid or oversized learning track'; end if;
 if jsonb_typeof(payload->'modules') is distinct from 'array' or jsonb_typeof(payload->'resources') is distinct from 'array' then raise exception 'Provide modules and learning resources'; end if;
 if jsonb_array_length(payload->'modules') not between 1 and 20 or jsonb_array_length(payload->'resources') not between 1 and 20 then raise exception 'Provide 1–20 modules and resources'; end if;
 for m in select value from jsonb_array_elements(payload->'modules') loop
  if jsonb_typeof(m) is distinct from 'object' or jsonb_typeof(m->'id') is distinct from 'string' or jsonb_typeof(m->'title') is distinct from 'string' or jsonb_typeof(m->'description') is distinct from 'string' or jsonb_typeof(m->'level') is distinct from 'string' then raise exception 'Module fields must be text';end if;
  if coalesce(m->>'id','') !~ '^[a-zA-Z0-9_-]{1,64}$' or m->>'id'=any(module_ids) then raise exception 'Unique module identifiers required'; end if;
  module_ids:=array_append(module_ids,m->>'id');
  if coalesce(length(trim(m->>'title')),0) not between 3 and 160 or coalesce(length(trim(m->>'description')),0) not between 10 and 2000 or coalesce(m->>'level','') not in ('very-beginner','beginner','intermediate','advanced') then raise exception 'Provide valid module title, description and level'; end if;
  if jsonb_typeof(m->'subTopics') is distinct from 'array' then raise exception 'Module topics required'; end if;
  if jsonb_array_length(m->'subTopics') not between 1 and 30 then raise exception 'Provide 1–30 topics per module'; end if;
  topic_ids:='{}';
  for t in select value from jsonb_array_elements(m->'subTopics') loop
   if jsonb_typeof(t) is distinct from 'object' or jsonb_typeof(t->'id') is distinct from 'string' or jsonb_typeof(t->'title') is distinct from 'string' or jsonb_typeof(t->'duration') is distinct from 'string' then raise exception 'Topic fields must be text';end if;
   if coalesce(t->>'id','') !~ '^[a-zA-Z0-9_-]{1,64}$' or t->>'id'=any(topic_ids) or coalesce(length(trim(t->>'title')),0) not between 3 and 160 or coalesce(length(trim(t->>'duration')),0) not between 2 and 80 then raise exception 'Provide unique topics with titles and estimated duration'; end if;
   topic_ids:=array_append(topic_ids,t->>'id');
  end loop;
 end loop;
 for r in select value from jsonb_array_elements(payload->'resources') loop
  if jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(r->'name') is distinct from 'string' or jsonb_typeof(r->'description') is distinct from 'string' or jsonb_typeof(r->'url') is distinct from 'string' then raise exception 'Resource fields must be text';end if;
  if coalesce(length(trim(r->>'name')),0) not between 3 and 160 or coalesce(length(trim(r->>'description')),0) not between 10 and 1000 or coalesce(r->>'url','') !~ '^https://[^[:space:]]+$' or length(r->>'url')>2000 then raise exception 'Provide named HTTPS learning resources with descriptions'; end if;
 end loop;
 insert into public.learning_tracks(owner_id,publisher_name,title,category,description,modules,resources)
 values(auth.uid(),publisher,trim(payload->>'title'),trim(payload->>'category'),trim(payload->>'description'),payload->'modules',payload->'resources') returning id into result;
 return result;
end $$;
create function public.archive_learning_track(track uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.learning_tracks set status='Archived',archived_at=now() where id=track and owner_id=auth.uid() and status='Published';
 if not found then raise exception 'Choose your published learning track'; end if;
end $$;
revoke all on function public.publish_learning_track(jsonb),public.archive_learning_track(uuid) from public,anon;
grant execute on function public.publish_learning_track(jsonb),public.archive_learning_track(uuid) to authenticated;
commit;
