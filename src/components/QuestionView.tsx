import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Flag,
  Lightbulb,
  ArrowRight,
  Clock3,
} from "lucide-react";
import type { Question, Session } from "../types";
export default function QuestionView({
  q,
  session,
  update,
  assess,
  next,
  exam,
}: {
  q: Question;
  session: Session;
  update: (patch: Partial<Session>) => void;
  assess: (q: Question, mark: number) => void;
  next: () => void;
  exam: boolean;
}) {
  const [seconds, setSeconds] = useState(0);
  const [timing, setTiming] = useState(false);
  useEffect(() => {
    setSeconds(0);
    setTiming(false);
  }, [q.id]);
  useEffect(() => {
    if (!timing) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [timing]);
  const response = session.answers[q.id] || "";
  const reading = exam && session.phase === "reading";
  const feedback = exam
    ? session.phase === "review"
    : !!session.submitted[q.id];
  const order = session.optionOrders[q.id] || q.options?.map((o) => o.id) || [];
  const flagged = session.flags.includes(q.id);
  function change(value: string) {
    update({ answers: { ...session.answers, [q.id]: value } });
  }
  return (
    <div className="question-layout">
      <article className="card question-card">
        <div className="question-meta">
          <span className="pill">{q.type.replaceAll("-", " ")}</span>
          <span>{q.difficulty}</span>
          <strong>
            {q.marks} {q.marks === 1 ? "mark" : "marks"}
          </strong>
        </div>
        <div className="question-topic">
          {q.topic} <span> / {q.subtopic}</span>
        </div>
        <h2>{q.text}</h2>
        {reading && (
          <p className="notice">
            Reading time: read and plan mentally. Answer controls unlock when
            writing time begins.
          </p>
        )}
        {q.type === "multiple-choice" ? (
          <fieldset disabled={reading || feedback}>
            <legend className="sr-only">Choose one answer</legend>
            <div className="options">
              {order.map((id, i) => {
                const o = q.options!.find((o) => o.id === id)!;
                return (
                  <label
                    className={`option ${response === id ? "selected" : ""} ${feedback && q.correctAnswer === id ? "correct" : ""} ${feedback && response === id && q.correctAnswer !== id ? "incorrect" : ""}`}
                    key={id}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={id}
                      checked={response === id}
                      onChange={() => change(id)}
                    />
                    <span className="option-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{o.text}</span>
                    {feedback && q.correctAnswer === id && (
                      <CheckCircle2 size={20} />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <>
            {q.planning && (
              <details className="planning">
                <summary>Plan your response</summary>
                <ol>
                  {q.planning.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
              </details>
            )}
            <label className="field-label" htmlFor="response">
              Your response
            </label>
            <textarea
              id="response"
              rows={q.type === "extended-response" ? 12 : 7}
              disabled={reading || feedback}
              value={response}
              maxLength={100000}
              placeholder="Write your response here. Use technical detail and link it to the question…"
              onChange={(e) => change(e.target.value)}
            />
            <div className="writing-meta">
              <span>
                {response.trim() ? response.trim().split(/\s+/).length : 0}{" "}
                words
              </span>
              {!exam && q.type === "extended-response" && (
                <button
                  className="text-button"
                  onClick={() => setTiming(!timing)}
                >
                  <Clock3 size={15} />
                  {timing ? "Pause" : "Start"} optional timer ·{" "}
                  {Math.floor(seconds / 60)}:
                  {String(seconds % 60).padStart(2, "0")}
                </button>
              )}
            </div>
          </>
        )}
        <div className="question-actions">
          <button
            className={`button secondary ${flagged ? "flagged" : ""}`}
            onClick={() =>
              update({
                flags: flagged
                  ? session.flags.filter((id) => id !== q.id)
                  : [...session.flags, q.id],
              })
            }
          >
            <Flag size={16} />
            {flagged ? "Flagged" : "Flag for review"}
          </button>
          {!exam && !feedback && (
            <button
              className="button primary"
              disabled={!response.trim()}
              onClick={() => {
                if (q.type === "multiple-choice")
                  assess(q, response === q.correctAnswer ? 1 : 0);
                else
                  update({ submitted: { ...session.submitted, [q.id]: true } });
              }}
            >
              {" "}
              {q.type === "multiple-choice"
                ? "Check answer"
                : "Compare & self-assess"}
              <ArrowRight size={16} />
            </button>
          )}
          {!exam && feedback && (
            <button
              className="button primary"
              disabled={session.marks[q.id] === undefined}
              onClick={next}
            >
              Next question <ArrowRight size={16} />
            </button>
          )}
        </div>
        {feedback && (
          <section className="feedback" aria-label="Answer feedback">
            <div className="feedback-heading">
              <CheckCircle2 size={22} />
              <h3>
                {q.type === "multiple-choice"
                  ? response === q.correctAnswer
                    ? "Correct — well done"
                    : "Let’s learn from this"
                  : "Compare, reflect, improve"}
              </h3>
            </div>
            {q.type === "multiple-choice" ? (
              <>
                <p>
                  <strong>Correct answer:</strong> {q.modelAnswer}
                </p>
                <p>{q.explanation}</p>
                <details>
                  <summary>Why each option does or doesn’t fit</summary>
                  {order.map((id, i) => {
                    const o = q.options!.find((o) => o.id === id)!;
                    return (
                      <p key={id}>
                        <strong>
                          {String.fromCharCode(65 + i)}. {o.text}
                        </strong>
                        <br />
                        {o.explanation}
                      </p>
                    );
                  })}
                </details>
              </>
            ) : (
              <>
                <p className="notice">
                  Written responses are self-assessed by you. This website does
                  not automatically mark your writing.
                </p>
                <div className="comparison">
                  <div>
                    <h4>Your response</h4>
                    <p className="preserve">
                      {response || "No response entered."}
                    </p>
                  </div>
                  <div>
                    <h4>Model response</h4>
                    <p>{q.modelAnswer}</p>
                  </div>
                </div>
                <p>{q.explanation}</p>
              </>
            )}
            {q.syllabusReference && (
              <p className="source-note">
                <strong>Syllabus reference:</strong> {q.syllabusReference}
              </p>
            )}
            {q.source === "Verified past paper" && (
              <p className="source-note">
                <a href={q.sourceUrl} target="_blank" rel="noreferrer">
                  Verified source: {q.sourceYear} · {q.examSection}
                </a>
              </p>
            )}
            <h4>Marking guidance</h4>
            <div className="criteria">
              {q.criteria.map((c) => (
                <div key={c.marks}>
                  <strong>
                    {c.marks} {c.marks === "1" ? "mark" : "marks"}
                  </strong>
                  <p>{c.description}</p>
                </div>
              ))}
            </div>
            {q.type !== "multiple-choice" && (
              <label className="self-mark">
                Your self-assessed mark
                <select
                  aria-label="Your self-assessed mark"
                  value={session.marks[q.id] ?? ""}
                  onChange={(e) => {
                    if (e.target.value !== "")
                      assess(q, Number(e.target.value));
                  }}
                >
                  <option value="" disabled>
                    Select a mark
                  </option>
                  {Array.from({ length: q.marks + 1 }, (_, i) => (
                    <option key={i} value={i}>
                      {i} / {q.marks}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <h4>Key vocabulary</h4>
            <div className="tag-list">
              {q.vocabulary.map((v) => (
                <span className="tag" key={v}>
                  {v}
                </span>
              ))}
            </div>
            <p className="tip">
              <Lightbulb size={19} />
              <span>{q.tip}</span>
            </p>
            <p>
              <strong>Revise next:</strong> {q.topic} · {q.subtopic}
            </p>
          </section>
        )}
      </article>
      <aside className="card learning-note">
        <span className="icon-tile">
          <Lightbulb />
        </span>
        <h3>Make every answer count</h3>
        <p>
          {exam
            ? "Read the command word, use the available marks to judge the depth needed, and leave time to review."
            : "Practice is more than a score. Read the feedback, identify the gap, then try again."}
        </p>
        <div className="note-divider" />
        <h4>Answer with purpose</h4>
        <p>
          <strong>Outline</strong> — give the main features.
        </p>
        <p>
          <strong>Explain</strong> — show how or why.
        </p>
        <p>
          <strong>Evaluate</strong> — make a judgement using evidence.
        </p>
        <small>
          {q.source === "Original"
            ? "Original practice content. Not an official NESA question or marking guide."
            : "Verified past-paper question. See source attribution in the feedback."}
        </small>
      </aside>
    </div>
  );
}
