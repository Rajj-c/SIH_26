begin;
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
commit;
