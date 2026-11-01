
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
} from "lucide-react";
import api from "../services/api";

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
  const startAt = test.startAt ? new Date(test.startAt).getTime() : NaN;
  const endAt = test.endAt ? new Date(test.endAt).getTime() : NaN;

  if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) {
    return "Schedule missing";
  }

  if (now < startAt) return "Upcoming";
  if (now > endAt) return "Closed";
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
  const startAt = test.startAt ? new Date(test.startAt).getTime() : NaN;
  const endAt = test.endAt ? new Date(test.endAt).getTime() : NaN;

  const withinSchedule =
    Number.isFinite(startAt) &&
    Number.isFinite(endAt) &&
    now >= startAt &&
    now <= endAt;

  const hasAttempts =
    Boolean(test.inProgressAttemptId) ||
    test.attemptsRemaining == null ||
    Number(test.attemptsRemaining) > 0;

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

  if (status === 401) {
    return "Your session may have expired. Please log in again.";
  }

  if (status === 403) {
    return "You do not have permission to access this information.";
  }

  if (status === 404) {
    return "The requested API route was not found. Check the backend route configuration.";
  }

  if (status >= 500) {
    return message || "The server encountered an error. Check the backend terminal.";
  }

  return message || error?.message || fallback;
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
      setError(
        getErrorMessage(err, "Unable to load dashboard data.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);

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
            new Date(a.startAt).getTime() -
            new Date(b.startAt).getTime()
        ),
    [tests, currentTime]
  );

  const completedResults = useMemo(
    () =>
      results.filter((result) => {
        const status = String(result.status || "").toLowerCase();

        return (
          ["submitted", "expired", "completed"].includes(status) ||
          Boolean(result.submittedAt || result.completedAt)
        );
      }),
    [results]
  );

  const averageScore = useMemo(() => {
    const percentages = completedResults
      .map((result) => {
        if (result.percentage != null) {
          const value = Number(result.percentage);
          return Number.isFinite(value) ? value : null;
        }

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

        return Number.isFinite(score) &&
          Number.isFinite(total) &&
          total > 0
          ? (score / total) * 100
          : null;
      })
      .filter((value) => value !== null);

    return percentages.length
      ? Math.round(
        percentages.reduce((sum, value) => sum + value, 0) /
        percentages.length
      )
      : null;
  }, [completedResults]);

  if (mode === "results") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="YOUR PERFORMANCE"
          title="My Results"
          description="Review your completed assessments, scores, and performance."
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
            <div className="grid gap-4 sm:grid-cols-3">
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
                icon={Award}
                label="Best score"
                value={`${Math.max(
                  ...completedResults.map((result) => {
                    if (result.percentage != null) {
                      return Number(result.percentage) || 0;
                    }

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

                    return total > 0 && Number.isFinite(score)
                      ? (score / total) * 100
                      : 0;
                  })
                ).toFixed(0)}%`}
              />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Assessment history
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your completed and submitted attempts.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {[...completedResults]
                  .sort((a, b) => {
                    const dateA = new Date(
                      a.submittedAt || a.completedAt || 0
                    ).getTime();
                    const dateB = new Date(
                      b.submittedAt || b.completedAt || 0
                    ).getTime();

                    return dateB - dateA;
                  })
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

                    const percentage =
                      result.percentage != null
                        ? Number(result.percentage)
                        : total > 0 && Number.isFinite(score)
                          ? (score / total) * 100
                          : null;

                    const status = String(
                      result.status || "Submitted"
                    );

                    return (
                      <div
                        key={result._id || result.id || index}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
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
                                result.submittedAt ||
                                result.completedAt
                              )}
                            </p>

                            <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                              {status}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 rounded-xl bg-emerald-50 px-5 py-3 sm:text-right">
                          <p className="text-2xl font-bold text-emerald-700">
                            {percentage === null
                              ? "—"
                              : `${Math.round(percentage)}%`}
                          </p>

                          <p className="mt-1 text-sm text-emerald-700">
                            {Number.isFinite(score) && Number.isFinite(total) &&
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
      <div className="space-y-6">
        <PageHeader
          eyebrow="YOUR LEARNING SPACE"
          title="My Assessments"
          description="Find your tests, check their schedules, and start when they are available."
          onRefresh={loadData}
          loading={loading}
        />

        {error && <ErrorMessage message={error} onRetry={loadData} />}

        {resultsError && (
          <p className="text-sm text-amber-700">
            Your assessments loaded, but results could not be loaded:{" "}
            {resultsError}
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
              <MiniStat
                icon={BookOpen}
                label="All assessments"
                value={tests.length}
              />
              <MiniStat
                icon={Play}
                label="Ready to start"
                value={availableTests.length}
              />
              <MiniStat
                icon={CalendarDays}
                label="Upcoming"
                value={upcomingTests.length}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">              {tests.map((test, index) => (
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
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-800 p-7 text-white shadow-xl sm:p-10">
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-indigo-100">
              <ShieldCheck size={16} />
              TestPilot Student Portal
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome{user?.name ? `, ${user.name}` : " back"}!
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
              Your next challenge is waiting. Explore assessments,
              monitor your results, and keep improving.
            </p>

            <button
              type="button"
              onClick={() => onNavigate?.("tests")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-800 transition hover:bg-indigo-50"
            >
              <Play size={17} />
              Explore assessments
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="flex h-24 w-24 shrink-0 items-center justify-center self-start rounded-3xl border border-white/20 bg-white/10 md:self-center">
            <Target size={44} />
          </div>
        </div>
      </section>

      {error && <ErrorMessage message={error} onRetry={loadData} />}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="My assessments"
          value={loading ? "—" : tests.length}
          detail="Published tests"
          color="indigo"
        />
        <StatCard
          icon={Play}
          label="Ready to attempt"
          value={loading ? "—" : availableTests.length}
          detail="Within the scheduled time"
          color="emerald"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed tests"
          value={loading ? "—" : completedResults.length}
          detail="Submitted or expired"
          color="violet"
        />
        <StatCard
          icon={TrendingUp}
          label="Average score"
          value={
            loading
              ? "—"
              : averageScore === null
                ? "—"
                : `${averageScore}%`
          }
          detail="Across scored attempts"
          color="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {availableTests.length > 0
                  ? "Ready when you are"
                  : "Your upcoming assessments"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your tests and their current schedules.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.("tests")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              View all <ArrowRight size={16} />
            </button>
          </div>

          {loading ? (
            <LoadingCards />
          ) : tests.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen size={36} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                No assessments available
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your administrator's published tests will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[...tests]
                .sort((a, b) => {
                  const aStart = a.startAt
                    ? new Date(a.startAt).getTime()
                    : Infinity;
                  const bStart = b.startAt
                    ? new Date(b.startAt).getTime()
                    : Infinity;

                  return aStart - bStart;
                })
                .slice(0, 5)
                .map((test, index) => {
                  const status = getScheduleStatus(test, currentTime);
                  const available = canStartTest(test, currentTime);

                  return (
                    <div
                      key={test._id || test.id || index}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:shadow-sm"                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                          {test.subject?.code ||
                            test.subject?.name ||
                            "ASSESSMENT"}
                        </p>
                        <h3 className="mt-1 font-bold text-slate-900">
                          {test.title || test.name || "Untitled assessment"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {test.durationMinutes ?? "—"} minutes
                          {" · "}
                          {test.totalMarks ?? "—"} marks
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(test.startAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={status} />
                        {available && (
                          <button
                            type="button"
                            onClick={() => onStartTest?.(test)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                          >
                            <Play size={14} />
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
              <Award size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">My progress</h2>
              <p className="text-sm text-slate-500">
                Keep moving forward
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-700">
              Average score
            </p>
            <p className="mt-1 text-3xl font-bold text-indigo-950">
              {averageScore === null ? "—" : `${averageScore}%`}
            </p>
            <p className="mt-1 text-xs text-indigo-600">
              {completedResults.length} completed attempt(s)
            </p>
          </div>

          {resultsError && (
            <p className="mt-3 text-xs leading-5 text-amber-700">
              Results could not be loaded: {resultsError}
            </p>
          )}

          <div className="mt-5 space-y-3">
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

      {!loading && completedResults.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Recent activity
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your latest completed attempts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.("results")}
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              All results
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {[...completedResults]
              .sort((a, b) => {
                const dateA = new Date(
                  a.submittedAt || a.completedAt || 0
                ).getTime();
                const dateB = new Date(
                  b.submittedAt || b.completedAt || 0
                ).getTime();

                return dateB - dateA;
              })
              .slice(0, 3)
              .map((result, index) => (
                <div
                  key={result._id || result.id || index}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {result.test?.title ||
                        result.test?.name ||
                        result.testTitle ||
                        "Assessment"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(
                        result.submittedAt || result.completedAt
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                    {result.percentage != null
                      ? `${Math.round(Number(result.percentage))}%`
                      : result.score != null
                        ? `${result.score} marks`
                        : result.marksObtained != null
                          ? `${result.marksObtained} marks`
                          : "Submitted"}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  onRefresh,
  loading,
}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white shadow-lg sm:p-8">
      <div>
        <p className="text-sm font-medium text-indigo-100">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-indigo-100">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
      >
        <RefreshCw
          size={16}
          className={loading ? "animate-spin" : ""}
        />
        Refresh
      </button>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, detail, color }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${colors[color]}`}>
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-indigo-100 hover:bg-indigo-50/50"
    >
      <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {description}
        </span>
      </span>
      <ArrowRight size={16} className="text-slate-400" />
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
    "Schedule missing": "Schedule unavailable",
  }[status];

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {test.subject?.code || "ASSESSMENT"}
          </p>
          <h3 className="mt-2 break-words text-lg font-bold text-slate-900">
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
        <Info
          icon={Clock3}
          label="Duration"
          value={`${test.durationMinutes ?? "—"} min`}
        />
        <Info
          icon={Target}
          label="Total marks"
          value={test.totalMarks ?? "—"}
        />
        <Info
          icon={BookOpen}
          label="Questions"
          value={test.questionCount ?? test.questions?.length ?? "—"}
        />
        <Info
          icon={FileCheck2}
          label="Attempts left"
          value={test.attemptsRemaining ?? "—"}
        />
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-xs text-slate-500">
          Starts: {formatDate(test.startAt)}
        </p>
        <p className="text-xs text-slate-500">
          Closes: {formatDate(test.endAt)}
        </p>
      </div>

      <button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
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
    Upcoming: "bg-amber-50 text-amber-700",
    Closed: "bg-slate-100 text-slate-600",
    Completed: "bg-slate-100 text-slate-600",
    "In progress": "bg-indigo-50 text-indigo-700",
    "Schedule missing": "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600"
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
      <p className="mt-1.5 break-words text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="font-bold underline"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
      <Icon size={38} className="mx-auto text-slate-400" />
      <h3 className="mt-4 font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        <RefreshCw size={16} />
        {action}
      </button>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="h-48 animate-pulse rounded-2xl bg-slate-100"
        />
      ))}
    </div>
  );
}
