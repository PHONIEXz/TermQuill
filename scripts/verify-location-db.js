import {writeFile} from 'node:fs/promises';
const sql=`do $geo_verify$
declare actor uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); sid uuid; result jsonb; ver integer; pass boolean:=false;
begin
 begin
  insert into auth.users(id,email,email_confirmed_at) values(actor,'geo-smoke-'||actor||'@example.invalid',now()),(outsider,'geo-outsider-'||outsider||'@example.invalid',now());
  perform set_config('request.jwt.claim.sub',actor::text,true);
  sid:=(public.lp_workspace('create_school','{"name":"Rollback-only location test"}')->>'id')::uuid;
  result:=public.lp_workspace('place_save',jsonb_build_object('school_id',sid,'latitude',0.123456,'longitude',0.654321,'area','Rollback test point','source','manual','accuracy',null,'expected_version',0,'confirmed_school',true,'public_listing',false));
  ver:=(result->'location'->>'version')::int;
  if exists(select 1 from jsonb_array_elements(public.lp_public_places('{}')->'schools') e where e->>'id'=sid::text) then raise exception 'Private location leaked';end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin perform public.lp_workspace('place_get',jsonb_build_object('school_id',sid));raise exception 'Outsider read allowed';exception when insufficient_privilege then null;end;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform public.lp_workspace('verification_request',jsonb_build_object('school_id',sid,'public_reference','https://example.invalid/school','authority_note','Rollback fixture for location access checks only.'));
  perform lessonpress.record_verification(sid,'verified','Rollback test operator','Isolated temporary fixture, not a real school verification.');
  result:=public.lp_workspace('place_save',jsonb_build_object('school_id',sid,'latitude',0.123456,'longitude',0.654321,'area','Rollback test point','source','manual','accuracy',null,'expected_version',ver,'confirmed_school',true,'public_listing',true));
  ver:=(result->'location'->>'version')::int;
  select e into result from jsonb_array_elements(public.lp_public_places(jsonb_build_object('search','Rollback-only location test'))->'schools') e where e->>'id'=sid::text;
  if result is null or result->>'latitude'<>'0.123' or result ? 'accuracy' or result ? 'updated_by' then raise exception 'Public location contract failed';end if;
  perform public.lp_workspace('place_remove',jsonb_build_object('school_id',sid,'expected_version',ver));
  if exists(select 1 from jsonb_array_elements(public.lp_public_places('{}')->'schools') e where e->>'id'=sid::text) then raise exception 'Removed location remained listed';end if;
  if has_table_privilege('authenticated','lessonpress.school_locations','SELECT') or has_function_privilege('authenticated','lessonpress.workspace_v2(text,jsonb)','EXECUTE') or not has_function_privilege('anon','public.lp_public_places(jsonb)','EXECUTE') then raise exception 'Location privilege mismatch';end if;
  pass:=true;raise exception using errcode='ZX001',message='rollback geo fixtures';
 exception when sqlstate 'ZX001' then null;end;
 if not pass then raise exception 'Location verification failed';end if;
end $geo_verify$;`;
await writeFile(process.argv[2]||'location-verification.sql',sql);console.log('Rollback-only location verification SQL prepared.');
