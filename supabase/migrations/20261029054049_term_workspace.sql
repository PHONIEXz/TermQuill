begin;
create table if not exists lessonpress.term_workspaces(
 owner_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{"plans":[],"reminder":{"enabled":false,"days":[1,2,3,4,5],"time":"19:00","zone":"Africa/Lagos","onlyMissing":true}}',
 version bigint not null default 0,updated_at timestamptz not null default now(),
 check(octet_length(state::text)<=40000)
);
alter table lessonpress.term_workspaces enable row level security;
revoke all on lessonpress.term_workspaces from public,anon,authenticated;
create or replace function public.lp_term_workspace(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();entry lessonpress.term_workspaces;expected bigint;next_state jsonb;
begin
 if actor is null or not coalesce((public.lp_educator('status')->>'allowed')::boolean,false) then raise exception 'Educator approval required.' using errcode='42501';end if;
 if p_action not in ('get','save') then raise exception 'Invalid term workspace action.' using errcode='22023';end if;
 if p_action='save' then
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>45000 then raise exception 'Invalid term settings.' using errcode='22023';end if;
  expected:=(p_payload->>'expectedVersion')::bigint;next_state:=p_payload->'state';
  if expected is null or expected<0 or jsonb_typeof(next_state) is distinct from 'object' or jsonb_typeof(next_state->'plans') is distinct from 'array' or jsonb_array_length(next_state->'plans')>100 or jsonb_typeof(next_state->'reminder') is distinct from 'object' then raise exception 'Invalid term settings.' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(next_state->'plans') p where p->>'term' not in ('1','2','3') or p->>'weeks' not in ('10','11','12')) then raise exception 'Invalid term length.' using errcode='22023';end if;
  insert into lessonpress.term_workspaces(owner_id) values(actor) on conflict do nothing;
  select * into entry from lessonpress.term_workspaces where owner_id=actor for update;
  if entry.version<>expected then raise exception 'Term settings changed on another device.' using errcode='40001';end if;
  update lessonpress.term_workspaces set state=next_state,version=version+1,updated_at=now() where owner_id=actor returning * into entry;
 else
  select * into entry from lessonpress.term_workspaces where owner_id=actor;
 end if;
 return jsonb_build_object('state',coalesce(entry.state,'{"plans":[],"reminder":{"enabled":false,"days":[1,2,3,4,5],"time":"19:00","zone":"Africa/Lagos","onlyMissing":true}}'::jsonb),'version',coalesce(entry.version,0));
end $$;
revoke all on function public.lp_term_workspace(text,jsonb) from public,anon;
grant execute on function public.lp_term_workspace(text,jsonb) to authenticated;
commit;
