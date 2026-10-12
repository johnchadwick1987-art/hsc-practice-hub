import { useState } from "react";
import {
  BookOpen,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { PAST_PAPERS, PAST_PAPER_BANK } from "../logic";
import type { Progress, Question } from "../types";
export default function PastPapers({
  progress,
  practise,
}: {
  progress: Progress;
  practise: (questions: Question[]) => void;
}) {
  const [year, setYear] = useState(PAST_PAPERS[0].year);
  const paper = PAST_PAPERS.find((p) => p.year === year)!;
  const questions = paper.questionIds.map((id) =>
    PAST_PAPER_BANK.find((q) => q.id === id)!,
  );
  const latest = new Map(progress.attempts.map((a) => [a.questionId, a]));
  const assessed = questions.filter((q) => latest.has(q.id));
  const automatic = assessed
    .filter((q) => q.type === "multiple-choice")
    .reduce((sum, q) => sum + latest.get(q.id)!.earned, 0);
  const written = assessed
    .filter((q) => q.type !== "multiple-choice")
    .reduce((sum, q) => sum + latest.get(q.id)!.earned, 0);
  const pending = questions.filter((q) => !latest.has(q.id)).length;
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">OFFICIAL PAPERS. YOUR PRACTICE.</div>
        <h1>Past HSC Multimedia papers</h1>
        <p>
          11 verified papers · 2015–2025 · 176 linked questions, using the same
          answer and progress controls.
        </p>
      </div>
      <div className="notice">
        Open the official question in a new tab, read it there, then answer
        here. Paper text, diagrams and written marking rubrics remain on the NSW
        Government website. Multiple-choice answers use verified NESA answer
        keys; writing is self-assessed against the linked official guidelines.
      </div>
      <section className="card paper-selector">
        <label className="stack-label">
          Choose a paper year
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {PAST_PAPERS.map((p) => (
              <option value={p.year} key={p.year}>
                {p.year} — Multimedia Technologies
              </option>
            ))}
          </select>
        </label>
        <p>
          These are all Multimedia papers found in NESA’s current 2015–2025
          exam-pack index, checked 12 October 2026. Older papers and a 2026
          paper have not been verified or added.
        </p>
      </section>
      <section className="card paper-overview">
        <div>
          <span className="eyebrow">{year} • NSW GOVERNMENT / NESA</span>
          <h2>{year} HSC Industrial Technology — Multimedia Technologies</h2>
          <p>
            16 numbered questions, including the parts of Question 16 · 40 marks
          </p>
        </div>
        <div className="backup-actions">
          <a
            className="button secondary"
            href={paper.paperUrl}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={17} />
            Official paper <ExternalLink size={14} />
          </a>
          <a
            className="button secondary"
            href={paper.markingGuidelinesUrl}
            target="_blank"
            rel="noreferrer"
          >
            <FileText size={17} />
            Marking guidelines <ExternalLink size={14} />
          </a>
          <button
            className="button primary"
            onClick={() => practise(questions)}
          >
            Practise {year} paper <ArrowRight size={17} />
          </button>
        </div>
        <div className="paper-progress">
          <strong>{assessed.length} / 16 assessed</strong>
          <span>
            Automatic: {automatic}/10 · Self-assessed: {written}/30
          </span>
          <span>
            {pending
              ? `${pending} questions still to assess; result incomplete.`
              : `Latest assessed results: ${automatic + written}/40.`}
          </span>
        </div>
        <p className="muted">
          Year practice is untimed and provides feedback after each answer. Use
          Exam simulation for the timed original practice paper. The summary
          combines your latest assessed answer to each question, so it may
          include several practice sessions.
        </p>
      </section>
      {(["I", "II", "III"] as const).map((section) => (
        <section key={section} className="paper-section">
          <div className="section-heading">
            <h2>
              Section {section} —{" "}
              {section === "III"
                ? "Industry Study"
                : "Industry Related Manufacturing Technology"}
            </h2>
            <span>{section === "I" ? "10" : "15"} marks</span>
          </div>
          <div className="paper-question-grid">
            {questions
              .filter((q) => q.examSection === section)
              .map((q) => {
                const result = latest.get(q.id);
                return (
                  <article key={q.id} className="card paper-question">
                    <div className="question-meta">
                      <span className="pill">
                        {q.type.replaceAll("-", " ")}
                      </span>
                      <strong>
                        {q.marks} {q.marks === 1 ? "mark" : "marks"}
                      </strong>
                    </div>
                    <h3>Question {q.paperQuestion}</h3>
                    <p>
                      {q.paperQuestion === 16
                        ? "Answer all parts, then add their marks for your total."
                        : `Open page ${q.paperPage} of the official PDF to read the question.`}
                    </p>
                    {result ? (
                      <span className="paper-result">
                        <CheckCircle2 size={15} />
                        {result.earned}/{result.max} ·{" "}
                        {result.kind === "automatic"
                          ? "Automatic"
                          : "Self-assessed"}
                      </span>
                    ) : (
                      <span className="paper-unattempted">
                        Not yet assessed
                      </span>
                    )}
                    <div className="paper-card-actions">
                      <a href={q.sourceUrl} target="_blank" rel="noreferrer">
                        View question <ExternalLink size={13} />
                      </a>
                      <button
                        className="button primary"
                        aria-label={`Practise ${year} question ${q.paperQuestion}`}
                        onClick={() => practise([q])}
                      >
                        Practise <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
      <section className="card guide">
        <h2>Study from the official source</h2>
        <p>
          © NSW Education Standards Authority. Official documents open on the
          NSW Government website; this website is not endorsed by or affiliated
          with NESA. PDF page links are a convenience: your browser may ignore
          the page fragment, in which case navigate to the displayed question
          number manually.
        </p>
        <p>
          Question identifiers, allocations, answer-key letters and PDF-page
          references were checked against each paper and guide. Source-file
          fingerprints and the verification date are stored in the editable
          paper catalogue. Question wording, option wording, diagrams, sample
          answers and written criteria are not republished here.
        </p>
        <a
          href="https://www.nsw.gov.au/education-and-training/nesa/copyright"
          target="_blank"
          rel="noreferrer"
        >
          Read NESA’s copyright terms <ExternalLink size={14} />
        </a>
      </section>
    </>
  );
}
