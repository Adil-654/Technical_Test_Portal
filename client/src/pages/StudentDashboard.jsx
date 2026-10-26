
import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Clock3,
  FileCheck2,
  Play,
  RefreshCw,
  ShieldCheck,
  Target,
} from "lucide-react";
import api from "../services/api";

function formatDate(value) {
  if (!value) return null;

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatus(test) {
  if (test.startsInFuture) return "Upcoming";
  if (test.hasEnded) return "Closed";
  if (test.inProgressAttemptId) return "In progress";
  if (test.attemptsRemaining === 0) return "Completed";
  return "Available";
}

export default function StudentDashboard({ onStartTest }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/student-assessments");
      setTests(response.data.tests || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load assessments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const availableCount = tests.filter(
    (test) => test.isAvailable
  ).length;

  const totalQuestions = tests.reduce(
    (sum, test) => sum + test.questionCount,
    0
  );

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-7 text-white shadow-xl sm:p-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-indigo-100">
              <ShieldCheck size={16} />
              TestPilot Student Portal
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to test your skills?
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
              Review your available assessments, manage your time,
              and track your progress one test at a time.
            </p>
          </div>

          <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-2xl border border-white/20 bg-white/10 md:self-center">
            <Target size={38} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={BookOpen}
          label="Published assessments"
          value={tests.length}
          detail="Tests available in the portal"
        />

        <StatCard
          icon={Play}
          label="Ready to attempt"
          value={availableCount}
          detail="Available or resumable tests"
        />

        <StatCard
          icon={FileCheck2}
          label="Questions"
          value={totalQuestions}
          detail="Across published assessments"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              My assessments
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a test or continue an unfinished attempt.
            </p>
          </div>

          <button
            type="button"
            onClick={loadTests}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <button
                type="button"
                onClick={loadTests}
                className="ml-2 font-bold underline"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-52 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : tests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-14 text-center">
              <BookOpen
                size={38}
                className="mx-auto text-slate-400"
              />
              <h3 className="mt-4 font-bold text-slate-800">
                No assessments published yet
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Published tests will appear here when your
                administrator makes them available.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {tests.map((test) => (
                <AssessmentCard
                  key={test.id}
                  test={test}
                  onStart={() => onStartTest(test)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function AssessmentCard({ test, onStart }) {
  const status = getStatus(test);

  const statusStyles = {
    Available: "bg-emerald-50 text-emerald-700",
    Upcoming: "bg-amber-50 text-amber-700",
    Closed: "bg-slate-100 text-slate-600",
    Completed: "bg-slate-100 text-slate-600",
    "In progress": "bg-indigo-50 text-indigo-700",
  };

  const canStart = test.isAvailable;

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 p-5 transition hover:border-indigo-200 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {test.subject?.code || "ASSESSMENT"}
          </p>
          <h3 className="mt-2 break-words text-lg font-bold text-slate-900">
            {test.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {test.subject?.name || "General"}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
        >
          {status}
        </span>
      </div>

      {test.description && (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
          {test.description}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Info icon={Clock3} label="Duration" value={`${test.durationMinutes} min`} />
        <Info icon={Target} label="Total marks" value={test.totalMarks} />
        <Info icon={BookOpen} label="Questions" value={test.questionCount} />
        <Info
          icon={FileCheck2}
          label="Attempts left"
          value={test.attemptsRemaining}
        />
      </div>

      {test.startAt && (
        <p className="mt-4 text-xs text-slate-500">
          Starts: {formatDate(test.startAt)}
        </p>
      )}

      {test.endAt && (
        <p className="mt-1 text-xs text-slate-500">
          Closes: {formatDate(test.endAt)}
        </p>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <button
          type="button"
          disabled={!canStart}
          onClick={onStart}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          <Play size={16} />
          {test.inProgressAttemptId
            ? "Resume test"
            : canStart
              ? "Start test"
              : status === "Upcoming"
                ? "Not started yet"
                : status === "Closed"
                  ? "Test closed"
                  : "No attempts left"}
        </button>
      </div>
    </article>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}
