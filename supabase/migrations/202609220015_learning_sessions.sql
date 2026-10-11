begin;
create table public.learning_sessions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 program_id uuid references public.learning_programs(id), title text not null check(length(trim(title)) between 5 and 160),
 kind text not null check(kind in ('Workshop','Guest lecture','Mentorship')),
 audience text not null check(audience in ('student','academician','all')),
 speaker text not null check(length(trim(speaker)) between 2 and 200),
 agenda text not null check(length(trim(agenda)) between 20 and 4000),
 mode text not null check(mode in ('Online','On-site','Hybrid')),
 starts_at timestamptz not null, ends_at timestamptz not null,
 registration_closes_at timestamptz not null, capacity integer not null check(capacity between 1 and 1000),
 status text not null default 'Scheduled' check(status in ('Scheduled','Completed','Cancelled')),
 created_at timestamptz not null default now(),
 check(ends_at>starts_at and ends_at<=starts_at+interval '12 hours'),check(registration_closes_at<=starts_at)
);
create table public.learning_session_access(session_id uuid primary key references public.learning_sessions(id),location text not null check(length(trim(location)) between 3 and 2000));
create table public.learning_session_registrations (
 id uuid primary key default gen_random_uuid(),session_id uuid not null references public.learning_sessions(id),
 learner_id uuid not null references public.profiles(id),learner_name text not null,
 status text not null default 'Registered' check(status in ('Registered','Cancelled')),
 attendance text not null default 'Not recorded' check(attendance in ('Not recorded','Present','Absent')),
 recorded_by uuid references public.profiles(id),recorded_at timestamptz,
 rating integer check(rating between 1 and 5),feedback text check(length(trim(feedback)) between 10 and 2000),feedback_at timestamptz,
 unique(session_id,learner_id),created_at timestamptz not null default now()
);
alter table public.learning_sessions enable row level security;
alter table public.learning_session_access enable row level security;
alter table public.learning_session_registrations enable row level security;
create policy session_read on public.learning_sessions for select to authenticated using(true);
create policy session_registration_read on public.learning_session_registrations for select to authenticated using(learner_id=auth.uid() or private.is_institution_member(learner_id) or exists(select 1 from public.learning_sessions s where s.id=session_id and s.owner_id=auth.uid()));
create policy session_access_read on public.learning_session_access for select to authenticated using(exists(select 1 from public.learning_sessions s where s.id=session_id and s.owner_id=auth.uid()) or exists(select 1 from public.learning_session_registrations r where r.session_id=learning_session_access.session_id and r.learner_id=auth.uid() and r.status='Registered'));
revoke all on public.learning_sessions,public.learning_session_access,public.learning_session_registrations from public,anon,authenticated;
grant select on public.learning_sessions,public.learning_session_access,public.learning_session_registrations to authenticated;
grant all on public.learning_sessions,public.learning_session_access,public.learning_session_registrations to service_role;

create function public.schedule_learning_session(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; linked uuid; o public.opportunities; p public.learning_programs;
begin
 if auth.uid() is null or private.current_role() is null or private.current_role() not in ('industry','academician','institution') then raise exception 'Organizer access required'; end if;
 if (payload->>'starts_at')::timestamptz<=now() or (payload->>'registration_closes_at')::timestamptz<=now() then raise exception 'Choose future start and registration deadline'; end if;
 linked:=nullif(payload->>'program_id','')::uuid;
 if linked is not null then
 select * into o from public.opportunities where id=linked;select * into p from public.learning_programs where id=linked;
 if p.id is null or o.owner_id is distinct from auth.uid() or o.status<>'Open' or (o.audience<>'all' and o.audience is distinct from payload->>'audience') then raise exception 'Choose your open program and its eligible audience'; end if;
 if ((payload->>'starts_at')::timestamptz at time zone 'Asia/Kolkata')::date<p.starts_on or ((payload->>'ends_at')::timestamptz at time zone 'Asia/Kolkata')::date>p.ends_on then raise exception 'Session must fall within the program dates'; end if;
 end if;
 insert into public.learning_sessions(owner_id,program_id,title,kind,audience,speaker,agenda,mode,starts_at,ends_at,registration_closes_at,capacity) values(auth.uid(),linked,trim(payload->>'title'),payload->>'kind',payload->>'audience',trim(payload->>'speaker'),trim(payload->>'agenda'),payload->>'mode',(payload->>'starts_at')::timestamptz,(payload->>'ends_at')::timestamptz,(payload->>'registration_closes_at')::timestamptz,(payload->>'capacity')::integer) returning id into result;
 insert into public.learning_session_access values(result,trim(payload->>'location'));return result;
end $$;
create function public.register_learning_session(session uuid,joining boolean) returns void language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions; r public.learning_session_registrations; role_name text;
begin
 select * into s from public.learning_sessions where id=session for update;
 role_name:=private.current_role();
 if auth.uid() is null or role_name is null or role_name not in ('student','academician') or s.id is null or s.owner_id=auth.uid() then raise exception 'Choose a learner session'; end if;
 select * into r from public.learning_session_registrations where session_id=session and learner_id=auth.uid() for update;
 if s.status<>'Scheduled' or s.starts_at<=now() then raise exception 'Registration changes are closed'; end if;
 if joining is false then
  update public.learning_session_registrations set status='Cancelled' where id=r.id and status='Registered';
  if found then perform private.send_notification(s.owner_id,'Sessions','A learner cancelled a session registration','/'||(select role from public.profiles where id=s.owner_id)||'/sessions','session-withdrawal:'||gen_random_uuid()::text);end if;
  return;
 end if;
 if joining is distinct from true then raise exception 'Choose register or cancel'; end if;
 if s.audience not in ('all',role_name) or s.registration_closes_at<=now() then raise exception 'Audience or registration deadline does not permit registration'; end if;
 if s.program_id is not null and not exists(select 1 from public.program_enrollments where program_id=s.program_id and learner_id=auth.uid() and status in ('Enrolled','Completed')) then raise exception 'Enroll in the linked program first'; end if;
 if r.status='Registered' then return; end if;
 if (select count(*) from public.learning_session_registrations where session_id=session and status='Registered')>=s.capacity then raise exception 'Session is full'; end if;
 if r.id is null then
 insert into public.learning_session_registrations(session_id,learner_id,learner_name) select session,auth.uid(),coalesce(full_name,'Learner') from public.profiles where id=auth.uid();
 else update public.learning_session_registrations set status='Registered' where id=r.id; end if;
 perform private.send_notification(s.owner_id,'Sessions','A learner registered for your session','/'||(select role from public.profiles where id=s.owner_id)||'/sessions','session-registration:'||gen_random_uuid()::text);
end $$;
create function public.record_session_attendance(registration uuid,decision text) returns void language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions; r public.learning_session_registrations;
begin
 select * into s from public.learning_sessions where id=(select session_id from public.learning_session_registrations where id=registration) for update;
 select * into r from public.learning_session_registrations where id=registration for update;
 if auth.uid() is null or s.owner_id is distinct from auth.uid() or s.status<>'Scheduled' or s.starts_at>now() or r.status<>'Registered' then raise exception 'Only the organizer can record attendance after the session starts'; end if;
 if decision is null or decision not in ('Present','Absent') then raise exception 'Choose Present or Absent'; end if;
 update public.learning_session_registrations set attendance=decision,recorded_by=auth.uid(),recorded_at=now() where id=registration;
end $$;
create function public.finish_learning_session(session uuid,decision text) returns void language plpgsql security definer set search_path='' as $$
declare s public.learning_sessions; person record;
begin
 select * into s from public.learning_sessions where id=session for update;
 if auth.uid() is null or s.owner_id is distinct from auth.uid() or s.status<>'Scheduled' then raise exception 'Choose your scheduled session'; end if;
 if decision='Completed' then
 if s.ends_at>now() or exists(select 1 from public.learning_session_registrations where session_id=session and status='Registered' and attendance='Not recorded') then raise exception 'Wait until session ends and record all attendance'; end if;
 elsif decision='Cancelled' then
 if exists(select 1 from public.learning_session_registrations where session_id=session and attendance<>'Not recorded') then raise exception 'Cannot cancel after attendance is recorded'; end if;
 else raise exception 'Choose Completed or Cancelled'; end if;
 update public.learning_sessions set status=decision where id=session;
 for person in select p.id,p.role from public.learning_session_registrations r join public.profiles p on p.id=r.learner_id where r.session_id=session and r.status='Registered' loop
 perform private.send_notification(person.id,'Sessions','A registered session was '||lower(decision),'/'||person.role||'/sessions','session-status:'||session::text);end loop;
end $$;
create function public.submit_session_feedback(registration uuid,score integer,comments text) returns void language plpgsql security definer set search_path='' as $$
declare r public.learning_session_registrations;
begin
 select * into r from public.learning_session_registrations where id=registration for update;
 if auth.uid() is null or r.learner_id is distinct from auth.uid() or r.status<>'Registered' or r.attendance<>'Present' or not exists(select 1 from public.learning_sessions where id=r.session_id and status='Completed') then raise exception 'Feedback requires your recorded attendance at a completed session'; end if;
 if r.feedback_at is not null then raise exception 'Feedback already submitted'; end if;
 if score is null or score not between 1 and 5 or comments is null or length(trim(comments)) not between 10 and 2000 then raise exception 'Provide rating 1–5 and feedback 10–2000 characters'; end if;
 update public.learning_session_registrations set rating=score,feedback=trim(comments),feedback_at=now() where id=registration;
end $$;
revoke all on function public.schedule_learning_session(jsonb),public.register_learning_session(uuid,boolean),public.record_session_attendance(uuid,text),public.finish_learning_session(uuid,text),public.submit_session_feedback(uuid,integer,text) from public,anon;
grant execute on function public.schedule_learning_session(jsonb),public.register_learning_session(uuid,boolean),public.record_session_attendance(uuid,text),public.finish_learning_session(uuid,text),public.submit_session_feedback(uuid,integer,text) to authenticated;
commit;
