
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Expand,
  Flag,
  Loader2,
  Lock,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import api from "../services/api";

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;

  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getQuestionId(question) {
  return String(question?.question?._id || question?.question || "");
}

export default function StudentExam() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [remaining, setRemaining] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("All changes saved");
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [permissionState, setPermissionState] = useState("pending");
  const [cameraError, setCameraError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState("");
  const [finished, setFinished] = useState(false);

  const cameraStreamRef = useRef(null);
  const saveTimerRef = useRef(null);
  const answersRef = useRef({});
  const submittingRef = useRef(false);
  const lastViolationRef = useRef(0);
  const expiryRef = useRef(false);

  const questions = attempt?.answers || [];
  const currentQuestion = questions[currentIndex];

  const currentQuestionId = currentQuestion
    ? getQuestionId(currentQuestion)
    : "";

  const questionTitle =
    attempt?.test?.title || attempt?.test?.name || "Assessment";

  const answeredCount = useMemo(
    () =>
      Object.values(answers).filter(
        (value) => value !== null && value !== undefined
      ).length,
    [answers]
  );

  const unansweredCount = questions.length - answeredCount;

  const payloadAnswers = useCallback(
    (source = answersRef.current) =>
      questions.map((question) => ({
        questionId: getQuestionId(question),
        selectedOption: source[getQuestionId(question)] ?? null,
      })),
    [questions]
  );

  // Stop camera and release fullscreen.
  const releaseExamMode = useCallback(async () => {
    setMonitoring(false);

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      cameraStreamRef.current = null;
    }

    setPermissionState("pending");

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Could not exit fullscreen:", err);
    }

    setFullscreen(false);
  }, []);

  const loadAttempt = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/student-assessments/attempts/${attemptId}`
      );

      const data = response.data?.attempt;

      if (!data) {
        throw new Error("Attempt data was not returned by the server.");
      }

      setAttempt(data);

      const restored = {};

      (data.answers || []).forEach((answer) => {
        const id = getQuestionId(answer);

        if (id) {
          restored[id] = answer.selectedOption ?? null;
        }
      });

      answersRef.current = restored;
      setAnswers(restored);

      const expires = new Date(data.expiresAt).getTime();

      setRemaining(
        Number.isFinite(expires)
          ? Math.max(0, Math.ceil((expires - Date.now()) / 1000))
          : 0
      );

      if (data.status !== "in_progress") {
        setFinished(true);
        await releaseExamMode();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load this assessment."
      );
    } finally {
      setLoading(false);
    }
  }, [attemptId, releaseExamMode]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  // Save answers to the server.
  const saveAnswers = useCallback(
    async (source = answersRef.current) => {
      if (
        !attemptId ||
        !questions.length ||
        submittingRef.current ||
        finished
      ) {
        return;
      }

      setSaving(true);
      setSaveMessage("Saving answers...");

      try {
        await api.patch(
          `/student-assessments/attempts/${attemptId}/answers`,
          {
            answers: payloadAnswers(source),
          }
        );

        setSaveMessage("All changes saved");
      } catch (err) {
        setSaveMessage(
          err.response?.data?.message || "Save failed. Please retry."
        );
      } finally {
        setSaving(false);
      }
    },
    [attemptId, questions.length, payloadAnswers, finished]
  );

  // Submit the assessment.
  const submitAttempt = useCallback(
    async (automatic = false) => {
      if (submittingRef.current || !attemptId) return;

      submittingRef.current = true;
      setSubmitting(true);
      setError("");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      try {
        const response = await api.post(
          `/student-assessments/attempts/${attemptId}/submit`,
          {
            answers: payloadAnswers(),
          }
        );

        const finalAttempt = response.data?.attempt;

        if (finalAttempt) {
          setAttempt(finalAttempt);
        }

        setFinished(true);

        setWarning(
          automatic
            ? "Time expired. Your assessment has been submitted automatically."
            : "Your assessment has been submitted successfully."
        );

        // IMPORTANT: Exit fullscreen and stop camera after successful submission.
        await releaseExamMode();

      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);

        setError(
          err.response?.data?.message ||
            "Submission failed. Please try again."
        );
      }
    },
    [attemptId, payloadAnswers, releaseExamMode]
  );

  // Countdown timer uses the server-provided expiry time.
  useEffect(() => {
    if (!attempt?.expiresAt || finished) return;

    const updateTimer = () => {
      const expiry = new Date(attempt.expiresAt).getTime();

      const seconds = Math.max(
        0,
        Math.ceil((expiry - Date.now()) / 1000)
      );

      setRemaining(seconds);

      if (seconds <= 0 && !expiryRef.current) {
        expiryRef.current = true;
        submitAttempt(true);
      }
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [attempt?.expiresAt, finished, submitAttempt]);

  // Autosave after answer changes.
  useEffect(() => {
    if (!attempt || finished || submitting) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveAnswers();
    }, 700);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [answers, attempt?._id, finished, submitting, saveAnswers]);

  function selectOption(optionIndex) {
    if (!currentQuestionId || finished || submitting) return;

    const updated = {
      ...answersRef.current,
      [currentQuestionId]: optionIndex,
    };

    answersRef.current = updated;
    setAnswers(updated);
    setSaveMessage("Answer changed");
  }

  function clearAnswer() {
    if (!currentQuestionId || finished || submitting) return;

    const updated = {
      ...answersRef.current,
      [currentQuestionId]: null,
    };

    answersRef.current = updated;
    setAnswers(updated);
    setSaveMessage("Answer changed");
  }

  function toggleMark() {
    if (!currentQuestionId) return;

    setMarked((previous) => ({
      ...previous,
      [currentQuestionId]: !previous[currentQuestionId],
    }));
  }

  // Request fullscreen and camera permission after student interaction.
  async function enterExamMode() {
    setCameraError("");
    setWarning("");

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      setFullscreen(Boolean(document.fullscreenElement));
    } catch {
      setFullscreen(false);

      setWarning(
        "Fullscreen could not be enabled. Please allow fullscreen in your browser."
      );
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      cameraStreamRef.current = stream;
      setPermissionState("granted");
    } catch {
      setPermissionState("denied");

      setCameraError(
        "Camera permission was not granted. Allow camera access in browser settings."
      );
    }

    setMonitoring(true);
  }

  const registerViolation = useCallback((message) => {
    const now = Date.now();

    if (now - lastViolationRef.current < 1500) return;

    lastViolationRef.current = now;

    setViolations((count) => count + 1);
    setWarning(message);
  }, []);

  // Detect tab switching, window focus loss and fullscreen exit.
  useEffect(() => {
    if (!monitoring || finished) return;

    const handleVisibility = () => {
      if (document.hidden) {
        registerViolation(
          "Warning: You switched tabs or minimized the exam window. Please return to the assessment."
        );
      }
    };

    const handleFullscreen = () => {
      const isFullscreen = Boolean(document.fullscreenElement);

      setFullscreen(isFullscreen);

      if (!isFullscreen && !finished) {
        registerViolation(
          "Warning: Fullscreen mode was exited. Return to fullscreen."
        );
      }
    };

    const handleBlur = () => {
      registerViolation(
        "Warning: The exam window lost focus. Please stay on the assessment."
      );
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreen);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      window.removeEventListener("blur", handleBlur);
    };
  }, [monitoring, finished, registerViolation]);

  // Cleanup when leaving the exam page.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });

        cameraStreamRef.current = null;
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  async function handleFinish() {
    await submitAttempt(false);
  }

  // Loading screen.
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            className="mx-auto animate-spin text-indigo-600"
            size={36}
          />
          <p className="mt-3 font-semibold text-slate-700">
            Loading your assessment...
          </p>
        </div>
      </div>
    );
  }

  // Error screen.
  if (error && !attempt) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center">
        <AlertTriangle className="mx-auto text-red-500" size={40} />

        <h2 className="mt-4 text-xl font-bold text-slate-900">
          Unable to open assessment
        </h2>

        <p className="mt-2 text-sm text-slate-600">{error}</p>

        <button
          onClick={loadAttempt}
          className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  // Completed screen.
  if (finished || attempt?.status !== "in_progress") {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto text-emerald-600" size={54} />

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Assessment completed
        </h1>

        <p className="mt-3 text-slate-600">
          {warning || "Your attempt has been finalized."}
        </p>

        {attempt?.score != null && (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-5">
            <p className="text-sm text-emerald-700">Your score</p>

            <p className="mt-1 text-3xl font-bold text-emerald-800">
              {attempt.score} / {attempt.totalMarks}
            </p>

            <p className="mt-1 text-sm text-emerald-700">
              {attempt.percentage ?? 0}%
            </p>
          </div>
        )}

        <button
          onClick={() =>
            navigate("/student/results", { replace: true })
          }
          className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          View my results
        </button>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center">
        <p className="font-semibold text-slate-800">
          No questions were found in this attempt.
        </p>

        <button
          onClick={() => navigate("/student/assessments")}
          className="mt-4 text-indigo-700 underline"
        >
          Back to assessments
        </button>
      </div>
    );
  }

  // Pre-exam instructions.
  if (!monitoring) {
    return (
      <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
          <Lock size={32} />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Ready to begin?
        </h1>

        <p className="mt-2 text-slate-600">{questionTitle}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <Clock3 className="text-indigo-600" size={22} />

            <p className="mt-2 text-sm text-slate-500">
              Time remaining
            </p>

            <p className="text-xl font-bold text-slate-900">
              {formatTime(remaining)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <Camera className="text-indigo-600" size={22} />

            <p className="mt-2 text-sm text-slate-500">
              Camera
            </p>

            <p className="text-sm font-bold text-slate-900">
              Permission will be requested
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-start gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            Do not switch tabs or exit fullscreen during the assessment.
          </p>

          <p>
            Your answers are saved to the server. Refreshing the page will not
            reset your timer.
          </p>

          <p>
            This website can detect some tab changes, but cannot disable
            browser extensions or completely prevent switching applications.
          </p>
        </div>

        {cameraError && (
          <p className="mt-4 text-sm text-red-600">{cameraError}</p>
        )}

        <button
          onClick={enterExamMode}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-bold text-white hover:bg-indigo-700"
        >
          <Expand size={18} />
          Enter fullscreen and begin
        </button>
      </div>
    );
  }

  // Active exam screen.
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            TestPilot · Live Assessment
          </p>

          <h1 className="mt-1 text-xl font-bold text-slate-900">
            {questionTitle}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-lg font-bold ${
              remaining <= 300
                ? "bg-red-50 text-red-700"
                : "bg-indigo-50 text-indigo-700"
            }`}
          >
            <Clock3 size={19} />
            {formatTime(remaining)}
          </div>

          <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
            {saving ? "Saving..." : saveMessage}
          </div>
        </div>
      </header>

      {warning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldAlert size={20} className="shrink-0" />

          <div className="flex-1">{warning}</div>

          <button
            onClick={() => setWarning("")}
            aria-label="Dismiss warning"
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}

          <button
            onClick={() => saveAnswers()}
            className="ml-3 font-bold underline"
          >
            Retry save
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
              Question {currentIndex + 1}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMark}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                  marked[currentQuestionId]
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Flag size={15} />
                {marked[currentQuestionId]
                  ? "Marked"
                  : "Mark for review"}
              </button>

              <span className="text-xs font-semibold text-slate-500">
                {currentQuestion?.marks ?? 1} marks
              </span>
            </div>
          </div>

          <h2 className="mt-7 whitespace-pre-wrap text-lg font-semibold leading-8 text-slate-900">
            {currentQuestion?.questionText}
          </h2>

          <div className="mt-6 space-y-3">
            {(currentQuestion?.options || []).map((option, index) => {
              const selected = answers[currentQuestionId] === index;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectOption(index)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                  }`}
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

                  <span className="pt-1 text-sm leading-6 text-slate-800">
                    {option.text}
                  </span>

                  {selected && (
                    <CheckCircle2
                      className="ml-auto shrink-0 text-indigo-600"
                      size={19}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={clearAnswer}
              disabled={answers[currentQuestionId] == null}
              className="text-sm font-semibold text-slate-500 hover:text-red-600 disabled:opacity-40"
            >
              Clear response
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((index) => Math.max(0, index - 1))
                }
                disabled={currentIndex === 0}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft size={17} />
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((index) =>
                    Math.min(questions.length - 1, index + 1)
                  )
                }
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                Next
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">
              Question palette
            </h3>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const id = getQuestionId(question);

                const isAnswered =
                  answers[id] !== null && answers[id] !== undefined;

                const isMarked = Boolean(marked[id]);
                const active = index === currentIndex;

                return (
                  <button
                    key={id || index}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`relative h-10 rounded-lg border text-sm font-bold ${
                      active
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : isMarked
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : isAnswered
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-2 text-xs text-slate-600">
              <PaletteLegend color="bg-emerald-500" label="Answered" />
              <PaletteLegend color="bg-slate-300" label="Not answered" />
              <PaletteLegend color="bg-amber-400" label="Marked for review" />
              <PaletteLegend color="bg-indigo-600" label="Current question" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs text-slate-500">Answered</p>
                <p className="text-xl font-bold text-emerald-700">
                  {answeredCount}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Unanswered</p>
                <p className="text-xl font-bold text-slate-700">
                  {unansweredCount}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Camera size={18} />
              Camera permission
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {permissionState === "granted"
                ? "Camera permission granted for this session."
                : "Camera permission not granted."}
            </p>

            {cameraError && (
              <p className="mt-2 text-xs text-red-600">{cameraError}</p>
            )}

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span
                className={`h-2 w-2 rounded-full ${
                  permissionState === "granted"
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />

              {permissionState === "granted"
                ? "Permission active"
                : "Permission pending"}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">
              Exam monitoring
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Tab and fullscreen changes are detected where the browser
              permits. These events are not yet stored as server-side
              proctoring records.
            </p>

            <p className="mt-3 text-sm font-bold text-amber-700">
              Detected warnings: {violations}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Fullscreen: {fullscreen ? "Active" : "Exited"}
            </p>
          </section>

          <button
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send size={18} />
            Submit assessment
          </button>
        </aside>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              Submit your assessment?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              You have answered {answeredCount} of {questions.length} questions.
              {unansweredCount > 0
                ? ` ${unansweredCount} questions are still unanswered.`
                : " All questions have responses."}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700"
              >
                Continue exam
              </button>

              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  handleFinish();
                }}
                disabled={submitting}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaletteLegend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
    </div>
  );
}
