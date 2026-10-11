# HSC Multimedia Practice Hub

**Practise. Improve. Prepare for the HSC.**

A static revision website for Year 12 NSW HSC Industrial Technology – Multimedia Technologies. Built with React, TypeScript, Vite and Tailwind CSS. No backend, accounts, analytics, API keys or paid services.

## What students can do

- Use the dashboard, mixed practice, ten topic categories and incorrect-answer review.
- Practise **30 original questions**: 15 multiple choice, 10 short answer and 5 extended response.
- Read explanations for every option, model responses, marking criteria, terminology and revision tips.
- Compare written responses side by side and select an honest **self-assessed** mark. Writing is never automatically marked.
- Resume sessions, flag questions and practise a **40-mark exam** with 5 minutes reading and 90 minutes writing.
- Track multiple-choice accuracy separately from written results; export, import and reset local progress.
- Use a mobile layout, keyboard controls, visible focus and optional dark mode.
- Create local question drafts in the teacher workspace and export them for deliberate publication.

## Run it on your computer

1. Install **Node.js 24 LTS** from [nodejs.org](https://nodejs.org/).
2. Download or clone this repository and open a terminal in its folder.
3. Run:

```sh
npm ci
npm run dev
```

Open the address Vite prints, including `/hsc-practice-hub/`. To stop the server, press Ctrl+C.

To check changes:

```sh
npm test
npm run build
```

For real-browser tests, install the Chromium browser once:

```sh
npx playwright install chromium
npm run test:e2e
```

Linux machines may need `npx playwright install --with-deps chromium`. On this cloud environment, the tests use the already-installed `/usr/bin/chromium`. Set `CHROMIUM_PATH` only to use another existing browser executable. Browser tests build and run the production site themselves.

To inspect a completed build manually, run `npm run preview` and use the path Vite prints. Do not open `dist/index.html` directly: this application expects to be served over HTTP.

## Put it on GitHub Pages (free)

1. Review the changes. On a feature branch, commit and push them, open a pull request into `main`, then merge after the checks pass. If the repository has no commits yet, create its first commit on `main` instead.
2. In the GitHub repository, choose **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Ensure Actions is enabled. The **Check and deploy practice hub** workflow runs tests, builds the site and deploys pushes to `main`. Pull requests run checks without deploying. You can also run it using **Actions → Check and deploy practice hub → Run workflow** on `main`.
4. Wait for the workflow to show success. Pages displays the published address.

For this repository, the expected published address is:

**https://johnchadwick1987-art.github.io/hsc-practice-hub/**

This address is only live after a successful GitHub deployment. Nothing in local development automatically pushes or publishes your code. GitHub Pages is free for public repositories; private-repository Pages availability depends on the GitHub plan.

The Vite base is already `/hsc-practice-hub/`. If you rename the repository, update `base` in `vite.config.ts`. The app uses in-page navigation, so refreshing does not require a server redirect rule.

## Maintain the content

Read [the teacher guide](docs/TEACHER_GUIDE.md) for step-by-step question editing, JSON fields, marking examples, topics, imports and copyright checks.

- Published questions: `src/data/questions.json`.
- Editable topic categories: `src/data/topics.ts`.
- Exam question selection: `EXAM_IDS` in `src/logic.ts`.
- Content and scoring tests: `src/logic.test.ts`.
- Browser workflow tests: `tests/app.spec.ts`.

Keep question IDs stable. Changing or removing IDs can invalidate old progress exports; plan a migration before such changes. Run the tests before every content update.

## Exam and syllabus references

Checked **12 October 2026** against the official [Industrial Technology Stage 6 Syllabus (2013)](https://www.nsw.gov.au/education-and-training/nesa/curriculum/tas/industrial-technology-stage-6-2013), [assessment and examination specifications](https://www.nsw.gov.au/education-and-training/nesa/curriculum/tas/industrial-technology-stage-6-2013/assessment-and-reporting), and [2025 Multimedia examination](https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers/industrial-technology/2025).

- Section I: Industry Related Manufacturing Technology, objective responses, 10 marks.
- Section II: Industry Related Manufacturing Technology, short answers, 15 marks; approximately six items, with at least one worth 4–6 marks.
- Section III: Industry Study, one structured extended response, 15 marks; approximately 600 words in total.
- Time: 90 minutes writing plus 5 minutes reading. The official paper recommends roughly 20/35/35 minutes across the sections.

Our simulation uses 10 multiple-choice questions, five short-answer questions including a two-part item (six items total), and a two-part industry-study response. It has separate automatic marks out of 10 and self-assessed marks out of 30. No final result is shown until all six written responses have selected marks. Unanswered writing should be self-assessed at zero. It is a practice tool, not an official examination or secure assessment system.

The bank is original, with no questions copied from a NESA paper. Revision categories include broader project-work skills; they do not imply every category is directly examined in the written paper. Broad syllabus references are included only where checked. This small bank is not exhaustive syllabus coverage. See [source and coverage notes](docs/SOURCES.md).

## Privacy and limitations

- Progress and theme are saved in the student's browser. Clearing browser data, using another profile/device or private browsing can remove progress. Export regularly; import **replaces** current progress.
- Draft teacher questions are not persisted or published by the editor; export before leaving the page. Everyone can open it; there is no fake secure admin login.
- Written marking is self-assessment. Model answers are examples, and teachers should review content and criteria before formal classroom assessment.
- The exam timer continues when the tab is closed and submits on the next visit if time has elapsed. The optional extended-response stopwatch is temporary and is not an exam clock.
- Answer data ships with the static website and is inspectable. Exam mode hides feedback in the interface but cannot prevent technical access to answers or clock tampering. It is not suitable for high-stakes assessment.
- No cloud synchronisation or student reporting to a teacher. Responses may contain anything a student types, so exported files should be stored privately.
- Modern Chrome/Chromebooks are the target; browser checks run with Chromium, not on a physical school Chromebook.
- `FeedbackProvider` in `src/types.ts` is a future integration contract only. No AI service currently works or is called. Future AI needs a secure backend and must never expose keys in this frontend.

## Validation

Automated tests cover bank structure, every multiple-choice answer, unique/latest progress calculations, explicit written marks, import rejection, storage, 40-mark exam scoring and deadline transitions. Browser tests cover practice completion, reload persistence, exam submission and assessment, expired exams, export/import/reset, teacher export, mobile layout, keyboard focus and dark mode. These checks do not certify full accessibility compliance or replace teacher review.
