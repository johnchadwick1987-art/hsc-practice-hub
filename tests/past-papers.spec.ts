import { test, expect } from "@playwright/test";
import fs from "node:fs";
import type { Question } from "../src/types";
const bank: Question[] = JSON.parse(
  fs.readFileSync("src/data/past-paper-questions.json", "utf8"),
);
const key = "hsc-multimedia-progress-v1";
test("new title, official catalogue, stable MC letters and stored marking", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("");
  await expect(page).toHaveTitle("Chadwick HSC Revision Website");
  await expect(
    page.getByRole("link", { name: "CHADWICK HSC REVISION WEBSITE" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Past HSC papers", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Past HSC Multimedia papers" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Choose a paper year").locator("option"),
  ).toHaveCount(11);
  const q = bank.find((q) => q.id === "nesa-2025-q01")!;
  await page
    .getByRole("button", { name: "Practise 2025 question 1", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open official question 1" }),
  ).toHaveAttribute("href", q.sourceUrl!);
  await expect(page.getByRole("radio").nth(2)).toHaveAttribute("value", "C");
  await page.getByRole("radio").nth(2).check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(
    page.getByRole("heading", { name: "Correct — well done" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View official answer key" }),
  ).toHaveAttribute("href", q.markingGuidelinesUrl!);
  await page.getByRole("button", { name: "Next question" }).click();
  await page
    .getByRole("button", { name: "Past HSC papers", exact: true })
    .click();
  await expect(
    page.getByText("1 / 16 assessed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Automatic: 1/10 · Self-assessed: 0/30", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Past HSC papers", exact: true })
    .click();
  await expect(
    page.getByText("1 / 16 assessed", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("year selection and written official guidelines without a fabricated model response", async ({
  page,
}) => {
  await page.goto("");
  await page
    .getByRole("button", { name: "Past HSC papers", exact: true })
    .click();
  await page.getByLabel("Choose a paper year").selectOption("2015");
  await page
    .getByRole("button", { name: "Practise 2015 question 11", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open official question 11" }),
  ).toHaveAttribute(
    "href",
    bank.find((q) => q.id === "nesa-2015-q11")!.sourceUrl!,
  );
  await page
    .getByLabel("Your response", { exact: true })
    .fill("My response after reading the official question.");
  await page.getByRole("button", { name: "Compare & self-assess" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Official marking guidelines",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Model response", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Your self-assessed mark" })
    .selectOption("1");
  await page.getByRole("button", { name: "Next question" }).click();
  const progress = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    key,
  );
  expect(progress.attempts[0]).toMatchObject({
    questionId: "nesa-2015-q11",
    earned: 1,
    max: 1,
    kind: "self-assessed",
  });
});
test("whole paper runs in official order and resumes without changing option identities", async ({
  page,
}) => {
  await page.goto("");
  await page
    .getByRole("button", { name: "Past HSC papers", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Practise 2025 paper", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "2025 HSC Multimedia Technologies — Question 1",
    }),
  ).toBeVisible();
  await page.getByRole("radio").first().check();
  await page.reload();
  await page
    .getByRole("button", { name: "Resume practice", exact: true })
    .click();
  await expect(page.getByRole("radio").first()).toBeChecked();
  await expect(page.getByRole("radio").first()).toHaveAttribute("value", "A");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s learn from this" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next question" }).click();
  await expect(
    page.getByRole("heading", {
      name: "2025 HSC Multimedia Technologies — Question 2",
    }),
  ).toBeVisible();
});
test("past-paper page and reference card fit a mobile screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Past HSC papers", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Practise 2025 question 16", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open official question 16" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".sidebar").evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished));
  });
  await page.screenshot({
    path: "test-results/linked-question-mobile.png",
    fullPage: true,
  });
});
