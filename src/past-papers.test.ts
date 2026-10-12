import { describe, it, expect } from "vitest";
import {
  BANK,
  ORIGINAL_BANK,
  PAST_PAPER_BANK,
  PAST_PAPERS,
  createSession,
  markChoice,
  parseProgress,
  emptyProgress,
  recordAttempt,
  statistics,
  validateQuestionBank,
} from "./logic";
// Independently checked against each downloaded official guide's Section I table.
const officialKeys: Record<number, string> = {
  2015: "ABACBD DABC".replaceAll(" ", ""),
  2016: "BCBCAADAAD",
  2017: "CCBADBDCDB",
  2018: "DBBADDCCAA",
  2019: "ACDAABBDCC",
  2020: "DDCACBCBDA",
  2021: "DCAB CACDBB".replaceAll(" ", ""),
  2022: "BDACCD AAAB".replaceAll(" ", ""),
  2023: "CCBCAACDDB",
  2024: "DCBCDADBBA",
  2025: "CCDDABCBCC",
};
describe("official linked paper catalogue", () => {
  it("contains every verified year from 2015 through 2025 with 176 numbered references", () => {
    expect(PAST_PAPERS.map((p) => p.year)).toEqual(
      Array.from({ length: 11 }, (_, i) => 2025 - i),
    );
    expect(PAST_PAPER_BANK).toHaveLength(176);
    expect(BANK).toHaveLength(206);
    expect(new Set(BANK.map((q) => q.id)).size).toBe(206);
    expect(validateQuestionBank(BANK)).toHaveLength(206);
  });
  it("matches independently checked answer keys and 10/15/15 allocations in every year", () => {
    for (const paper of PAST_PAPERS) {
      const questions = paper.questionIds.map((id) =>
        PAST_PAPER_BANK.find((q) => q.id === id)!,
      );
      expect(questions.map((q) => q.paperQuestion)).toEqual(
        Array.from({ length: 16 }, (_, i) => i + 1),
      );
      expect(
        questions
          .filter((q) => q.type === "multiple-choice")
          .map((q) => q.correctAnswer)
          .join(""),
      ).toBe(officialKeys[paper.year]);
      for (const [section, marks] of [
        ["I", 10],
        ["II", 15],
        ["III", 15],
      ] as const)
        expect(
          questions
            .filter((q) => q.examSection === section)
            .reduce((sum, q) => sum + q.marks, 0),
        ).toBe(marks);
      expect(paper.marks).toBe(40);
    }
  });
  it("keeps verified official links, PDF pages and file fingerprints for every reference", () => {
    for (const paper of PAST_PAPERS) {
      expect(paper.paperSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(paper.markingGuidelinesSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(new URL(paper.packUrl).pathname.endsWith("/" + paper.year)).toBe(
        true,
      );
      for (const id of paper.questionIds) {
        const q = PAST_PAPER_BANK.find((q) => q.id === id)!;
        expect(q.sourceYear).toBe(paper.year);
        expect(q.sourceUrl).toBe(paper.paperUrl + "#page=" + q.paperPage);
        expect(q.markingGuidelinesUrl).toBe(
          paper.markingGuidelinesUrl + "#page=" + q.guidelinesPage,
        );
        expect(new URL(q.sourceUrl!).hostname).toBe("www.nsw.gov.au");
        expect(q.source).toBe("Linked past paper");
      }
    }
  });
  it("does not pretend linked references contain copied prompts, options or written model answers", () => {
    for (const q of PAST_PAPER_BANK) {
      expect(q.text).toBe(
        `${q.sourceYear} HSC Multimedia Technologies — Question ${q.paperQuestion}`,
      );
      if (q.type === "multiple-choice")
        for (const o of q.options!)
          expect(o.text).toBe(`Option ${o.id} in the official paper`);
      else expect(q.modelAnswer).toBe("");
    }
  });
  it("preserves question sequence and official option letters, even in incorrect-answer review", () => {
    const pool = PAST_PAPER_BANK.filter((q) => q.sourceYear === 2025);
    const session = createSession("past-paper", pool);
    expect(session.questionIds).toEqual(pool.map((q) => q.id));
    for (const q of pool.filter((q) => q.type === "multiple-choice")) {
      expect(session.optionOrders[q.id]).toEqual(["A", "B", "C", "D"]);
      expect(createSession("incorrect", [q]).optionOrders[q.id]).toEqual([
        "A",
        "B",
        "C",
        "D",
      ]);
      expect(markChoice(q, q.correctAnswer!)).toBe(1);
    }
  });
  it("retains original-only mixed practice and accepts both old and new progress exports", () => {
    const original = createSession("mixed");
    expect(original.questionIds).toHaveLength(30);
    expect(
      original.questionIds.every((id) =>
        ORIGINAL_BANK.some((q) => q.id === id),
      ),
    ).toBe(true);
    expect(
      parseProgress(
        JSON.stringify({
          ...emptyProgress(),
          sessions: [original],
          activeSessionId: original.id,
        }),
      ),
    ).toMatchObject({ activeSessionId: original.id });
    const q = PAST_PAPER_BANK[0];
    const session = createSession("past-paper", [q]);
    session.answers[q.id] = q.correctAnswer!;
    session.marks[q.id] = 1;
    session.submitted[q.id] = true;
    const p = recordAttempt(
      { ...emptyProgress(), sessions: [session], activeSessionId: session.id },
      session,
      q,
      1,
    );
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
    expect(statistics(p).completed).toBe(1);
    expect(statistics(p).accuracy).toBe(100);
  });
  it("rejects unverified or unsafe linked references", () => {
    const q = PAST_PAPER_BANK[0];
    expect(() =>
      validateQuestionBank([
        { ...q, markingGuidelinesUrl: "https://example.com/mg.pdf" },
      ]),
    ).toThrow("official");
    expect(() => validateQuestionBank([{ ...q, paperPage: 0 }])).toThrow(
      "PDF pages",
    );
    expect(() =>
      validateQuestionBank([{ ...q, sourceYear: undefined }]),
    ).toThrow("verified year");
  });
});
