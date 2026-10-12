import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  Layers3,
  ClipboardList,
  BarChart3,
  GraduationCap,
  ArrowRight,
  RotateCcw,
  Play,
  Target,
  CheckCircle2,
  TrendingUp,
  Clock3,
  Download,
  Upload,
  Moon,
  Sun,
  Menu,
  X,
  Flag,
  ShieldCheck,
  ChevronLeft,
  CircleHelp,
} from "lucide-react";
import {
  BANK,
  ORIGINAL_BANK,
  createSession,
  statistics,
  emptyProgress,
  parseProgress,
  recordAttempt,
  examScore,
  transitionClock,
  markChoice,
  STORAGE_KEY,
} from "./logic";
import { readProgress, saveProgress, downloadJson } from "./storage";
import { topics } from "./data/topics";
import type { Progress, Question, Session } from "./types";
import QuestionView from "./components/QuestionView";
import Teacher from "./components/Teacher";
import PastPapers from "./components/PastPapers";
type Page =
  | "dashboard"
  | "topics"
  | "practice"
  | "exam"
  | "progress"
  | "teacher"
  | "about"
  | "past-papers";
const nav = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "topics", label: "Practice by topic", icon: Layers3 },
  { page: "exam", label: "Exam simulation", icon: ClipboardList },
  { page: "past-papers", label: "Past HSC papers", icon: BookOpen },
  { page: "progress", label: "My progress", icon: BarChart3 },
  { page: "teacher", label: "Teacher workspace", icon: GraduationCap },
] as const;
export default function App() {
  const [initial] = useState(readProgress);
  const [progress, setProgress] = useState<Progress>(initial.progress);
  const [warning, setWarning] = useState(initial.warning);
  const [storageBlocked, setStorageBlocked] = useState(!!initial.warning);
  const [page, setPage] = useState<Page>("dashboard");
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("hsc-theme") === "dark";
    } catch {
      return false;
    }
  });
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "reset" | "replace" | "submit" | null
  >(null);
  const [pendingReview, setPendingReview] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState<{
    mode: Session["mode"];
    pool: Question[];
  } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const previousPage = useRef<Page>("dashboard");
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (menu)
      sidebarRef.current
        ?.querySelector<HTMLButtonElement>("nav button")
        ?.focus();
  }, [menu]);
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:850px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width:850px)");
    const change = () => setMobile(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const stats = statistics(progress);
  const active = progress.sessions.find(
    (s) => s.id === progress.activeSessionId,
  );
  const question = active
    ? BANK.find((q) => q.id === active.questionIds[active.index])
    : undefined;
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("hsc-theme", dark ? "dark" : "light");
    } catch {
      /* Theme still works in memory. */
    }
  }, [dark]);
  useEffect(() => {
    if (storageBlocked) return;
    try {
      saveProgress(progress);
    } catch {
      setWarning(
        "Browser storage is unavailable or full. Work is kept in memory for this visit; export it to avoid losing it.",
      );
    }
  }, [progress, storageBlocked]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!active || active.mode !== "exam") return;
    const changed = transitionClock(active, now);
    if (changed !== active) {
      if (changed.phase === "review") {
        submitExam(active);
        setNotice(
          "Writing time ended. Your saved responses have been submitted. Self-assess written answers to finish.",
        );
      } else updateSession(changed);
    }
  }, [now, active?.id, active?.phase]);
  useEffect(() => {
    if (previousPage.current !== page) {
      mainRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    previousPage.current = page;
  }, [page]);
  function navigate(p: Page) {
    mainRef.current?.focus();
    setPage(p);
    setMenu(false);
    setNotice("");
  }
  function updateSession(patch: Partial<Session>) {
    setProgress((p) => ({
      ...p,
      sessions: p.sessions.map((s) =>
        s.id === p.activeSessionId ? { ...s, ...patch } : s,
      ),
    }));
  }
  function begin(mode: Session["mode"], pool: Question[] = ORIGINAL_BANK) {
    if (!pool.length) {
      setNotice("No questions to review yet. Try a practice session first.");
      return;
    }
    if (active && !active.completed) {
      setPendingReview(null);
      setPendingStart({ mode, pool });
      setConfirmAction("replace");
      return;
    }
    start(mode, pool);
  }
  function openExamReview(id: string) {
    if (active && active.id !== id && !active.completed) {
      setPendingStart(null);
      setPendingReview(id);
      setConfirmAction("replace");
      return;
    }
    resumeReview(id);
  }
  function resumeReview(id: string) {
    setProgress((p) => ({
      ...p,
      activeSessionId: id,
      sessions: p.sessions.map((s) =>
        s.id === id ? { ...s, completed: false } : s,
      ),
    }));
    navigate("practice");
  }
  function start(mode: Session["mode"], pool: Question[]) {
    const s = createSession(mode, pool);
    setProgress((p) => ({
      ...p,
      activeSessionId: s.id,
      sessions: [...p.sessions, s],
    }));
    navigate("practice");
  }
  function assess(q: Question, earned: number) {
    if (!active) return;
    setProgress((p) => {
      const s = p.sessions.find((s) => s.id === p.activeSessionId)!;
      const changed = {
        ...s,
        marks: { ...s.marks, [q.id]: earned },
        submitted: { ...s.submitted, [q.id]: true },
      };
      return {
        ...recordAttempt(p, changed, q, earned),
        sessions: p.sessions.map((x) => (x.id === s.id ? changed : x)),
      };
    });
  }
  function complete() {
    if (!active) return;
    updateSession({ completed: true, ended: new Date().toISOString() });
    setProgress((p) => ({ ...p, activeSessionId: undefined }));
    navigate("progress");
    setNotice("Session saved. Take a moment to reflect on what you learned.");
  }
  function next() {
    if (!active) return;
    if (active.index === active.questionIds.length - 1) complete();
    else updateSession({ index: active.index + 1 });
  }
  function submitExam(s: Session) {
    setProgress((p) => {
      let changed = { ...s, phase: "review" as const, deadline: undefined };
      let result = p;
      for (const id of s.questionIds) {
        const q = BANK.find((q) => q.id === id)!;
        if (q.type === "multiple-choice") {
          const mark = markChoice(q, s.answers[id] || "");
          changed = {
            ...changed,
            marks: { ...changed.marks, [id]: mark },
            submitted: { ...changed.submitted, [id]: true },
          };
          result = recordAttempt(result, changed, q, mark);
        }
      }
      return {
        ...result,
        sessions: result.sessions.map((x) => (x.id === s.id ? changed : x)),
      };
    });
    setConfirmAction(null);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000)
        throw Error("Maximum progress file size is 5 MB.");
      const imported = parseProgress(await file.text());
      setProgress(imported);
      setStorageBlocked(false);
      setWarning("");
      setNotice("Progress imported successfully.");
    } catch (e) {
      setNotice(
        `Import failed: ${e instanceof Error ? e.message : "Invalid file"}. Your current progress has been kept.`,
      );
    }
  }
  function handleConfirm() {
    if (confirmAction === "reset") {
      setProgress(emptyProgress());
      setStorageBlocked(false);
      setWarning("");
      setNotice("Progress reset.");
    } else if (confirmAction === "replace" && pendingStart) {
      if (active)
        updateSession({ completed: true, ended: new Date().toISOString() });
      start(pendingStart.mode, pendingStart.pool);
      setPendingStart(null);
    } else if (confirmAction === "replace" && pendingReview) {
      if (active)
        updateSession({ completed: true, ended: new Date().toISOString() });
      resumeReview(pendingReview);
      setPendingReview(null);
    } else if (confirmAction === "submit" && active) submitExam(active);
    setConfirmAction(null);
  }
  const ranked = stats.byTopic
    .filter((t) => t.count)
    .sort((a, b) => b.earned / b.max - a.earned / a.max);
  const score = active?.mode === "exam" ? examScore(active) : undefined;
  function meter(value: number, label: string) {
    return (
      <div
        className="meter"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{ width: `${value}%` }} />
      </div>
    );
  }
  const review = () =>
    begin(
      "incorrect",
      BANK.filter((q) => stats.incorrectIds.includes(q.id)),
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <aside
        className={`sidebar ${menu ? "open" : ""}`}
        aria-label="Main navigation"
        ref={sidebarRef}
        onKeyDown={(e) => {
          if (!mobile || !menu) return;
          if (e.key === "Escape") {
            setMenu(false);
            document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus();
          }
          if (e.key === "Tab") {
            const els =
              e.currentTarget.querySelectorAll<HTMLElement>("a,button");
            if (e.shiftKey && document.activeElement === els[0]) {
              e.preventDefault();
              els[els.length - 1].focus();
            } else if (
              !e.shiftKey &&
              document.activeElement === els[els.length - 1]
            ) {
              e.preventDefault();
              els[0].focus();
            }
          }
        }}
        inert={mobile && !menu}
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="brand-icon">
            <BookOpen size={24} />
          </span>
          <span>
            CHADWICK HSC<small>REVISION WEBSITE</small>
          </span>
        </a>
        <div className="nav-label">YOUR LEARNING SPACE</div>
        <nav>
          {nav.map(({ page: p, label, icon: Icon }) => (
            <button
              key={p}
              aria-label={label}
              onClick={() => navigate(p)}
              className={`nav-item ${page === p ? "active" : ""}`}
              aria-current={page === p ? "page" : undefined}
            >
              <Icon size={20} />
              {label}
              {p === "progress" && stats.completed > 0 && (
                <span className="nav-count">{stats.completed}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="small-overline">SMALL STEPS. REAL PROGRESS.</span>
          <h3>Your next mark starts here.</h3>
          <p>A little practice today makes a difference on exam day.</p>
          <button onClick={() => begin("mixed")} className="sidebar-cta">
            Start practising <ArrowRight size={16} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => navigate("about")}>
            <CircleHelp size={19} />
            About & study guidance
          </button>
          <span>
            <ShieldCheck size={15} />
            Private. Local. No accounts.
          </span>
        </div>
      </aside>
      {menu && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label={menu ? "Close navigation" : "Open navigation"}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <span className="course-label">
              YEAR 12 <span>/</span> INDUSTRIAL TECHNOLOGY
            </span>
            <span className="course-mobile">Chadwick HSC Revision</span>
          </div>
          <div className="topbar-right">
            <span className="course-badge">Multimedia Technologies</span>
            <button
              className="icon-button"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <span className="student-avatar" aria-label="Student workspace">
              S
            </span>
          </div>
        </header>
        <main id="main" ref={mainRef} tabIndex={-1}>
          {warning && (
            <div className="alert" role="alert">
              {warning}
              <button
                className="text-button"
                onClick={() => {
                  try {
                    const raw = localStorage.getItem(STORAGE_KEY);
                    if (raw)
                      downloadJson(
                        JSON.parse(raw),
                        "hsc-saved-data-recovery.json",
                      );
                  } catch {
                    setNotice(
                      "The saved data cannot be accessed. Reset to start again.",
                    );
                  }
                }}
              >
                Export saved data for recovery
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          {page === "dashboard" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">YOUR HSC JOURNEY</div>
                <h1>Ready to make progress?</h1>
                <p>Practise. Improve. Prepare for the HSC.</p>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">
                    <span /> BUILT FOR YOUR NEXT BREAKTHROUGH
                  </span>
                  <h2>
                    Build your knowledge.
                    <br />
                    Grow your confidence.
                  </h2>
                  <p>
                    One question at a time. Get clear feedback, strengthen your
                    skills, and walk into your written exam prepared.
                  </p>
                  <div className="hero-actions">
                    <button
                      className="button white"
                      onClick={() => begin("mixed")}
                    >
                      Start practice <ArrowRight size={18} />
                    </button>
                    {active && !active.completed && (
                      <button
                        className="hero-resume"
                        onClick={() => navigate("practice")}
                      >
                        <Play size={16} />
                        Resume practice
                      </button>
                    )}
                  </div>
                  <div className="hero-foot">
                    <ShieldCheck size={15} />
                    Original questions + linked past papers <span>·</span> Your
                    progress stays private
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-dots">✦</div>
                  <div className="art-card back-card">
                    <div className="art-mini-line" />
                    <div className="art-mini-line short" />
                    <div className="art-chart">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                  <div className="art-card front-card">
                    <span className="art-check">
                      <CheckCircle2 size={30} />
                    </span>
                    <strong>
                      A little better,
                      <br />
                      every day.
                    </strong>
                    <div className="art-progress">
                      <span />
                    </div>
                    <div className="art-card-foot">
                      <span>YOUR NEXT CHAPTER</span>
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <span className="floating-icon">
                    <GraduationCap size={30} />
                  </span>
                  <span className="art-spark">+</span>
                </div>
              </section>
              <section className="stats-grid" aria-label="Progress overview">
                <div className="stat-card">
                  <span className="stat-icon blue">
                    <Target size={20} />
                  </span>
                  <span className="stat-title">Overall progress</span>
                  <div className="stat-value">
                    {stats.progress}
                    <small>%</small>
                  </div>
                  {meter(stats.progress, "Overall progress")}
                  <small>
                    {stats.completed} of {BANK.length} questions assessed
                  </small>
                </div>
                <div className="stat-card">
                  <span className="stat-icon green">
                    <CheckCircle2 size={20} />
                  </span>
                  <span className="stat-title">Multiple-choice accuracy</span>
                  <div className="stat-value">
                    {stats.accuracy ?? "—"}
                    {stats.accuracy !== null && <small>%</small>}
                  </div>
                  <small>
                    {stats.mcCount
                      ? `${stats.mcCount} automatically marked attempts`
                      : "Your first answer starts the story"}
                  </small>
                </div>
                <div className="stat-card">
                  <span className="stat-icon purple">
                    <BookOpen size={20} />
                  </span>
                  <span className="stat-title">Questions completed</span>
                  <div className="stat-value">
                    {stats.completed}
                    <small>/ {BANK.length}</small>
                  </div>
                  <small>Every question is a chance to improve</small>
                </div>
                <div className="stat-card">
                  <span className="stat-icon amber">
                    <TrendingUp size={20} />
                  </span>
                  <span className="stat-title">Written practice</span>
                  <div className="stat-value">
                    {stats.writtenEarned}
                    <small>/ {stats.writtenMax}</small>
                  </div>
                  <small>Self-assessed marks · all attempts</small>
                </div>
              </section>
              <div className="section-heading">
                <h2>Choose your next step</h2>
                <span>Make practice work for you</span>
              </div>
              <section className="path-grid">
                <button
                  className="path-card"
                  onClick={() => navigate("topics")}
                >
                  <span className="path-icon blue">
                    <Layers3 />
                  </span>
                  <h3>Practice by topic</h3>
                  <p>
                    Focus on a skill. Build a stronger understanding, one topic
                    at a time.
                  </p>
                  <span className="path-link">
                    Explore 10 topics <ArrowRight size={17} />
                  </span>
                </button>
                <button className="path-card" onClick={() => navigate("exam")}>
                  <span className="path-icon purple">
                    <ClipboardList />
                  </span>
                  <h3>Full exam simulation</h3>
                  <p>
                    Find your rhythm with a timed, 40-mark written practice
                    paper.
                  </p>
                  <span className="path-link">
                    Take the challenge <ArrowRight size={17} />
                  </span>
                </button>
                <button className="path-card" onClick={review}>
                  <span className="path-icon amber">
                    <RotateCcw />
                  </span>
                  <h3>Review & improve</h3>
                  <p>
                    Revisit missed answers and responses with room to earn more
                    marks.
                  </p>
                  <span className="path-link">
                    {stats.incorrectIds.length
                      ? `${stats.incorrectIds.length} questions to revisit`
                      : "Build on what you learn"}{" "}
                    <ArrowRight size={17} />
                  </span>
                </button>
              </section>
              <div className="dashboard-bottom">
                <section className="card">
                  <div className="section-heading">
                    <h2>Your topic snapshot</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("progress")}
                    >
                      View progress <ArrowRight size={15} />
                    </button>
                  </div>
                  {ranked.length ? (
                    <div className="strength-grid">
                      <div>
                        <span className="tiny-label">STRONGEST TOPIC</span>
                        <h3>{ranked[0].topic}</h3>
                        <p>
                          {Math.round((ranked[0].earned / ranked[0].max) * 100)}
                          % of available marks · latest results
                        </p>
                      </div>
                      <div>
                        <span className="tiny-label">NEXT FOCUS</span>
                        <h3>
                          {ranked.length > 1
                            ? ranked[ranked.length - 1].topic
                            : "Try another topic to compare"}
                        </h3>
                        <p>
                          {ranked.length > 1
                            ? "A great place for your next practice session."
                            : "Comparisons appear after assessing two topics."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-snapshot">
                      <div className="snapshot-bars">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                      <div>
                        <h3>Your strengths will show up here</h3>
                        <p>
                          Complete a few questions to discover what’s going well
                          and where to focus next.
                        </p>
                      </div>
                    </div>
                  )}
                </section>
                <section className="card">
                  <h2>Recent activity</h2>
                  {progress.attempts.length ? (
                    <ul className="activity-list">
                      {progress.attempts
                        .slice(-3)
                        .reverse()
                        .map((a) => (
                          <li key={a.id}>
                            <span className="activity-dot" />
                            <div>
                              <strong>
                                {
                                  BANK.find((q) => q.id === a.questionId)
                                    ?.subtopic
                                }
                              </strong>
                              <small>
                                {a.earned}/{a.max} ·{" "}
                                {a.kind === "automatic"
                                  ? "Automatic"
                                  : "Self-assessed"}{" "}
                                · {new Date(a.date).toLocaleDateString("en-AU")}
                              </small>
                            </div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="activity-empty">
                      <Clock3 size={25} />
                      <p>A fresh start, full of possibility.</p>
                      <small>Your practice activity will appear here.</small>
                    </div>
                  )}
                </section>
              </div>
              <div className="privacy-strip">
                <ShieldCheck size={19} />
                <p>
                  <strong>Your learning. Your browser.</strong> No accounts or
                  personal details. Export progress to keep a backup.
                </p>
              </div>
            </>
          )}
          {page === "dashboard" && (
            <section className="card past-paper-dashboard">
              <div>
                <span className="eyebrow">OFFICIAL PAST-PAPER PRACTICE</span>
                <h2>Explore 11 years of HSC Multimedia papers.</h2>
                <p>
                  176 linked questions from 2015–2025. Open the official paper,
                  answer here, and track your progress.
                </p>
              </div>
              <button
                className="button primary"
                onClick={() => navigate("past-papers")}
              >
                Browse past papers <ArrowRight size={17} />
              </button>
            </section>
          )}
          {page === "topics" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">FOCUSED PRACTICE</div>
                <h1>Start with one topic.</h1>
                <p>
                  Pick a focus, practise at your own pace, and use the feedback
                  to improve.
                </p>
              </div>
              <div className="topic-grid">
                {topics
                  .filter((t) => ORIGINAL_BANK.some((q) => q.topic === t))
                  .map((t, i) => {
                    const q = ORIGINAL_BANK.filter((q) => q.topic === t);
                    const result = {
                      count: q.filter((question) =>
                        progress.attempts.some(
                          (a) => a.questionId === question.id,
                        ),
                      ).length,
                    };
                    return (
                      <button
                        className="card topic-card"
                        key={t}
                        onClick={() => begin("topic", q)}
                      >
                        <span className="topic-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h2>{t}</h2>
                        <p>
                          {q.length} questions ·{" "}
                          {q.reduce((s, x) => s + x.marks, 0)} available marks
                        </p>
                        {meter(
                          Math.round((result.count / q.length) * 100),
                          `${t} completion`,
                        )}
                        <span className="path-link">
                          Practise this topic <ArrowRight size={17} />
                        </span>
                      </button>
                    );
                  })}
              </div>
              <p className="muted">
                Topics are editable teaching categories, not a claim of
                exhaustive syllabus coverage.
              </p>
            </>
          )}
          {page === "exam" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">PUT IT ALL TOGETHER</div>
                <h1>Your practice exam.</h1>
                <p>
                  Build confidence with timing, planning and reviewing your
                  answers.
                </p>
              </div>
              <section className="card exam-intro">
                <span className="path-icon purple">
                  <ClipboardList size={28} />
                </span>
                <h2>40 marks. A focused challenge.</h2>
                <p>
                  5 minutes reading time, followed by 1 hour and 30 minutes
                  writing time. Your timer and responses are saved as you work;
                  the clock continues if you close this tab.
                </p>
                <div className="exam-structure">
                  <div>
                    <strong>Section I</strong>
                    <span>10 multiple-choice questions</span>
                    <b>10 marks</b>
                  </div>
                  <div>
                    <strong>Section II</strong>
                    <span>5 short-answer questions, 6 items</span>
                    <b>15 marks</b>
                  </div>
                  <div>
                    <strong>Section III</strong>
                    <span>1 structured industry-study response</span>
                    <b>15 marks</b>
                  </div>
                </div>
                <p className="notice">
                  Based on the current NESA examination specifications, checked
                  12 October 2026: Sections I and II cover Industry Related
                  Manufacturing Technology; Section III covers Industry Study.
                  All questions and criteria are original practice material, not
                  NESA material.
                </p>
                <ul>
                  <li>Answer selection is locked during reading time.</li>
                  <li>Navigate freely and flag questions to revisit.</li>
                  <li>
                    Feedback is hidden until submission; unanswered
                    multiple-choice questions receive zero.
                  </li>
                  <li>
                    Written responses require your own self-assessed marks
                    before a final result is shown.
                  </li>
                </ul>
                <button
                  className="button primary"
                  onClick={() => begin("exam")}
                >
                  Start reading time <ArrowRight size={18} />
                </button>
                {active?.mode === "exam" && (
                  <button
                    className="button secondary"
                    onClick={() => navigate("practice")}
                  >
                    Resume current exam
                  </button>
                )}
              </section>
            </>
          )}
          {page === "practice" &&
            (active && question ? (
              <>
                <div className="practice-heading">
                  <div>
                    <div className="eyebrow">
                      {active.mode === "past-paper"
                        ? "LINKED PAST-PAPER PRACTICE"
                        : active.mode === "exam"
                          ? "EXAM SIMULATION"
                          : active.mode === "incorrect"
                            ? "REVIEW & IMPROVE"
                            : "PRACTICE SESSION"}
                    </div>
                    <h1>
                      {active.mode === "exam"
                        ? active.phase === "review"
                          ? "Review your exam"
                          : active.phase === "reading"
                            ? "Reading time"
                            : "Writing time"
                        : "One question. One step forward."}
                    </h1>
                    <p>
                      Question {active.index + 1} of {active.questionIds.length}{" "}
                      ·{" "}
                      {active.mode === "exam"
                        ? "40 available marks"
                        : "Your responses are saved as you work"}
                    </p>
                  </div>
                  {active.mode === "exam" && active.phase !== "review" && (
                    <div
                      className="exam-timer"
                      role="timer"
                      aria-label="Time remaining"
                    >
                      <Clock3 size={20} />
                      <strong>
                        {new Date(Math.max(0, (active.deadline || now) - now))
                          .toISOString()
                          .slice(11, 19)}
                      </strong>
                      <small>
                        {active.phase === "reading" ? "Reading" : "Writing"}
                      </small>
                    </div>
                  )}
                </div>
                {active.mode === "exam" && (
                  <>
                    <div className="exam-toolbar">
                      <div className="question-nav" aria-label="Exam questions">
                        {active.questionIds.map((id, i) => (
                          <button
                            key={id}
                            aria-label={`Question ${i + 1}${active.flags.includes(id) ? ", flagged" : ""}`}
                            aria-current={
                              active.index === i ? "step" : undefined
                            }
                            className={`${active.index === i ? "current" : ""} ${active.answers[id] ? "answered" : ""}`}
                            onClick={() => updateSession({ index: i })}
                          >
                            {i + 1}
                            {active.flags.includes(id) && <Flag size={10} />}
                          </button>
                        ))}
                      </div>
                      {active.phase === "reading" ? (
                        <button
                          className="button secondary"
                          onClick={() =>
                            updateSession({
                              phase: "writing",
                              deadline: Date.now() + 5400000,
                            })
                          }
                        >
                          Skip reading time
                        </button>
                      ) : active.phase === "writing" ? (
                        <button
                          className="button primary"
                          onClick={() => setConfirmAction("submit")}
                        >
                          Submit exam
                        </button>
                      ) : (
                        <button
                          className="button primary"
                          disabled={!!score?.pending}
                          onClick={complete}
                        >
                          Finish & save results
                        </button>
                      )}
                    </div>
                    {active.phase === "review" && score && (
                      <div className="exam-results">
                        <div>
                          <strong>
                            {score.pending
                              ? `${score.total} marks recorded`
                              : `${score.total} / 40`}
                          </strong>
                          <span>
                            {score.pending
                              ? "Final result pending written self-assessment"
                              : "Final practice result"}
                          </span>
                        </div>
                        <p>
                          Automatic: {score.automatic}/10 · Self-assessed:{" "}
                          {score.selfAssessed}/30 · {score.pending} written
                          responses still to assess
                        </p>
                      </div>
                    )}
                  </>
                )}
                {meter(
                  Math.round(
                    ((active.index + 1) / active.questionIds.length) * 100,
                  ),
                  "Session position",
                )}
                <QuestionView
                  key={question.id}
                  q={question}
                  session={active}
                  update={updateSession}
                  assess={assess}
                  next={next}
                  exam={active.mode === "exam"}
                />
                <div className="practice-footer">
                  <button
                    className="button secondary"
                    disabled={active.index === 0}
                    onClick={() => updateSession({ index: active.index - 1 })}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                  <button
                    className="text-button"
                    onClick={() => navigate("dashboard")}
                  >
                    Save & return to dashboard
                  </button>
                  {active.mode === "exam" && (
                    <button
                      className="button secondary"
                      disabled={active.index === active.questionIds.length - 1}
                      onClick={() => updateSession({ index: active.index + 1 })}
                    >
                      Next <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <section className="card">
                <h1>Let’s get started.</h1>
                <p>Choose a practice session to begin.</p>
                <button
                  className="button primary"
                  onClick={() => begin("mixed")}
                >
                  Start practice
                </button>
              </section>
            ))}
          {page === "progress" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">REFLECT & IMPROVE</div>
                <h1>Your progress, at a glance.</h1>
                <p>
                  {stats.completed} unique questions assessed ·{" "}
                  {stats.accuracy === null
                    ? "No multiple-choice results yet"
                    : `${stats.accuracy}% multiple-choice accuracy`}{" "}
                  · written marks are self-assessed.
                </p>
              </div>
              <section className="card">
                <h2>Performance by topic</h2>
                <p>
                  Latest assessed attempt per question. Mixed automatic and
                  self-assessed results are shown as earned marks, not an
                  official grade.
                </p>
                <div className="topic-performance">
                  {stats.byTopic.map((t) => (
                    <div key={t.topic}>
                      <div>
                        <strong>{t.topic}</strong>
                        <span>
                          {t.count
                            ? t.earned + "/" + t.max + " marks"
                            : "Not started"}
                        </span>
                      </div>
                      {meter(
                        t.max ? Math.round((t.earned / t.max) * 100) : 0,
                        `${t.topic} marks`,
                      )}
                      <small>{t.count} questions assessed</small>
                    </div>
                  ))}
                </div>
              </section>
              <section className="card guide">
                <div className="section-heading">
                  <h2>Previous sessions</h2>
                  {active && (
                    <button
                      className="text-button"
                      onClick={() => navigate("practice")}
                    >
                      Resume active session <ArrowRight size={15} />
                    </button>
                  )}
                </div>
                {progress.sessions.length ? (
                  <div className="session-list">
                    {progress.sessions
                      .slice()
                      .reverse()
                      .map((s) => {
                        const a = progress.attempts.filter(
                          (a) => a.sessionId === s.id,
                        );
                        const e = s.mode === "exam" ? examScore(s) : undefined;
                        return (
                          <div key={s.id}>
                            <div>
                              <strong>
                                {s.mode === "exam"
                                  ? "Exam simulation"
                                  : s.mode === "past-paper"
                                    ? "Past-paper practice"
                                    : s.mode === "topic"
                                      ? "Topic practice"
                                      : s.mode === "incorrect"
                                        ? "Review practice"
                                        : "Mixed practice"}
                              </strong>
                              <small>
                                {new Date(s.created).toLocaleString("en-AU")} ·{" "}
                                {s.completed ? "Closed" : "In progress"}
                              </small>
                            </div>
                            <div>
                              {e ? (
                                <>
                                  <strong>
                                    {e.pending
                                      ? "Pending self-assessment"
                                      : `${e.total}/40`}
                                  </strong>
                                  <small>
                                    Automatic {e.automatic}/10 · Self-assessed{" "}
                                    {e.selfAssessed}/30
                                  </small>
                                </>
                              ) : (
                                <>
                                  <strong>{a.length} assessed</strong>
                                  <small>
                                    {a.reduce((sum, x) => sum + x.earned, 0)}/
                                    {a.reduce((sum, x) => sum + x.max, 0)}{" "}
                                    assessed marks
                                  </small>
                                </>
                              )}
                              {s.mode === "exam" && s.phase === "review" && (
                                <button
                                  className="text-button"
                                  onClick={() => openExamReview(s.id)}
                                >
                                  Review exam
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p>
                    Your sessions will appear here after you start practising.
                  </p>
                )}
              </section>
              <section className="card guide">
                <h2>Keep your progress safe</h2>
                <p>
                  Progress is stored only in this browser. Clearing browser
                  data, using another device or private browsing may remove it.
                  No names, email addresses or accounts are collected. Exported
                  responses may contain whatever you type; store them privately.
                </p>
                <div className="backup-actions">
                  <button
                    className="button secondary"
                    onClick={() =>
                      downloadJson(progress, "hsc-multimedia-progress.json")
                    }
                  >
                    <Download size={17} />
                    Export progress
                  </button>
                  <label className="button secondary file-button">
                    <Upload size={17} />
                    Import progress
                    <input
                      aria-label="Import progress"
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => {
                        importFile(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    className="button danger"
                    onClick={() => setConfirmAction("reset")}
                  >
                    <RotateCcw size={17} />
                    Reset progress
                  </button>
                </div>
                <p className="muted">
                  Import replaces current progress. Export a backup first.
                  Invalid files are rejected without changing your data.
                </p>
              </section>
            </>
          )}
          {page === "teacher" && <Teacher />}
          {page === "past-papers" && (
            <PastPapers
              progress={progress}
              practise={(pool) => begin("past-paper", pool)}
            />
          )}
          {page === "about" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">STUDY WITH CONFIDENCE</div>
                <h1>Practice with purpose.</h1>
                <p>
                  Original revision material for NSW HSC Industrial Technology –
                  Multimedia Technologies.
                </p>
              </div>
              <section className="card guide">
                <h2>What this hub does</h2>
                <p>
                  Practise 15 original multiple-choice, 10 original short-answer
                  and 5 original extended-response questions, plus 176 linked
                  past-paper questions. Multiple-choice answers are marked
                  automatically. Written responses use model answers and
                  transparent self-assessment, not keyword matching or AI
                  marking.
                </p>
                <h2>Coverage and official references</h2>
                <p>
                  The ten editable topic categories support revision; they do
                  not replace the official syllabus or guarantee complete exam
                  coverage. The original bank contains no copied past-paper
                  questions. The linked collection provides 176 numbered
                  questions from 2015–2025 through official PDF links, with
                  verified answer keys and local progress. Coverage was checked
                  against the Industrial Technology Stage 6 Syllabus (2013),
                  including HSC Multimedia Technologies and Industry Study. The
                  ten categories are configurable revision groupings; some
                  questions also reinforce project-work skills.
                </p>
                <p>
                  The 40-mark simulation uses 5 minutes reading and 90 minutes
                  writing. Its structure follows the NESA examination
                  specifications checked 12 October 2026: 10 marks of objective
                  responses, 15 marks of short answers (approximately six items,
                  including one worth 4–6 marks), and a structured 15-mark
                  Industry Study response. Keep checking current teacher
                  guidance and specifications.
                </p>
                <ul>
                  <li>
                    <a
                      href="https://www.nsw.gov.au/education-and-training/nesa/curriculum/tas/industrial-technology-stage-6-2013"
                      target="_blank"
                      rel="noreferrer"
                    >
                      NESA Industrial Technology Stage 6 syllabus
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.nsw.gov.au/education-and-training/nesa/curriculum/tas/industrial-technology-stage-6-2013/assessment-and-reporting"
                      target="_blank"
                      rel="noreferrer"
                    >
                      NESA examination specifications
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers/industrial-technology/2025"
                      target="_blank"
                      rel="noreferrer"
                    >
                      NESA HSC past papers and examination material
                    </a>
                  </li>
                </ul>
                <h2>A useful practice routine</h2>
                <ol>
                  <li>Answer before revealing the feedback.</li>
                  <li>Read why each option fits or does not fit.</li>
                  <li>
                    Compare written work with the model and the marking bands.
                  </li>
                  <li>
                    Be honest about missing detail; revisit your weaker topics.
                  </li>
                  <li>Export progress occasionally so you have a backup.</li>
                </ol>
                <h2>Privacy and future feedback</h2>
                <p>
                  This static site has no backend, accounts, tracking analytics
                  or AI calls. A future feedback provider interface exists in
                  the code, but no AI feedback service is connected. Never put
                  an API key in this frontend.
                </p>
              </section>
            </>
          )}
          <footer className="footer">
            <span>Chadwick HSC Revision Website</span>
            <span>
              Original practice + official paper links · Not affiliated with
              NESA
            </span>
          </footer>
        </main>
      </div>
      {confirmAction && (
        <div className="modal-overlay">
          <div
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") setConfirmAction(null);
              if (e.key === "Tab") {
                const els =
                  e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
                if (e.shiftKey && document.activeElement === els[0]) {
                  e.preventDefault();
                  els[els.length - 1].focus();
                } else if (
                  !e.shiftKey &&
                  document.activeElement === els[els.length - 1]
                ) {
                  e.preventDefault();
                  els[0].focus();
                }
              }
            }}
          >
            <h2 id="confirm-title">
              {confirmAction === "reset"
                ? "Reset all progress?"
                : confirmAction === "replace"
                  ? pendingReview
                    ? "Switch to the exam review?"
                    : "Start a new session?"
                  : "Submit your exam?"}
            </h2>
            <p>
              {confirmAction === "reset"
                ? "This removes local responses, results and sessions. Export a backup first."
                : confirmAction === "replace"
                  ? "Your current session will close. Assessed results are kept, but this session will no longer be resumable."
                  : "You cannot change responses after submission. Multiple-choice answers will be marked and written answers will need self-assessment."}
            </p>
            <div className="backup-actions">
              <button
                autoFocus
                className="button secondary"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button className="button primary" onClick={handleConfirm}>
                {confirmAction === "reset"
                  ? "Reset progress"
                  : confirmAction === "replace"
                    ? pendingReview
                      ? "Review exam"
                      : "Start new session"
                    : "Submit exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
