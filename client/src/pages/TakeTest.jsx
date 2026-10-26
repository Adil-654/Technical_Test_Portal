
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function TakeTest({ test, onBack, onFinished }) {
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const answersRef = useRef({});
  const attemptRef = useRef(null);
  const finishedRef = useRef(false);
  const savingRef = useRef(false);
  const submittingRef = useRef(false);

  const attemptId = test?.inProgressAttemptId;

  useEffect(() => {
    let cancelled = false;

    async function initializeAttempt() {
      setLoading(true);
      setError("");

      try {
        const response = attemptId
          ? await api.get(
              `/student-assessments/attempts/${attemptId}`
            )
          : await api.post(
              `/student-assessments/${test.id}/start`
            );

        if (cancelled) return;

        const loadedAttempt = response.data.attempt;

        if (!loadedAttempt) {
          throw new Error("The server did not return a test attempt.");
        }

        attemptRef.current = loadedAttempt;
        setAttempt(loadedAttempt);

        const savedAnswers = {};

        for (const answer of loadedAttempt.answers) {
          savedAnswers[String(answer.question)] =
            answer.selectedOption ?? null;
        }

        answersRef.current = savedAnswers;
        setAnswers(savedAnswers);

        const remaining = Math.max(
          0,
          Math.ceil(
            (new Date(loadedAttempt.expiresAt).getTime() -
              Date.now()) /
              1000
          )
        );

        setSecondsLeft(remaining);

        if (loadedAttempt.status !== "in_progress" || remaining === 0) {
          finishedRef.current = true;
          onFinished(loadedAttempt);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to start the test."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initializeAttempt();

    return () => {
      cancelled = true;
    };
  }, [test?.id, attemptId, onFinished]);

  const saveAnswers = useCallback(async (answersToSave) => {
    const currentAttempt = attemptRef.current;

    if (
      !currentAttempt ||
      currentAttempt.status !== "in_progress" ||
      finishedRef.current ||
      savingRef.current ||
      submittingRef.current
    ) {
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      const payload = currentAttempt.answers.map((answer) => ({
        questionId: String(answer.question),
        selectedOption:
          answersToSave[String(answer.question)] ?? null,
      }));

      const response = await api.patch(
        `/student-assessments/attempts/${currentAttempt.id}/answers`,
        { answers: payload }
      );

      if (response.data.attempt) {
        attemptRef.current = response.data.attempt;
        setAttempt(response.data.attempt);
      }

      setNotice("Answers saved");
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save answers. Please check your connection."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);

  const submitTest = useCallback(
    async (automatic = false) => {
      const currentAttempt = attemptRef.current;

      if (
        !currentAttempt ||
        currentAttempt.status !== "in_progress" ||
        finishedRef.current ||
        submittingRef.current
      ) {
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setError("");

      try {
        const payload = currentAttempt.answers.map((answer) => ({
          questionId: String(answer.question),
          selectedOption:
            answersRef.current[String(answer.question)] ?? null,
        }));

        const response = await api.post(
          `/student-assessments/attempts/${currentAttempt.id}/submit`,
          { answers: payload }
        );

        finishedRef.current = true;
        attemptRef.current = response.data.attempt;
        setAttempt(response.data.attempt);
        onFinished(response.data.attempt);
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        setError(
          err.response?.data?.message ||
            (automatic
              ? "Automatic submission failed. Please submit manually."
              : "Unable to submit the test. Please try again.")
        );
      }
    },
    [onFinished]
  );

  // Use the server-provided expiry timestamp; don't rely on a
  // countdown value that might drift or reset after a refresh.
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (new Date(attempt.expiresAt).getTime() - Date.now()) /
            1000
        )
      );

      setSecondsLeft(remaining);

      if (remaining === 0) {
        submitTest(true);
      }
    };

    updateCountdown();

    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [attempt?.id, attempt?.expiresAt, attempt?.status, submitTest]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(""), 2500);

    return () => window.clearTimeout(timer);
  }, [notice]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-600">
        <LoaderCircle size={34} className="animate-spin text-indigo-600" />
        <p className="font-medium">Preparing your assessment...</p>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center">
        <AlertCircle size={36} className="mx-auto text-red-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          Could not open the test
        </h2>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
        >
          Back to assessments
        </button>
      </div>
    );
  }

  if (!attempt) return null;

  const questions = attempt.answers;
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(
    (question) =>
      answers[String(question.question)] !== null &&
      answers[String(question.question)] !== undefined
  ).length;

  const isUrgent = secondsLeft <= 60;
  const isFinalized = attempt.status !== "in_progress";

  function chooseOption(optionIndex) {
    if (isFinalized || submitting) return;

    const questionId = String(currentQuestion.question);
    const updatedAnswers = {
      ...answersRef.current,
      [questionId]: optionIndex,
    };

    answersRef.current = updatedAnswers;
    setAnswers(updatedAnswers);
    setNotice("");
    saveAnswers(updatedAnswers);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              TestPilot assessment
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              {test.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {answeredCount} of {questions.length} questions answered
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 self-start rounded-xl px-4 py-3 sm:self-auto ${
            isUrgent
              ? "bg-red-50 text-red-700"
              : "bg-slate-50 text-slate-800"
          }`}
        >
          <Clock3 size={21} />
          <div>
            <p className="text-xs font-medium">Time remaining</p>
            <p className="font-mono text-xl font-bold">
              {formatTime(secondsLeft)}
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-sm font-semibold text-slate-500">
              {currentQuestion.marks} mark
              {currentQuestion.marks === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          <h2 className="mt-7 whitespace-pre-wrap text-lg font-semibold leading-8 text-slate-900 sm:text-xl">
            {currentQuestion.questionText}
          </h2>

          <div className="mt-6 space-y-3">
            {currentQuestion.options.map((option, index) => {
              const selected =
                answers[String(currentQuestion.question)] === index;

              return (
                <button
                  key={index}
                  type="button"
                  disabled={isFinalized || submitting}
                  onClick={() => chooseOption(index)}
                  className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                  } disabled:cursor-not-allowed`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      selected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="flex-1 pt-1 text-sm leading-6 text-slate-800">
                    {option.text}
                  </span>
                  {selected && (
                    <CheckCircle2
                      size={19}
                      className="mt-1 shrink-0 text-indigo-600"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((index) => index - 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((index) => index + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Next question
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || isFinalized}
                onClick={() => {
                  if (
                    window.confirm(
                      `Submit your test? You have answered ${answeredCount} of ${questions.length} questions.`
                    )
                  ) {
                    submitTest(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send size={16} />
                {submitting ? "Submitting..." : "Submit test"}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {saving ? (
              <>
                <LoaderCircle size={14} className="animate-spin" />
                Saving your answer...
              </>
            ) : notice ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-600" />
                {notice}
              </>
            ) : (
              "Your answers are saved to the server when selected."
            )}
          </div>
        </main>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Question navigator</h2>
          <p className="mt-1 text-xs text-slate-500">
            Select a number to jump to a question.
          </p>

          <div className="mt-5 grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const selected =
                answers[String(question.question)] !== null &&
                answers[String(question.question)] !== undefined;
              const current = index === currentIndex;

              return (
                <button
                  key={String(question.question)}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`flex aspect-square items-center justify-center rounded-lg border text-sm font-bold ${
                    current
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : selected
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  aria-label={`Go to question ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <Legend color="bg-indigo-600" label="Current question" />
            <Legend color="bg-emerald-100" label="Answered" />
            <Legend color="bg-white border border-slate-300" label="Not answered" />
          </div>

          <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            Your deadline is enforced by the server. Keep your connection
            active and submit before time expires.
          </div>

          {isFinalized && (
            <button
              type="button"
              onClick={() => onFinished(attempt)}
              className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
            >
              View result
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm ${color}`} />
      {label}
    </div>
  );
}
