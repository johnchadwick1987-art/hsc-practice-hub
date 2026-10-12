export type QuestionType =
  "multiple-choice" | "short-answer" | "extended-response";
export interface Criterion {
  marks: string;
  description: string;
}
export interface Question {
  id: string;
  type: QuestionType;
  topic: string;
  subtopic: string;
  difficulty: "Foundation" | "Developing" | "Challenge";
  text: string;
  marks: number;
  options?: { id: string; text: string; explanation: string }[];
  correctAnswer?: string;
  explanation: string;
  criteria: Criterion[];
  modelAnswer: string;
  vocabulary: string[];
  tip: string;
  planning?: string[];
  source: "Original" | "Verified past paper" | "Linked past paper";
  sourceUrl?: string;
  markingGuidelinesUrl?: string;
  paperQuestion?: number;
  paperPage?: number;
  guidelinesPage?: number;
  sourceYear?: number;
  examSection?: string;
  syllabusReference?: string;
}
export interface Attempt {
  id: string;
  questionId: string;
  response: string;
  earned: number;
  max: number;
  kind: "automatic" | "self-assessed";
  date: string;
  sessionId: string;
}
export interface Session {
  id: string;
  mode: "mixed" | "topic" | "incorrect" | "exam" | "past-paper";
  questionIds: string[];
  index: number;
  answers: Record<string, string>;
  marks: Record<string, number>;
  submitted: Record<string, boolean>;
  flags: string[];
  optionOrders: Record<string, string[]>;
  phase: "reading" | "writing" | "review";
  deadline?: number;
  completed: boolean;
  created: string;
  ended?: string;
}
export interface Progress {
  version: 1;
  attempts: Attempt[];
  sessions: Session[];
  activeSessionId?: string;
}
// A later secure server may implement this contract. No service is connected in this version.
export interface FeedbackProvider {
  review(
    question: Question,
    response: string,
  ): Promise<{ suggestions: string[]; estimatedMark?: number }>;
}

export interface PastPaper {
  year: number;
  packUrl: string;
  paperUrl: string;
  markingGuidelinesUrl: string;
  paperSha256: string;
  markingGuidelinesSha256: string;
  verifiedOn: string;
  questionIds: string[];
  marks: number;
}
