import { test, expect } from "@playwright/test";
import fs from "node:fs";
import type { Question } from "../src/types";
const BANK: Question[] = JSON.parse(
  fs.readFileSync("src/data/questions.json", "utf8"),
);
const STORAGE_KEY = "hsc-multimedia-progress-v1";
test("dashboard, MC marking, written self-assessment and reload persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "Ready to make progress?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Practice by topic", exact: true })
    .click();
  await page
    .getByRole("button", { name: /01 Multimedia production processes/ })
    .click();
  let attempts = 0;
  for (
    let i = 0;
    i <
    BANK.filter((q) => q.topic === "Multimedia production processes").length;
    i++
  ) {
    const data = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!),
      STORAGE_KEY,
    );
    const s = data.sessions.find((s: any) => s.id === data.activeSessionId);
    const q = BANK.find((q) => q.id === s.questionIds[s.index])!;
    if (q.type === "multiple-choice") {
      await page.getByRole("radio").nth(0).check();
      await page.getByRole("button", { name: "Check answer" }).click();
      await expect(
        page.getByRole("region", { name: "Answer feedback" }),
      ).toBeVisible();
    } else {
      await page
        .getByLabel("Your response", { exact: true })
        .fill(
          "Plan a storyboard, record clear footage and edit a tested final export.",
        );
      await page.getByRole("button", { name: "Compare & self-assess" }).click();
      await page
        .getByRole("combobox", { name: "Your self-assessed mark" })
        .selectOption("2");
    }
    attempts++;
    await page.getByRole("button", { name: "Next question" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Your progress, at a glance." }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "My progress", exact: true }).click();
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    STORAGE_KEY,
  );
  expect(saved.attempts).toHaveLength(attempts);
  expect(errors).toEqual([]);
});
test("exam reading lock, flags, submission, written scoring and completed review", async ({
  page,
}) => {
  await page.goto("");
  await page
    .getByRole("button", { name: "Exam simulation", exact: true })
    .click();
  await page.getByRole("button", { name: "Start reading time" }).click();
  await expect(page.getByRole("radio").first()).toBeDisabled();
  await page
    .getByRole("button", { name: "Flag for review", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Question 1, flagged", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Skip reading time" }).click();
  await page.getByRole("radio").first().check();
  await page.reload();
  await page
    .getByRole("button", { name: "Resume practice", exact: true })
    .click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.getByRole("button", { name: "Submit exam", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Submit exam", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Finish & save results" }),
  ).toBeDisabled();
  for (let i = 10; i < 16; i++) {
    await page
      .getByRole("button", { name: `Question ${i + 1}`, exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Your self-assessed mark" })
      .selectOption("0");
  }
  await expect(
    page.getByText("Final practice result", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish & save results" }).click();
  await page.getByRole("button", { name: "Review exam", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review your exam" }),
  ).toBeVisible();
});
test("expired exam resumes in review without extending time", async ({
  page,
}) => {
  await page.goto("");
  await page.evaluate((k) => {
    const qids = [
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
    ];
    const s = {
      id: "expired",
      mode: "exam",
      questionIds: qids,
      index: 0,
      answers: {},
      marks: {},
      submitted: {},
      flags: [],
      optionOrders: Object.fromEntries(
        qids.map((id) => [id, id.startsWith("mc") ? ["A", "B", "C", "D"] : []]),
      ),
      phase: "reading",
      deadline: Date.now() - 6000000,
      completed: false,
      created: new Date().toISOString(),
    };
    localStorage.setItem(
      k,
      JSON.stringify({
        version: 1,
        attempts: [],
        sessions: [s],
        activeSessionId: s.id,
      }),
    );
  }, STORAGE_KEY);
  await page.reload();
  await page
    .getByRole("button", { name: "Resume practice", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review your exam" }),
  ).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeDisabled();
});
test("invalid import preserves progress, export downloads and reset confirms", async ({
  page,
}) => {
  await page.goto("");
  await page.getByRole("button", { name: "My progress", exact: true }).click();
  await page.getByLabel("Import progress", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":9}'),
  });
  await expect(page.getByRole("status")).toContainText("Import failed");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress" }).click();
  expect((await download).suggestedFilename()).toBe(
    "hsc-multimedia-progress.json",
  );
  await page
    .getByRole("button", { name: "Reset progress", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset progress", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Progress reset.");
});
test("teacher draft remains unpublished and exports valid JSON", async ({
  page,
}) => {
  await page.goto("");
  await page
    .getByRole("button", { name: "Teacher workspace", exact: true })
    .click();
  await page
    .getByLabel("Question", { exact: true })
    .fill("Explain one use of a storyboard.");
  await page
    .getByLabel("Model response", { exact: true })
    .fill(
      "A storyboard plans shots and communicates the sequence before filming.",
    );
  await page
    .getByRole("button", { name: "Generate editable JSON draft" })
    .click();
  await expect(page.getByLabel("Question JSON")).toContainText(
    "Explain one use",
  );
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Validate & export JSON" }).click();
  expect((await d).suggestedFilename()).toBe("teacher-question-draft.json");
  await expect(page.getByRole("status")).toContainText("not published");
});
test("mobile navigation, no horizontal overflow, keyboard focus and dark mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "Ready to make progress?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Practice by topic", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Start with one topic." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".sidebar").evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));
  });
  await page.screenshot({
    path: "test-results/mobile-topics.png",
    fullPage: true,
  });
});
test("desktop dashboard screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("");
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
});

test("valid progress import resumes a response and mobile practice fits the screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "My progress", exact: true }).click();
  const session = {
    id: "imported",
    mode: "topic",
    questionIds: ["sa-03"],
    index: 0,
    answers: { "sa-03": "48,000 × 16 × 2 × 10 / 8 = 1,920,000 bytes" },
    marks: {},
    submitted: {},
    flags: [],
    optionOrders: { "sa-03": [] },
    phase: "writing",
    completed: false,
    created: new Date().toISOString(),
  };
  await page.getByLabel("Import progress", { exact: true }).setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        attempts: [],
        sessions: [session],
        activeSessionId: "imported",
      }),
    ),
  });
  await expect(page.getByRole("status")).toHaveText(
    "Progress imported successfully.",
  );
  await page.getByRole("button", { name: "Resume active session" }).click();
  await expect(page.getByLabel("Your response", { exact: true })).toHaveValue(
    session.answers["sa-03"],
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Compare & self-assess" }).click();
  await page
    .getByRole("combobox", { name: "Your self-assessed mark" })
    .selectOption("3");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("keyboard can select and submit a multiple-choice answer", async ({
  page,
}) => {
  await page.goto("");
  await page
    .getByRole("button", { name: "Exam simulation", exact: true })
    .click();
  await page.getByRole("button", { name: "Start reading time" }).click();
  await page.getByRole("button", { name: "Skip reading time" }).click();
  await page.getByRole("radio").first().focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio").first()).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio").nth(1)).toBeChecked();
  await page.getByRole("button", { name: "Submit exam", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Cancel" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Submit exam", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Review your exam" }),
  ).toBeVisible();
});
