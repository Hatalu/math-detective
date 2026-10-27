-- MATH DETECTIVE — Supabase schema, RLS, RPCs, storage. Run once in Supabase SQL Editor.
-- Re-runnable for functions/policies; tables use "if not exists".
-- Security model:
--   * Teachers = auth users listed in teacher_profiles (added by an admin via SQL, never by the client).
--   * Students = Supabase anonymous auth users, linked to a team via team_members (created only by join_room()).
--   * Answers/clues are in separate teacher-only tables; students get them only through RPCs.
--   * Submissions and scores are written only by submit_answer() (security definer). Students have no insert/update.

create extension if not exists pgcrypto;

-- ============ TABLES ============
create table if not exists teacher_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (teacher_id, name)
);

create table if not exists question_sets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references question_sets(id) on delete cascade,
  position int not null default 0,
  content jsonb not null  -- student-visible only (no answers)
);
create index if not exists questions_set_idx on questions(set_id, position);

create table if not exists question_answers (   -- teacher-only
  question_id uuid primary key references questions(id) on delete cascade,
  expected jsonb not null,      -- {measure, values:number[], noMode:boolean}
  explanation jsonb not null    -- {reasoning, misconceptions, limitations, clueTemplates}
);

create table if not exists clues (              -- teacher-only; released by get_hints/reveal_hint
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  level smallint not null check (level between 1 and 3),
  body text not null,
  unique (question_id, level)
);

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teacher_profiles(user_id) on delete cascade,
  classroom_id uuid references classrooms(id) on delete set null,
  question_set_id uuid references question_sets(id) on delete set null,
  title text not null,
  room_code text not null unique,
  status text not null default 'waiting' check (status in ('waiting','active','paused','reviewing','completed')),
  join_open boolean not null default true,
  current_index int not null default 0,
  question_started_at timestamptz,
  paused_at timestamptz,
  time_limit_sec int not null default 600 check (time_limit_sec between 0 and 3600),
  hints_enabled boolean not null default true,
  hint_penalty int not null default 5 check (hint_penalty between 0 and 30),
  show_scores boolean not null default true,
  speed_bonus boolean not null default false,
  reveal_answer boolean not null default false,
  revealed_hint_level smallint not null default 0 check (revealed_hint_level between 0 and 3),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
alter table game_sessions add column if not exists paused_at timestamptz; -- for databases created before this column
create index if not exists sessions_teacher_idx on game_sessions(teacher_id, created_at desc);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 30),
  created_at timestamptz not null default now()
);
create unique index if not exists teams_name_uq on teams(session_id, lower(name));

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index if not exists team_members_user_idx on team_members(user_id);

create table if not exists hint_unlocks (
  team_id uuid not null references teams(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  level smallint not null check (level between 1 and 3),
  unlocked_at timestamptz not null default now(),
  primary key (team_id, question_id, level)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  client_submission_id uuid not null,
  answer jsonb not null,
  reasoning text not null default '' check (char_length(reasoning) <= 2000),
  hints_used int not null default 0,
  submitted_at timestamptz not null default now(),
  is_correct boolean not null,
  accuracy_score int not null check (accuracy_score between 0 and 50),
  method_score int not null check (method_score between 0 and 20),
  reasoning_score int not null check (reasoning_score between 0 and 25),
  communication_score int not null default 0 check (communication_score between 0 and 5),
  speed_bonus int not null default 0 check (speed_bonus between 0 and 5),
  hint_penalty int not null default 0 check (hint_penalty >= 0),
  total_score int not null default 0,
  unique (team_id, question_id)              -- one submission per team per mission
);
create index if not exists submissions_session_idx on submissions(session_id);

create table if not exists score_events (      -- audit log of teacher score changes
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  submission_id uuid references submissions(id) on delete set null,
  detail jsonb not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists exit_ticket_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  student_label text not null check (char_length(student_label) between 1 and 40),
  answer1 text not null default '', answer2 text not null default '', answer3 text not null default '',
  submitted_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists work_gallery (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  case_title text not null check (char_length(case_title) between 1 and 120),
  conclusion text not null check (char_length(conclusion) between 1 and 500),
  reasoning text not null default '' check (char_length(reasoning) <= 1000),
  image_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gallery_session_idx on work_gallery(session_id, created_at);

-- ============ HELPERS (security definer → no RLS recursion) ============
create or replace function is_teacher() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from teacher_profiles where user_id = auth.uid()) $$;

create or replace function is_session_owner(sid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from game_sessions where id = sid and teacher_id = auth.uid()) $$;

create or replace function is_session_member(sid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from team_members m join teams t on t.id = m.team_id where t.session_id = sid and m.user_id = auth.uid()) $$;

create or replace function is_team_member(tid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from team_members where team_id = tid and user_id = auth.uid()) $$;

create or replace function team_session(tid uuid) returns uuid language sql stable security definer set search_path = public as
$$ select session_id from teams where id = tid $$;

create or replace function owns_set(set_uuid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from question_sets where id = set_uuid and teacher_id = auth.uid()) $$;

create or replace function owns_question(qid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from questions q join question_sets s on s.id = q.set_id where q.id = qid and s.teacher_id = auth.uid()) $$;

create or replace function my_team_in(sid uuid) returns uuid language sql stable security definer set search_path = public as
$$ select t.id from teams t join team_members m on m.team_id = t.id where t.session_id = sid and m.user_id = auth.uid() order by m.joined_at desc limit 1 $$;

-- ============ RLS ============
alter table teacher_profiles enable row level security;
alter table classrooms enable row level security;
alter table question_sets enable row level security;
alter table questions enable row level security;
alter table question_answers enable row level security;
alter table clues enable row level security;
alter table game_sessions enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table hint_unlocks enable row level security;
alter table submissions enable row level security;
alter table score_events enable row level security;
alter table exit_ticket_responses enable row level security;
alter table work_gallery enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

create policy tp_self on teacher_profiles for select using (user_id = auth.uid());

create policy cls_owner on classrooms for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and is_teacher());
create policy set_owner on question_sets for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and is_teacher());

create policy q_owner on questions for all using (owns_set(set_id)) with check (owns_set(set_id));
create policy q_player on questions for select using (
  exists (select 1 from game_sessions g where g.question_set_id = questions.set_id and is_session_member(g.id)));

create policy qa_owner on question_answers for all using (owns_question(question_id)) with check (owns_question(question_id));
create policy clue_owner on clues for all using (owns_question(question_id)) with check (owns_question(question_id));

create policy gs_owner on game_sessions for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and is_teacher());
create policy gs_member on game_sessions for select using (is_session_member(id));

create policy team_read on teams for select using (is_session_owner(session_id) or is_session_member(session_id));
create policy team_owner_del on teams for delete using (is_session_owner(session_id));

create policy tm_read on team_members for select using (user_id = auth.uid() or is_session_owner(team_session(team_id)));

create policy hu_read on hint_unlocks for select using (is_team_member(team_id) or is_session_owner(team_session(team_id)));
create policy hu_owner_del on hint_unlocks for delete using (is_session_owner(team_session(team_id)));

create policy sub_read on submissions for select using (is_team_member(team_id) or is_session_owner(session_id));
create policy sub_owner_upd on submissions for update using (is_session_owner(session_id)) with check (is_session_owner(session_id));
create policy sub_owner_del on submissions for delete using (is_session_owner(session_id));

create policy se_owner on score_events for all using (is_session_owner(session_id)) with check (is_session_owner(session_id));

create policy et_read on exit_ticket_responses for select using (user_id = auth.uid() or is_session_owner(session_id));
create policy et_owner_del on exit_ticket_responses for delete using (is_session_owner(session_id));

create policy wg_read on work_gallery for select using (
  is_session_owner(session_id) or is_team_member(team_id) or (status = 'approved' and is_session_member(session_id)));
create policy wg_insert on work_gallery for insert with check (
  is_team_member(team_id) and team_session(team_id) = session_id and status = 'pending');
create policy wg_update on work_gallery for update using (is_team_member(team_id) or is_session_owner(session_id))
  with check (is_team_member(team_id) or is_session_owner(session_id));
create policy wg_delete on work_gallery for delete using (is_team_member(team_id) or is_session_owner(session_id));

-- students may edit text of their own work but never approve it
create or replace function gallery_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_session_owner(new.session_id) then
    if new.status <> old.status or new.team_id <> old.team_id or new.session_id <> old.session_id then
      raise exception 'NOT_TEACHER';
    end if;
    new.status := 'pending'; -- edited work needs re-approval
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists gallery_guard_t on work_gallery;
create trigger gallery_guard_t before update on work_gallery for each row execute function gallery_guard();

-- teacher score edits: keep totals consistent and log every change
create or replace function submission_total() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.total_score := greatest(0, new.accuracy_score + new.method_score + new.reasoning_score + new.communication_score + new.speed_bonus - new.hint_penalty);
  if tg_op = 'UPDATE' then
    if new.answer <> old.answer or new.team_id <> old.team_id or new.question_id <> old.question_id then raise exception 'IMMUTABLE'; end if;
    insert into score_events(session_id, team_id, submission_id, detail)
      values (new.session_id, new.team_id, new.id, jsonb_build_object('from', old.total_score, 'to', new.total_score,
        'reasoning', new.reasoning_score, 'communication', new.communication_score, 'accuracy', new.accuracy_score));
  end if;
  return new;
end $$;
drop trigger if exists submission_total_t on submissions;
create trigger submission_total_t before insert or update on submissions for each row execute function submission_total();

-- teachers can't move a session to another teacher or change its code
create or replace function session_guard() returns trigger language plpgsql as $$
begin
  if new.teacher_id <> old.teacher_id or new.room_code <> old.room_code then raise exception 'IMMUTABLE'; end if;
  if new.status = 'completed' and old.status <> 'completed' then new.ended_at := now(); end if;
  return new;
end $$;
drop trigger if exists session_guard_t on game_sessions;
create trigger session_guard_t before update on game_sessions for each row execute function session_guard();

-- ============ RPCs ============
create or replace function create_session(p_title text, p_set_id uuid, p_class_name text)
returns game_sessions language plpgsql security definer set search_path = public as $$
declare v_code text; v_cls uuid; v game_sessions; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if not is_teacher() then raise exception 'NOT_TEACHER'; end if;
  if not owns_set(p_set_id) then raise exception 'SET_NOT_FOUND'; end if;
  if coalesce(trim(p_class_name), '') <> '' then
    insert into classrooms(teacher_id, name) values (auth.uid(), trim(p_class_name))
      on conflict (teacher_id, name) do update set name = excluded.name returning id into v_cls;
  end if;
  loop
    v_code := (select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from game_sessions where room_code = v_code);
  end loop;
  insert into game_sessions(teacher_id, classroom_id, question_set_id, title, room_code)
    values (auth.uid(), v_cls, p_set_id, coalesce(nullif(trim(p_title), ''), 'ห้องสืบสวน'), v_code) returning * into v;
  return v;
end $$;

create or replace function room_status(p_code text) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('exists', true, 'id', id, 'status', status, 'join_open', join_open, 'title', title)
                   from game_sessions where room_code = upper(trim(p_code))), '{"exists": false}'::jsonb)
$$;

create or replace function join_room(p_code text, p_team_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g game_sessions; v_team teams; v_name text := trim(p_team_name);
begin
  if auth.uid() is null then raise exception 'NOT_MEMBER'; end if;
  select * into g from game_sessions where room_code = upper(trim(p_code));
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if g.status = 'completed' then raise exception 'ROOM_ENDED'; end if;
  if char_length(v_name) not between 2 and 30 then raise exception 'BAD_TEAM_NAME'; end if;
  select * into v_team from teams where session_id = g.id and lower(name) = lower(v_name);
  if not found then
    if not g.join_open then raise exception 'ROOM_CLOSED'; end if;
    insert into teams(session_id, name) values (g.id, v_name) returning * into v_team;
  end if;
  -- one device belongs to one team per session
  delete from team_members m using teams t where m.team_id = t.id and t.session_id = g.id and m.user_id = auth.uid() and t.id <> v_team.id;
  insert into team_members(team_id, user_id) values (v_team.id, auth.uid()) on conflict do nothing;
  return jsonb_build_object('session_id', g.id, 'team_id', v_team.id, 'team_name', v_team.name);
end $$;

create or replace function my_team(p_session_id uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('team_id', t.id, 'team_name', t.name) from teams t where t.id = my_team_in(p_session_id)
$$;

create or replace function current_question(g game_sessions) returns uuid language sql stable security definer set search_path = public as $$
  select id from questions where set_id = g.question_set_id order by position, id offset g.current_index limit 1
$$;

create or replace function get_hints(p_session_id uuid, p_question_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g game_sessions; v_team uuid;
begin
  select * into g from game_sessions where id = p_session_id;
  v_team := my_team_in(p_session_id);
  if v_team is null and not is_session_owner(p_session_id) then raise exception 'NOT_MEMBER'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('level', c.level, 'body', c.body) order by c.level)
    from clues c where c.question_id = p_question_id
      and exists (select 1 from questions q where q.id = c.question_id and q.set_id = g.question_set_id)
      and (c.level <= g.revealed_hint_level or exists (select 1 from hint_unlocks h where h.team_id = v_team and h.question_id = c.question_id and h.level = c.level))
  ), '[]'::jsonb);
end $$;

create or replace function reveal_hint(p_session_id uuid, p_level int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g game_sessions; v_team uuid; v_q uuid;
begin
  select * into g from game_sessions where id = p_session_id;
  v_team := my_team_in(p_session_id);
  if v_team is null then raise exception 'NOT_MEMBER'; end if;
  if g.status <> 'active' then raise exception 'NOT_ACTIVE'; end if;
  if not g.hints_enabled then raise exception 'HINTS_OFF'; end if;
  v_q := current_question(g);
  if exists (select 1 from submissions where team_id = v_team and question_id = v_q) then raise exception 'NOT_ACTIVE'; end if;
  if p_level < 1 or p_level > 3 then raise exception 'HINT_ORDER'; end if;
  if p_level > 1 and p_level - 1 > g.revealed_hint_level
     and not exists (select 1 from hint_unlocks where team_id = v_team and question_id = v_q and level = p_level - 1) then
    raise exception 'HINT_ORDER';
  end if;
  if p_level > g.revealed_hint_level then
    insert into hint_unlocks(team_id, question_id, level) values (v_team, v_q, p_level) on conflict do nothing;
  end if;
  return get_hints(p_session_id, v_q);
end $$;

create or replace function values_close(a jsonb, b jsonb) returns boolean language sql immutable as $$
  select jsonb_array_length(a) = jsonb_array_length(b) and not exists (
    select 1 from
      (select x::numeric v, row_number() over (order by x::numeric) i from jsonb_array_elements_text(a) x) xa
      full join (select y::numeric v, row_number() over (order by y::numeric) i from jsonb_array_elements_text(b) y) yb using (i)
    where xa.v is null or yb.v is null or abs(xa.v - yb.v) > 0.01)
$$;

-- Scoring must match src/lib/math.ts calculateScore()
create or replace function submit_answer(p_session_id uuid, p_answer jsonb, p_reasoning text, p_client_id uuid)
returns submissions language plpgsql security definer set search_path = public as $$
declare g game_sessions; v_team uuid; v_q uuid; v_content jsonb; v_exp jsonb; s submissions;
  v_measure_ok boolean; v_value_ok boolean; v_hints int; v_len int; v_speed int := 0; v_deadline timestamptz;
begin
  select * into g from game_sessions where id = p_session_id for share;
  v_team := my_team_in(p_session_id);
  if v_team is null then raise exception 'NOT_MEMBER'; end if;
  v_q := current_question(g);
  -- idempotent: duplicate taps or retries after reconnect return the stored submission
  select * into s from submissions where team_id = v_team and question_id = v_q;
  if found then return s; end if;
  if g.status <> 'active' then raise exception 'NOT_ACTIVE'; end if;
  if g.time_limit_sec > 0 and g.question_started_at is not null then
    v_deadline := g.question_started_at + make_interval(secs => g.time_limit_sec + 10); -- 10s network grace
    if now() > v_deadline then raise exception 'TIME_UP'; end if;
    if g.speed_bonus then
      v_speed := least(5, greatest(0, floor(5 * extract(epoch from (g.question_started_at + make_interval(secs => g.time_limit_sec) - now())) / g.time_limit_sec)::int));
    end if;
  end if;

  select content into v_content from questions where id = v_q;
  select expected into v_exp from question_answers where question_id = v_q;
  if v_exp is null then raise exception 'NO_ANSWER_KEY'; end if;

  v_measure_ok := (p_answer->>'measure') = (v_exp->>'measure');
  v_value_ok := case
    when not coalesce((v_content->>'askValue')::boolean, true) then v_measure_ok
    when (v_exp->>'noMode')::boolean then coalesce((p_answer->>'noMode')::boolean, false)
    else not coalesce((p_answer->>'noMode')::boolean, false) and values_close(coalesce(p_answer->'values', '[]'::jsonb), v_exp->'values')
  end;
  select count(*) into v_hints from hint_unlocks where team_id = v_team and question_id = v_q and level > g.revealed_hint_level;
  v_len := char_length(trim(coalesce(p_reasoning, '')));

  insert into submissions(session_id, team_id, question_id, client_submission_id, answer, reasoning, hints_used, is_correct,
    accuracy_score, method_score, reasoning_score, speed_bonus, hint_penalty)
  values (p_session_id, v_team, v_q, p_client_id, p_answer, left(coalesce(p_reasoning, ''), 2000), v_hints, v_measure_ok and v_value_ok,
    case when v_value_ok then 50 else 0 end,
    (case when v_measure_ok then 10 else 0 end) + (case when coalesce((p_answer->>'markedEvidence')::int, 0) > 0 then 10 else 0 end),
    case when v_len >= 60 then 25 when v_len >= 20 then 15 when v_len > 0 then 5 else 0 end,
    v_speed, v_hints * g.hint_penalty)
  on conflict (team_id, question_id) do nothing
  returning * into s;
  if s.id is null then select * into s from submissions where team_id = v_team and question_id = v_q; end if;
  return s;
end $$;

create or replace function get_feedback(p_session_id uuid, p_question_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g game_sessions; v_team uuid; a question_answers;
begin
  select * into g from game_sessions where id = p_session_id;
  v_team := my_team_in(p_session_id);
  if not (is_session_owner(p_session_id)
          or (v_team is not null and (g.reveal_answer or g.status in ('reviewing', 'completed')
              or exists (select 1 from submissions where team_id = v_team and question_id = p_question_id)))) then
    return null;
  end if;
  select * into a from question_answers where question_id = p_question_id;
  return jsonb_build_object('measure', a.expected->'measure', 'values', a.expected->'values', 'noMode', a.expected->'noMode',
    'reasoning', a.explanation->'reasoning', 'misconceptions', a.explanation->'misconceptions', 'limitations', a.explanation->'limitations');
end $$;

create or replace function get_scoreboard(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g game_sessions; v_team uuid;
begin
  select * into g from game_sessions where id = p_session_id;
  v_team := my_team_in(p_session_id);
  if not is_session_owner(p_session_id) and v_team is null then raise exception 'NOT_MEMBER'; end if;
  return coalesce((select jsonb_agg(row_to_json(r) order by r.total desc, r.name) from (
    select t.id team_id, t.name, coalesce(sum(s.total_score), 0)::int total, count(s.id)::int submitted,
           count(s.id) filter (where s.is_correct)::int correct, coalesce(sum(s.hints_used), 0)::int hints
    from teams t left join submissions s on s.team_id = t.id
    where t.session_id = p_session_id
      and (is_session_owner(p_session_id) or g.show_scores or t.id = v_team)
    group by t.id) r), '[]'::jsonb);
end $$;

create or replace function submit_exit_ticket(p_session_id uuid, p_label text, p_a1 text, p_a2 text, p_a3 text) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- individual: any signed-in (anonymous) student who reached the room, even if their team shared one phone
  if auth.uid() is null or not exists (select 1 from game_sessions where id = p_session_id) then raise exception 'ROOM_NOT_FOUND'; end if;
  insert into exit_ticket_responses(session_id, user_id, student_label, answer1, answer2, answer3)
    values (p_session_id, auth.uid(), left(trim(p_label), 40), left(p_a1, 1000), left(p_a2, 1000), left(p_a3, 1000))
  on conflict (session_id, user_id) do update set student_label = excluded.student_label, answer1 = excluded.answer1,
    answer2 = excluded.answer2, answer3 = excluded.answer3, submitted_at = now();
end $$;

-- internal helper: only called from security-definer RPCs
revoke execute on function current_question(game_sessions) from public, anon;

-- ============ REALTIME ============
do $$ begin
  begin alter publication supabase_realtime add table game_sessions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table teams; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table submissions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table hint_unlocks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table work_gallery; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table exit_ticket_responses; exception when duplicate_object then null; end;
end $$;

-- ============ STORAGE (private bucket, 5 MB, images only) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- object path: <session_id>/<team_id>/<uuid>.<ext>
drop policy if exists gallery_read on storage.objects;
drop policy if exists gallery_insert on storage.objects;
drop policy if exists gallery_delete on storage.objects;
create policy gallery_read on storage.objects for select to authenticated using (
  bucket_id = 'gallery' and (is_session_owner(((storage.foldername(name))[1])::uuid) or is_session_member(((storage.foldername(name))[1])::uuid)));
create policy gallery_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'gallery' and is_team_member(((storage.foldername(name))[2])::uuid)
  and team_session(((storage.foldername(name))[2])::uuid) = ((storage.foldername(name))[1])::uuid);
create policy gallery_delete on storage.objects for delete to authenticated using (
  bucket_id = 'gallery' and (is_session_owner(((storage.foldername(name))[1])::uuid) or is_team_member(((storage.foldername(name))[2])::uuid)));
