# Teacher guide

You do not need a backend or login to maintain this website. Students see only the question bank deliberately committed to the repository.

## Create a local draft

1. Open **Teacher workspace** in the website.
2. Select a question type and topic; enter the question, model response and marks.
3. Choose **Generate editable JSON draft**.
4. Edit the JSON carefully. The starting template inherits fields from an example: replace the options, correct answer, explanations, vocabulary, planning and criteria. Do not leave “Edit…” instructions or unrelated inherited content.
5. Choose **Validate & export JSON**. Validation checks structure, not teaching accuracy. Export before leaving the page; drafts are not saved automatically.

This editor is public and local, not a secure administrative area. Exporting does not add anything to the student bank.

## Add a published question

Open `src/data/questions.json` in GitHub or your editor. It is one JSON array: add the new object before the closing `]`, with a comma between objects. JSON needs double quotes and no trailing comma. Use unique, stable IDs such as `sa-11`; do not reuse an old ID for a different question.

A short-answer example:

```json
{
  "id": "sa-11",
  "type": "short-answer",
  "topic": "Formats, compression and file management",
  "subtopic": "Lossless compression",
  "difficulty": "Developing",
  "text": "Explain one reason to retain a lossless master image while publishing a compressed copy online.",
  "marks": 2,
  "explanation": "Master and delivery files serve different needs.",
  "modelAnswer": "A lossless master preserves the original image information for future editing. A compressed delivery copy reduces transfer size for web users while the master remains available for new exports.",
  "criteria": [
    {
      "marks": "2",
      "description": "Explains preservation of information for future editing (1), and reduced transfer size of a delivery copy (1)."
    },
    { "marks": "1", "description": "Explains one of these points accurately." },
    { "marks": "0", "description": "No relevant accurate information." }
  ],
  "vocabulary": ["Lossless", "Master", "Delivery file"],
  "tip": "Explain the purpose of both copies, not only their file sizes.",
  "source": "Original"
}
```

Required fields are shown above. Types are `multiple-choice`, `short-answer`, `extended-response`. Difficulties are `Foundation`, `Developing`, `Challenge`. Marks are positive integers up to 40; multiple choice must be 1 mark. Topic must exactly match a category in `src/data/topics.ts`.

For multiple choice, add four `options`, each with a unique `id`, `text` and an `explanation`, and set `correctAnswer` to the correct option ID. IDs remain stable even when displayed answers are shuffled. Avoid “all of the above” and positional references because options are randomised. Include a model answer and criteria for 1 and 0 marks.

For extended responses, add `planning` as an array of useful planning steps. Organise `criteria` into realistic bands. For structured questions, identify part allocations and explain that students add their part marks when selecting the total. The system displays written criteria; it does not interpret or automatically apply them.

## Edit answers and marking

Find the question by its ID. Edit `text`, `modelAnswer`, `explanation`, `tip`, `vocabulary` and `criteria` as required. Criteria should identify specific expected points or distinguish performance levels; allow accurate alternatives. Check totals carefully. If you materially change what a question asks, use a new ID and plan an export migration so old responses are not compared with unrelated new content.

## Topics and syllabus references

Edit `src/data/topics.ts` to add a category, then use the exact same topic string in your questions. The categories are teacher-defined revision groupings. Check the official syllabus rather than treating them as syllabus headings.

Optional `syllabusReference` should name the verified document and section precisely. Do not invent clause numbers. Optional `sourceYear` and `examSection` are for verified provenance, not guesses. Original questions should not be labelled as past-paper questions. The full-text bank in `questions.json` contains only original content. Separate `past-paper-questions.json` records provide linked question references without republishing their wording.

## Linked papers and authorised full-text imports

The existing linked collection covers verified 2015–2025 papers. Read [PAST_PAPERS.md](PAST_PAPERS.md) to maintain those records; no permission to republish entire papers is implied by linking them.

There is no runtime student-bank upload. Importing actual question text requires documented publication rights and deliberate repository edits:

1. Verify the official question text, year, paper, focus area, section, marks and guidelines.
2. Check [NESA copyright information](https://www.nsw.gov.au/education-and-training/nesa/copyright) and the applicable publication permissions; do not assume a classroom-use permission permits public republication.
3. Use the same question schema. Set `source` to `Verified past paper`, provide `sourceYear`, `examSection`, `sourceUrl` (an official NSW/NESA source), and a checked `syllabusReference`. Retain attribution and record permission evidence in the repository documentation.
4. Have a teacher review the answers and marking criteria. Validation cannot verify copyright or historical authenticity.
5. Add only authorised, reviewed objects to `src/data/questions.json`, then test and publish.

Progress imports are a separate feature and cannot add questions to the student bank. Teacher JSON exports are drafts, not progress files.

## Change the practice exam

Edit `EXAM_IDS` in `src/logic.ts`. Keep:

- 10 objective marks from the Multimedia focus area.
- 15 short-answer marks, approximately six items, including at least one 4–6-mark item.
- 15 marks from one structured Industry Study response.

The current exam has five short-answer questions with one split into two items. Tests require a total of 40. If question counts change, update the introductory description and browser tests. Keep automatic and self-assessed marks separate. Check current NESA specifications before changing the structure.

## Check and publish changes

Run `npm test`, `npm run build` and, when changing behaviour, `npm run test:e2e`. Commit on your feature branch, open a pull request to `main`, review and merge. If this is the empty repository's first version, its first commit may be made directly on `main`. The Pages workflow publishes after checks succeed. See the README for enabling Pages.
