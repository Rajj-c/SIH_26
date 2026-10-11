begin;
create table public.ai_learning_plans (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references public.profiles(id),
 target_id uuid not null references public.opportunities(id),
 starts_on date not null default (now() at time zone 'Asia/Kolkata')::date,
 target_date date not null,
 weekly_hours integer not null check(weekly_hours between 1 and 40),
 model text not null check(length(model) between 1 and 100),
 prompt_version text not null check(length(prompt_version) between 1 and 100),
 draft jsonb not null check(jsonb_typeof(draft)='array' and jsonb_array_length(draft) between 1 and 8),
 reviewed_steps jsonb,
 goal_ids uuid[] not null default '{}',
 accepted_at timestamptz,
 created_at timestamptz not null default now(),
 check(target_date between starts_on and starts_on+180)
);
alter table public.ai_learning_plans enable row level security;
create policy ai_plan_read on public.ai_learning_plans for select to authenticated using(user_id=(select auth.uid()));
create policy ai_plan_insert on public.ai_learning_plans for insert to authenticated with check(user_id=(select auth.uid()) and private.current_role()='student');
revoke all on public.ai_learning_plans from anon,authenticated;
grant select on public.ai_learning_plans to authenticated;
grant insert(target_id,target_date,weekly_hours,model,prompt_version,draft) on public.ai_learning_plans to authenticated;
grant all on public.ai_learning_plans to service_role;

create function public.accept_ai_learning_plan(plan uuid, steps jsonb) returns uuid[] language plpgsql security definer set search_path='' as $$
declare p public.ai_learning_plans; s jsonb; goal uuid; result uuid[]='{}'; weeks integer; due date; resource uuid;
begin
 select * into p from public.ai_learning_plans where id=plan for update;
 if auth.uid() is null or p.user_id is distinct from auth.uid() or private.current_role()<>'student' then raise exception 'Choose your own learning plan'; end if;
 if p.accepted_at is not null then return p.goal_ids; end if;
 if p.target_date<(now() at time zone 'Asia/Kolkata')::date then raise exception 'Plan deadline passed; generate a new plan'; end if;
 if not exists(select 1 from public.opportunities where id=p.target_id and status='Open' and audience in ('student','all') and type in ('Job','Internship','Apprenticeship','Live Project') and deadline>=(now() at time zone 'Asia/Kolkata')::date) then raise exception 'Target is no longer open'; end if;
 if steps is null or jsonb_typeof(steps)<>'array' or jsonb_array_length(steps) not between 1 and 8 then raise exception 'Choose 1–8 steps'; end if;
 weeks:=ceil((p.target_date-p.starts_on+1)/7.0);
 for s in select value from jsonb_array_elements(steps) loop
  if jsonb_typeof(s->'skill') is distinct from 'string' or length(trim(s->>'skill')) not between 1 and 160 or jsonb_typeof(s->'task') is distinct from 'string' or length(trim(s->>'task')) not between 20 and 2000 or coalesce(s->>'week','') !~ '^[0-9]{1,2}$' or coalesce(s->>'hours','') !~ '^[0-9]{1,2}$' then raise exception 'Invalid learning step'; end if;
  if (s->>'week')::integer not between 1 and weeks or (s->>'hours')::integer not between 1 and p.weekly_hours then raise exception 'Step exceeds time budget'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(steps) as items(item) group by public.skill_key(item->>'skill') having count(*)>1) then raise exception 'Use one goal per skill'; end if;
 if exists(select 1 from jsonb_array_elements(steps) as items(item) group by item->>'week' having sum((item->>'hours')::integer)>p.weekly_hours) then raise exception 'Weekly hours exceeded'; end if;
 for s in select value from jsonb_array_elements(steps) loop
  resource:=nullif(s->>'resource_id','')::uuid;
  if not exists(select 1 from public.opportunities o,unnest(o.skills) skill where o.id=p.target_id and public.skill_key(skill)=public.skill_key(s->>'skill')) then raise exception 'Skill not required by target'; end if;
  if resource is not null and not exists(select 1 from public.learning_programs lp join public.opportunities o on o.id=lp.id where o.id=resource and o.status='Open' and o.deadline>=(now() at time zone 'Asia/Kolkata')::date and o.audience in ('student','all') and o.type in ('Training','Workshop','Mentorship') and exists(select 1 from unnest(o.skills) skill where public.skill_key(skill)=public.skill_key(s->>'skill'))) then raise exception 'Learning program unavailable or unrelated'; end if;
  due:=least(p.target_date,p.starts_on+((s->>'week')::integer*7)-1);
  insert into public.learning_goals(skill,target_id,resource_id,due_on,notes) values(trim(s->>'skill'),p.target_id,resource,due,trim(s->>'task')||E'\nEstimated effort: '||(s->>'hours')||' hours. AI-assisted, student-reviewed practice; not verified proficiency.') returning id into goal;
  result:=array_append(result,goal);
 end loop;
 update public.ai_learning_plans set reviewed_steps=steps,goal_ids=result,accepted_at=now() where id=plan;
 return result;
end $$;
revoke all on function public.accept_ai_learning_plan(uuid,jsonb) from public,anon;
grant execute on function public.accept_ai_learning_plan(uuid,jsonb) to authenticated;
commit;
