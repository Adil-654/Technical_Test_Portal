
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Play,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Library,
  Trophy,
  Zap,
} from "lucide-react";
import api from "../services/api";

const theme = {
  navy: "#172554",
  orange: "#F97316",
  lightOrange: "#FDBA74",
};

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getScheduleStatus(test, now = Date.now()) {
  const startAt = test.startAt ? new Date(test.startAt).getTime() : null;
  const endAt = test.endAt ? new Date(test.endAt).getTime() : null;

  if (
    (startAt !== null && !Number.isFinite(startAt)) ||
    (endAt !== null && !Number.isFinite(endAt))
  ) {
    return "Schedule unavailable";
  }

  if (startAt !== null && now < startAt) return "Upcoming";
  if (endAt !== null && now > endAt) return "Closed";
  if (test.inProgressAttemptId) return "In progress";

  if (
    test.attemptsRemaining != null &&
    Number(test.attemptsRemaining) <= 0
  ) {
    return "Completed";
  }

  return "Available";
}

function canStartTest(test, now = Date.now()) {
  const startAt = test.startAt ? new Date(test.startAt).getTime() : null;
  const endAt = test.endAt ? new Date(test.endAt).getTime() : null;

  const validSchedule =
    (startAt === null || Number.isFinite(startAt)) &&
    (endAt === null || Number.isFinite(endAt));

  const withinSchedule =
    validSchedule &&
    (startAt === null || now >= startAt) &&
    (endAt === null || now <= endAt);

  const hasAttempts =
    Boolean(test.inProgressAttemptId) ||
    Number(test.attemptsRemaining ?? 1) > 0;

  return withinSchedule && hasAttempts;
}

function extractItems(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function getErrorMessage(error, fallback) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;

  if (status === 401) return "Your session may have expired. Please log in again.";
  if (status === 403) return "You do not have permission to access this information.";
  if (status === 404) return "The requested API route was not found. Check the backend route configuration.";
  if (status >= 500) return message || "The server encountered an error. Check the backend terminal.";

  return message || error?.message || fallback;
}

function getPercentage(result) {
  if (result.percentage != null) {
    const value = Number(result.percentage);
    return Number.isFinite(value) ? value : null;
  }

  const score = Number(
    result.score ?? result.marksObtained ?? result.obtainedMarks
  );

  const total = Number(
    result.totalMarks ?? result.maxMarks ?? result.test?.totalMarks
  );

  return Number.isFinite(score) && Number.isFinite(total) && total > 0
    ? (score / total) * 100
    : null;
}

function getCompletedResults(results) {
  return results.filter((result) => {
    const status = String(result.status || "").toLowerCase();

    return (
      ["submitted", "expired", "completed"].includes(status) ||
      Boolean(result.submittedAt || result.completedAt)
    );
  });
}

export default function StudentDashboard({
  mode = "overview",
  onStartTest,
  onNavigate,
  user,
}) {
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultsError, setResultsError] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setResultsError("");

    try {
      const [testsResponse, resultsResponse] = await Promise.allSettled([
        api.get("/student-assessments"),
        api.get("/student-assessments/results"),
      ]);

      if (testsResponse.status === "fulfilled") {
        setTests(
          extractItems(testsResponse.value.data, [
            "tests",
            "assessments",
            "data",
          ])
        );
      } else {
        setTests([]);
        setError(
          getErrorMessage(
            testsResponse.reason,
            "Unable to load assessments."
          )
        );
      }

      if (resultsResponse.status === "fulfilled") {
        setResults(
          extractItems(resultsResponse.value.data, [
            "results",
            "attempts",
            "data",
          ])
        );
      } else {
        setResults([]);
        setResultsError(
          getErrorMessage(
            resultsResponse.reason,
            "Unable to load your results."
          )
        );
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load dashboard data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  const availableTests = useMemo(
    () => tests.filter((test) => canStartTest(test, currentTime)),
    [tests, currentTime]
  );

  const upcomingTests = useMemo(
    () =>
      tests
        .filter((test) => getScheduleStatus(test, currentTime) === "Upcoming")
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        ),
    [tests, currentTime]
  );

  const completedResults = useMemo(
    () => getCompletedResults(results),
    [results]
  );

  const percentages = useMemo(
    () =>
      completedResults
        .map(getPercentage)
        .filter((value) => value !== null),
    [completedResults]
  );

  const averageScore = percentages.length
    ? Math.round(
        percentages.reduce((sum, value) => sum + value, 0) /
          percentages.length
      )
    : null;

  const bestScore = percentages.length
    ? Math.round(Math.max(...percentages))
    : null;

  if (mode === "results") {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow="YOUR PERFORMANCE"
          title="My Results"
          description="Review your completed assessments, scores and achievements."
          onRefresh={loadData}
          loading={loading}
        />

        {resultsError && (
          <ErrorMessage message={resultsError} onRetry={loadData} />
        )}

        {loading ? (
          <LoadingCards />
        ) : resultsError ? (
          <EmptyState
            icon={AlertCircle}
            title="Unable to load results"
            description={resultsError}
            action="Try again"
            onAction={loadData}
          />
        ) : completedResults.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No results yet"
            description="Your completed assessment results will appear here after you submit a test."
            action="Refresh results"
            onAction={loadData}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MiniStat
                icon={FileCheck2}
                label="Completed tests"
                value={completedResults.length}
              />
              <MiniStat
                icon={TrendingUp}
                label="Average score"
                value={averageScore === null ? "—" : `${averageScore}%`}
              />
              <MiniStat
                icon={Trophy}
                label="Best score"
                value={bestScore === null ? "—" : `${bestScore}%`}
              />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <SectionHeading
                  icon={Award}
                  title="Assessment history"
                  description="Your completed and submitted attempts."
                />
              </div>

              <div className="divide-y divide-slate-100">
                {[...completedResults]
                  .sort(
                    (a, b) =>
                      new Date(b.submittedAt || b.completedAt || 0).getTime() -
                      new Date(a.submittedAt || a.completedAt || 0).getTime()
                  )
                  .map((result, index) => {
                    const score = Number(
                      result.score ??
                        result.marksObtained ??
                        result.obtainedMarks
                    );
                    const total = Number(
                      result.totalMarks ??
                        result.maxMarks ??
                        result.test?.totalMarks
                    );
                    const percentage = getPercentage(result);
                    const status = String(result.status || "Submitted");

                    return (
                      <div
                        key={result._id || result.id || index}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                      >
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                            <FileCheck2 size={22} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900">
                              {result.test?.title ||
                                result.test?.name ||
                                result.testTitle ||
                                "Assessment"}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {result.test?.subject?.name ||
                                result.subject?.name ||
                                "Assessment result"}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              Submitted:{" "}
                              {formatDate(
                                result.submittedAt || result.completedAt
                              )}
                            </p>
                            <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                              {status}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl bg-orange-50 px-5 py-3 sm:text-right">
                          <p className="text-2xl font-extrabold text-orange-600">
                            {percentage === null
                              ? "—"
                              : `${Math.round(percentage)}%`}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {Number.isFinite(score) &&
                            Number.isFinite(total) &&
                            total > 0
                              ? `${score} / ${total} marks`
                              : "Score"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  if (mode === "assessments") {
    return (
      <div className="space-y-7">
        <PageHeader
          eyebrow="YOUR LEARNING SPACE"
          title="My Assessments"
          description="Find your tests, check their schedules, and start when they are available."
          onRefresh={loadData}
          loading={loading}
        />

        {error && <ErrorMessage message={error} onRetry={loadData} />}

        {resultsError && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Your assessments loaded, but results could not be loaded: {resultsError}
          </p>
        )}

        {loading ? (
          <LoadingCards />
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Unable to load assessments"
            description={error}
            action="Try again"
            onAction={loadData}
          />
        ) : tests.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No assessments yet"
            description="Published assessments will appear here when your administrator makes them available."
            action="Refresh assessments"
            onAction={loadData}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <MiniStat icon={BookOpen} label="All assessments" value={tests.length} />
              <MiniStat icon={Play} label="Ready to start" value={availableTests.length} />
              <MiniStat icon={CalendarDays} label="Upcoming" value={upcomingTests.length} />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {tests.map((test, index) => (
                <AssessmentCard
                  key={test._id || test.id || index}
                  test={test}
                  now={currentTime}
                  onStart={() => onStartTest?.(test)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Welcome banner */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#172554] via-[#1E3A70] to-[#F97316] p-7 text-white shadow-xl sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-orange-100">
              <ShieldCheck size={15} />
              TESTPILOT STUDENT PORTAL
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome{user?.name ? `, ${user.name}` : " back"}!
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Every test is a new opportunity to improve. Challenge yourself,
              track your performance and keep moving forward.
            </p>

            <button
              type="button"
              onClick={() => onNavigate?.("tests")}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:-translate-y-0.5 hover:bg-orange-500"
            >
              <Play size={17} />
              Explore assessments
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="flex h-28 w-28 shrink-0 items-center justify-center self-start rounded-3xl border border-white/20 bg-white/10 shadow-inner backdrop-blur md:mr-5 md:self-center">
            <Target size={54} className="text-orange-300" />
          </div>
        </div>

        <div className="relative mt-8 flex flex-wrap gap-5 border-t border-white/15 pt-5 text-sm text-blue-100">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-orange-300" />
            Learn consistently
          </span>
          <span className="flex items-center gap-2">
            <TrendingUp size={16} className="text-orange-300" />
            Track your growth
          </span>
          <span className="flex items-center gap-2">
            <Trophy size={16} className="text-orange-300" />
            Aim higher
          </span>
        </div>
      </section>

      {error && <ErrorMessage message={error} onRetry={loadData} />}

      {/* Statistics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="My assessments"
          value={loading ? "—" : tests.length}
          detail="Published tests"
          accent="navy"
        />
        <StatCard
          icon={Zap}
          label="Ready to attempt"
          value={loading ? "—" : availableTests.length}
          detail="Available right now"
          accent="orange"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed tests"
          value={loading ? "—" : completedResults.length}
          detail="Submitted or expired"
          accent="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Average score"
          value={loading ? "—" : averageScore === null ? "—" : `${averageScore}%`}
          detail="Across scored attempts"
          accent="purple"
        />
      </section>

      {/* Main dashboard content */}
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading
              icon={CalendarDays}
              title={availableTests.length > 0 ? "Ready when you are" : "Your assessments"}
              description="Your tests and their current schedules."
            />
            <TextButton onClick={() => onNavigate?.("tests")}>
              View all <ArrowRight size={16} />
            </TextButton>
          </div>

          {loading ? (
            <LoadingCards />
          ) : tests.length === 0 ? (
            <EmptyInline
              icon={BookOpen}
              title="No assessments available"
              description="Your administrator's published tests will appear here."
            />
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[...tests]
                .sort((a, b) => {
                  const aStart = a.startAt ? new Date(a.startAt).getTime() : Infinity;
                  const bStart = b.startAt ? new Date(b.startAt).getTime() : Infinity;
                  return aStart - bStart;
                })
                .slice(0, 4)
                .map((test, index) => {
                  const status = getScheduleStatus(test, currentTime);
                  const available = canStartTest(test, currentTime);

                  return (
                    <div
                      key={test._id || test.id || index}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-orange-300 hover:bg-orange-50/30 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                          {test.subject?.code || test.subject?.name || "ASSESSMENT"}
                        </p>
                        <h3 className="mt-2 font-bold text-[#172554]">
                          {test.title || test.name || "Untitled assessment"}
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock3 size={13} />
                            {test.durationMinutes ?? "—"} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Target size={13} />
                            {test.totalMarks ?? "—"} marks
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-400">
                          {formatDate(test.startAt)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge status={status} />
                        {available && (
                          <button
                            type="button"
                            onClick={() => onStartTest?.(test)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F97316] px-3 py-2 text-sm font-bold text-white transition hover:bg-orange-600"
                          >
                            <Play size={14} />
                            {status === "In progress" ? "Resume" : "Start"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Progress panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            icon={Award}
            title="My progress"
            description="Keep moving forward."
          />

          <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#172554] to-[#263F78] p-5 text-white">
            <p className="text-sm font-medium text-blue-100">Average score</p>
            <p className="mt-2 text-4xl font-extrabold">
              {averageScore === null ? "—" : `${averageScore}%`}
            </p>
            <p className="mt-1 text-xs text-blue-200">
              {completedResults.length} completed attempt(s)
            </p>

            {averageScore !== null && (
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-[#F97316] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, averageScore))}%` }}
                />
              </div>
            )}
          </div>

          {resultsError && (
            <p className="mt-3 text-xs leading-5 text-amber-700">
              Results could not be loaded: {resultsError}
            </p>
          )}

          <div className="mt-5 space-y-2">
            <QuickAction
              icon={BookOpen}
              title="Browse assessments"
              description="Find your next test"
              onClick={() => onNavigate?.("tests")}
            />
            <QuickAction
              icon={Library}
              title="Question Bank"
              description="Practice and explore questions"
              onClick={() => onNavigate?.("question-bank")}
            />
            <QuickAction
              icon={Award}
              title="My results"
              description="Review your performance"
              onClick={() => onNavigate?.("results")}
            />
            <QuickAction
              icon={Clock3}
              title="Upcoming tests"
              description={`${upcomingTests.length} scheduled`}
              onClick={() => onNavigate?.("tests")}
            />
          </div>
        </div>
      </section>

      {/* Recent activity */}
      {!loading && completedResults.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeading
              icon={FileCheck2}
              title="Recent activity"
              description="Your latest completed attempts."
            />
            <TextButton onClick={() => onNavigate?.("results")}>
              All results <ArrowRight size={16} />
            </TextButton>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {[...completedResults]
              .sort(
                (a, b) =>
                  new Date(b.submittedAt || b.completedAt || 0).getTime() -
                  new Date(a.submittedAt || a.completedAt || 0).getTime()
              )
              .slice(0, 3)
              .map((result, index) => {
                const percentage = getPercentage(result);

                return (
                  <div
                    key={result._id || result.id || index}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                        <FileCheck2 size={19} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#172554]">
                          {result.test?.title ||
                            result.test?.name ||
                            result.testTitle ||
                            "Assessment"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(result.submittedAt || result.completedAt)}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-lg bg-orange-50 px-3 py-2 text-sm font-extrabold text-orange-600">
                      {percentage !== null
                        ? `${Math.round(percentage)}%`
                        : result.score != null
                          ? `${result.score} marks`
                          : result.marksObtained != null
                            ? `${result.marksObtained} marks`
                            : "Submitted"}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

function PageHeader({ eyebrow, title, description, onRefresh, loading }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#172554] to-[#294477] p-6 text-white shadow-lg sm:p-8">
      <div>
        <p className="text-sm font-bold tracking-widest text-orange-300">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">{description}</p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        Refresh
      </button>
    </section>
  );
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
        <Icon size={21} />
      </div>
      <div>
        <h2 className="font-extrabold text-[#172554]">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        )}
      </div>
    </div>
  );
}

function TextButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 transition hover:text-orange-700"
    >
      {children}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, detail, accent }) {
  const styles = {
    navy: "bg-blue-50 text-[#172554]",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-emerald-50 text-emerald-700",
    purple: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#172554]">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${styles[accent] || styles.navy}`}>
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400">{detail}</p>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/3 rounded-full bg-[#F97316] transition-all group-hover:w-2/3" />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200">
      <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-extrabold text-[#172554]">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-orange-200 hover:bg-orange-50/50"
    >
      <span className="rounded-lg bg-orange-50 p-2 text-orange-600">
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#172554]">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <ArrowRight size={16} className="text-orange-500" />
    </button>
  );
}

function AssessmentCard({ test, onStart, now }) {
  const status = getScheduleStatus(test, now);
  const canStart = canStartTest(test, now);

  const buttonLabel = {
    Available: "Start test",
    Upcoming: "Not started yet",
    Closed: "Test closed",
    Completed: "No attempts left",
    "In progress": "Resume test",
    "Schedule unavailable": "Schedule unavailable",
  }[status];

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">
            {test.subject?.code || "ASSESSMENT"}
          </p>
          <h3 className="mt-2 break-words text-lg font-extrabold text-[#172554]">
            {test.title || test.name || "Untitled assessment"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {test.subject?.name || "General"}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {test.description && (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
          {test.description}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Info icon={Clock3} label="Duration" value={`${test.durationMinutes ?? "—"} min`} />
        <Info icon={Target} label="Total marks" value={test.totalMarks ?? "—"} />
        <Info
          icon={BookOpen}
          label="Questions"
          value={test.questionCount ?? test.questions?.length ?? "—"}
        />
        <Info icon={FileCheck2} label="Attempts left" value={test.attemptsRemaining ?? "—"} />
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-xs text-slate-500">Starts: {formatDate(test.startAt)}</p>
        <p className="text-xs text-slate-500">Closes: {formatDate(test.endAt)}</p>
      </div>

      <button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F97316] px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <Play size={16} />
        {buttonLabel}
      </button>
    </article>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Available: "bg-emerald-50 text-emerald-700",
    Upcoming: "bg-orange-50 text-orange-700",
    Closed: "bg-slate-100 text-slate-600",
    Completed: "bg-slate-100 text-slate-600",
    "In progress": "bg-blue-50 text-blue-800",
    "Schedule unavailable": "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-1.5 break-words text-sm font-bold text-[#172554]">
        {value}
      </p>
    </div>
  );
}

function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="font-bold underline">
        Try again
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
      <Icon size={38} className="mx-auto text-orange-400" />
      <h3 className="mt-4 font-extrabold text-[#172554]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
      >
        <RefreshCw size={16} />
        {action}
      </button>
    </div>
  );
}

function EmptyInline({ icon: Icon, title, description }) {
  return (
    <div className="py-12 text-center">
      <Icon size={36} className="mx-auto text-orange-300" />
      <p className="mt-3 font-bold text-[#172554]">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-40 animate-pulse rounded-2xl bg-slate-100"
        />
      ))}
    </div>
  );
}
