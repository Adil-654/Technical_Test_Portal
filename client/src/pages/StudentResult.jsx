import { CheckCircle2, Home, Trophy } from "lucide-react";

export default function StudentResult({ attempt, onBack }) {
  const score = attempt?.score ?? 0;
  const totalMarks = attempt?.totalMarks ?? 0;
  const percentage = attempt?.percentage ?? 0;
  const totalQuestions = attempt?.answers?.length ?? 0;
  const isExpired = attempt?.status === "expired";

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Trophy className="mx-auto text-indigo-600" size={44} />

        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {isExpired ? "Time is up!" : "Assessment completed"}
        </h1>

        <p className="mt-2 text-slate-500">
          Your assessment has been evaluated.
        </p>

        <div className="my-8">
          <p className="text-sm text-slate-500">Your score</p>
          <p className="mt-2 text-4xl font-bold text-indigo-700">
            {score} / {totalMarks}
          </p>
          <p className="mt-2 font-semibold text-slate-600">
            {Number(percentage).toFixed(2)}%
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-slate-50 p-4">
          <p className="text-slate-600">
            Total questions: <strong>{totalQuestions}</strong>
          </p>
          <p className="mt-2 text-slate-600">
            Status: <strong>{isExpired ? "Time expired" : "Submitted"}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          <Home size={18} />
          Back to assessments
        </button>
      </div>
    </div>
  );
}