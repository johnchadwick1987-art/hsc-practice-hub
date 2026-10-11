import { describe, it, expect, vi } from "vitest";
import {
  BANK,
  EXAM_IDS,
  validateQuestionBank,
  markChoice,
  statistics,
  emptyProgress,
  createSession,
  transitionClock,
  examScore,
  recordAttempt,
  parseProgress,
  shuffle,
} from "./logic";
import { readProgress, saveProgress } from "./storage";
function assessed() {
  const s = createSession("mixed");
  const q = BANK[0];
  s.answers[q.id] = q.correctAnswer!;
  s.marks[q.id] = 1;
  s.submitted[q.id] = true;
  return recordAttempt(
    { ...emptyProgress(), sessions: [s], activeSessionId: s.id },
    s,
    q,
    1,
  );
}
describe("published content", () => {
  it("has 30 unique original questions with the requested split and all ten topics", () => {
    expect(validateQuestionBank(BANK)).toHaveLength(30);
    expect(new Set(BANK.map((q) => q.topic)).size).toBe(10);
    expect(BANK.filter((q) => q.type === "multiple-choice")).toHaveLength(15);
    expect(BANK.filter((q) => q.type === "short-answer")).toHaveLength(10);
    expect(BANK.filter((q) => q.type === "extended-response")).toHaveLength(5);
    expect(BANK.every((q) => q.source === "Original" && !q.sourceYear)).toBe(
      true,
    );
  });
  it("requires verified provenance for published past-paper imports", () => {
    const q = { ...BANK[0], source: "Verified past paper" };
    expect(() => validateQuestionBank([q])).toThrow("verified year");
    expect(
      validateQuestionBank([
        {
          ...q,
          sourceYear: 2025,
          examSection: "I",
          syllabusReference: "Checked reference",
          sourceUrl: "https://www.nsw.gov.au/example",
        },
      ]),
    ).toHaveLength(1);
    expect(() =>
      validateQuestionBank([
        {
          ...q,
          sourceYear: 2025,
          examSection: "I",
          syllabusReference: "Checked reference",
          sourceUrl: "javascript:alert(1)",
        },
      ]),
    ).toThrow("official");
  });
  it("rejects duplicate IDs and invalid options", () => {
    expect(() => validateQuestionBank([BANK[0], BANK[0]])).toThrow("Duplicate");
    expect(() =>
      validateQuestionBank([{ ...BANK[0], correctAnswer: "Z" }]),
    ).toThrow("correct answer");
    expect(() => validateQuestionBank([{ ...BANK[0], marks: 0 }])).toThrow(
      "Marks",
    );
  });
  it("marks every correct and wrong choice; written answers cannot be auto-marked", () => {
    for (const q of BANK.filter((q) => q.type === "multiple-choice"))
      for (const o of q.options!)
        expect(markChoice(q, o.id)).toBe(o.id === q.correctAnswer ? 1 : 0);
    expect(markChoice(BANK[0], "")).toBe(0);
    expect(() => markChoice(BANK[15], "test")).toThrow("self-assessment");
  });
  it("shuffles without mutating or losing items", () => {
    const input = ["a", "b", "c"];
    const result = shuffle(input, () => 0);
    expect(input).toEqual(["a", "b", "c"]);
    expect(result.sort()).toEqual([...input].sort());
  });
});
describe("progress and imports", () => {
  it("counts unique assessed questions and latest topic performance, but all MC attempts for accuracy", () => {
    let p = assessed();
    const s = createSession("mixed");
    s.answers[BANK[0].id] = "B";
    p = { ...p, sessions: [...p.sessions, s] };
    p = recordAttempt(p, s, BANK[0], 0);
    const stats = statistics(p);
    expect(stats.completed).toBe(1);
    expect(stats.accuracy).toBe(50);
    expect(stats.incorrectIds).toEqual([BANK[0].id]);
    expect(stats.byTopic[0].earned).toBe(0);
  });
  it("does not count unassessed written responses; explicitly records selected marks", () => {
    const s = createSession("mixed");
    s.answers["sa-01"] = "A response";
    let p = { ...emptyProgress(), sessions: [s] };
    expect(statistics(p).completed).toBe(0);
    p = recordAttempt(p, s, BANK[15], 2);
    expect(p.attempts[0].kind).toBe("self-assessed");
    expect(statistics(p).writtenEarned).toBe(2);
    expect(() => recordAttempt(p, s, BANK[15], 4)).toThrow();
  });
  it("round-trips sessions, answers, results and option order", () => {
    const p = assessed();
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
  });
  it("rejects corrupt versions, unknown questions, false automatic marks and missing timers", () => {
    const p = assessed();
    expect(() => parseProgress("{")).toThrow();
    expect(() => parseProgress(JSON.stringify({ ...p, version: 2 }))).toThrow();
    expect(() =>
      parseProgress(
        JSON.stringify({
          ...p,
          attempts: [{ ...p.attempts[0], questionId: "unknown" }],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseProgress(
        JSON.stringify({ ...p, attempts: [{ ...p.attempts[0], earned: 0 }] }),
      ),
    ).toThrow("Automatic");
    const s = createSession("exam");
    delete s.deadline;
    expect(() =>
      parseProgress(JSON.stringify({ ...emptyProgress(), sessions: [s] })),
    ).toThrow("deadline");
  });
  it("saves and loads browser data; preserves corrupted storage with a warning", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    const p = assessed();
    saveProgress(p);
    expect(readProgress().progress).toEqual(p);
    store.set("hsc-multimedia-progress-v1", "broken");
    expect(readProgress().warning).toContain("not been overwritten");
    expect(store.get("hsc-multimedia-progress-v1")).toBe("broken");
    vi.unstubAllGlobals();
  });
});
describe("exam scoring and deadlines", () => {
  it("uses 10 automatic + 15 short + 15 extended marks", () => {
    const s = createSession("exam");
    expect(s.questionIds).toEqual(EXAM_IDS);
    expect(examScore(s)).toMatchObject({
      automatic: 0,
      selfAssessed: 0,
      max: 40,
      pending: 6,
    });
    expect(
      EXAM_IDS.filter((id) => id.startsWith("sa")).reduce(
        (v, id) => v + BANK.find((q) => q.id === id)!.marks,
        0,
      ),
    ).toBe(15);
  });
  it("scores MC automatically and keeps written results pending until explicitly assessed", () => {
    const s = createSession("exam");
    for (const id of s.questionIds) {
      const q = BANK.find((q) => q.id === id)!;
      if (q.type === "multiple-choice") s.answers[id] = q.correctAnswer!;
      else s.marks[id] = q.marks;
    }
    expect(examScore(s)).toEqual({
      automatic: 10,
      selfAssessed: 30,
      total: 40,
      max: 40,
      pending: 0,
    });
  });
  it("continues clocks across reloads and submits after both deadlines pass", () => {
    const s = createSession("exam");
    const deadline = s.deadline!;
    expect(transitionClock(s, deadline - 1)).toBe(s);
    const writing = transitionClock(s, deadline);
    expect(writing.phase).toBe("writing");
    expect(writing.deadline).toBe(deadline + 5400000);
    expect(transitionClock(s, deadline + 5400000).phase).toBe("review");
    expect(transitionClock(writing, deadline + 5400000).phase).toBe("review");
  });
});
