begin;
create function private.notify_credential_review() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.credential_review_requests; recipient uuid; destination text; message text;
begin
 select * into r from public.credential_review_requests where id=new.request_id;
 if not exists(select 1 from public.institution_memberships m where m.institution_id=r.institution_id and m.member_id=r.student_id and m.status='Approved') then return new; end if;
 if new.decision='Requested' and new.actor_id=r.student_id then
  recipient:=r.institution_id;
  destination:='/institution/credential-reviews?review='||r.id::text;
  message:='A credential review request needs your attention';
 elsif new.actor_id=r.institution_id and new.decision in ('Approved','Changes requested','Declined','Revoked') then
  recipient:=r.student_id;
  destination:='/student/credential-reviews?review='||r.id::text;
  message:=case new.decision when 'Approved' then 'Your submitted credential version was institution-reviewed' when 'Changes requested' then 'Corrections were requested for your credential review' when 'Declined' then 'Your credential review request was declined' else 'An institution credential-review approval was revoked' end;
 else return new;
 end if;
 perform private.send_notification(recipient,'Credential review',message,destination,'credential-review-event:'||new.id::text);
 return new;
end $$;
revoke all on function private.notify_credential_review() from public,anon,authenticated;
create trigger notify_credential_review_event after insert on public.credential_review_events for each row execute function private.notify_credential_review();
commit;
