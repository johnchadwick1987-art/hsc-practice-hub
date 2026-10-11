import { useState } from "react";
import { BANK, validateQuestionBank } from "../logic";
import { topics } from "../data/topics";
import { downloadJson } from "../storage";
import type { Question, QuestionType } from "../types";
export default function Teacher() {
  const [type, setType] = useState<QuestionType>("short-answer");
  const [topic, setTopic] = useState(topics[0]);
  const [text, setText] = useState("");
  const [model, setModel] = useState("");
  const [marks, setMarks] = useState(3);
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");
  function draft() {
    const sample = BANK.find((q) => q.type === type)!;
    const q: Question = {
      ...sample,
      id: `teacher-${Date.now()}`,
      topic,
      text,
      modelAnswer: model,
      marks: type === "multiple-choice" ? 1 : marks,
      subtopic: "Edit this subtopic",
      explanation: "Edit this explanation.",
      tip: "Edit this improvement tip.",
      vocabulary: ["Edit key terminology"],
      criteria: [
        { marks: "0", description: "No relevant accurate information." },
        {
          marks: `1–${type === "multiple-choice" ? 1 : marks}`,
          description:
            "Replace with question-specific expected points and mark bands.",
        },
      ],
    };
    delete q.sourceYear;
    delete q.syllabusReference;
    delete q.examSection;
    setJson(JSON.stringify([q], null, 2));
    setMessage(
      "Draft created. Replace all inherited options, criteria and guidance before exporting.",
    );
  }
  function exportDraft() {
    try {
      const bank = validateQuestionBank(JSON.parse(json));
      downloadJson(bank, "teacher-question-draft.json");
      setMessage(
        "Validated and exported. This file is not published to students. Review it, then add it to the repository.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invalid JSON.");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">TEACHER WORKSPACE</div>
        <h1>Thoughtful questions. Better practice.</h1>
        <p>
          Create local drafts and export them for review. There is no login;
          this page is available to everyone.
        </p>
      </div>
      <div className="two-columns">
        <section className="card">
          <h2>Create a question draft</h2>
          <p>
            Drafts stay on this page and are never added to the student bank
            automatically.
          </p>
          <label className="stack-label">
            Question type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
            >
              <option value="multiple-choice">Multiple choice</option>
              <option value="short-answer">Short answer</option>
              <option value="extended-response">Extended response</option>
            </select>
          </label>
          <label className="stack-label">
            Topic
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="stack-label">
            Question
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <label className="stack-label">
            Model response
            <textarea
              rows={5}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>
          {type !== "multiple-choice" && (
            <label className="stack-label">
              Marks
              <input
                type="number"
                min={1}
                max={40}
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
              />
            </label>
          )}
          <button
            className="button primary"
            disabled={!text.trim() || !model.trim()}
            onClick={draft}
          >
            Generate editable JSON draft
          </button>
        </section>
        <section className="card">
          <h2>Review & export</h2>
          <p>
            Edit the options, correct answer, explanations, vocabulary and
            realistic marking criteria in this JSON. Exporting validates
            structure, not educational accuracy.
          </p>
          <label className="stack-label">
            Question JSON
            <textarea
              className="code-editor"
              rows={20}
              value={json}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
            />
          </label>
          <button
            className="button primary"
            disabled={!json}
            onClick={exportDraft}
          >
            Validate & export JSON
          </button>
          <p role="status">{message}</p>
        </section>
      </div>
      <section className="card guide">
        <h2>Publish deliberately</h2>
        <ol>
          <li>
            Export your draft and review its technical accuracy, wording and
            mark allocation.
          </li>
          <li>
            Add the reviewed question objects to{" "}
            <code>src/data/questions.json</code>. Keep IDs unique and stable.
          </li>
          <li>
            For new topics, edit <code>src/data/topics.ts</code>. Add model
            responses, marking bands and explanations for every answer option.
          </li>
          <li>
            Only add a source year, exam section or syllabus reference after
            checking the official source and copyright permissions. The initial
            bank uses original questions.
          </li>
          <li>
            Run <code>npm test</code> and <code>npm run build</code>, then
            commit and merge. GitHub Actions deploys the published bank.
          </li>
        </ol>
        <p>
          Detailed instructions are in <code>docs/TEACHER_GUIDE.md</code>.
          Student answers stay in their own browser and cannot be viewed here.
        </p>
      </section>
    </>
  );
}
