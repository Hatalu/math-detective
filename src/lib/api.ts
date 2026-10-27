import { useEffect, useRef, useState } from 'react';
import { db, supabase, thaiError } from './supabase';
import { answerKey, type CaseQuestion, type QuestionContent } from './cases';
import { fillTemplate, type StudentAnswer } from './math';
import type { Feedback } from '../components/CaseResult';

export type Status = 'waiting' | 'active' | 'paused' | 'reviewing' | 'completed';
export const STATUS_TH: Record<Status, string> = { waiting: 'รอเริ่มเกม', active: 'กำลังสืบสวน', paused: 'พักเกม', reviewing: 'เฉลย/ทบทวน', completed: 'จบเกม' };

export interface Session {
  id: string; teacher_id: string; title: string; room_code: string; status: Status; join_open: boolean;
  question_set_id: string | null; current_index: number; question_started_at: string | null; paused_at: string | null; time_limit_sec: number;
  hints_enabled: boolean; hint_penalty: number; show_scores: boolean; speed_bonus: boolean;
  reveal_answer: boolean; revealed_hint_level: number; created_at: string; ended_at: string | null; classroom_id: string | null;
}
export interface QuestionRow { id: string; set_id: string; position: number; content: QuestionContent }
export interface Team { id: string; session_id: string; name: string; created_at: string }
export interface Submission {
  id: string; session_id: string; team_id: string; question_id: string; answer: StudentAnswer; reasoning: string;
  hints_used: number; submitted_at: string; is_correct: boolean; accuracy_score: number; method_score: number;
  reasoning_score: number; communication_score: number; speed_bonus: number; hint_penalty: number; total_score: number;
}
export interface ScoreRow { team_id: string; name: string; total: number; submitted: number; correct: number; hints: number }

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw new Error(thaiError(error));
  return data as T;
}
function ok<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw new Error(thaiError(r.error));
  return r.data as T;
}

/* ---------- student ---------- */
export const roomStatus = (code: string) => rpc<{ exists: boolean; id?: string; status?: Status; join_open?: boolean; title?: string }>('room_status', { p_code: code });
export const joinRoom = (code: string, team: string) => rpc<{ session_id: string; team_id: string; team_name: string }>('join_room', { p_code: code, p_team_name: team });
export const myTeam = (sid: string) => rpc<{ team_id: string; team_name: string } | null>('my_team', { p_session_id: sid });
export const getHints = (sid: string, qid: string) => rpc<{ level: number; body: string }[]>('get_hints', { p_session_id: sid, p_question_id: qid });
export const revealHint = (sid: string, level: number) => rpc<{ level: number; body: string }[]>('reveal_hint', { p_session_id: sid, p_level: level });
export const submitAnswer = (sid: string, a: StudentAnswer, reasoning: string, clientId: string) =>
  rpc<Submission>('submit_answer', { p_session_id: sid, p_answer: a, p_reasoning: reasoning, p_client_id: clientId });
export const getFeedback = (sid: string, qid: string) => rpc<Omit<Feedback, 'correct' | 'scores'> | null>('get_feedback', { p_session_id: sid, p_question_id: qid });
export const scoreboard = (sid: string) => rpc<ScoreRow[]>('get_scoreboard', { p_session_id: sid });
export const submitExit = (sid: string, label: string, a: [string, string, string]) =>
  rpc<null>('submit_exit_ticket', { p_session_id: sid, p_label: label, p_a1: a[0], p_a2: a[1], p_a3: a[2] });

export function toFeedback(sub: Submission, fb: Omit<Feedback, 'correct' | 'scores'>): Feedback {
  return {
    ...fb, correct: sub.is_correct,
    scores: { accuracy: sub.accuracy_score, method: sub.method_score, reasoning: sub.reasoning_score, communication: sub.communication_score, speed: sub.speed_bonus, penalty: sub.hint_penalty, total: sub.total_score },
  };
}

export const getSession = async (id: string) => ok<Session>(await db().from('game_sessions').select('*').eq('id', id).single());
export const getQuestions = async (setId: string) => ok<QuestionRow[]>(await db().from('questions').select('id,set_id,position,content').eq('set_id', setId).order('position'));

/* ---------- teacher ---------- */
export const createSession = (title: string, setId: string, className: string) =>
  rpc<Session>('create_session', { p_title: title, p_set_id: setId, p_class_name: className });
export async function updateSession(id: string, patch: Partial<Session>) {
  return ok<Session>(await db().from('game_sessions').update(patch).eq('id', id).select().single());
}

export async function saveQuestion(setId: string, position: number, q: CaseQuestion): Promise<string> {
  const c = db();
  const content: QuestionContent = {
    code: q.code, title: q.title, story: q.story, objective: q.objective, evidence: q.evidence, data: q.data,
    dataLabel: q.dataLabel, unit: q.unit, prompt: q.prompt, target: q.target, askValue: q.askValue, difficulty: q.difficulty,
  };
  const row = q.id
    ? ok<{ id: string }>(await c.from('questions').update({ content, position }).eq('id', q.id).select('id').single())
    : ok<{ id: string }>(await c.from('questions').insert({ set_id: setId, position, content }).select('id').single());
  const k = answerKey(q); // computed from the data at save time → answer always matches the dataset
  ok(await c.from('question_answers').upsert({
    question_id: row.id,
    expected: { measure: k.measure, values: k.values, noMode: k.noMode },
    explanation: { reasoning: q.reasoning, misconceptions: q.misconceptions, limitations: q.limitations, clueTemplates: q.clues },
  }));
  ok(await c.from('clues').upsert(q.clues.map((t, i) => ({ question_id: row.id, level: i + 1, body: fillTemplate(t, q.data) })), { onConflict: 'question_id,level' }));
  return row.id;
}

export async function loadSet(setId: string): Promise<CaseQuestion[]> {
  const c = db();
  const qs = await getQuestions(setId);
  if (!qs.length) return [];
  const ans = ok<{ question_id: string; expected: { measure: CaseQuestion['measure'] }; explanation: { reasoning: string; misconceptions: string; limitations: string; clueTemplates: CaseQuestion['clues'] } }[]>(
    await c.from('question_answers').select('*').in('question_id', qs.map((q) => q.id)));
  return qs.map((q) => {
    const a = ans.find((x) => x.question_id === q.id);
    return {
      ...q.content, id: q.id, measure: a?.expected.measure ?? 'mean',
      clues: a?.explanation.clueTemplates ?? ['', '', ''], reasoning: a?.explanation.reasoning ?? '',
      misconceptions: a?.explanation.misconceptions ?? '', limitations: a?.explanation.limitations ?? '',
    };
  });
}

/* ---------- realtime ---------- */
export type Watch = { table: string; filter?: string };
/** Subscribes to postgres_changes (RLS applies). Returns channel status for the connection badge. */
export function useRealtime(key: string | null, watches: Watch[], onChange: () => void) {
  const [status, setStatus] = useState('CONNECTING');
  const cb = useRef(onChange); cb.current = onChange;
  useEffect(() => {
    if (!supabase || !key) return;
    let ch = supabase.channel(key);
    for (const w of watches) ch = ch.on('postgres_changes' as never, { event: '*', schema: 'public', table: w.table, filter: w.filter } as never, () => cb.current());
    ch.subscribe((s) => { setStatus(s); if (s === 'SUBSCRIBED') cb.current(); }); // refetch after (re)connect so nothing is missed
    const onOnline = () => cb.current();
    addEventListener('online', onOnline);
    return () => { removeEventListener('online', onOnline); supabase!.removeChannel(ch); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return status;
}
