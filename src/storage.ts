import { emptyProgress, parseProgress, STORAGE_KEY } from "./logic";
import type { Progress } from "./types";
export function readProgress(): { progress: Progress; warning: string } {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return {
      progress: text ? parseProgress(text) : emptyProgress(),
      warning: "",
    };
  } catch {
    return {
      progress: emptyProgress(),
      warning:
        "Saved progress could not be loaded. It has not been overwritten. Export or reset it before continuing; private browsing or storage restrictions can also cause this.",
    };
  }
}
export function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
