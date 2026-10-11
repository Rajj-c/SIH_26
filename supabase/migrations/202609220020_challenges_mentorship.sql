begin;
create table public.initiatives(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id),publisher_name text not null,
 kind text not null check(kind in ('Innovation challenge','Mentorship')),
 title text not null check(length(trim(title)) between 5 and 160),
 description text not null check(length(trim(description)) between 30 and 5000),
 criteria text not null check(length(trim(criteria)) between 30 and 4000),
 audience text not null check(audience in ('student','academician','all')),
 deadline timestamptz not null,capacity integer not null check(capacity between 1 and 1000),
 status text not null default 'Open' check(status in ('Open','Closed')),created_at timestamptz not null default now()
);
create table public.initiative_entries(
 id uuid primary key default gen_random_uuid(),initiative_id uuid not null references public.initiatives(id),learner_id uuid not null references public.profiles(id),learner_name text not null,
 proposal text not null check(length(trim(proposal)) between 30 and 5000),
 evidence_url text not null default '' check(evidence_url='' or (evidence_url ~ '^https://[^[:space:]]+$' and length(evidence_url)<=2000)),
 status text not null check(status in ('Submitted','Requested','Active','Completion requested','Completed','Reviewed','Declined','Withdrawn')),
 score integer check(score between 0 and 100),feedback text,created_at timestamptz not null default now(),completed_at timestamptz,
 unique(initiative_id,learner_id)
);
create table public.initiative_journal(
 id uuid primary key default gen_random_uuid(),entry_id uuid not null references public.initiative_entries(id),author_id uuid not null references public.profiles(id),
 kind text not null,message text not null check(length(trim(message)) between 10 and 4000),created_at timestamptz not null default now()
);
alter table public.initiatives enable row level security;
alter table public.initiative_entries enable row level security;
alter table public.initiative_journal enable row level security;
create policy initiatives_read on public.initiatives for select to authenticated using(true);
create policy entries_read on public.initiative_entries for select to authenticated using(learner_id=auth.uid() or exists(select 1 from public.initiatives where id=initiative_id and owner_id=auth.uid()));
create policy initiative_journal_read on public.initiative_journal for select to authenticated using(exists(select 1 from public.initiative_entries where id=entry_id));
revoke all on public.initiatives,public.initiative_entries,public.initiative_journal from public,anon,authenticated;
grant select on public.initiatives,public.initiative_entries,public.initiative_journal to authenticated;
grant all on public.initiatives,public.initiative_entries,public.initiative_journal to service_role;
create index initiative_entries_learner on public.initiative_entries(learner_id);
create index initiative_journal_entry on public.initiative_journal(entry_id);
create function public.publish_initiative(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;publisher text;
begin
 if auth.uid() is null or coalesce(private.current_role(),'') not in ('industry','academician','institution') then raise exception 'Organizer access required';end if;
 if (payload->>'deadline')::timestamptz<=now() then raise exception 'Choose a future deadline';end if;
 select coalesce(nullif(organization,''),full_name) into publisher from public.profiles where id=auth.uid();
 insert into public.initiatives(owner_id,publisher_name,kind,title,description,criteria,audience,deadline,capacity) values(auth.uid(),publisher,payload->>'kind',trim(payload->>'title'),trim(payload->>'description'),trim(payload->>'criteria'),payload->>'audience',(payload->>'deadline')::timestamptz,(payload->>'capacity')::integer) returning id into result;return result;
end $$;
create function public.submit_initiative_entry(initiative uuid,proposal_text text,evidence text default '') returns void language plpgsql security definer set search_path='' as $$
declare i public.initiatives;person public.profiles;
begin
 select * into i from public.initiatives where id=initiative for update;select * into person from public.profiles where id=auth.uid();
 if auth.uid() is null or i.id is null or coalesce(person.role,'') not in ('student','academician') or person.id=i.owner_id or i.audience not in ('all',person.role) or i.status<>'Open' or i.deadline<=now() then raise exception 'Choose an open initiative for your role';end if;
 if i.kind='Innovation challenge' and coalesce(evidence,'')='' then raise exception 'Provide an HTTPS link to your challenge submission';end if;
 if (select count(*) from public.initiative_entries where initiative_id=initiative and status not in ('Withdrawn','Declined'))>=i.capacity then raise exception 'Initiative capacity reached';end if;
 insert into public.initiative_entries(initiative_id,learner_id,learner_name,proposal,evidence_url,status) values(initiative,auth.uid(),person.full_name,trim(proposal_text),trim(coalesce(evidence,'')),case when i.kind='Mentorship' then 'Requested' else 'Submitted' end);
 perform private.send_notification(i.owner_id,'Initiatives','A challenge submission or mentorship request arrived','/'||(select role from public.profiles where id=i.owner_id)||'/initiatives','initiative-entry:'||gen_random_uuid()::text);
end $$;
create function public.update_initiative_entry(entry uuid,decision text,notes text,points integer default null) returns void language plpgsql security definer set search_path='' as $$
declare e public.initiative_entries;i public.initiatives;next_status text;person record;
begin
 select * into i from public.initiatives where id=(select initiative_id from public.initiative_entries where id=entry) for update;
 select * into e from public.initiative_entries where id=entry for update;
 if auth.uid() is null or e.id is null or auth.uid() not in (i.owner_id,e.learner_id) then raise exception 'Participant access required';end if;
 if coalesce(length(trim(notes)),0) not between 10 and 4000 then raise exception 'Provide 10–4000 characters of feedback or progress';end if;
 next_status:=e.status;
 if decision='Withdraw' and auth.uid()=e.learner_id and e.status in ('Submitted','Requested','Active','Completion requested') then next_status:='Withdrawn';
 elsif i.kind='Innovation challenge' and decision='Review' and auth.uid()=i.owner_id and e.status='Submitted' and i.deadline<=now() and points between 0 and 100 then next_status:='Reviewed';
 elsif i.kind='Mentorship' then
  if decision='Accept' and auth.uid()=i.owner_id and e.status='Requested' then next_status:='Active';
  elsif decision='Decline' and auth.uid()=i.owner_id and e.status='Requested' then next_status:='Declined';
  elsif decision='Progress' and e.status='Active' then null;
  elsif decision='Request completion' and auth.uid()=e.learner_id and e.status='Active' then next_status:='Completion requested';
  elsif decision='Complete' and auth.uid()=i.owner_id and e.status='Completion requested' then next_status:='Completed';
  elsif decision='Continue' and auth.uid()=i.owner_id and e.status='Completion requested' then next_status:='Active';
  else raise exception 'Invalid mentorship action';end if;
 else raise exception 'Invalid initiative action or judging is not open';end if;
 update public.initiative_entries set status=next_status,score=case when decision='Review' then points else score end,feedback=case when decision in ('Review','Decline','Complete','Continue') then trim(notes) else feedback end,completed_at=case when next_status='Completed' then now() else completed_at end where id=entry;
 insert into public.initiative_journal(entry_id,author_id,kind,message) values(entry,auth.uid(),decision,trim(notes));
 for person in select id,role from public.profiles where id in (i.owner_id,e.learner_id) loop
 perform private.send_notification(person.id,'Initiatives','Your challenge or mentorship workspace has an update','/'||person.role||'/initiatives','initiative-update:'||gen_random_uuid()::text);end loop;
end $$;
create function public.close_initiative(initiative uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.initiatives set status='Closed' where id=initiative and owner_id=auth.uid() and status='Open';
 if not found then raise exception 'Choose your open initiative';end if;
end $$;
revoke all on function public.publish_initiative(jsonb),public.submit_initiative_entry(uuid,text,text),public.update_initiative_entry(uuid,text,text,integer),public.close_initiative(uuid) from public,anon;
grant execute on function public.publish_initiative(jsonb),public.submit_initiative_entry(uuid,text,text),public.update_initiative_entry(uuid,text,text,integer),public.close_initiative(uuid) to authenticated;
commit;
