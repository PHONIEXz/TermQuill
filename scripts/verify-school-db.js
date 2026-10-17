// Build a single-statement smoke test for the deployed database query editor.
// Test data is always rolled back by the inner exception block.
import {writeFile} from 'node:fs/promises';
import {sampleSpec,samplePaper} from '../lib/sample.js';
const content=JSON.stringify({spec:sampleSpec,paper:samplePaper,sample:true}).replaceAll("'","''");
const sql=`do $verification$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); s uuid; d uuid; p uuid; i jsonb; r jsonb; pass boolean:=false;
begin
 begin
  insert into auth.users(id,email,email_confirmed_at) values(a,'lp-test-principal-'||a||'@example.invalid',now()),(b,'lp-test-teacher-'||b||'@example.invalid',now()),(outsider,'lp-test-outsider-'||outsider||'@example.invalid',now());
  perform set_config('request.jwt.claim.sub',a::text,true);
  s:=(public.lp_workspace('create_school','{"name":"Transient verification school"}')->>'id')::uuid;
  d:=(public.lp_workspace('create_department',jsonb_build_object('school_id',s,'name','Science'))->>'id')::uuid;
  perform public.lp_workspace('verification_request',jsonb_build_object('school_id',s,'public_reference','https://example.invalid/school','authority_note','Isolated rollback fixture for operator verification checks.'));
  perform lessonpress.record_verification(s,'verified','Rollback smoke test','Verification fixture only; all records are rolled back.');
  i:=public.lp_workspace('invite',jsonb_build_object('school_id',s,'department_id',d,'email','lp-test-teacher-'||b||'@example.invalid','role','teacher'));
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform public.lp_workspace('accept_invite',jsonb_build_object('token',i->>'token'));
  p:=(public.lp_workspace('save_paper',jsonb_build_object('school_id',s,'department_id',d,'content','${content}'::jsonb))->>'id')::uuid;
  perform public.lp_workspace('submit',jsonb_build_object('school_id',s,'paper_id',p,'expected_revision',1));
  begin perform public.lp_workspace('review',jsonb_build_object('school_id',s,'paper_id',p,'expected_revision',1,'decision','approved','comment','Self approval must fail')); raise exception 'Self approval was allowed'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.lp_workspace('review',jsonb_build_object('school_id',s,'paper_id',p,'expected_revision',1,'decision','approved','comment','Independent review smoke test'));
  r:=public.lp_workspace('paper',jsonb_build_object('school_id',s,'paper_id',p));
  if (r->>'approved_revision')::int<>1 then raise exception 'Approval missing'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin perform public.lp_workspace('dashboard',jsonb_build_object('school_id',s)); raise exception 'Outsider access allowed'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.lp_workspace('print_request',jsonb_build_object('school_id',s,'paper_id',p,'revision',1,'copy','student'));
  r:=public.lp_workspace('audit_list',jsonb_build_object('school_id',s,'event','print_requested'));
  if jsonb_array_length(r->'events')<>1 then raise exception 'Print audit missing'; end if;
  if has_function_privilege('authenticated','lessonpress.workspace_v1(text,jsonb)','EXECUTE') or has_function_privilege('authenticated','lessonpress.record_verification(uuid,text,text,text)','EXECUTE') then raise exception 'Private workflow bypass'; end if;
  if has_table_privilege('authenticated','lessonpress.revisions','UPDATE') or has_table_privilege('anon','lessonpress.papers','SELECT') or has_function_privilege('anon','public.lp_workspace(text,jsonb)','EXECUTE') then raise exception 'Direct access privilege leak'; end if;
  pass:=true;
  raise exception using errcode='ZX001',message='rollback verification fixtures';
 exception when sqlstate 'ZX001' then null;
 end;
 if not pass then raise exception 'Verification failed'; end if;
end $verification$;`;
await writeFile(process.argv[2]||'school-verification.sql',sql);
console.log('SQL verification prepared; all temporary data rolls back.');
