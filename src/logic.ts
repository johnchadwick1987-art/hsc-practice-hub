import raw from "./data/questions.json";
import { topics } from "./data/topics";
import type { Question, Progress, Session, Attempt } from "./types";
export const BANK = raw as Question[];
export const STORAGE_KEY = "hsc-multimedia-progress-v1";
export const emptyProgress = (): Progress => ({
  version: 1,
  attempts: [],
  sessions: [],
});
const obj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const strings = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((y) => typeof y === "string");
export function validateQuestionBank(value: unknown): Question[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10000)
    throw Error("The bank must be a non-empty array of questions.");
  const ids = new Set<string>();
  for (const q of value) {
    if (!obj(q)) throw Error("Each question must be an object.");
    for (const key of [
      "id",
      "topic",
      "subtopic",
      "text",
      "explanation",
      "modelAnswer",
      "tip",
    ])
      if (typeof q[key] !== "string" || !(q[key] as string).trim())
        throw Error(`Missing ${key}.`);
    if (ids.has(q.id as string)) throw Error(`Duplicate ID: ${q.id}`);
    ids.add(q.id as string);
    if (!topics.includes(q.topic as string))
      throw Error(`Unknown topic: ${q.topic}. Add it to topics.ts first.`);
    if (
      !["Foundation", "Developing", "Challenge"].includes(
        q.difficulty as string,
      ) ||
      !["Original", "Verified past paper"].includes(q.source as string)
    )
      throw Error("Use a supported difficulty and source.");
    if (
      !Number.isInteger(q.marks) ||
      (q.marks as number) < 1 ||
      (q.marks as number) > 40
    )
      throw Error("Marks must be an integer from 1 to 40.");
    if (
      !strings(q.vocabulary) ||
      !q.vocabulary.length ||
      !Array.isArray(q.criteria) ||
      !q.criteria.length ||
      !q.criteria.every(
        (c) =>
          obj(c) &&
          typeof c.marks === "string" &&
          typeof c.description === "string" &&
          c.description.trim(),
      )
    )
      throw Error("Vocabulary and marking criteria are required.");
    if (q.planning !== undefined && !strings(q.planning))
      throw Error("Planning must be an array of text.");
    if (q.source === "Verified past paper") {
      if (
        !q.sourceYear ||
        !q.examSection ||
        !q.syllabusReference ||
        typeof q.sourceUrl !== "string"
      )
        throw Error(
          "Past papers require a verified year, section, syllabus reference and official source URL.",
        );
      let url: URL;
      try {
        url = new URL(q.sourceUrl);
      } catch {
        throw Error("Invalid source URL.");
      }
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        ![
          "nsw.gov.au",
          "educationstandards.nsw.edu.au",
          "boardofstudies.nsw.edu.au",
        ].some((h) => url.hostname === h || url.hostname.endsWith("." + h))
      )
        throw Error("Use an official NSW/NESA HTTPS source URL.");
    }
    if (
      q.sourceYear !== undefined &&
      (!Number.isInteger(q.sourceYear) ||
        (q.sourceYear as number) < 2000 ||
        (q.sourceYear as number) > 2100)
    )
      throw Error("Invalid source year.");
    for (const k of ["syllabusReference", "examSection"])
      if (q[k] !== undefined && typeof q[k] !== "string")
        throw Error(`Invalid ${k}.`);
    if (q.type === "multiple-choice") {
      if (
        q.marks !== 1 ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !q.options.every(
          (o) =>
            obj(o) &&
            typeof o.id === "string" &&
            typeof o.text === "string" &&
            o.text.trim() &&
            typeof o.explanation === "string" &&
            o.explanation.trim(),
        )
      )
        throw Error(
          "Multiple choice requires four explained options and one mark.",
        );
      const options = q.options as { id: string }[];
      if (
        new Set(options.map((o) => o.id)).size !== 4 ||
        !options.some((o) => o.id === q.correctAnswer)
      )
        throw Error(
          "Option IDs must be unique and include the correct answer.",
        );
    } else if (
      !["short-answer", "extended-response"].includes(q.type as string)
    )
      throw Error("Unknown question type.");
  }
  return value as Question[];
}
validateQuestionBank(BANK);
export function markChoice(q: Question, response: string): number {
  if (q.type !== "multiple-choice")
    throw Error("Written responses require self-assessment.");
  return response === q.correctAnswer ? 1 : 0;
}
export function shuffle<T>(
  items: T[],
  random: () => number = Math.random,
): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const EXAM_IDS = [
  "mc-01",
  "mc-02",
  "mc-03",
  "mc-04",
  "mc-05",
  "mc-10",
  "mc-11",
  "mc-12",
  "mc-13",
  "mc-14",
  "sa-02",
  "sa-03",
  "sa-04",
  "sa-05",
  "sa-09",
  "er-01",
]; // 10 + 15 + 15 = 40; six short-answer items including sa-09 parts (a)/(b).
export function createSession(
  mode: Session["mode"],
  pool: Question[] = BANK,
): Session {
  const questionIds =
    mode === "exam" ? [...EXAM_IDS] : shuffle(pool.map((q) => q.id));
  if (!questionIds.length)
    throw Error("No questions available for this session.");
  return {
    id: crypto.randomUUID(),
    mode,
    questionIds,
    index: 0,
    answers: {},
    marks: {},
    submitted: {},
    flags: [],
    optionOrders: Object.fromEntries(
      questionIds.map((id) => [
        id,
        shuffle(BANK.find((q) => q.id === id)?.options?.map((o) => o.id) || []),
      ]),
    ),
    phase: mode === "exam" ? "reading" : "writing",
    deadline: mode === "exam" ? Date.now() + 300000 : undefined,
    completed: false,
    created: new Date().toISOString(),
  };
}
export function transitionClock(s: Session, now: number): Session {
  if (s.mode !== "exam" || s.phase === "review" || !s.deadline || s.completed)
    return s;
  if (now < s.deadline) return s;
  if (s.phase === "reading") {
    const deadline = s.deadline + 5400000;
    return now >= deadline
      ? { ...s, phase: "review", deadline: undefined }
      : { ...s, phase: "writing", deadline };
  }
  return { ...s, phase: "review", deadline: undefined };
}
export function examScore(s: Session) {
  let automatic = 0,
    selfAssessed = 0,
    pending = 0;
  for (const id of s.questionIds) {
    const q = BANK.find((q) => q.id === id)!;
    if (q.type === "multiple-choice")
      automatic += markChoice(q, s.answers[id] || "");
    else if (s.marks[id] !== undefined) selfAssessed += s.marks[id];
    else pending++;
  }
  return {
    automatic,
    selfAssessed,
    total: automatic + selfAssessed,
    max: s.questionIds.reduce(
      (sum, id) => sum + BANK.find((q) => q.id === id)!.marks,
      0,
    ),
    pending,
  };
}
export function recordAttempt(
  p: Progress,
  s: Session,
  q: Question,
  earned: number,
): Progress {
  if (!Number.isInteger(earned) || earned < 0 || earned > q.marks)
    throw Error("Invalid mark.");
  const a: Attempt = {
    id: `${s.id}:${q.id}`,
    sessionId: s.id,
    questionId: q.id,
    response: s.answers[q.id] || "",
    earned,
    max: q.marks,
    kind: q.type === "multiple-choice" ? "automatic" : "self-assessed",
    date: new Date().toISOString(),
  };
  return { ...p, attempts: [...p.attempts.filter((x) => x.id !== a.id), a] };
}
export function statistics(p: Progress) {
  const latest = new Map<string, Attempt>();
  p.attempts.forEach((a) => latest.set(a.questionId, a));
  const mc = p.attempts.filter((a) => a.kind === "automatic");
  const written = p.attempts.filter((a) => a.kind === "self-assessed");
  const byTopic = topics.map((topic) => {
    const a = [...latest.values()].filter(
      (a) => BANK.find((q) => q.id === a.questionId)?.topic === topic,
    );
    return {
      topic,
      count: a.length,
      earned: a.reduce((s, x) => s + x.earned, 0),
      max: a.reduce((s, x) => s + x.max, 0),
    };
  });
  return {
    completed: latest.size,
    progress: Math.round((latest.size / BANK.length) * 100),
    accuracy: mc.length
      ? Math.round((mc.reduce((s, a) => s + a.earned, 0) / mc.length) * 100)
      : null,
    mcCount: mc.length,
    writtenEarned: written.reduce((s, a) => s + a.earned, 0),
    writtenMax: written.reduce((s, a) => s + a.max, 0),
    byTopic,
    incorrectIds: [...latest.values()]
      .filter((a) => a.earned < a.max)
      .map((a) => a.questionId),
  };
}
export function parseProgress(text: string): Progress {
  if (text.length > 5_000_000)
    throw Error("Progress file is too large (maximum 5 MB).");
  const p: unknown = JSON.parse(text);
  if (
    !obj(p) ||
    p.version !== 1 ||
    !Array.isArray(p.attempts) ||
    !Array.isArray(p.sessions) ||
    p.attempts.length > 10000 ||
    p.sessions.length > 1000
  )
    throw Error("Not a supported progress export.");
  const bank = new Map(BANK.map((q) => [q.id, q]));
  const sessionIds = new Set<string>();
  for (const s of p.sessions) {
    if (
      !obj(s) ||
      typeof s.id !== "string" ||
      !s.id ||
      sessionIds.has(s.id) ||
      !["mixed", "topic", "incorrect", "exam"].includes(s.mode as string) ||
      !strings(s.questionIds) ||
      !s.questionIds.length ||
      new Set(s.questionIds).size !== s.questionIds.length ||
      !s.questionIds.every((id) => bank.has(id)) ||
      !Number.isInteger(s.index) ||
      (s.index as number) < 0 ||
      (s.index as number) >= s.questionIds.length
    )
      throw Error("Invalid session or question IDs.");
    sessionIds.add(s.id);
    if (
      s.mode === "exam" &&
      (s.questionIds.length !== EXAM_IDS.length ||
        !EXAM_IDS.every((id) => (s.questionIds as string[]).includes(id)))
    )
      throw Error("Invalid exam question set.");
    if (
      !obj(s.answers) ||
      !obj(s.marks) ||
      !obj(s.submitted) ||
      !obj(s.optionOrders) ||
      !strings(s.flags) ||
      !s.flags.every((id) => (s.questionIds as string[]).includes(id)) ||
      !["reading", "writing", "review"].includes(s.phase as string) ||
      typeof s.completed !== "boolean" ||
      typeof s.created !== "string" ||
      !Number.isFinite(Date.parse(s.created))
    )
      throw Error("Invalid session data.");
    if (
      s.ended !== undefined &&
      (typeof s.ended !== "string" || !Number.isFinite(Date.parse(s.ended)))
    )
      throw Error("Invalid completion date.");
    if (
      s.deadline !== undefined &&
      (typeof s.deadline !== "number" ||
        !Number.isFinite(s.deadline) ||
        s.deadline < 0)
    )
      throw Error("Invalid timer.");
    if (
      s.mode === "exam" &&
      s.phase !== "review" &&
      !s.completed &&
      s.deadline === undefined
    )
      throw Error("Missing exam deadline.");
    for (const [id, response] of Object.entries(s.answers)) {
      const q = bank.get(id);
      if (
        !q ||
        !(s.questionIds as string[]).includes(id) ||
        typeof response !== "string" ||
        response.length > 100000 ||
        (q.type === "multiple-choice" &&
          !q.options!.some((o) => o.id === response))
      )
        throw Error("Invalid response.");
    }
    for (const [id, mark] of Object.entries(s.marks))
      if (
        !(s.questionIds as string[]).includes(id) ||
        !Number.isInteger(mark) ||
        (mark as number) < 0 ||
        (mark as number) > bank.get(id)!.marks
      )
        throw Error("Invalid self-assessed mark.");
    for (const [id, done] of Object.entries(s.submitted))
      if (
        !(s.questionIds as string[]).includes(id) ||
        typeof done !== "boolean"
      )
        throw Error("Invalid submitted status.");
    for (const id of s.questionIds) {
      const order = s.optionOrders[id],
        q = bank.get(id)!;
      if (
        !strings(order) ||
        (q.type === "multiple-choice" &&
          (order.length !== 4 ||
            new Set(order).size !== 4 ||
            !order.every((v) => q.options!.some((o) => o.id === v))))
      )
        throw Error("Invalid option ordering.");
    }
  }
  const attemptIds = new Set<string>();
  for (const a of p.attempts) {
    if (!obj(a) || typeof a.questionId !== "string")
      throw Error("Invalid attempt.");
    const q = bank.get(a.questionId);
    if (
      !q ||
      typeof a.id !== "string" ||
      attemptIds.has(a.id) ||
      typeof a.sessionId !== "string" ||
      !sessionIds.has(a.sessionId) ||
      a.id !== `${a.sessionId}:${a.questionId}` ||
      typeof a.response !== "string" ||
      a.response.length > 100000 ||
      !Number.isInteger(a.earned) ||
      (a.earned as number) < 0 ||
      (a.earned as number) > q.marks ||
      a.max !== q.marks ||
      a.kind !==
        (q.type === "multiple-choice" ? "automatic" : "self-assessed") ||
      typeof a.date !== "string" ||
      !Number.isFinite(Date.parse(a.date))
    )
      throw Error("Invalid attempt or marks.");
    if (q.type === "multiple-choice" && a.earned !== markChoice(q, a.response))
      throw Error("Automatic mark does not match the response.");
    const session = p.sessions.find((s) => s.id === a.sessionId);
    if (!session.questionIds.includes(a.questionId))
      throw Error("Attempt is outside its session.");
    attemptIds.add(a.id);
  }
  if (
    p.activeSessionId !== undefined &&
    (typeof p.activeSessionId !== "string" ||
      !sessionIds.has(p.activeSessionId) ||
      p.sessions.find((s) => s.id === p.activeSessionId).completed)
  )
    throw Error("Invalid active session.");
  return p as unknown as Progress;
}
