begin;
create table public.credential_review_requests (
 id uuid primary key default gen_random_uuid(),
 record_id uuid references public.portfolio_records(id) on delete set null,
 student_id uuid not null references public.profiles(id),
 institution_id uuid not null references public.profiles(id),
 snapshot jsonb not null,
 status text not null default 'Pending' check(status in ('Pending','Approved','Changes requested','Declined','Revoked','Superseded')),
 created_at timestamptz not null default now()
);
create unique index credential_pending on public.credential_review_requests(record_id,institution_id) where status='Pending';
create table public.credential_review_events (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.credential_review_requests(id),
 actor_id uuid not null references public.profiles(id),
 decision text not null,
 feedback text not null,
 created_at timestamptz not null default now()
);
alter table public.credential_review_requests enable row level security;
alter table public.credential_review_events enable row level security;
create policy credential_request_read on public.credential_review_requests for select to authenticated using(student_id=(select auth.uid()) or (institution_id=(select auth.uid()) and exists(select 1 from public.institution_memberships m where m.member_id=student_id and m.institution_id=(select auth.uid()) and m.status='Approved')));
create policy credential_event_read on public.credential_review_events for select to authenticated using(exists(select 1 from public.credential_review_requests r where r.id=request_id));
revoke all on public.credential_review_requests,public.credential_review_events from anon,authenticated;
grant select on public.credential_review_requests,public.credential_review_events to authenticated;
grant all on public.credential_review_requests,public.credential_review_events to service_role;
create view public.credential_review_details with(security_invoker=true) as select r.*,coalesce(to_jsonb(p)=r.snapshot,false) as is_current from public.credential_review_requests r left join public.portfolio_records p on p.id=r.record_id;
grant select on public.credential_review_details to authenticated;

create function public.request_credential_review(record uuid,institution uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.portfolio_records; existing uuid; result uuid;
begin
 if auth.uid() is null or private.current_role() is distinct from 'student' then raise exception 'Student access required'; end if;
 select * into p from public.portfolio_records where id=record for update;
 if p.user_id is distinct from auth.uid() or p.kind<>'certification' then raise exception 'Choose your own certificate'; end if;
 perform 1 from public.institution_memberships m join public.profiles i on i.id=m.institution_id where m.member_id=auth.uid() and m.institution_id=institution and m.status='Approved' and i.role='institution' for share of m;
 if not found then raise exception 'Choose your approved institution'; end if;
 if length(trim(p.organization))=0 or (coalesce(p.document_path,'')='' and p.url='') then raise exception 'Add issuer and a document or evidence URL'; end if;
 if p.expires_on is not null and p.expires_on<(now() at time zone 'Asia/Kolkata')::date then raise exception 'Certificate is expired'; end if;
 select id into existing from public.credential_review_requests where record_id=record and institution_id=institution and snapshot=to_jsonb(p) and status in ('Pending','Approved') order by created_at desc limit 1;
 if existing is not null then return existing; end if;
 for existing in select id from public.credential_review_requests where record_id=record and institution_id=institution and status='Pending' for update loop
  update public.credential_review_requests set status='Superseded' where id=existing;
  insert into public.credential_review_events(request_id,actor_id,decision,feedback) values(existing,auth.uid(),'Superseded','Student submitted an updated certificate version.');
 end loop;
 insert into public.credential_review_requests(record_id,student_id,institution_id,snapshot) values(record,auth.uid(),institution,to_jsonb(p)) returning id into result;
 insert into public.credential_review_events(request_id,actor_id,decision,feedback) values(result,auth.uid(),'Requested','Student requested institution review of this saved certificate version.');
 return result;
end $$;
create function public.decide_credential_review(request uuid,decision text,feedback text) returns void language plpgsql security definer set search_path='' as $$
declare r public.credential_review_requests; p public.portfolio_records;
begin
 if auth.uid() is null or private.current_role() is distinct from 'institution' then raise exception 'Institution access required'; end if;
 -- Lock the source before the request to serialize edits and decisions consistently.
 select * into p from public.portfolio_records where id=(select record_id from public.credential_review_requests where id=request) for update;
 select * into r from public.credential_review_requests where id=request for update;
 if r.institution_id is distinct from auth.uid() then raise exception 'Choose a review assigned to your institution'; end if;
 perform 1 from public.institution_memberships where institution_id=auth.uid() and member_id=r.student_id and status='Approved' for share;
 if not found then raise exception 'Approved membership is required'; end if;
 if feedback is null or length(trim(feedback)) not between 10 and 3000 then raise exception 'Explain your review in 10–3000 characters'; end if;
 if decision='Revoked' then
  if r.status<>'Approved' then raise exception 'Only approved reviews can be revoked'; end if;
 else
  if decision is null or decision not in ('Approved','Changes requested','Declined') or r.status<>'Pending' then raise exception 'Choose a pending review and a valid decision'; end if;
  if p.id is null or to_jsonb(p) is distinct from r.snapshot then raise exception 'Certificate changed or was deleted; request a new review'; end if;
  if decision='Approved' and p.expires_on is not null and p.expires_on<(now() at time zone 'Asia/Kolkata')::date then raise exception 'Certificate is expired'; end if;
 end if;
 update public.credential_review_requests set status=decision where id=request;
 insert into public.credential_review_events(request_id,actor_id,decision,feedback) values(request,auth.uid(),decision,trim(feedback));
 -- Intentionally never sets portfolio verified_at or creates skill evidence.
end $$;
revoke all on function public.request_credential_review(uuid,uuid),public.decide_credential_review(uuid,text,text) from public,anon;
grant execute on function public.request_credential_review(uuid,uuid),public.decide_credential_review(uuid,text,text) to authenticated;
commit;
