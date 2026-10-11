begin;
create table private.ai_request_budgets(user_id uuid primary key references public.profiles(id),next_at timestamptz not null default '-infinity',budget_day date not null default current_date,used integer not null default 0);
revoke all on private.ai_request_budgets from public,anon,authenticated;
grant all on private.ai_request_budgets to service_role;
-- Fixed server policy, shared across endpoints and instances: 1/minute, 30/UTC day.
create function public.reserve_ai_request() returns integer language plpgsql security definer set search_path='' as $$
declare b private.ai_request_budgets; utc_day date:=(now() at time zone 'UTC')::date;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 insert into private.ai_request_budgets(user_id,budget_day) values(auth.uid(),utc_day) on conflict do nothing;
 select * into b from private.ai_request_budgets where user_id=auth.uid() for update;
 if b.next_at>now() then return greatest(1,ceil(extract(epoch from b.next_at-now()))::integer); end if;
 if b.budget_day=utc_day and b.used>=30 then return greatest(1,ceil(extract(epoch from ((utc_day+1)::timestamp at time zone 'UTC')-now()))::integer); end if;
 update private.ai_request_budgets set next_at=now()+interval '60 seconds',budget_day=utc_day,used=case when b.budget_day=utc_day then b.used+1 else 1 end where user_id=auth.uid();
 return 0;
end $$;
revoke all on function public.reserve_ai_request() from public,anon;
grant execute on function public.reserve_ai_request() to authenticated;
commit;
