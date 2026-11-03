import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  lazy,
  Suspense,
} from "react";
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
  X,
  Check,
  XCircle,
  MinusCircle,
  BarChart3,
  Eye,
  Lightbulb,
  Loader2,
} from "lucide-react";
import api from "../services/api";
const Assessment3DCharts = lazy(
  () => import("../components/Assessment3DCharts")
);

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

function getAssessmentName(result) {
  const name =
    result.test?.title ||
    result.test?.name ||
    result.testTitle ||
    result.title;

  return typeof name === "string" && name.trim()
    ? name.trim()
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

function getAttemptId(result) {
  return result._id || result.id || result.attemptId;
}

function getReviewData(response) {
  const data = response?.data;

  if (data?.review) return data.review;
  if (data?.data?.review) return data.data.review;
  if (data?.data) return data.data;

  return data || null;
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

  // Assessment review modal state
  const [selectedResult, setSelectedResult] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

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

  // Close the modal with Escape and prevent background scrolling.
  useEffect(() => {
    if (!selectedResult) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeReview();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedResult]);

  const closeReview = () => {
    setSelectedResult(null);
    setReview(null);
    setReviewError("");
    setReviewLoading(false);
  };

  const openReview = async (result) => {
    const attemptId = getAttemptId(result);

    if (!attemptId) {
      setSelectedResult(result);
      setReview(null);
      setReviewError("Attempt ID is missing. Unable to load the answer sheet.");
      return;
    }

    setSelectedResult(result);
    setReview(null);
    setReviewError("");
    setReviewLoading(true);

    try {
      const response = await api.get(
        `/student-assessments/attempts/${attemptId}/review`
      );

      setReview(getReviewData(response));
    } catch (err) {
      setReviewError(
        getErrorMessage(err, "Unable to load the assessment review.")
      );
    } finally {
      setReviewLoading(false);
    }
  };

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

  const namedCompletedResults = useMemo(
    () => completedResults.filter((result) => getAssessmentName(result)),
    [completedResults]
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
                  title="Assessment History"
                  description="Select an assessment to view your answer sheet and topic-wise performance."
                />
              </div>

              {namedCompletedResults.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-semibold text-slate-600">
                    Assessment names are unavailable.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Please try refreshing. If the issue continues, the results
                    API needs to return the associated test title.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">Assessment</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">Marks</th>
                        <th className="px-6 py-4 text-center">Percentage</th>
                        <th className="px-6 py-4 text-right">Review</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {[...namedCompletedResults]
                        .sort(
                          (a, b) =>
                            new Date(
                              b.submittedAt || b.completedAt || 0
                            ).getTime() -
                            new Date(
                              a.submittedAt || a.completedAt || 0
                            ).getTime()
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
                          const testName = getAssessmentName(result);
                          const status = String(result.status || "Submitted");

                          return (
                            <tr
                              key={getAttemptId(result) || index}
                              onClick={() => openReview(result)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  openReview(result);
                                }
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={`View review for ${testName}`}
                              className="cursor-pointer transition hover:bg-orange-50/50 focus:bg-orange-50/50 focus:outline-none"
                            >
                              <td className="px-6 py-5">
                                <p className="font-bold text-[#172554]">
                                  {testName}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {formatDate(
                                    result.submittedAt || result.completedAt
                                  )}
                                </p>
                              </td>

                              <td className="px-6 py-5">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                                    status.toLowerCase() === "expired"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                >
                                  {status}
                                </span>
                              </td>

                              <td className="px-6 py-5 text-center">
                                <span className="font-bold text-slate-700">
                                  {Number.isFinite(score) &&
                                  Number.isFinite(total) &&
                                  total > 0
                                    ? `${score} / ${total}`
                                    : "—"}
                                </span>
                              </td>

                              <td className="px-6 py-5 text-center">
                                <span className="font-extrabold text-orange-600">
                                  {percentage !== null
                                    ? `${Math.round(percentage)}%`
                                    : "—"}
                                </span>
                              </td>

                              <td className="px-6 py-5 text-right">
                                <span className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 transition group-hover:bg-orange-100">
                                  <Eye size={15} />
                                  View details
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
                <Eye size={13} className="mr-1 inline" />
                Click any assessment row to view its detailed performance.
              </div>
            </section>
          </>
        )}

        {selectedResult && (
          <ReviewModal
            result={selectedResult}
            review={review}
            loading={reviewLoading}
            error={reviewError}
            onClose={closeReview}
            onRetry={() => openReview(selectedResult)}
          />
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
            {[...namedCompletedResults]
              .sort(
                (a, b) =>
                  new Date(b.submittedAt || b.completedAt || 0).getTime() -
                  new Date(a.submittedAt || a.completedAt || 0).getTime()
              )
              .slice(0, 3)
              .map((result, index) => {
                const percentage = getPercentage(result);

                return (
                  <button
                    type="button"
                    key={getAttemptId(result) || index}
                    onClick={() => openReview(result)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-orange-50/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                        <FileCheck2 size={19} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#172554]">
                          {getAssessmentName(result)}
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
                  </button>
                );
              })}
          </div>
        </section>
      )}

      {selectedResult && (
        <ReviewModal
          result={selectedResult}
          review={review}
          loading={reviewLoading}
          error={reviewError}
          onClose={closeReview}
          onRetry={() => openReview(selectedResult)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Assessment review modal                                                    */
/* -------------------------------------------------------------------------- */

function ReviewModal({ result, review, loading, error, onClose, onRetry }) {
  const summary = review?.summary || {};
  const answers = Array.isArray(review?.answers) ? review.answers : [];
  const topics = Array.isArray(review?.topics) ? review.topics : [];

  const totalQuestions = Number(
    summary.totalQuestions ?? answers.length
  );

  const correct = Number(summary.correct ?? 0);
  const incorrect = Number(summary.incorrect ?? 0);
  const unanswered = Number(summary.unanswered ?? 0);

  const assessmentName =
    review?.testTitle || getAssessmentName(result) || "Assessment review";

  const score = review?.score ?? result.score ?? result.marksObtained;
  const totalMarks =
    review?.totalMarks ?? result.totalMarks ?? result.test?.totalMarks;

  const percentage =
    review?.percentage != null
      ? Number(review.percentage)
      : getPercentage(result);

  const questionStats = [
    { label: "Correct", value: correct, color: "#10b981" },
    { label: "Incorrect", value: incorrect, color: "#ef4444" },
    { label: "Unanswered", value: unanswered, color: "#94a3b8" },
  ];

  const questionSegments = buildSegments(questionStats);

  const topicStats = [
    {
      label: "Strong",
      value: topics.filter((topic) => getTopicCategory(topic) === "Strong").length,
      color: "#10b981",
    },
    {
      label: "Average",
      value: topics.filter((topic) => getTopicCategory(topic) === "Average").length,
      color: "#f59e0b",
    },
    {
      label: "Weak",
      value: topics.filter((topic) => getTopicCategory(topic) === "Weak").length,
      color: "#ef4444",
    },
  ];

  const topicSegments = buildSegments(topicStats);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 bg-[#172554] px-5 py-5 text-white sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-300">
              ASSESSMENT REVIEW
            </p>
            <h2
              id="review-modal-title"
              className="mt-1 truncate text-xl font-extrabold sm:text-2xl"
            >
              {assessmentName}
            </h2>
            <p className="mt-1 text-xs text-blue-200">
              {formatDate(
                review?.submittedAt ||
                  result.submittedAt ||
                  result.completedAt
              )}
              {review?.attemptNumber
                ? ` · Attempt ${review.attemptNumber}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="shrink-0 rounded-xl border border-white/20 bg-white/10 p-2.5 text-white transition hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
              <Loader2 size={38} className="animate-spin text-orange-500" />
              <p className="mt-4 font-bold text-[#172554]">
                Loading your assessment review...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Fetching answers and topic-wise performance.
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <AlertCircle size={40} className="text-red-500" />
              <h3 className="mt-4 font-bold text-[#172554]">
                Unable to load review
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
              >
                <RefreshCw size={15} />
                Try again
              </button>
            </div>
          ) : !review ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No review data was returned by the server.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Score summary */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ReviewStat
                  label="Your score"
                  value={
                    score != null && totalMarks != null
                      ? `${score} / ${totalMarks}`
                      : "—"
                  }
                  icon={Award}
                  color="orange"
                />
                <ReviewStat
                  label="Percentage"
                  value={
                    Number.isFinite(percentage)
                      ? `${Math.round(percentage)}%`
                      : "—"
                  }
                  icon={TrendingUp}
                  color="blue"
                />
                <ReviewStat
                  label="Correct answers"
                  value={correct}
                  icon={CheckCircle2}
                  color="green"
                />
                <ReviewStat
                  label="Total questions"
                  value={totalQuestions}
                  icon={FileCheck2}
                  color="purple"
                />
              </div>

              {/* Charts */}
              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard
                  title="Question outcome"
                  description="How you performed across all questions."
                >
                  {totalQuestions > 0 ? (
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                      <DonutChart
                        segments={questionSegments}
                        total={totalQuestions}
                        centerLabel="Questions"
                      />
                      <ChartLegend stats={questionStats} total={totalQuestions} />
                    </div>
                  ) : (
                    <ChartEmpty />
                  )}
                </ChartCard>

                <ChartCard
                  title="Topic performance"
                  description="Distribution of topics by your performance."
                >
                  {topics.length > 0 ? (
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                      <DonutChart
                        segments={topicSegments}
                        total={topics.length}
                        centerLabel="Topics"
                      />
                      <ChartLegend stats={topicStats} total={topics.length} />
                    </div>
                  ) : (
                    <ChartEmpty message="Topic performance is not available yet." />
                  )}
                </ChartCard>
              </div>

              {/* Topic breakdown */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5">
                  <SectionHeading
                    icon={BarChart3}
                    title="Topic-wise performance"
                    description="Review your accuracy and marks for each topic."
                  />
                </div>

                {topics.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No topic information is available for this attempt. Topics
                    will appear here after questions are tagged in the Question
                    Bank and new attempts are created.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {topics.map((topic, index) => (
                      <TopicPerformanceRow
                        key={topic.topic || topic.name || index}
                        topic={topic}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Answer sheet */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 p-5">
                  <SectionHeading
                    icon={FileCheck2}
                    title="Answer sheet"
                    description="Your selected answers, correct answers and explanations."
                  />
                </div>

                {answers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No answer details are available for this attempt.
                  </div>
                ) : (
                  <div className="space-y-4 p-4 sm:p-5">
                    {answers.map((answer, index) => (
                      <AnswerCard
                        key={answer.questionId || answer.question || index}
                        answer={answer}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <span className="text-xs text-slate-400">
            TestPilot · Assessment review
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#172554] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-900"
          >
            Close review
          </button>
        </footer>
      </section>
    </div>
  );
}

function buildSegments(stats) {
  const total = stats.reduce((sum, item) => sum + item.value, 0);

  if (!total) return [];

  let current = 0;

  return stats.map((item) => {
    const start = current;
    current += (item.value / total) * 100;

    return {
      ...item,
      start,
      end: current,
    };
  });
}

function DonutChart({ segments, total, centerLabel }) {
  const gradient = segments.length
    ? `conic-gradient(${segments
        .map(
          (segment) =>
            `${segment.color} ${segment.start}% ${segment.end}%`
        )
        .join(", ")})`
    : "#e2e8f0";

  return (
    <div
      className="relative flex h-44 w-44 shrink-0 items-center justify-center rounded-full"
      style={{ background: gradient }}
      role="img"
      aria-label={`${total} ${centerLabel.toLowerCase()}`}
    >
      <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-inner">
        <span className="text-3xl font-extrabold text-[#172554]">{total}</span>
        <span className="text-xs font-medium text-slate-400">{centerLabel}</span>
      </div>
    </div>
  );
}

function ChartLegend({ stats, total }) {
  return (
    <div className="w-full max-w-xs space-y-3">
      {stats.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
          <span className="text-sm font-bold text-[#172554]">
            {item.value}
            <span className="ml-2 text-xs font-medium text-slate-400">
              ({total ? Math.round((item.value / total) * 100) : 0}%)
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-extrabold text-[#172554]">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-6 flex min-h-[190px] items-center justify-center">
        {children}
      </div>
    </section>
  );
}

function ChartEmpty({ message = "No chart data available." }) {
  return (
    <div className="py-10 text-center text-sm text-slate-400">
      <BarChart3 size={30} className="mx-auto mb-2 text-slate-300" />
      {message}
    </div>
  );
}

function ReviewStat({ label, value, icon: Icon, color }) {
  const styles = {
    orange: "bg-orange-50 text-orange-600",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    purple: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={`rounded-lg p-2 ${styles[color] || styles.blue}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-[#172554]">{value}</p>
    </div>
  );
}

function getTopicCategory(topic) {
  const percentage = Number(topic.percentage ?? 0);

  if (topic.performance) {
    const value = String(topic.performance).toLowerCase();

    if (value === "strong") return "Strong";
    if (value === "average") return "Average";
    if (value === "weak") return "Weak";
  }

  if (percentage >= 70) return "Strong";
  if (percentage >= 40) return "Average";
  return "Weak";
}

function TopicPerformanceRow({ topic }) {
  const name = topic.topic || topic.name || "Uncategorized";
  const percentage = Math.min(
    100,
    Math.max(0, Number(topic.percentage) || 0)
  );

  const category = getTopicCategory(topic);

  const styles = {
    Strong: {
      badge: "bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
    },
    Average: {
      badge: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
    },
    Weak: {
      badge: "bg-red-50 text-red-700",
      bar: "bg-red-500",
    },
  };

  const style = styles[category];

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-[#172554]">{name}</h4>
          <p className="mt-1 text-xs text-slate-500">
            {Number(topic.correct) || 0} correct ·{" "}
            {Number(topic.incorrect) || 0} incorrect ·{" "}
            {Number(topic.unanswered) || 0} unanswered
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold text-[#172554]">
            {Math.round(percentage)}%
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${style.badge}`}
          >
            {category}
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${style.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
        <span>
          Marks: {topic.marksAwarded ?? 0} / {topic.totalMarks ?? 0}
        </span>
        <span>{topic.total ?? 0} question(s)</span>
      </div>
    </div>
  );
}

function AnswerCard({ answer, index }) {
  const options = Array.isArray(answer.options) ? answer.options : [];

  const selectedOption =
    answer.selectedOption === null || answer.selectedOption === undefined
      ? null
      : Number(answer.selectedOption);

  const correctOption =
    answer.correctOption === null || answer.correctOption === undefined
      ? null
      : Number(answer.correctOption);

  const isAttempted =
    answer.isAttempted != null
      ? Boolean(answer.isAttempted)
      : selectedOption !== null;

  const isCorrect =
    answer.isCorrect != null
      ? Boolean(answer.isCorrect)
      : isAttempted &&
        correctOption !== null &&
        selectedOption === correctOption;

  const status = !isAttempted
    ? "Unanswered"
    : isCorrect
      ? "Correct"
      : "Incorrect";

  const statusStyles = {
    Correct: "bg-emerald-50 text-emerald-700",
    Incorrect: "bg-red-50 text-red-700",
    Unanswered: "bg-slate-100 text-slate-600",
  };

  const StatusIcon =
    status === "Correct"
      ? CheckCircle2
      : status === "Incorrect"
        ? XCircle
        : MinusCircle;

  return (
    <article className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Question {answer.questionNumber || index + 1}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {answer.topic && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {answer.topic}
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[status]}`}
          >
            <StatusIcon size={13} />
            {status}
          </span>
        </div>
      </div>

      <h4 className="mt-4 whitespace-pre-wrap text-sm font-bold leading-6 text-[#172554]">
        {answer.questionText || "Question text unavailable"}
      </h4>

      <div className="mt-4 space-y-2">
        {options.map((option, optionIndex) => {
          const optionText =
            typeof option === "string" ? option : option?.text || "";

          const isSelected = selectedOption === optionIndex;
          const isAnswer = correctOption === optionIndex;

          let optionStyle = "border-slate-200 bg-white text-slate-600";

          if (isAnswer) {
            optionStyle = "border-emerald-300 bg-emerald-50 text-emerald-800";
          } else if (isSelected && !isCorrect) {
            optionStyle = "border-red-300 bg-red-50 text-red-800";
          }

          return (
            <div
              key={optionIndex}
              className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${optionStyle}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/80 text-xs font-extrabold">
                {String.fromCharCode(65 + optionIndex)}
              </span>

              <span className="min-w-0 flex-1 pt-0.5">{optionText}</span>

              <span className="flex shrink-0 items-center gap-1 text-xs font-bold">
                {isAnswer && (
                  <>
                    <Check size={15} />
                    Correct answer
                  </>
                )}
                {isSelected && !isAnswer && (
                  <>
                    <X size={14} />
                    Your answer
                  </>
                )}
                {isSelected && isAnswer && (
                  <span className="sr-only">Your answer</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-500">
          Your answer:{" "}
          <strong className="text-slate-700">
            {isAttempted
              ? `Option ${String.fromCharCode(65 + selectedOption)}`
              : "Not answered"}
          </strong>
        </span>

        <span className="font-bold text-[#172554]">
          Marks: {answer.marksAwarded ?? (isCorrect ? answer.marks ?? 0 : 0)} /{" "}
          {answer.marks ?? 0}
        </span>
      </div>

      {answer.explanation && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-800">
            <Lightbulb size={15} />
            Explanation
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {answer.explanation}
          </p>
        </div>
      )}
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Existing dashboard components                                              */
/* -------------------------------------------------------------------------- */

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