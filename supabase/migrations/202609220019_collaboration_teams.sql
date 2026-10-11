begin;
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
commit;
