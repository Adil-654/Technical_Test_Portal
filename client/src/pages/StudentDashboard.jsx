
import { useCallback, useEffect, useState } from "react";
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
  if (Number(test.attemptsRemaining) <= 0) return "Completed";

  return "Available";
}

function canStartTest(test, now = Date.now()) {
  const startAt = test.startAt ? new Date(test.startAt).getTime() : NaN;
  const endAt = test.endAt ? new Date(test.endAt).getTime() : NaN;

  return (
    Number.isFinite(startAt) &&
    Number.isFinite(endAt) &&
    now >= startAt &&
    now <= endAt &&
    (Boolean(test.inProgressAttemptId) ||
      Number(test.attemptsRemaining) > 0)
  );
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
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [testsResponse, resultsResponse] = await Promise.allSettled([
        api.get("/student-assessments"),
        api.get("/student-assessments/results"),
      ]);

      if (testsResponse.status === "fulfilled") {
        const data = testsResponse.value.data;
        const items = Array.isArray(data)
          ? data
          : data?.tests ?? data?.assessments ?? [];

        setTests(Array.isArray(items) ? items : []);
      } else {
        setTests([]);
        setError(
          testsResponse.reason?.response?.data?.message ||
            "Unable to load assessments."
        );
      }

      if (resultsResponse.status === "fulfilled") {
        const data = resultsResponse.value.data;
        const items = Array.isArray(data)
          ? data
          : data?.results ?? data?.attempts ?? [];

        setResults(Array.isArray(items) ? items : []);
      } else {
        setResults([]);
      }
    } catch {
      setError("Unable to load dashboard data. Please try again.");
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

  const availableTests = tests.filter((test) =>
    canStartTest(test, currentTime)
  );

  const completedResults = results.filter((result) => {
    const status = String(result.status || "").toLowerCase();
    return (
      status === "submitted" ||
      status === "expired" ||
      Boolean(result.submittedAt || result.completedAt)
    );
  });

  const averageScore = (() => {
    const percentages = completedResults
      .map((result) => {
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
      })
      .filter((value) => value !== null);

    return percentages.length
      ? Math.round(
          percentages.reduce((sum, value) => sum + value, 0) /
            percentages.length
        )
      : null;
  })();

  if (mode === "assessments") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Your learning workspace"
          title="Available Assessments"
          description="Check the schedule, review test details, and start an assessment when it becomes available."
          onRefresh={loadData}
          loading={loading}
        />

        {error && <ErrorMessage message={error} onRetry={loadData} />}

        {loading ? (
          <LoadingCards />
        ) : tests.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No assessments available"
            description="Published assessments will appear here when your administrator makes them available."
            action="Refresh assessments"
            onAction={loadData}
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {tests.map((test, index) => (
              <AssessmentCard
                key={test._id || test.id || index}
                test={test}
                now={currentTime}
                onStart={() => onStartTest?.(test)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
              Keep learning, challenge yourself, and track your assessment
              performance from one place.
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

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Your overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A quick look at your assessment activity.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            aria-label="Refresh dashboard"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={BookOpen}
            label="Published assessments"
            value={loading ? "—" : tests.length}
            detail="Available in your portal"
            color="indigo"
          />

          <StatCard
            icon={Play}
            label="Ready to attempt"
            value={loading ? "—" : availableTests.length}
            detail="Currently within schedule"
            color="emerald"
          />

          <StatCard
            icon={FileCheck2}
            label="Completed attempts"
            value={loading ? "—" : completedResults.length}
            detail="Submitted or expired attempts"
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
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Assessments to explore
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Start a test when its schedule allows.
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
            <div className="py-10 text-center">
              <BookOpen size={34} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                No assessments yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Check back when new tests are published.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {tests.slice(0, 4).map((test, index) => {
                const status = getScheduleStatus(test, currentTime);
                const available = canStartTest(test, currentTime);

                return (
                  <div
                    key={test._id || test.id || index}
                    className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        {test.subject?.code || test.subject?.name || "Assessment"}
                      </p>
                      <h3 className="mt-1 font-bold text-slate-900">
                        {test.title || test.name || "Untitled assessment"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {test.durationMinutes ?? "—"} minutes
                        {" · "}
                        {test.totalMarks ?? "—"} marks
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
              <CalendarDays size={22} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Quick actions</h2>
              <p className="text-sm text-slate-500">Go to a section</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <QuickAction
              icon={BookOpen}
              title="Browse assessments"
              description="See schedules and available tests"
              onClick={() => onNavigate?.("tests")}
            />
            <QuickAction
              icon={Award}
              title="My results"
              description="Review previous attempts"
              onClick={() => onNavigate?.("results")}
            />
            <QuickAction
              icon={Clock3}
              title="Upcoming tests"
              description={`${tests.filter((test) => getScheduleStatus(test, currentTime) === "Upcoming").length} scheduled`}
              onClick={() => onNavigate?.("tests")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, onRefresh, loading }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white shadow-lg sm:p-8">
      <div>
        <p className="text-sm font-medium text-indigo-100">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-indigo-100">{description}</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
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
        <span className="block text-sm font-semibold text-slate-800">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
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
        <Info icon={Clock3} label="Duration" value={`${test.durationMinutes ?? "—"} min`} />
        <Info icon={Target} label="Total marks" value={test.totalMarks ?? "—"} />
        <Info icon={BookOpen} label="Questions" value={test.questionCount ?? test.questions?.length ?? "—"} />
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
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600"}`}>
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
      <p className="mt-1.5 break-words text-sm font-bold text-slate-800">{value}</p>
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
        <div key={item} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}
