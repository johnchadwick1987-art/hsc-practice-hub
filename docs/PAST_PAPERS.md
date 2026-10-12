# Linked past-paper collection

The Chadwick HSC Revision Website includes all **11 Multimedia exam packs in NESA’s current Industrial Technology index**, covering **2015–2025**, as checked on 12 October 2026. Each year contains references to Questions 1–16, including all parts of the final structured response: **176 numbered question references** in total. Older papers and a 2026 paper were not verified or added. This is not a claim to cover every historical HSC examination.

Students open each official question on the NSW Government website, answer in the existing practice interface, and save progress locally. Questions 1–10 use verified multiple-choice answer-key letters. Questions 11–16 use self-assessment against the linked official marking guidelines. Question 16 is assessed as one total out of 15 across all its parts.

The site does **not** republish question wording, option wording, diagrams, written marking rubrics or official sample answers. A linked card is a reference and an answer-recording tool, not an imported copy of the official question. Written feedback opens the actual official guidelines rather than displaying an invented model answer. The existing 30 original questions still provide their full wording, original model answers and detailed explanations directly in the site.

## Copyright and attribution

[NESA’s copyright terms](https://www.nsw.gov.au/education-and-training/nesa/copyright) reserve Crown copyright and require written permission for reproduction of major extracts or entire material, subject to the Copyright Act. The special syllabus adaptation arrangement is not a general permission to republish exam papers on a public website. [NSW Government’s general copyright policy](https://www.nsw.gov.au/nsw-government/copyright) explicitly excludes NESA content from its general Creative Commons licence.

The linked collection keeps NESA materials on the official site, opens them in a new tab and acknowledges NESA. No public-republication permission has been supplied. Third-party material within papers may have separate rights. Obtain and document appropriate permissions before importing actual question text, diagrams, rubrics or sample answers into the repository.

## What was verified

For each year, the official exam-pack page was read and its Multimedia paper and marking-guidelines links followed. All **22 PDFs** were fetched over HTTPS, checked for a PDF header and their text extracted locally for verification. Official PDFs and extracted text are not committed to this repository.

The following facts were checked and saved:

- Year, official exam-pack link and direct paper/guide links.
- Numbered questions 1–16 and their sections.
- One mark for each of ten objective questions; the official answer-key letter for each.
- Printed allocations for Questions 11–15, totalling 15 marks, and Question 16, worth 15 marks.
- PDF page for each question and the corresponding guidelines page.
- SHA-256 fingerprints of the source paper and guide at verification time.

PDF page fragments are not supported by every browser. If a link opens at the beginning, students can navigate to the displayed page and question number manually. Third-party links can change; the exam-pack link remains a route to the current official source. Source fingerprints record which files were checked, not a live guarantee that the files remain unchanged.

## Editable files

- `src/data/past-papers.json`: year catalogue, source URLs, fingerprints, verification dates and the IDs belonging to each paper.
- `src/data/past-paper-questions.json`: question references, verified allocations and answer keys, PDF-page links and original study instructions.
- `src/past-papers.test.ts`: completeness, allocations, provenance, independently checked answer keys, fixed option identities and progress compatibility.
- `tests/past-papers.spec.ts`: year browsing, linked marking, written guidance, resume and mobile behaviour.

Mixed practice and the existing timed simulation use the original bank. **Past HSC papers** offers untimed, ordered year practice or a single question. Linked multiple-choice options retain A/B/C/D order, including in incorrect-answer review, because these letters refer to the options in the external paper. Original questions can still randomise their options.

Existing question IDs and the browser storage key are unchanged. Old progress exports remain valid. The overall completion denominator now includes 30 original and 176 linked questions, so an existing completion percentage may decrease when the larger bank is added; saved answers and marks are retained. Original-topic completion bars count only original questions, while overall progress and year summaries include linked practice. Year scores show latest assessed answers, which may come from several sessions, and remain explicitly incomplete while questions are unassessed.

## Adding another verified year

1. Find the official Multimedia paper and guidelines in NESA’s index. Verify the actual focus area and year, not just the filename.
2. Add the year record to `past-papers.json`. Use genuine source-file fingerprints and the date you checked the files.
3. Add linked question records using stable IDs such as `nesa-2026-q01`. Set `source` to `Linked past paper`, provide the year, section, question number, verified marks and PDF-page links. Use reference titles only; do not paste protected wording without permission.
4. Check every answer-key letter directly against the official table. Do not infer letters from a generated model answer. Keep the official A/B/C/D identities fixed.
5. Link written questions to their correct official guidelines pages and assess all parts. Do not present generic instructions as an official marking rubric.
6. Update the catalogue counts, displayed year range, source notes and independently verified test expectations. If the official structure changes, update the supported question-number/section validation rather than assuming the old format still applies.
7. Run `npm test`, `npm run test:e2e` and review the content before committing and deploying.

For importing authorised question text rather than links, follow the separate permission and provenance process in `TEACHER_GUIDE.md`. That workflow is deliberately distinct from the linked collection.
