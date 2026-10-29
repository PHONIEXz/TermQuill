begin;
-- Preserve the educator wrapper and all existing rows/permissions. Only raise bounds.
do $$
declare fn record;definition text;changed int:=0;
begin
 for fn in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='lessonpress' and p.proname='personal_lessons_before_educator') or (n.nspname='public' and p.proname='lp_personal_lessons') loop
  definition:=pg_get_functiondef(fn.oid);
  if position('jsonb_array_length(p_payload->''items'')>100' in definition)>0 then
   definition:=replace(definition,'jsonb_array_length(p_payload->''items'')>100','jsonb_array_length(p_payload->''items'')>500');
   definition:=replace(definition,'>2200000','>3300000');
   definition:=replace(definition,'where owner_id=actor)>100','where owner_id=actor)>500');
   definition:=replace(definition,'>2000000','>3000000');
   definition:=replace(definition,'100 notes / 2 MB','500 notes / 3 MB');
   execute definition;changed:=changed+1;
  end if;
 end loop;
 if changed<>1 then raise exception 'Expected one personal-lesson implementation to update.';end if;
end $$;
commit;
