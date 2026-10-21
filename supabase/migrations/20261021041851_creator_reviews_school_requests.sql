begin;
-- Membership discovery is separate from the optional public map listing.
create table lessonpress.school_discovery (
 school_id uuid primary key references lessonpress.schools(id), enabled boolean not null default false,
 updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now()
);
create table lessonpress.school_join_requests (
 id uuid primary key default gen_random_uuid(),school_id uuid not null references lessonpress.schools(id),
 user_id uuid not null references auth.users(id),department_id uuid not null,
 context text not null check(length(context) between 40 and 1000),
 status text not null default 'pending' check(status in ('pending','approved','changes_requested','declined')),
 version integer not null default 1,requested_at timestamptz not null default now(),reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),review_note text not null default '',
 unique(school_id,user_id),foreign key(department_id,school_id) references lessonpress.departments(id,school_id)
);
create index school_join_user_idx on lessonpress.school_join_requests(user_id);
create index school_join_queue_idx on lessonpress.school_join_requests(id) where status='pending';
create table lessonpress.access_events (
 id bigint generated always as identity primary key,actor_id uuid not null references auth.users(id),
 kind text not null check(kind in ('educator','school','join')),target_id uuid not null,
 decision text not null,note text not null check(length(note) between 20 and 1500),created_at timestamptz not null default now()
);
alter table lessonpress.school_discovery enable row level security;
alter table lessonpress.school_join_requests enable row level security;
alter table lessonpress.access_events enable row level security;
revoke all on lessonpress.school_discovery,lessonpress.school_join_requests,lessonpress.access_events from public,anon,authenticated;
revoke all on sequence lessonpress.access_events_id_seq from public,anon,authenticated;

create function lessonpress.access_centre(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();operator boolean;sid uuid;did uuid;target uuid;kind text;decision text;note text;
 request_profile lessonpress.educator_applications;school_review lessonpress.school_verification;join_row lessonpress.school_join_requests;
 rows_json jsonb;cursor uuid;q text;is_enabled boolean;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Verified sign-in required.' using errcode='28000';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>6000 then raise exception 'Invalid access request.' using errcode='22023';end if;
 operator:=exists(select 1 from lessonpress.app_operators where user_id=actor);
 if p_action='bootstrap' then
  return jsonb_build_object('operator',operator,'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'school',s.name,'status',r.status,'context',r.context,'requestedAt',r.requested_at,'reviewNote',r.review_note,'reviewedAt',r.reviewed_at) order by r.requested_at desc) from lessonpress.school_join_requests r join lessonpress.schools s on s.id=r.school_id where r.user_id=actor),'[]'::jsonb),
   'managedSchools',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'enabled',coalesce(d.enabled,false))) from lessonpress.schools s join lessonpress.members m on m.school_id=s.id left join lessonpress.school_discovery d on d.school_id=s.id where m.user_id=actor and m.role='principal'),'[]'::jsonb));
 elsif p_action='set_listing' then
  sid:=(p_payload->>'school_id')::uuid;
  if not exists(select 1 from lessonpress.members where school_id=sid and user_id=actor and role='principal') then raise exception 'Only this school’s administrator can enable discovery.' using errcode='42501';end if;
  if jsonb_typeof(p_payload->'enabled') is distinct from 'boolean' then raise exception 'Choose whether staff can find your school.' using errcode='22023';end if;
  is_enabled:=(p_payload->>'enabled')::boolean;
  insert into lessonpress.school_discovery(school_id,enabled,updated_by) values(sid,is_enabled,actor) on conflict(school_id) do update set enabled=excluded.enabled,updated_by=actor,updated_at=now();
  insert into lessonpress.audit(school_id,actor_id,action,detail) values(sid,actor,'staff_discovery_changed',jsonb_build_object('enabled',is_enabled));
  return jsonb_build_object('ok',true);
 elsif p_action='search' then
  q:=trim(coalesce(p_payload->>'search',''));cursor:=(p_payload->>'after')::uuid;
  if length(q)>100 then raise exception 'Search using at most 100 characters.' using errcode='22023';end if;
  select coalesce(jsonb_agg(data order by id),'[]'::jsonb) into rows_json from (
   select s.id,jsonb_build_object('id',s.id,'name',s.name,'verified',coalesce(v.status='verified',false),'member',exists(select 1 from lessonpress.members m where m.school_id=s.id and m.user_id=actor),'departments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name) order by d.name) from lessonpress.departments d where d.school_id=s.id),'[]'::jsonb)) data
   from lessonpress.schools s join lessonpress.school_discovery p on p.school_id=s.id and p.enabled left join lessonpress.school_verification v on v.school_id=s.id
   where (q='' or position(lower(q) in lower(s.name))>0) and (cursor is null or s.id>cursor) order by s.id limit 21
  ) page;
 elsif p_action='request_join' then
  sid:=(p_payload->>'school_id')::uuid;did:=(p_payload->>'department_id')::uuid;note:=trim(coalesce(p_payload->>'context',''));
  if length(note) not between 40 and 1000 then raise exception 'Describe your connection to the school using 40–1,000 characters.' using errcode='22023';end if;
  select * into request_profile from lessonpress.educator_applications where user_id=actor for update;
  if not found or request_profile.status='revoked' then raise exception 'Submit your educator profile in My workspace first. Revoked access requires a separate review.' using errcode='42501';end if;
  if not exists(select 1 from lessonpress.school_discovery where school_id=sid and enabled) or not exists(select 1 from lessonpress.departments where school_id=sid and id=did) then raise exception 'This school or department is not accepting requests. Refresh the search.' using errcode='22023';end if;
  if exists(select 1 from lessonpress.members where school_id=sid and user_id=actor) then raise exception 'You already belong to this school.' using errcode='22023';end if;
  if (select count(*) from lessonpress.school_join_requests where user_id=actor and school_id<>sid and status='pending')>=3 then raise exception 'Wait for review of your existing school requests.' using errcode='22023';end if;
  insert into lessonpress.school_join_requests(school_id,user_id,department_id,context) values(sid,actor,did,note)
   on conflict(school_id,user_id) do update set department_id=excluded.department_id,context=excluded.context,status='pending',version=lessonpress.school_join_requests.version+1,requested_at=clock_timestamp(),reviewed_at=null,reviewed_by=null,review_note='';
  return jsonb_build_object('ok',true);
 elsif p_action in ('queue','review','history') then
  if not operator then raise exception 'Creator review access required.' using errcode='42501';end if;
  kind:=p_payload->>'kind';cursor:=(p_payload->>'after')::uuid;
  if p_action='history' then
   return jsonb_build_object('events',coalesce((select jsonb_agg(e order by e.id desc) from (select * from lessonpress.access_events order by id desc limit 50) e),'[]'::jsonb));
  end if;
  if kind is null or kind not in ('educator','school','join') then raise exception 'Choose a review queue.' using errcode='22023';end if;
  if p_action='queue' then
   if kind='educator' then
    select coalesce(jsonb_agg(data order by id),'[]'::jsonb) into rows_json from (select a.user_id id,jsonb_build_object('id',a.user_id,'email',u.email,'profile',a.profile,'status',a.status,'version',a.requested_at,'self',a.user_id=actor) data from lessonpress.educator_applications a join auth.users u on u.id=a.user_id where a.status='pending' and (cursor is null or a.user_id>cursor) order by a.user_id limit 21) page;
   elsif kind='school' then
    select coalesce(jsonb_agg(data order by id),'[]'::jsonb) into rows_json from (select v.school_id id,jsonb_build_object('id',v.school_id,'school',s.name,'reference',v.public_reference,'context',v.authority_note,'version',v.requested_at,'self',v.requested_by=actor or exists(select 1 from lessonpress.members m where m.school_id=v.school_id and m.user_id=actor and m.role='principal')) data from lessonpress.school_verification v join lessonpress.schools s on s.id=v.school_id where v.status='pending' and (cursor is null or v.school_id>cursor) order by v.school_id limit 21) page;
   else
    select coalesce(jsonb_agg(data order by id),'[]'::jsonb) into rows_json from (select r.id,jsonb_build_object('id',r.id,'school',s.name,'email',u.email,'profile',a.profile,'educatorStatus',a.status,'context',r.context,'version',r.version,'departmentId',r.department_id,'verified',coalesce(v.status='verified',false),'self',r.user_id=actor,'departments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name) order by d.name) from lessonpress.departments d where d.school_id=s.id),'[]'::jsonb)) data from lessonpress.school_join_requests r join lessonpress.schools s on s.id=r.school_id join auth.users u on u.id=r.user_id left join lessonpress.educator_applications a on a.user_id=r.user_id left join lessonpress.school_verification v on v.school_id=s.id where r.status='pending' and (cursor is null or r.id>cursor) order by r.id limit 21) page;
   end if;
  else
   target:=(p_payload->>'id')::uuid;decision:=p_payload->>'decision';note:=trim(coalesce(p_payload->>'note',''));
   if target is null or length(note) not between 20 and 1000 or decision is null then raise exception 'Record a decision and 20–1,000 characters describing the checks you performed.' using errcode='22023';end if;
   if kind='educator' then
    if target=actor then raise exception 'You cannot review your own educator request.' using errcode='42501';end if;
    if decision not in ('approved','changes_requested','revoked') then raise exception 'Invalid educator decision.' using errcode='22023';end if;
    select * into request_profile from lessonpress.educator_applications where user_id=target for update;
    if not found or request_profile.status<>'pending' or request_profile.requested_at is distinct from (p_payload->>'version')::timestamptz then raise exception 'Request changed. Refresh the queue before deciding.' using errcode='40001';end if;
    perform lessonpress.review_educator(target,decision,actor::text,note);
   elsif kind='school' then
    if decision not in ('verified','changes_requested') then raise exception 'Invalid school decision.' using errcode='22023';end if;
    select * into school_review from lessonpress.school_verification where school_id=target for update;
    if not found or school_review.status<>'pending' or school_review.requested_at is distinct from (p_payload->>'version')::timestamptz then raise exception 'School request changed. Refresh the queue.' using errcode='40001';end if;
    if school_review.requested_by=actor or exists(select 1 from lessonpress.members where school_id=target and user_id=actor and role='principal') then raise exception 'Your own school needs independent verification.' using errcode='42501';end if;
    perform lessonpress.record_verification(target,decision,actor::text,note);
   else
    if decision not in ('approved','changes_requested','declined') then raise exception 'Invalid membership decision.' using errcode='22023';end if;
    select * into join_row from lessonpress.school_join_requests where id=target for update;
    if not found or join_row.status<>'pending' or join_row.version is distinct from (p_payload->>'version')::integer then raise exception 'Membership request changed. Refresh the queue.' using errcode='40001';end if;
    if join_row.user_id=actor then raise exception 'You cannot approve your own membership request.' using errcode='42501';end if;
    if decision='approved' then
     perform 1 from lessonpress.school_verification where school_id=join_row.school_id and status='verified' for share;
     if not found then raise exception 'Verify the school identity before approving staff access.' using errcode='22023';end if;
     perform 1 from lessonpress.educator_applications where user_id=join_row.user_id and status<>'revoked' for share;
     if not found or not exists(select 1 from auth.users where id=join_row.user_id and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Applicant needs a valid educator profile and active account.' using errcode='22023';end if;
     did:=(p_payload->>'department_id')::uuid;
     if not exists(select 1 from lessonpress.departments where id=did and school_id=join_row.school_id) then raise exception 'Choose a department in this school.' using errcode='22023';end if;
     -- Existing roles are never overwritten or upgraded by a membership request.
     insert into lessonpress.members(school_id,user_id,role,department_id) values(join_row.school_id,join_row.user_id,'teacher',did) on conflict(school_id,user_id) do nothing;
     insert into lessonpress.audit(school_id,actor_id,action,detail) values(join_row.school_id,actor,'staff_request_approved',jsonb_build_object('request_id',join_row.id,'user_id',join_row.user_id,'role','teacher','department_id',did));
    end if;
    update lessonpress.school_join_requests set status=decision,version=version+1,reviewed_at=now(),reviewed_by=actor,review_note=note where id=target;
   end if;
   insert into lessonpress.access_events(actor_id,kind,target_id,decision,note) values(actor,kind,target,decision,note);
   return jsonb_build_object('ok',true);
  end if;
 else raise exception 'Unknown access action.' using errcode='22023';end if;
 if jsonb_array_length(rows_json)>20 then return jsonb_build_object('items',rows_json-20,'nextAfter',rows_json->19->>'id');end if;
 return jsonb_build_object('items',rows_json,'nextAfter',null);
end $$;
revoke all on function lessonpress.access_centre(text,jsonb) from public,anon;
grant execute on function lessonpress.access_centre(text,jsonb) to authenticated;
create function public.lp_access(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select lessonpress.access_centre(p_action,p_payload); $$;
revoke all on function public.lp_access(text,jsonb) from public,anon;
grant execute on function public.lp_access(text,jsonb) to authenticated;
commit;
