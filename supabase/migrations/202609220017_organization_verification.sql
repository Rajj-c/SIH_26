begin;
-- Bootstrap reviewers explicitly through the SQL editor/service role, never signup metadata.
create table private.platform_reviewers(user_id uuid primary key references public.profiles(id),created_at timestamptz not null default now());
revoke all on private.platform_reviewers from public,anon,authenticated;
grant all on private.platform_reviewers to service_role;
create function public.is_platform_reviewer() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.platform_reviewers where user_id=auth.uid())$$;
revoke all on function public.is_platform_reviewer() from public,anon;
grant execute on function public.is_platform_reviewer() to authenticated;
create table public.organization_verifications(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id),
 legal_name text not null check(length(trim(legal_name)) between 3 and 200),
 website text not null check(website ~ '^https://[^[:space:]]+$' and length(website)<=2000),
 evidence_url text not null check(evidence_url ~ '^https://[^[:space:]]+$' and length(evidence_url)<=2000),
 explanation text not null check(length(trim(explanation)) between 30 and 4000),
 status text not null default 'Pending' check(status in ('Pending','Approved','Rejected','Revoked')),
 reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,reason text,
 created_at timestamptz not null default now()
);
create unique index organization_open_request on public.organization_verifications(owner_id) where status in ('Pending','Approved');
create table public.organization_review_events(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organization_verifications(id),
 actor_id uuid not null references public.profiles(id),action text not null,reason text not null,created_at timestamptz not null default now()
);
alter table public.organization_verifications enable row level security;
alter table public.organization_review_events enable row level security;
create policy organization_review_read on public.organization_verifications for select to authenticated using(owner_id=auth.uid() or public.is_platform_reviewer());
create policy organization_history_read on public.organization_review_events for select to authenticated using(exists(select 1 from public.organization_verifications v where v.id=organization_id and (v.owner_id=auth.uid() or public.is_platform_reviewer())));
revoke all on public.organization_verifications,public.organization_review_events from public,anon,authenticated;
grant select on public.organization_verifications,public.organization_review_events to authenticated;
grant all on public.organization_verifications,public.organization_review_events to service_role;
create function public.request_organization_verification(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or coalesce(private.current_role(),'') not in ('industry','institution') then raise exception 'Industry or institution account required'; end if;
 insert into public.organization_verifications(owner_id,legal_name,website,evidence_url,explanation) values(auth.uid(),trim(payload->>'legal_name'),trim(payload->>'website'),trim(payload->>'evidence_url'),trim(payload->>'explanation')) returning id into result;
 insert into public.organization_review_events(organization_id,actor_id,action,reason) values(result,auth.uid(),'Requested','Organization verification requested');return result;
end $$;
create function public.review_organization(request_id uuid,decision text,review_reason text) returns void language plpgsql security definer set search_path='' as $$
declare r public.organization_verifications;
begin
 if not public.is_platform_reviewer() then raise exception 'Platform reviewer access required'; end if;
 select * into r from public.organization_verifications where id=request_id for update;
 if r.id is null or r.owner_id=auth.uid() then raise exception 'Cannot review your own organization'; end if;
 if not ((r.status='Pending' and decision in ('Approved','Rejected')) or (r.status='Approved' and decision='Revoked')) or decision is null then raise exception 'Invalid review transition'; end if;
 if coalesce(length(trim(review_reason)),0) not between 20 and 2000 then raise exception 'Explain your review in 20–2000 characters'; end if;
 update public.organization_verifications set status=decision,reviewed_by=auth.uid(),reviewed_at=now(),reason=trim(review_reason) where id=request_id;
 insert into public.organization_review_events(organization_id,actor_id,action,reason) values(request_id,auth.uid(),decision,trim(review_reason));
 perform private.send_notification(r.owner_id,'Organization','Your organization verification status changed','/'||(select role from public.profiles where id=r.owner_id)||'/organization','organization-review:'||gen_random_uuid()::text);
end $$;
-- Expose only the attested name and current status, not private evidence/review notes.
create function public.organization_verification_directory() returns table(id uuid,owner_id uuid,legal_name text,status text,reviewed_at timestamptz) language sql stable security definer set search_path='' as $$
 select id,owner_id,legal_name,status,reviewed_at from public.organization_verifications where status in ('Approved','Revoked') and auth.uid() is not null
$$;
revoke all on function public.request_organization_verification(jsonb),public.review_organization(uuid,text,text),public.organization_verification_directory() from public,anon;
grant execute on function public.request_organization_verification(jsonb),public.review_organization(uuid,text,text),public.organization_verification_directory() to authenticated;
commit;
