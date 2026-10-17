begin;
alter table lessonpress.audit alter column actor_id drop not null;
create table lessonpress.school_verification (
 school_id uuid primary key references lessonpress.schools(id),
 status text not null default 'unverified' check(status in ('unverified','pending','verified','changes_requested')),
 public_reference text check(length(public_reference)<=300), authority_note text check(length(authority_note)<=1000),
 requested_by uuid references auth.users(id), requested_at timestamptz,
 reviewed_by text check(length(reviewed_by)<=200), reviewed_at timestamptz, review_note text check(length(review_note)<=1000)
);
create table lessonpress.invite_usage (
 school_id uuid primary key references lessonpress.schools(id), window_start timestamptz not null, attempts integer not null check(attempts>=0)
);
alter table lessonpress.school_verification enable row level security;
alter table lessonpress.invite_usage enable row level security;
revoke all on lessonpress.school_verification,lessonpress.invite_usage from public,anon,authenticated;
insert into lessonpress.school_verification(school_id) select id from lessonpress.schools;

-- Preserve the reviewed permission checks; the wrapper adds pilot controls.
alter function lessonpress.workspace(text,jsonb) rename to workspace_v1;
create or replace function lessonpress.workspace_v1(p_action text, p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid(); actor_email text; sid uuid; did uuid; pid uuid; m lessonpress.members; p lessonpress.papers; inv lessonpress.invitations;
 result jsonb; token text; rid uuid; next_rev integer; content jsonb; action_detail jsonb := '{}';
begin
 select lower(email) into actor_email from auth.users where id=actor and email_confirmed_at is not null and (banned_until is null or banned_until < now());
 if actor is null or actor_email is null then raise exception 'Sign in with a verified email.' using errcode='28000'; end if;
 if octet_length(p_payload::text)>95000 then raise exception 'Request too large.'; end if;
 if p_action='bootstrap' then
  return jsonb_build_object('schools',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'role',mm.role,'department_id',mm.department_id) order by s.name) from lessonpress.schools s join lessonpress.members mm on mm.school_id=s.id where mm.user_id=actor),'[]'::jsonb));
 elsif p_action='create_school' then
  if (select count(*) from lessonpress.members where user_id=actor and role='principal')>=3 then raise exception 'Pilot limit: three schools per principal.'; end if;
  insert into lessonpress.schools(name) values(trim(p_payload->>'name')) returning id into sid;
  insert into lessonpress.members(school_id,user_id,role) values(sid,actor,'principal');
  insert into lessonpress.audit(school_id,actor_id,action) values(sid,actor,'school_created');
  return jsonb_build_object('id',sid);
 elsif p_action='accept_invite' then
  select * into inv from lessonpress.invitations where token_hash=encode(sha256(convert_to(p_payload->>'token','UTF8')),'hex') for update;
  if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at<=now() or inv.email<>actor_email then raise exception 'Invitation is invalid, expired, or belongs to another email.' using errcode='42501'; end if;
  if exists(select 1 from lessonpress.members where school_id=inv.school_id and user_id=actor) then raise exception 'You already belong to this school.'; end if;
  insert into lessonpress.members(school_id,user_id,role,department_id) values(inv.school_id,actor,inv.role,inv.department_id);
  update lessonpress.invitations set accepted_at=now() where id=inv.id;
  insert into lessonpress.audit(school_id,actor_id,action,detail) values(inv.school_id,actor,'invitation_accepted',jsonb_build_object('role',inv.role));
  return jsonb_build_object('id',inv.school_id);
 end if;
 sid := (p_payload->>'school_id')::uuid;
 select * into m from lessonpress.members where school_id=sid and user_id=actor;
 if not found then raise exception 'School access denied.' using errcode='42501'; end if;
 if p_action='dashboard' then
  return jsonb_build_object(
   'departments',coalesce((select jsonb_agg(d order by d.name) from lessonpress.departments d where school_id=sid and (m.role='principal' or id=m.department_id)),'[]'::jsonb),
   'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',mm.user_id,'email',u.email,'role',mm.role,'department_id',mm.department_id)) from lessonpress.members mm join auth.users u on u.id=mm.user_id where mm.school_id=sid and (m.role='principal' or mm.user_id=actor)),'[]'::jsonb),
   'invitations',case when m.role='principal' then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'department_id',i.department_id,'expires_at',i.expires_at,'accepted_at',i.accepted_at,'revoked_at',i.revoked_at)) from lessonpress.invitations i where i.school_id=sid),'[]'::jsonb) else '[]'::jsonb end,
   'papers',coalesce((select jsonb_agg(jsonb_build_object('id',pp.id,'department_id',pp.department_id,'author_id',pp.author_id,'status',case when m.role='teacher' and pp.author_id<>actor then 'approved' else pp.status end,'revision',rr.revision,'approved_revision',pp.approved_revision,'title',rr.content->'spec'->>'title','subject',rr.content->'spec'->>'subject','level',rr.content->'spec'->>'level','updated_at',pp.updated_at) order by pp.updated_at desc) from lessonpress.papers pp join lessonpress.revisions rr on rr.paper_id=pp.id and rr.revision=case when m.role='teacher' and pp.author_id<>actor then pp.approved_revision else pp.revision end where pp.school_id=sid and (m.role='principal' or pp.department_id=m.department_id) and (m.role<>'teacher' or pp.author_id=actor or pp.approved_revision is not null)),'[]'::jsonb),
   'audit',case when m.role='principal' then coalesce((select jsonb_agg(a order by a.id desc) from (select id,action,actor_id,paper_id,detail,created_at from lessonpress.audit where school_id=sid order by id desc limit 50) a),'[]'::jsonb) else '[]'::jsonb end);
 elsif p_action='create_department' then
  if m.role<>'principal' then raise exception 'Only principals can manage departments.' using errcode='42501'; end if;
  insert into lessonpress.departments(school_id,name) values(sid,trim(p_payload->>'name')) returning id into did;
  result:=jsonb_build_object('id',did); action_detail:=jsonb_build_object('name',p_payload->>'name');
 elsif p_action='invite' then
  if m.role<>'principal' then raise exception 'Only principals can invite staff.' using errcode='42501'; end if;
  if p_payload->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email.'; end if;
  token:=gen_random_uuid()::text||gen_random_uuid()::text;
  insert into lessonpress.invitations(school_id,email,role,department_id,token_hash,created_by) values(sid,lower(trim(p_payload->>'email')),p_payload->>'role',(p_payload->>'department_id')::uuid,encode(sha256(convert_to(token,'UTF8')),'hex'),actor) returning id into rid;
  result:=jsonb_build_object('id',rid,'token',token); action_detail:=jsonb_build_object('invitation_id',rid);
 elsif p_action='revoke_invite' then
  if m.role<>'principal' then raise exception 'Only principals can revoke invitations.' using errcode='42501'; end if;
  update lessonpress.invitations set revoked_at=now() where id=(p_payload->>'id')::uuid and school_id=sid and accepted_at is null;
  result:='{}';
 elsif p_action='remove_member' then
  if m.role<>'principal' then raise exception 'Only principals can manage staff.' using errcode='42501'; end if;
  delete from lessonpress.members where school_id=sid and user_id=(p_payload->>'user_id')::uuid and role<>'principal';
  result:='{}'; action_detail:=jsonb_build_object('user_id',p_payload->>'user_id');
 elsif p_action in ('save_paper','paper','submit','review') then
  pid:=(p_payload->>'paper_id')::uuid;
  if pid is null and p_action='save_paper' then
   did:=(p_payload->>'department_id')::uuid;
   if did is null or (m.role<>'principal' and did<>m.department_id) then raise exception 'Department access denied.' using errcode='42501'; end if;
   insert into lessonpress.papers(school_id,department_id,author_id) values(sid,did,actor) returning * into p;
   pid:=p.id;
  else
   select * into p from lessonpress.papers where id=pid and school_id=sid for update;
   if not found or (m.role<>'principal' and p.department_id<>m.department_id) then raise exception 'Paper access denied.' using errcode='42501'; end if;
  end if;
  if p_action='paper' then
   if p.author_id<>actor and m.role='teacher' and p.approved_revision is null then raise exception 'Paper access denied.' using errcode='42501'; end if;
   next_rev:=coalesce((p_payload->>'revision')::integer,case when m.role='teacher' and p.author_id<>actor then p.approved_revision else p.revision end);
   if m.role='teacher' and p.author_id<>actor and next_rev<>p.approved_revision then raise exception 'Only the approved copy is shared.' using errcode='42501'; end if;
   select r.content into content from lessonpress.revisions r where r.paper_id=pid and r.revision=next_rev;
   if content is null then raise exception 'Version not found.'; end if;
   return jsonb_build_object('id',pid,'author_id',p.author_id,'department_id',p.department_id,'status',case when m.role='teacher' and p.author_id<>actor then 'approved' else p.status end,'revision',next_rev,'current_revision',p.revision,'approved_revision',p.approved_revision,'content',content,
    'versions',coalesce((select jsonb_agg(jsonb_build_object('revision',r.revision,'created_at',r.created_at) order by r.revision desc) from lessonpress.revisions r where r.paper_id=pid and (m.role<>'teacher' or p.author_id=actor or r.revision=p.approved_revision)),'[]'::jsonb),
    'reviews',coalesce((select jsonb_agg(r order by r.created_at) from lessonpress.reviews r where r.paper_id=pid and r.revision=next_rev),'[]'::jsonb));
  end if;
  if p_action='save_paper' then
   if p.author_id<>actor then raise exception 'Only the author can edit this paper.' using errcode='42501'; end if;
   if p.revision<>coalesce((p_payload->>'expected_revision')::integer,0) then raise exception 'Another version was saved. Reload before saving.' using errcode='40001'; end if;
   if p.status='submitted' then raise exception 'Withdraw through a changes request before editing a submitted paper.'; end if;
   content:=p_payload->'content';
   if jsonb_typeof(content)<>'object' or jsonb_typeof(content->'spec') is distinct from 'object' or jsonb_typeof(content->'paper'->'questions') is distinct from 'array' or length(content->'spec'->>'title') not between 3 and 100 or jsonb_array_length(content->'paper'->'questions') not between 3 and 20 then raise exception 'Invalid assessment content.'; end if;
   next_rev:=p.revision+1;
   insert into lessonpress.revisions(paper_id,revision,content,created_by) values(pid,next_rev,content,actor);
   update lessonpress.papers set revision=next_rev,status='draft',updated_at=now() where id=pid;
   result:=jsonb_build_object('id',pid,'revision',next_rev); action_detail:=jsonb_build_object('revision',next_rev);
  elsif p_action='submit' then
   if p.author_id<>actor or p.status not in ('draft','changes_requested') or p.revision=0 then raise exception 'This paper cannot be submitted.' using errcode='42501'; end if;
   if p.revision is distinct from (p_payload->>'expected_revision')::integer then raise exception 'Reload the latest version.' using errcode='40001'; end if;
   update lessonpress.papers set status='submitted',updated_at=now() where id=pid;
   result:='{}'; action_detail:=jsonb_build_object('revision',p.revision);
  elsif p_action='review' then
   if m.role not in ('principal','hod') or p.author_id=actor or p.status<>'submitted' then raise exception 'An independent principal or department head must review a submitted paper.' using errcode='42501'; end if;
   if p.revision is distinct from (p_payload->>'expected_revision')::integer then raise exception 'Reload the latest version.' using errcode='40001'; end if;
   insert into lessonpress.reviews(paper_id,revision,reviewer_id,decision,question,comment) values(pid,p.revision,actor,p_payload->>'decision',(p_payload->>'question')::integer,trim(p_payload->>'comment'));
   if p_payload->>'decision' in ('approved','changes_requested') then update lessonpress.papers set status=p_payload->>'decision',approved_revision=case when p_payload->>'decision'='approved' then p.revision else approved_revision end,updated_at=now() where id=pid; end if;
   result:='{}'; action_detail:=jsonb_build_object('decision',p_payload->>'decision','revision',p.revision,'question',p_payload->'question');
  end if;
 else raise exception 'Unknown workspace action.';
 end if;
 insert into lessonpress.audit(school_id,actor_id,action,paper_id,detail) values(sid,actor,p_action,pid,action_detail);
 return result;
end;
$$;

revoke all on function lessonpress.workspace_v1(text,jsonb) from public,anon,authenticated;
create function lessonpress.workspace(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); sid uuid; m lessonpress.members; result jsonb; v lessonpress.school_verification;
 p jsonb; records jsonb; aid bigint; before_id bigint; action_filter text; used integer; ref text; note text;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Sign in with a verified email.' using errcode='28000'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>95000 then raise exception 'Request too large.'; end if;
 if p_action='create_school' then
  result:=lessonpress.workspace_v1(p_action,p_payload);
  insert into lessonpress.school_verification(school_id) values((result->>'id')::uuid);
  return result;
 elsif p_action='bootstrap' then
  result:=lessonpress.workspace_v1(p_action,p_payload);
  select coalesce(jsonb_agg(s||jsonb_build_object('verification_status',coalesce(vv.status,'unverified'))),'[]'::jsonb) into records from jsonb_array_elements(result->'schools') s left join lessonpress.school_verification vv on vv.school_id=(s->>'id')::uuid;
  return jsonb_build_object('schools',records);
 elsif p_action='accept_invite' then
  -- Existing invitations retain their original email, expiry and one-use checks.
  return lessonpress.workspace_v1(p_action,p_payload);
 end if;
 sid:=(p_payload->>'school_id')::uuid;
 select * into m from lessonpress.members where school_id=sid and user_id=actor;
 if not found then raise exception 'School access denied.' using errcode='42501'; end if;
 select * into v from lessonpress.school_verification where school_id=sid;
 if p_action='verification_request' then
  if m.role<>'principal' then raise exception 'Only principals can request verification.' using errcode='42501'; end if;
  if v.status in ('pending','verified') then raise exception 'This school already has a pending or completed verification.'; end if;
  ref:=trim(coalesce(p_payload->>'public_reference',''));note:=trim(coalesce(p_payload->>'authority_note',''));
  if length(ref) not between 8 and 300 or ref !~ '^https://[^[:space:]]+$' or length(note) not between 20 and 1000 then raise exception 'Enter a public HTTPS school reference and explain your role in 20–1000 characters.'; end if;
  -- Never fetch this URL automatically. It is a reference for human review.
  update lessonpress.school_verification set status='pending',public_reference=ref,authority_note=note,requested_by=actor,requested_at=now(),reviewed_by=null,reviewed_at=null,review_note=null where school_id=sid and status in ('unverified','changes_requested');
  if not found then raise exception 'Reload the latest verification status.' using errcode='40001'; end if;
  insert into lessonpress.audit(school_id,actor_id,action) values(sid,actor,'verification_requested');
  return jsonb_build_object('status','pending');
 elsif p_action='audit_list' then
  if m.role<>'principal' then raise exception 'Only principals can read the school activity log.' using errcode='42501'; end if;
  before_id:=coalesce((p_payload->>'before_id')::bigint,9223372036854775807);
  action_filter:=nullif(left(p_payload->>'event',60),'');
  select coalesce(jsonb_agg(row_data order by event_id desc),'[]'::jsonb),min(event_id) into records,aid from (
   select a.id event_id,jsonb_build_object('id',a.id::text,'action',a.action,'actor_id',a.actor_id,'actor_label',coalesce(a.detail->>'operator',u.email,a.actor_id::text,'Platform operator'),'paper_id',a.paper_id,'paper_title',r.content->'spec'->>'title','detail',a.detail,'created_at',a.created_at) row_data
   from lessonpress.audit a left join auth.users u on u.id=a.actor_id
   left join lessonpress.papers pp on pp.id=a.paper_id and pp.school_id=a.school_id
   left join lessonpress.revisions r on r.paper_id=pp.id and r.revision=coalesce((a.detail->>'revision')::integer,pp.revision)
   where a.school_id=sid and a.id<before_id and (action_filter is null or a.action=action_filter)
   order by a.id desc limit 50
  ) page;
  return jsonb_build_object('events',records,'next_before',case when jsonb_array_length(records)=50 then aid::text else null end);
 elsif p_action='print_request' then
  -- Reuse the exact paper/revision visibility rules, including approved-only copies.
  p:=lessonpress.workspace_v1('paper',p_payload);
  if coalesce(p_payload->>'copy','') not in ('student','teacher') then raise exception 'Choose a student copy or marking guide.'; end if;
  insert into lessonpress.audit(school_id,actor_id,action,paper_id,detail) values(sid,actor,'print_requested',(p->>'id')::uuid,jsonb_build_object('revision',(p->>'revision')::integer,'copy',p_payload->>'copy'));
  return jsonb_build_object('ok',true);
 elsif p_action='invite' then
  if m.role<>'principal' then raise exception 'Only principals can invite staff.' using errcode='42501'; end if;
  if v.status is distinct from 'verified' then raise exception 'School verification is required before creating new invitations.' using errcode='42501'; end if;
  insert into lessonpress.invite_usage as usage(school_id,window_start,attempts) values(sid,now(),1)
  on conflict(school_id) do update set window_start=case when usage.window_start<=now()-interval '1 hour' then now() else usage.window_start end,attempts=case when usage.window_start<=now()-interval '1 hour' then 1 else usage.attempts+1 end returning attempts into used;
  if used>20 then raise exception 'School invitation limit reached. Try again after the hourly window resets.' using errcode='P0429'; end if;
 end if;
 result:=lessonpress.workspace_v1(p_action,p_payload);
 if p_action='dashboard' then
  return result||jsonb_build_object('verification',case when m.role='principal' then to_jsonb(v)-'school_id' else jsonb_build_object('status',coalesce(v.status,'unverified')) end);
 end if;
 return result;
end $$;
revoke all on function lessonpress.workspace(text,jsonb) from public,anon;
grant execute on function lessonpress.workspace(text,jsonb) to authenticated;

-- Operator-only. School members cannot execute this or write verification rows.
-- Verification requires an independent check of institutional identity AND authority.
create function lessonpress.record_verification(p_school uuid,p_decision text,p_reviewer text,p_note text) returns void
language plpgsql security definer set search_path='' as $$
declare requester uuid;
begin
 if p_decision not in ('verified','changes_requested') or length(trim(p_reviewer)) not between 3 and 200 or length(trim(p_note)) not between 20 and 1000 then raise exception 'Record a reviewer, decision and meaningful verification evidence.'; end if;
 select requested_by into requester from lessonpress.school_verification where school_id=p_school and status='pending' for update;
 if not found then raise exception 'No pending verification request.'; end if;
 update lessonpress.school_verification set status=p_decision,reviewed_by=trim(p_reviewer),reviewed_at=now(),review_note=trim(p_note) where school_id=p_school;
 insert into lessonpress.audit(school_id,actor_id,action,detail) values(p_school,null,'verification_decided',jsonb_build_object('decision',p_decision,'operator',trim(p_reviewer)));
end $$;
revoke all on function lessonpress.record_verification(uuid,text,text,text) from public,anon,authenticated;
create or replace function public.lp_workspace(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select lessonpress.workspace(p_action,p_payload); $$;
revoke all on function public.lp_workspace(text,jsonb) from public,anon;
grant execute on function public.lp_workspace(text,jsonb) to authenticated;
commit;
