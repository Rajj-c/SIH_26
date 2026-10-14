-- Repair the four student features confirmed missing on 2026-10-13.
-- Run once in the project owner's Supabase SQL Editor after reviewing a backup.
-- All four changes commit together. Existing student records are retained.
-- Stop if any target table already exists; inspect migration history first.
begin;
do $student_repair$
declare name text;
begin
  foreach name in array array['profiles','institution_memberships','collaboration_proposals','collaboration_milestones','collaboration_updates','collaboration_events','notifications'] loop
    if to_regclass('public.' || name) is null then
      raise exception 'Required base table % is missing. Apply the earlier migrations first.', name;
    end if;
  end loop;
  foreach name in array array['learning_tracks','collaboration_members','collaboration_files','initiatives','initiative_entries','initiative_journal','roster_invitations'] loop
    if to_regclass('public.' || name) is not null then
      raise exception 'Target table % already exists. Stop and review applied migrations before using this repair.', name;
    end if;
  end loop;
  if to_regprocedure('private.current_role()') is null
     or to_regprocedure('private.send_notification(uuid,text,text,text,text)') is null
     or to_regprocedure('private.collaboration_event(uuid,text,text)') is null then
    raise exception 'Required base functions are missing. Apply the earlier migrations first.';
  end if;
end $student_repair$;

-- Source: 202609220016_published_learning_tracks.sql
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


-- Source: 202609220019_collaboration_teams.sql
create table public.collaboration_members(
 id uuid primary key default gen_random_uuid(),proposal_id uuid not null references public.collaboration_proposals(id),
 invited_by uuid not null references public.profiles(id),member_id uuid not null references public.profiles(id),
 member_name text not null,workspace_title text not null,
 permission text not null check(permission in ('Contributor','Observer')),
 status text not null default 'Awaiting partner' check(status in ('Awaiting partner','Invited','Accepted','Declined','Revoked')),
 approved_by uuid references public.profiles(id),created_at timestamptz not null default now(),responded_at timestamptz,
 unique(proposal_id,member_id)
);
create function private.can_read_collaboration(proposal uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.collaboration_proposals p where p.id=proposal and (auth.uid() in (p.owner_id,p.proposer_id) or exists(select 1 from public.collaboration_members m where m.proposal_id=p.id and m.member_id=auth.uid() and m.status='Accepted')))
$$;
create function private.can_contribute_collaboration(proposal uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.collaboration_proposals p where p.id=proposal and p.status='Accepted' and p.completion_requested_at is null and (auth.uid() in (p.owner_id,p.proposer_id) or exists(select 1 from public.collaboration_members m where m.proposal_id=p.id and m.member_id=auth.uid() and m.status='Accepted' and m.permission='Contributor')))
$$;
revoke all on function private.can_read_collaboration(uuid),private.can_contribute_collaboration(uuid) from public,anon;
grant execute on function private.can_read_collaboration(uuid),private.can_contribute_collaboration(uuid) to authenticated;
drop policy collaboration_read on public.collaboration_proposals;
create policy collaboration_read on public.collaboration_proposals for select to authenticated using(private.can_read_collaboration(id));
alter table public.collaboration_members enable row level security;
create policy collaboration_member_read on public.collaboration_members for select to authenticated using(member_id=auth.uid() or private.can_read_collaboration(proposal_id));
revoke all on public.collaboration_members from public,anon,authenticated;
grant select on public.collaboration_members to authenticated;
grant all on public.collaboration_members to service_role;
create function public.invite_collaboration_member(proposal uuid,person uuid,access_level text) returns void language plpgsql security definer set search_path='' as $$
declare p public.collaboration_proposals; member_label text;
begin
 select * into p from public.collaboration_proposals where id=proposal for update;
 if auth.uid() is null or p.id is null or auth.uid() not in (p.owner_id,p.proposer_id) or p.status<>'Accepted' or p.completion_requested_at is not null then raise exception 'An active partnership principal must invite collaborators'; end if;
 if person in (p.owner_id,p.proposer_id) then raise exception 'This account is already a principal'; end if;
 select full_name into member_label from public.profiles where id=person;
 if member_label is null then raise exception 'Choose an existing account'; end if;
 insert into public.collaboration_members(proposal_id,invited_by,member_id,member_name,workspace_title,permission) values(proposal,auth.uid(),person,member_label,p.title,access_level);
 perform private.collaboration_event(proposal,'Team invitation proposed','The other principal must approve sharing before the invitee can accept');
end $$;
create function public.respond_collaboration_invitation(invitation uuid,decision text) returns void language plpgsql security definer set search_path='' as $$
declare m public.collaboration_members;p public.collaboration_proposals;new_status text;member_role text;
begin
 select * into p from public.collaboration_proposals where id=(select proposal_id from public.collaboration_members where id=invitation) for update;
 select * into m from public.collaboration_members where id=invitation for update;
 if auth.uid() is null or m.id is null then raise exception 'Invitation unavailable'; end if;
 if decision='Revoke' and auth.uid() in (p.owner_id,p.proposer_id) and m.status in ('Awaiting partner','Invited','Accepted') then new_status:='Revoked';
 elsif decision='Approve' and m.status='Awaiting partner' and auth.uid() in (p.owner_id,p.proposer_id) and auth.uid()<>m.invited_by and p.status='Accepted' and p.completion_requested_at is null then new_status:='Invited';
 elsif decision in ('Accept','Decline') and m.status='Invited' and auth.uid()=m.member_id and p.status='Accepted' and p.completion_requested_at is null then new_status:=case when decision='Accept' then 'Accepted' else 'Declined' end;
 elsif decision='Leave' and m.status='Accepted' and auth.uid()=m.member_id then new_status:='Revoked';
 else raise exception 'Invitation action not permitted';end if;
 update public.collaboration_members set status=new_status,approved_by=case when decision='Approve' then auth.uid() else approved_by end,responded_at=now() where id=invitation;
 perform private.collaboration_event(p.id,'Team access changed',m.member_name||': '||new_status);
 select role into member_role from public.profiles where id=m.member_id;
 perform private.send_notification(m.member_id,'Collaboration','A project-team invitation changed','/'||member_role||'/collaborations','team-invitation:'||gen_random_uuid()::text);
end $$;
create function public.post_team_update(proposal uuid,message text,evidence text default '') returns void language plpgsql security definer set search_path='' as $$
declare p public.collaboration_proposals;
begin
 select * into p from public.collaboration_proposals where id=proposal for update;
 if not private.can_contribute_collaboration(proposal) then raise exception 'Active contributor access required';end if;
 insert into public.collaboration_updates(proposal_id,author_id,author_name,message,evidence_url) select proposal,auth.uid(),full_name,trim(message),trim(coalesce(evidence,'')) from public.profiles where id=auth.uid();
 perform private.collaboration_event(proposal,'Team update posted','A collaborator posted an update. Principal delivery approval is still required.');
end $$;
revoke all on function public.invite_collaboration_member(uuid,uuid,text),public.respond_collaboration_invitation(uuid,text),public.post_team_update(uuid,text,text) from public,anon;
grant execute on function public.invite_collaboration_member(uuid,uuid,text),public.respond_collaboration_invitation(uuid,text),public.post_team_update(uuid,text,text) to authenticated;
create table public.collaboration_files(
 id uuid primary key default gen_random_uuid(),proposal_id uuid not null references public.collaboration_proposals(id),
 uploaded_by uuid not null references public.profiles(id),title text not null check(length(trim(title)) between 3 and 160),
 storage_path text not null unique,created_at timestamptz not null default now()
);
alter table public.collaboration_files enable row level security;
create policy collaboration_file_read on public.collaboration_files for select to authenticated using(private.can_read_collaboration(proposal_id));
revoke all on public.collaboration_files from public,anon,authenticated;
grant select on public.collaboration_files to authenticated;
grant all on public.collaboration_files to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('collaboration-files','collaboration-files',false,10485760,array['application/pdf']);
create policy collaboration_storage_upload on storage.objects for insert to authenticated with check(bucket_id='collaboration-files' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.collaboration_proposals p where p.id::text=(storage.foldername(name))[2] and private.can_contribute_collaboration(p.id)));
create policy collaboration_storage_read on storage.objects for select to authenticated using(bucket_id='collaboration-files' and exists(select 1 from public.collaboration_files f where f.storage_path=name and private.can_read_collaboration(f.proposal_id)));
create function private.unattached_collaboration_file(path text) returns boolean language sql stable security definer set search_path='' as $$select not exists(select 1 from public.collaboration_files where storage_path=path)$$;
revoke all on function private.unattached_collaboration_file(text) from public,anon;
grant execute on function private.unattached_collaboration_file(text) to authenticated;
create policy collaboration_storage_cleanup on storage.objects for delete to authenticated using(bucket_id='collaboration-files' and (storage.foldername(name))[1]=auth.uid()::text and private.unattached_collaboration_file(name));
create function public.register_collaboration_file(proposal uuid,file_title text,path text) returns void language plpgsql security definer set search_path='' as $$
declare p public.collaboration_proposals;
begin
 select * into p from public.collaboration_proposals where id=proposal for update;
 if not private.can_contribute_collaboration(proposal) then raise exception 'Active contributor access required';end if;
 if path is null or split_part(path,'/',1)<>auth.uid()::text or split_part(path,'/',2)<>proposal::text or not exists(select 1 from storage.objects where bucket_id='collaboration-files' and name=path) then raise exception 'Upload your private project PDF first';end if;
 insert into public.collaboration_files(proposal_id,uploaded_by,title,storage_path) values(proposal,auth.uid(),trim(file_title),path);
 perform private.collaboration_event(proposal,'Project file shared','A private project attachment was shared');
end $$;
revoke all on function public.register_collaboration_file(uuid,text,text) from public,anon;
grant execute on function public.register_collaboration_file(uuid,text,text) to authenticated;


-- Source: 202609220020_challenges_mentorship.sql
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


-- Source: 202609220021_roster_invitations.sql
create table public.roster_invitations(
 id uuid primary key default gen_random_uuid(),institution_id uuid not null references public.profiles(id),institution_name text not null,
 email text not null check(length(email)<=254),status text not null default 'Invited' check(status in ('Invited','Accepted','Declined','Revoked')),
 created_at timestamptz not null default now(),responded_at timestamptz,unique(institution_id,email)
);
create function private.own_verified_email() returns text language sql stable security definer set search_path='' as $$select lower(email) from auth.users where id=auth.uid()$$;
revoke all on function private.own_verified_email() from public,anon;
grant execute on function private.own_verified_email() to authenticated;
alter table public.roster_invitations enable row level security;
create policy roster_read on public.roster_invitations for select to authenticated using(institution_id=auth.uid() or email=private.own_verified_email());
revoke all on public.roster_invitations from public,anon,authenticated;
grant select on public.roster_invitations to authenticated;
grant all on public.roster_invitations to service_role;
create function public.import_roster_invitations(emails text[]) returns integer language plpgsql security definer set search_path='' as $$
declare address text;institution_label text;result integer:=0;affected integer;
begin
 if auth.uid() is null or coalesce(private.current_role(),'')<>'institution' then raise exception 'Institution access required';end if;
 if emails is null or cardinality(emails) not between 1 and 200 then raise exception 'Import 1–200 email addresses at a time';end if;
 select coalesce(nullif(organization,''),full_name) into institution_label from public.profiles where id=auth.uid();
 foreach address in array emails loop
  address:=lower(trim(address));
  if address is null or length(address)>254 or address !~ '^[^[:space:]@,]+@[^[:space:]@,]+\.[^[:space:]@,]+$' then raise exception 'Invalid email; no invitations were imported';end if;
  insert into public.roster_invitations(institution_id,institution_name,email) values(auth.uid(),institution_label,address) on conflict(institution_id,email) do nothing;
  get diagnostics affected=row_count;result:=result+affected;
 end loop;return result;
end $$;
create function public.respond_roster_invitation(invitation uuid,decision text) returns void language plpgsql security definer set search_path='' as $$
declare r public.roster_invitations;next_status text;
begin
 select * into r from public.roster_invitations where id=invitation for update;
 if auth.uid() is null or r.id is null or r.status<>'Invited' then raise exception 'Choose a pending invitation';end if;
 if decision='Revoke' and r.institution_id=auth.uid() then next_status:='Revoked';
 elsif decision in ('Accept','Decline') and r.email=private.own_verified_email() and coalesce(private.current_role(),'') in ('student','academician') then
  next_status:=case when decision='Accept' then 'Accepted' else 'Declined' end;
  if decision='Accept' then
   insert into public.institution_memberships(institution_id,member_id,status) values(r.institution_id,auth.uid(),'Approved') on conflict(institution_id,member_id) do update set status='Approved';
  end if;
 else raise exception 'Invitation action not permitted';end if;
 update public.roster_invitations set status=next_status,responded_at=now() where id=invitation;
end $$;
-- Declining membership must not leave an older invite able to re-grant access.
create function private.revoke_stale_roster_invite() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='Declined' then update public.roster_invitations set status='Revoked',responded_at=now() where institution_id=new.institution_id and status='Invited' and email=(select lower(email) from auth.users where id=new.member_id);end if;return new;
end $$;
revoke all on function private.revoke_stale_roster_invite() from public,anon,authenticated;
create trigger membership_revoke_roster after insert or update of status on public.institution_memberships for each row execute function private.revoke_stale_roster_invite();
revoke all on function public.import_roster_invitations(text[]),public.respond_roster_invitation(uuid,text) from public,anon;
grant execute on function public.import_roster_invitations(text[]),public.respond_roster_invitation(uuid,text) to authenticated;

notify pgrst, 'reload schema';
commit;
