begin;
create table lessonpress.educator_applications(
 user_id uuid primary key references auth.users(id) on delete cascade,
 profile jsonb not null,status text not null default 'pending' check(status in ('pending','approved','changes_requested','revoked')),
 requested_at timestamptz not null default now(),reviewed_at timestamptz,review_note text not null default '',reviewer text,
 check(octet_length(profile::text)<=10000),check(length(review_note)<=1500)
);
create table lessonpress.educator_reviews(id bigint generated always as identity primary key,user_id uuid not null references auth.users(id),decision text not null,reviewer text not null,note text not null,created_at timestamptz not null default now());
alter table lessonpress.educator_reviews enable row level security;
revoke all on lessonpress.educator_reviews from public,anon,authenticated;
revoke all on sequence lessonpress.educator_reviews_id_seq from public,anon,authenticated;
create table lessonpress.app_operators(user_id uuid primary key references auth.users(id) on delete cascade,reason text not null,created_at timestamptz not null default now());
alter table lessonpress.educator_applications enable row level security;
alter table lessonpress.app_operators enable row level security;
revoke all on lessonpress.educator_applications,lessonpress.app_operators from public,anon,authenticated;
create function public.lp_educator(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();a lessonpress.educator_applications;source text;allowed boolean:=false;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Verified sign-in required.' using errcode='28000';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>10000 then raise exception 'Invalid educator request.' using errcode='22023';end if;
 if p_action='request' then
  if coalesce(p_payload->>'role','') not in ('teacher','school_leader','education_staff') or p_payload->'confirmEducator' is distinct from 'true'::jsonb then raise exception 'Confirm your education role.' using errcode='22023';end if;
  if coalesce(length(trim(p_payload->>'name')),0) not between 2 and 80 or coalesce(length(trim(p_payload->>'organisation')),0) not between 2 and 120 or coalesce(length(trim(p_payload->>'subjects')),0) not between 2 and 200 or coalesce(length(trim(p_payload->>'levels')),0) not between 2 and 120 or coalesce(length(trim(p_payload->>'context')),0) not between 40 and 1000 or length(coalesce(p_payload->>'reference',''))>300 then raise exception 'Check your educator request details.' using errcode='22023';end if;
  insert into lessonpress.educator_applications(user_id,profile) values(actor,jsonb_build_object('name',p_payload->>'name','role',p_payload->>'role','organisation',p_payload->>'organisation','subjects',p_payload->>'subjects','levels',p_payload->>'levels','context',p_payload->>'context','reference',coalesce(p_payload->>'reference','')))
  on conflict(user_id) do update set profile=excluded.profile,status=case when lessonpress.educator_applications.status='revoked' then 'revoked' else 'pending' end,requested_at=now(),reviewed_at=null,review_note='',reviewer=null;
 elsif p_action<>'status' then raise exception 'Invalid educator action.' using errcode='22023';end if;
 select * into a from lessonpress.educator_applications where user_id=actor;
 if exists(select 1 from lessonpress.app_operators where user_id=actor) then source:='operator';allowed:=true;
 elsif a.status='revoked' then source:='revoked';
 elsif exists(select 1 from lessonpress.members m join lessonpress.school_verification v on v.school_id=m.school_id where m.user_id=actor and v.status='verified') then source:='verified_school';allowed:=true;
 elsif a.status='approved' then source:='approved';allowed:=true;
 else source:=coalesce(a.status,'not_requested');end if;
 return jsonb_build_object('allowed',allowed,'status',source,'application',case when a.user_id is null then null else jsonb_build_object('profile',a.profile,'status',a.status,'requestedAt',a.requested_at,'reviewedAt',a.reviewed_at,'reviewNote',a.review_note) end);
end $$;
revoke all on function public.lp_educator(text,jsonb) from public,anon;
grant execute on function public.lp_educator(text,jsonb) to authenticated;
create function lessonpress.review_educator(p_user uuid,p_decision text,p_reviewer text,p_note text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_decision not in ('approved','changes_requested','revoked') or length(trim(p_reviewer)) not between 2 and 100 or length(trim(p_note)) not between 20 and 1500 then raise exception 'Record a reviewer, decision and review reason.';end if;
 update lessonpress.educator_applications set status=p_decision,reviewed_at=now(),review_note=p_note,reviewer=p_reviewer where user_id=p_user;
 if not found then raise exception 'Educator request not found.';end if;
 insert into lessonpress.educator_reviews(user_id,decision,reviewer,note) values(p_user,p_decision,p_reviewer,p_note);
end $$;
revoke all on function lessonpress.review_educator(uuid,text,text,text) from public,anon,authenticated;
grant execute on function lessonpress.review_educator(uuid,text,text,text) to service_role;
-- Gate both exposed RPCs and their previously authorised entry points.
alter function lessonpress.workspace(text,jsonb) rename to workspace_before_educator;
revoke all on function lessonpress.workspace_before_educator(text,jsonb) from public,anon,authenticated;
create function lessonpress.workspace(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_action not in ('bootstrap','accept_invite') and not coalesce((public.lp_educator('status')->>'allowed')::boolean,false) then raise exception 'Educator approval required.' using errcode='42501';end if;
 return lessonpress.workspace_before_educator(p_action,p_payload);
end $$;
revoke all on function lessonpress.workspace(text,jsonb) from public,anon;
grant execute on function lessonpress.workspace(text,jsonb) to authenticated;
alter function public.lp_personal_lessons(text,jsonb) set schema lessonpress;
alter function lessonpress.lp_personal_lessons(text,jsonb) rename to personal_lessons_before_educator;
revoke all on function lessonpress.personal_lessons_before_educator(text,jsonb) from public,anon,authenticated;
create function public.lp_personal_lessons(p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not coalesce((public.lp_educator('status')->>'allowed')::boolean,false) then raise exception 'Educator approval required.' using errcode='42501';end if;
 return lessonpress.personal_lessons_before_educator(p_action,p_payload);
end $$;
revoke all on function public.lp_personal_lessons(text,jsonb) from public,anon;
grant execute on function public.lp_personal_lessons(text,jsonb) to authenticated;
commit;
