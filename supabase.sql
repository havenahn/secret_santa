-- 새 마니또 구조. 기존 테이블과 정책은 아래 스크립트에서 제거합니다.
create extension if not exists pgcrypto;
drop function if exists public.create_room(text,text,text);
drop function if exists public.room_status(text);
drop function if exists public.register_person(text,text,text,text);
drop function if exists public.start_draw(text,text);
drop function if exists public.reveal_result(text,text,text);
drop table if exists public.participants cascade;
drop table if exists public.rooms cascade;
create table public.rooms(
 room_code text primary key check (room_code ~ '^[A-Z0-9]{6}$'),
 host_name text not null,
 host_password_hash text not null,
 started boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.participants(
 id bigint generated always as identity primary key,
 room_code text not null references public.rooms(room_code) on delete cascade,
 name text not null,
 password_hash text not null,
 avoid text not null default '',
 recipient_id bigint references public.participants(id),
 unique(room_code,name)
);
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
revoke all on public.rooms, public.participants from anon, authenticated;

create or replace function public.create_room(p_code text,p_host_name text,p_host_password text)
returns void language plpgsql security definer set search_path=public,extensions as $$
begin
 if length(p_host_password)<6 then raise exception '비밀번호는 6자 이상이어야 해요.'; end if;
 insert into rooms(room_code,host_name,host_password_hash) values(upper(p_code),p_host_name,crypt(p_host_password,gen_salt('bf')));
end;$$;
create or replace function public.room_status(p_code text)
returns json language plpgsql security definer set search_path=public as $$ declare r rooms%rowtype; ns json;begin
 select * into r from rooms where room_code=upper(p_code);if not found then raise exception '방을 찾을 수 없어요.';end if;
 select coalesce(json_agg(name order by id),'[]'::json) into ns from participants where room_code=r.room_code;
 return json_build_object('started',r.started,'participants',ns);
end;$$;
create or replace function public.register_person(p_code text,p_name text,p_password text,p_avoid text)
returns void language plpgsql security definer set search_path=public,extensions as $$ declare started_now boolean;begin
 if length(p_password)<6 then raise exception '비밀번호는 6자 이상이어야 해요.';end if;
 select started into started_now from rooms where room_code=upper(p_code) for update;
 if not found then raise exception '방을 찾을 수 없어요.';end if;
 if started_now then raise exception '추첨이 끝나 참가 정보를 수정할 수 없어요.';end if;
 insert into participants(room_code,name,password_hash,avoid) values(upper(p_code),trim(p_name),crypt(p_password,gen_salt('bf')),coalesce(p_avoid,''))
 on conflict(room_code,name) do update set password_hash=excluded.password_hash,avoid=excluded.avoid;
end;$$;
create or replace function public.start_draw(p_code text,p_host_password text)
returns void language plpgsql security definer set search_path=public,extensions as $$ declare r rooms%rowtype; ids bigint[]; shuffled bigint[]; i int; tries int:=0;begin
 select * into r from rooms where room_code=upper(p_code) for update;
 if not found then raise exception '방을 찾을 수 없어요.';end if;
 if r.host_password_hash<>crypt(p_host_password,r.host_password_hash) then raise exception '방장 비밀번호가 틀렸어요.';end if;
 if r.started then raise exception '이미 추첨을 시작했어요.';end if;
 select array_agg(id order by id) into ids from participants where room_code=r.room_code;
 if coalesce(array_length(ids,1),0)<2 then raise exception '참가자가 2명 이상이어야 해요.';end if;
 loop
  select array_agg(x order by random()) into shuffled from unnest(ids) x;
  exit when not exists(select 1 from generate_subscripts(ids,1) s where ids[s]=shuffled[s]);
  tries:=tries+1;if tries>10000 then raise exception '추첨을 만들지 못했어요. 다시 시도해주세요.';end if;
 end loop;
 for i in 1..array_length(ids,1) loop update participants set recipient_id=shuffled[i] where id=ids[i];end loop;
 update rooms set started=true where room_code=r.room_code;
end;$$;
create or replace function public.reveal_result(p_code text,p_name text,p_password text)
returns json language plpgsql security definer set search_path=public,extensions as $$ declare p participants%rowtype; rec participants%rowtype;begin
 select * into p from participants where room_code=upper(p_code) and name=trim(p_name);
 if not found then raise exception '등록된 이름을 찾을 수 없어요.';end if;
 if p.password_hash<>crypt(p_password,p.password_hash) then raise exception '비밀번호가 틀렸어요.';end if;
 if not (select started from rooms where room_code=p.room_code) then raise exception '아직 방장이 추첨을 시작하지 않았어요.';end if;
 select * into rec from participants where id=p.recipient_id;
 return json_build_object('recipient',rec.name,'avoid',rec.avoid);
end;$$;
revoke all on function public.create_room(text,text,text),public.room_status(text),public.register_person(text,text,text,text),public.start_draw(text,text),public.reveal_result(text,text,text) from public;
grant execute on function public.create_room(text,text,text),public.room_status(text),public.register_person(text,text,text,text),public.start_draw(text,text),public.reveal_result(text,text,text) to anon,authenticated;
