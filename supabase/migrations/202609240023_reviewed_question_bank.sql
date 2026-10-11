begin;
-- Dedicated subject reviewers; no role or signup metadata grants this authority.
create table private.question_reviewers(user_id uuid primary key references public.profiles(id));
revoke all on private.question_reviewers from public,anon,authenticated;
grant all on private.question_reviewers to service_role;
create function public.is_question_reviewer() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.question_reviewers where user_id=auth.uid())
$$;
create table private.reviewed_questions(
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 source_assessment uuid not null references public.industry_assessments(id),
 question jsonb not null, status text not null default 'Pending' check(status in ('Pending','Approved','Rejected','Revoked')),
 reviewer_id uuid references public.profiles(id), reason text, reviewed_at timestamptz, created_at timestamptz not null default now(),
 check(reviewer_id is null or reviewer_id<>owner_id)
);
create index reviewed_questions_owner on private.reviewed_questions(owner_id);
create table private.question_review_events(
 id uuid primary key default gen_random_uuid(), question_id uuid not null references private.reviewed_questions(id),
 actor_id uuid not null references public.profiles(id), decision text not null, reason text not null, created_at timestamptz not null default now()
);
revoke all on private.reviewed_questions,private.question_review_events from public,anon,authenticated;
grant all on private.reviewed_questions,private.question_review_events to service_role;

create function public.submit_question_bank(assessment uuid) returns integer language plpgsql security definer set search_path='' as $$
declare q jsonb; added integer:=0; item uuid;
begin
 perform 1 from public.profiles where id=auth.uid() and role='industry' for update;
 if not found then raise exception 'Industry author required'; end if;
 perform 1 from public.industry_assessments where id=assessment and owner_id=auth.uid() for update;
 if not found then raise exception 'Save your own assessment draft first'; end if;
 for q in select value - 'id' from private.industry_assessment_content c cross join lateral jsonb_array_elements(c.questions) where c.assessment_id=assessment loop
  if not exists(select 1 from private.reviewed_questions b where b.owner_id=auth.uid() and b.question=q and b.status in ('Pending','Approved')) then
   insert into private.reviewed_questions(owner_id,source_assessment,question) values(auth.uid(),assessment,q) returning id into item;
   insert into private.question_review_events(question_id,actor_id,decision,reason) values(item,auth.uid(),'Submitted','Immutable question snapshot submitted for independent review');
   added:=added+1;
  end if;
 end loop;
 return added;
end $$;

create function public.question_bank_items() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(b) || jsonb_build_object('history',(
  select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at),'[]'::jsonb) from private.question_review_events e where e.question_id=b.id
 )) order by b.created_at desc),'[]'::jsonb)
 from (select * from private.reviewed_questions where owner_id=auth.uid() or public.is_question_reviewer() order by created_at desc limit 500) b
$$;

create function public.review_bank_question(item uuid,decision text,review_reason text) returns void language plpgsql security definer set search_path='' as $$
declare b private.reviewed_questions;
begin
 if not public.is_question_reviewer() then raise exception 'Provisioned subject reviewer required'; end if;
 select * into b from private.reviewed_questions where id=item for update;
 if b.id is null or b.owner_id=auth.uid() then raise exception 'Cannot review your own question or a missing item'; end if;
 if decision is null or not ((b.status='Pending' and decision in ('Approved','Rejected')) or (b.status='Approved' and decision='Revoked')) then raise exception 'Invalid review transition'; end if;
 if coalesce(length(trim(review_reason)),0) not between 20 and 2000 then raise exception 'Provide a review rationale of 20–2000 characters'; end if;
 update private.reviewed_questions set status=decision,reviewer_id=auth.uid(),reason=trim(review_reason),reviewed_at=now() where id=item;
 insert into private.question_review_events(question_id,actor_id,decision,reason) values(item,auth.uid(),decision,trim(review_reason));
end $$;

-- Enforce in the database, including direct RPC callers. Existing published
-- snapshots are not rewritten; historical results retain their original keys.
create function private.require_reviewed_questions() returns trigger language plpgsql security definer set search_path='' as $$
declare a public.industry_assessments; q jsonb; approved uuid;
begin
 select * into a from public.industry_assessments where id=new.assessment_id;
 if a.status='Published' then
  for q in select value - 'id' from jsonb_array_elements(new.questions) loop
   select id into approved from private.reviewed_questions b where b.owner_id=a.owner_id and b.question=q and b.status='Approved' order by b.created_at desc limit 1 for share;
   if approved is null then raise exception 'Every question needs independent question-bank approval before publication. Save a draft and submit it for review.'; end if;
  end loop;
 end if;
 return new;
end $$;
create trigger require_reviewed_questions before insert or update on private.industry_assessment_content for each row execute function private.require_reviewed_questions();
revoke all on function public.is_question_reviewer(),public.submit_question_bank(uuid),public.question_bank_items(),public.review_bank_question(uuid,text,text) from public,anon;
grant execute on function public.is_question_reviewer(),public.submit_question_bank(uuid),public.question_bank_items(),public.review_bank_question(uuid,text,text) to authenticated;
commit;
