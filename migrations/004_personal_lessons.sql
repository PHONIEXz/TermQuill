begin;
create table lessonpress.personal_libraries(owner_id uuid primary key references auth.users(id) on delete cascade);
create sequence lessonpress.personal_lesson_versions;
create table lessonpress.personal_lessons(
 owner_id uuid not null references lessonpress.personal_libraries(owner_id) on delete cascade,
 id text not null check(id ~ '^[A-Za-z0-9_-]{1,80}$'),content jsonb not null,
 version bigint not null default nextval('lessonpress.personal_lesson_versions'),deleted_at timestamptz,
 primary key(owner_id,id),check(octet_length(content::text)<=90000)
);
alter table lessonpress.personal_libraries enable row level security;
alter table lessonpress.personal_lessons enable row level security;
revoke all on lessonpress.personal_libraries,lessonpress.personal_lessons from public,anon,authenticated;
revoke all on sequence lessonpress.personal_lesson_versions from public,anon,authenticated;
create function lessonpress.valid_personal_note(n jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(n)='object'
 and jsonb_typeof(n->'id')='string' and n->>'id' ~ '^[A-Za-z0-9_-]{1,80}$'
 and jsonb_typeof(n->'year')='string' and n->>'year' ~ '^[0-9]{4}/[0-9]{4}$'
 and case when n->>'year' ~ '^[0-9]{4}/[0-9]{4}$' then right(n->>'year',4)::int=left(n->>'year',4)::int+1 else false end
 and jsonb_typeof(n->'level')='string' and length(trim(n->>'level')) between 2 and 50
 and jsonb_typeof(n->'subject')='string' and length(trim(n->>'subject')) between 2 and 60
 and n->>'term' in ('1','2','3')
 and jsonb_typeof(n->'week')='number' and case when n->>'week' ~ '^[0-9]{1,2}$' then (n->>'week')::int between 1 and 20 else false end
 and jsonb_typeof(n->'topic')='string' and length(trim(n->>'topic')) between 2 and 100
 and jsonb_typeof(n->'body')='string' and length(trim(n->>'body')) between 120 and 18000,false)
$$;
revoke all on function lessonpress.valid_personal_note(jsonb) from public,anon,authenticated;
create function public.lp_personal_lessons(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();n jsonb;entry lessonpress.personal_lessons;note_id text;expected bigint;added int:=0;skipped int:=0;copied int:=0;stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Verified sign-in required.' using errcode='28000';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>2200000 then raise exception 'Invalid personal library request.' using errcode='22023';end if;
 if p_action='list' then
  return jsonb_build_object('items',coalesce((select jsonb_agg(content||jsonb_build_object('version',version) order by content->>'term',(content->>'week')::int,id) from lessonpress.personal_lessons where owner_id=actor and deleted_at is null),'[]'::jsonb),'trash',coalesce((select jsonb_agg(content||jsonb_build_object('version',version,'deletedAt',deleted_at) order by deleted_at desc) from lessonpress.personal_lessons where owner_id=actor and deleted_at>now()-interval '7 days'),'[]'::jsonb));
 end if;
 if p_action not in ('save','remove','restore','import') then raise exception 'Invalid personal library action.' using errcode='22023';end if;
 insert into lessonpress.personal_libraries values(actor) on conflict do nothing;
 perform 1 from lessonpress.personal_libraries where owner_id=actor for update;
 -- Expired trash is pruned only during a write. Active notes never expire automatically.
 delete from lessonpress.personal_lessons where owner_id=actor and deleted_at<=now()-interval '7 days';
 if p_action='import' then
  if jsonb_typeof(p_payload->'items') is distinct from 'array' or jsonb_array_length(p_payload->'items')>100 then raise exception 'Invalid personal library import.' using errcode='22023';end if;
  for n in select value from jsonb_array_elements(p_payload->'items') loop
   if not lessonpress.valid_personal_note(n) then raise exception 'Invalid lesson note.' using errcode='22023';end if;
   if exists(select 1 from lessonpress.personal_lessons where owner_id=actor and deleted_at is null and content-'id'-'createdAt'-'updatedAt'=n-'id'-'createdAt'-'updatedAt') then skipped:=skipped+1;continue;end if;
   note_id:=n->>'id';if exists(select 1 from lessonpress.personal_lessons where owner_id=actor and id=note_id) then note_id:=gen_random_uuid()::text;copied:=copied+1;end if;
   n:=n||jsonb_build_object('id',note_id,'createdAt',stamp,'updatedAt',stamp);
   insert into lessonpress.personal_lessons(owner_id,id,content) values(actor,note_id,n);added:=added+1;
  end loop;
 else
  note_id:=case when p_action='save' then p_payload->'note'->>'id' else p_payload->>'id' end;
  expected:=(p_payload->>'expectedVersion')::bigint;
  if expected is null or expected<0 then raise exception 'Expected version required.' using errcode='22023';end if;
  select * into entry from lessonpress.personal_lessons where owner_id=actor and id=note_id;
  if (not found and (p_action<>'save' or expected<>0)) or (found and (entry.version<>expected or (p_action='save' and entry.deleted_at is not null))) then raise exception 'Lesson changed or was removed. Reload before continuing.' using errcode='40001';end if;
  if p_action='save' then
   n:=p_payload->'note';if not lessonpress.valid_personal_note(n) then raise exception 'Invalid lesson note.' using errcode='22023';end if;
   n:=n||jsonb_build_object('createdAt',coalesce(entry.content->>'createdAt',stamp),'updatedAt',stamp);
   insert into lessonpress.personal_lessons(owner_id,id,content) values(actor,note_id,n) on conflict(owner_id,id) do update set content=excluded.content,version=nextval('lessonpress.personal_lesson_versions') returning * into entry;
  elsif p_action='remove' then
   if entry.deleted_at is not null then raise exception 'Lesson already in Recently removed.' using errcode='40001';end if;
   update lessonpress.personal_lessons set deleted_at=now(),version=nextval('lessonpress.personal_lesson_versions') where owner_id=actor and id=note_id returning * into entry;
  else
   if entry.deleted_at is null then raise exception 'Lesson already restored.' using errcode='40001';end if;
   update lessonpress.personal_lessons set deleted_at=null,version=nextval('lessonpress.personal_lesson_versions') where owner_id=actor and id=note_id returning * into entry;
  end if;
 end if;
 if (select count(*) from lessonpress.personal_lessons where owner_id=actor)>100 or (select coalesce(sum(octet_length(content::text)),0) from lessonpress.personal_lessons where owner_id=actor)>2000000 then raise exception 'Personal library limit: 100 notes / 2 MB including recently removed notes.' using errcode='P0001';end if;
 if p_action='import' then return jsonb_build_object('added',added,'skipped',skipped,'copied',copied);end if;
 return jsonb_build_object('note',entry.content||jsonb_build_object('version',entry.version,'deletedAt',entry.deleted_at));
end $$;
revoke all on function public.lp_personal_lessons(text,jsonb) from public,anon;
grant execute on function public.lp_personal_lessons(text,jsonb) to authenticated;
commit;
