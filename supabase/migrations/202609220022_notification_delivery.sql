begin;
create table public.notification_email_preferences(user_id uuid primary key default auth.uid() references public.profiles(id),enabled boolean not null default false);
alter table public.notification_email_preferences enable row level security;
create policy email_preferences_own on public.notification_email_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.notification_email_preferences from public,anon,authenticated;
grant select,insert,update on public.notification_email_preferences to authenticated;
grant all on public.notification_email_preferences to service_role;
create table private.notification_email_jobs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),day date not null,
 payload jsonb not null,status text not null default 'Queued' check(status in ('Queued','Sending','Sent')),
 attempts integer not null default 0,lease_id uuid,lease_until timestamptz,created_at timestamptz not null default now(),sent_at timestamptz,
 unique(user_id,day)
);
revoke all on private.notification_email_jobs from public,anon,authenticated;
grant all on private.notification_email_jobs to service_role;
create function public.claim_notification_emails(app_origin text,sender text) returns table(job_id uuid,lease uuid,payload jsonb) language plpgsql security definer set search_path='' as $$
declare person record;j private.notification_email_jobs;token uuid;
begin
 if app_origin !~ '^https://[^[:space:]]+$' or sender is null or length(sender) not between 5 and 320 then raise exception 'Configure HTTPS application origin and email sender';end if;
 -- One in-app reminder per session/learner. Never include meeting links in a notice or email.
 for person in select r.learner_id,p.role,s.id from public.learning_session_registrations r join public.learning_sessions s on s.id=r.session_id join public.profiles p on p.id=r.learner_id where r.status='Registered' and s.status='Scheduled' and s.starts_at>now() and s.starts_at<=now()+interval '24 hours' loop
 perform private.send_notification(person.learner_id,'Reminder','A registered session starts within 24 hours','/'||person.role||'/sessions','session-reminder:'||person.id::text);end loop;
 insert into private.notification_email_jobs(user_id,day,payload)
 select p.id,(now() at time zone 'UTC')::date,jsonb_build_object('from',sender,'to',jsonb_build_array(u.email),'subject','Your Origin Point workspace has updates','text','You have recent unread workspace updates. Sign in to review them: '||app_origin||'/'||p.role||'/notifications'||E'\n\nYou opted in to daily workspace emails. You can disable them in your notification settings. Emails do not contain private meeting links, scores or application details.')
 from public.notification_email_preferences pref join public.profiles p on p.id=pref.user_id join auth.users u on u.id=p.id
 where pref.enabled and u.email is not null and p.role in ('student','industry','academician','institution') and exists(select 1 from public.notifications n where n.recipient_id=p.id and n.read_at is null and n.created_at>now()-interval '24 hours')
 on conflict(user_id,day) do nothing;
 for j in select jobs.* from private.notification_email_jobs jobs join public.notification_email_preferences pref on pref.user_id=jobs.user_id and pref.enabled join auth.users u on u.id=jobs.user_id and u.email=jobs.payload->'to'->>0
 where jobs.status<>'Sent' and jobs.attempts<3 and jobs.created_at>now()-interval '23 hours' and (jobs.lease_until is null or jobs.lease_until<=now()) order by jobs.created_at,jobs.id for update of jobs skip locked limit 5 loop
 token:=gen_random_uuid();update private.notification_email_jobs set status='Sending',attempts=attempts+1,lease_id=token,lease_until=now()+interval '5 minutes' where id=j.id;
 job_id:=j.id;lease:=token;payload:=j.payload;return next;
 end loop;
end $$;
create function public.finish_notification_email(job uuid,lease uuid,delivered boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 update private.notification_email_jobs set status=case when delivered then 'Sent' else 'Queued' end,sent_at=case when delivered then now() else null end where id=job and lease_id=lease and status='Sending';
end $$;
revoke all on function public.claim_notification_emails(text,text),public.finish_notification_email(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_notification_emails(text,text),public.finish_notification_email(uuid,uuid,boolean) to service_role;
commit;
