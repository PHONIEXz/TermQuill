begin;
create sequence lessonpress.location_version_seq as integer;
revoke all on sequence lessonpress.location_version_seq from public,anon,authenticated;
create table lessonpress.school_locations (
 school_id uuid primary key references lessonpress.schools(id),
 latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
 area text not null check(length(area) between 2 and 100), public_listing boolean not null default false,
 source text not null check(source in ('manual','device')), accuracy double precision check(accuracy between 0 and 10000000),
 version integer not null default 1, updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now()
);
create index school_locations_public_idx on lessonpress.school_locations(latitude,longitude) where public_listing;
alter table lessonpress.school_locations enable row level security;
revoke all on lessonpress.school_locations from public,anon,authenticated;
alter function lessonpress.workspace(text,jsonb) rename to workspace_v2;
revoke all on function lessonpress.workspace_v2(text,jsonb) from public,anon,authenticated;
create function lessonpress.workspace(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();sid uuid;m lessonpress.members;l lessonpress.school_locations;expected integer;lat double precision;lon double precision;area_name text;is_public boolean;src text;acc double precision;
begin
 if p_action not in ('place_get','place_save','place_remove') then return lessonpress.workspace_v2(p_action,p_payload);end if;
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Sign in with a verified email.' using errcode='28000';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>4000 then raise exception 'Request too large.';end if;
 sid:=(p_payload->>'school_id')::uuid;select * into m from lessonpress.members where school_id=sid and user_id=actor;
 if not found then raise exception 'School access denied.' using errcode='42501';end if;
 if p_action='place_get' then
  select * into l from lessonpress.school_locations where school_id=sid;
  return jsonb_build_object('location',case when l.school_id is null then null else to_jsonb(l)-'school_id'-'updated_by' end);
 end if;
 if m.role<>'principal' then raise exception 'Only principals can change the school location.' using errcode='42501';end if;
 -- Serialise school-location writes, including creation and removal races.
 perform 1 from lessonpress.schools where id=sid for update;
 select * into l from lessonpress.school_locations where school_id=sid;
 expected:=(p_payload->>'expected_version')::integer;
 if expected is null or expected<>coalesce(l.version,0) then raise exception 'Reload the latest school location.' using errcode='40001';end if;
 if p_action='place_remove' then
  if l.school_id is null then return jsonb_build_object('ok',true);end if;
  delete from lessonpress.school_locations where school_id=sid;
  insert into lessonpress.audit(school_id,actor_id,action,detail) values(sid,actor,'school_location_removed',jsonb_build_object('location_version',l.version));
  return jsonb_build_object('ok',true);
 end if;
 if jsonb_typeof(p_payload->'area') is distinct from 'string' or jsonb_typeof(p_payload->'source') is distinct from 'string' or p_payload->'confirmed_school' is distinct from 'true'::jsonb or jsonb_typeof(p_payload->'public_listing') is distinct from 'boolean' or jsonb_typeof(p_payload->'latitude') is distinct from 'number' or jsonb_typeof(p_payload->'longitude') is distinct from 'number' then raise exception 'Check the school coordinates and confirm their use.';end if;
 lat:=(p_payload->>'latitude')::double precision;lon:=(p_payload->>'longitude')::double precision;area_name:=trim(coalesce(p_payload->>'area',''));is_public:=(p_payload->>'public_listing')::boolean;src:=p_payload->>'source';
 if lat not between -90 and 90 or lon not between -180 and 180 or length(area_name) not between 2 and 100 or src is null or src not in ('manual','device') then raise exception 'Check the school coordinates and area.';end if;
 if is_public and not exists(select 1 from lessonpress.school_verification where school_id=sid and status='verified') then raise exception 'Verify the school before publishing its location.' using errcode='42501';end if;
 if src='device' and p_payload->'accuracy' is not null and p_payload->'accuracy'<>'null'::jsonb then
  if jsonb_typeof(p_payload->'accuracy') is distinct from 'number' then raise exception 'Check the location accuracy.';end if;
  acc:=(p_payload->>'accuracy')::double precision;if acc not between 0 and 10000000 then raise exception 'Check the location accuracy.';end if;
 end if;
 insert into lessonpress.school_locations as target(school_id,latitude,longitude,area,public_listing,source,accuracy,version,updated_by)
 values(sid,round(lat::numeric,6)::double precision,round(lon::numeric,6)::double precision,area_name,is_public,src,acc,nextval('lessonpress.location_version_seq'),actor)
 on conflict(school_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,area=excluded.area,public_listing=excluded.public_listing,source=excluded.source,accuracy=excluded.accuracy,version=excluded.version,updated_by=actor,updated_at=now() returning * into l;
 insert into lessonpress.audit(school_id,actor_id,action,detail) values(sid,actor,'school_location_saved',jsonb_build_object('location_version',l.version,'public_listing',l.public_listing));
 return jsonb_build_object('location',to_jsonb(l)-'school_id'-'updated_by');
end $$;
revoke all on function lessonpress.workspace(text,jsonb) from public,anon;
grant execute on function lessonpress.workspace(text,jsonb) to authenticated;
create or replace function public.lp_workspace(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select lessonpress.workspace(p_action,p_payload); $$;
revoke all on function public.lp_workspace(text,jsonb) from public,anon;
grant execute on function public.lp_workspace(text,jsonb) to authenticated;

-- Public directory: only explicit opt-ins from independently verified schools.
-- Coordinates are rounded, and no account, membership or private metadata is returned.
create function public.lp_public_places(p_query jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' stable as $$
declare q text;after_school uuid;has_area boolean;south double precision;north double precision;west double precision;east double precision;rows_json jsonb;has_more boolean;cursor uuid;
begin
 if jsonb_typeof(p_query) is distinct from 'object' or octet_length(p_query::text)>2000 then raise exception 'Invalid directory query.';end if;
 q:=trim(coalesce(p_query->>'search',''));if length(q)>100 then raise exception 'Search is too long.';end if;
 after_school:=(p_query->>'after_id')::uuid;has_area:=p_query ? 'area';
 if has_area then
  if jsonb_typeof(p_query->'area') is distinct from 'object' then raise exception 'Invalid search area.';end if;
  south:=(p_query->'area'->>'south')::double precision;north:=(p_query->'area'->>'north')::double precision;west:=(p_query->'area'->>'west')::double precision;east:=(p_query->'area'->>'east')::double precision;
  if south is null or north is null or west is null or east is null or south not between -90 and 90 or north not between -90 and 90 or west not between -180 and 180 or east not between -180 and 180 or south>north then raise exception 'Invalid search area.';end if;
 end if;
 select coalesce(jsonb_agg(data order by id),'[]'::jsonb) into rows_json from (
  select s.id,jsonb_build_object('id',s.id,'name',s.name,'area',l.area,'latitude',round(l.latitude::numeric,3),'longitude',round(l.longitude::numeric,3)) data
  from lessonpress.school_locations l join lessonpress.schools s on s.id=l.school_id join lessonpress.school_verification v on v.school_id=s.id
  where l.public_listing and v.status='verified' and (after_school is null or s.id>after_school)
  and (q='' or position(lower(q) in lower(s.name||' '||l.area))>0)
  and (not has_area or (l.latitude between south and north and (case when west<=east then l.longitude between west and east else l.longitude>=west or l.longitude<=east end)))
  order by s.id limit 51
 ) page;
 has_more:=jsonb_array_length(rows_json)>50;
 if has_more then rows_json:=rows_json-50;cursor:=(rows_json->49->>'id')::uuid;end if;
 return jsonb_build_object('schools',rows_json,'next_after',cursor);
end $$;
revoke all on function public.lp_public_places(jsonb) from public;
grant execute on function public.lp_public_places(jsonb) to anon,authenticated;
commit;
