
import { useMemo } from "react";
import {
  CheckCircle2,
  Home,
  Trophy,
  XCircle,
  Clock,
  FileText,
  CalendarClock,
} from "lucide-react";

export default function StudentResult({ attempt, onBack }) {
  const result = useMemo(() => {
    const scoreValue =
      attempt?.score ??
      attempt?.marksObtained ??
      attempt?.obtainedMarks ??
      attempt?.totalScore;

    const totalValue =
      attempt?.totalMarks ??
      attempt?.maxMarks ??
      attempt?.test?.totalMarks;

    const score =
      scoreValue != null && Number.isFinite(Number(scoreValue))
        ? Number(scoreValue)
        : 0;

    const totalMarks =
      totalValue != null && Number.isFinite(Number(totalValue))
        ? Number(totalValue)
        : 0;

    const percentageValue = attempt?.percentage;

    const percentage =
      percentageValue != null && Number.isFinite(Number(percentageValue))
        ? Number(percentageValue)
        : totalMarks > 0
          ? (score / totalMarks) * 100
          : 0;

    const answers = Array.isArray(attempt?.answers)
      ? attempt.answers
      : [];

    const status = String(attempt?.status || "").toLowerCase();

    const isExpired = status === "expired";
    const isInProgress = status === "in_progress";

    return {
      score,
      totalMarks,
      percentage,
      answers,
      status,
      isExpired,
      isInProgress,
      title:
        attempt?.test?.title ||
        attempt?.testTitle ||
        attempt?.title ||
        "Assessment",
      subject:
        attempt?.test?.subject?.name ||
        attempt?.subject?.name ||
        attempt?.subjectName ||
        "General",
      submittedAt:
        attempt?.submittedAt ||
        attempt?.completedAt ||
        attempt?.updatedAt,
    };
  }, [attempt]);

  const {
    score,
    totalMarks,
    percentage,
    answers,
    isExpired,
    isInProgress,
    title,
    subject,
    submittedAt,
  } = result;

  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div
          className={`px-6 py-8 text-center sm:px-8 ${
            isExpired
              ? "bg-amber-50"
              : isInProgress
                ? "bg-slate-50"
                : "bg-indigo-50"
          }`}
        >
          {isExpired ? (
            <Clock
              className="mx-auto text-amber-600"
              size={44}
            />
          ) : isInProgress ? (
            <FileText
              className="mx-auto text-slate-600"
              size={44}
            />
          ) : (
            <Trophy
              className="mx-auto text-indigo-600"
              size={44}
            />
          )}

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {isExpired
              ? "Time is up!"
              : isInProgress
                ? "Assessment in progress"
                : "Assessment result"}
          </h1>

          <p className="mt-2 font-medium text-slate-700">{title}</p>

          <p className="mt-1 text-sm text-slate-500">
            Subject: {subject}
          </p>

          {formattedDate && (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500">
              <CalendarClock size={16} />
              {formattedDate}
            </p>
          )}
        </div>

        <div className="p-6 sm:p-8">
          <div className="rounded-2xl border border-slate-200 p-6 text-center">
            <p className="text-sm font-medium text-slate-500">
              {isInProgress ? "Current score" : "Your score"}
            </p>

            <p className="mt-2 text-4xl font-bold text-indigo-700">
              {score} / {totalMarks}
            </p>

            <p className="mt-2 font-semibold text-slate-600">
              {percentage.toFixed(2)}%
            </p>

            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, percentage))}%`,
                }}
              />
            </div>
          </div>

          <div className="my-6 space-y-3 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Total questions answered</span>
              <strong className="text-slate-900">{answers.length}</strong>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Status</span>

              <span className="inline-flex items-center gap-1.5 font-semibold">
                {isExpired ? (
                  <>
                    <Clock size={16} className="text-amber-600" />
                    <span className="text-amber-700">Time expired</span>
                  </>
                ) : isInProgress ? (
                  <>
                    <Clock size={16} className="text-slate-500" />
                    <span className="text-slate-700">In progress</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span className="text-emerald-700">Submitted</span>
                  </>
                )}
              </span>
            </div>

            {totalMarks > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-600">Marks obtained</span>
                <strong className="text-slate-900">
                  {score} out of {totalMarks}
                </strong>
              </div>
            )}
          </div>

          {isExpired && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <Clock size={18} className="mt-0.5 shrink-0" />
              Your assessment time expired. The score shown is based on the
              result data returned by the server.
            </div>
          )}

          {!isExpired && !isInProgress && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              Your assessment result is available.
            </div>
          )}

          <button
            type="button"
            onClick={onBack}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            <Home size={18} />
            Back to results
          </button>
        </div>
      </div>
    </div>
  );
}
