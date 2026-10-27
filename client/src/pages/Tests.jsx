
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  ClipboardList,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  LoaderCircle,
  CalendarDays,
  BookOpen,
  Plus,
  X,
  Save,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const EMPTY_FORM = {
  title: "",
  description: "",
  subject: "",
  durationMinutes: 30,
  questionIds: [],
  scheduledAt: "",
};

export default function Tests() {
  const navigate = useNavigate();

  const [tests, setTests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await api.get("/subjects", {
        params: { status: "active" },
      });

      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data.subjects || data.data || [];

      setSubjects(list);
    } catch (err) {
      console.error("Failed to load subjects:", err);
    }
  }, []);

  const fetchTests = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        setError("");

        const params = {};
        if (search.trim()) params.search = search.trim();
        if (subjectFilter) params.subject = subjectFilter;
        if (statusFilter) params.status = statusFilter;

        const response = await api.get("/tests", { params });
        const data = response.data;
        const list = Array.isArray(data)
          ? data
          : data.tests || data.data || [];

        setTests(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to fetch tests:", err);
        setError(
          err.response?.data?.message ||
            "Could not load assessments. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, subjectFilter, statusFilter]
  );

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await api.get("/questions", {
        params: {
          status: "active",
          isActive: true,
          subject: form.subject || undefined,
        },
      });

      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data.questions || data.data || [];

      setQuestions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load questions:", err);
      setCreateError(
        err.response?.data?.message ||
          "Could not load questions. Check your question-bank API."
      );
    }
  }, [form.subject]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchTests(), 250);
    return () => clearTimeout(timeout);
  }, [fetchTests]);

  useEffect(() => {
    if (showCreateModal && form.subject) {
      fetchQuestions();
    } else {
      setQuestions([]);
    }
  }, [showCreateModal, form.subject, fetchQuestions]);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setQuestions([]);
    setCreateError("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setCreateError("");
  };

  const updateForm = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const toggleQuestion = (questionId) => {
    setForm((previous) => {
      const exists = previous.questionIds.includes(questionId);

      return {
        ...previous,
        questionIds: exists
          ? previous.questionIds.filter((id) => id !== questionId)
          : [...previous.questionIds, questionId],
      };
    });
  };

  const handleCreateTest = async (event) => {
    event.preventDefault();
    setCreateError("");

    if (!form.title.trim()) {
      setCreateError("Please enter an assessment title.");
      return;
    }

    if (!form.subject) {
      setCreateError("Please select a subject.");
      return;
    }

    if (!Number.isFinite(Number(form.durationMinutes)) ||
        Number(form.durationMinutes) < 1) {
      setCreateError("Duration must be at least 1 minute.");
      return;
    }

    if (form.questionIds.length === 0) {
      setCreateError("Select at least one question.");
      return;
    }

    const selectedQuestions = questions.filter((question) =>
      form.questionIds.includes(String(question._id))
    );

    const calculatedMarks = selectedQuestions.reduce(
      (total, question) => total + Number(question.marks || 1),
      0
    );

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      subject: form.subject,
      durationMinutes: Number(form.durationMinutes),
      questionIds: form.questionIds,
      questionCount: form.questionIds.length,
      totalMarks: calculatedMarks,
      status: "draft",
      ...(form.scheduledAt
        ? { scheduledAt: new Date(form.scheduledAt).toISOString() }
        : {}),
    };

    try {
      setSaving(true);

      await api.post("/tests", payload);

      setShowCreateModal(false);
      setForm(EMPTY_FORM);

      await fetchTests(true);
    } catch (err) {
      console.error("Failed to create assessment:", err);

      setCreateError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Could not create assessment. Check the backend validation and request format."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (test) => {
    const isPublished = test.status === "published";

    if (test.status === "closed") {
      alert("This assessment is closed.");
      return;
    }

    const confirmed = window.confirm(
      isPublished
        ? `Unpublish "${test.title}"? Existing attempts and results should remain preserved.`
        : `Publish "${test.title}"? Students may be able to access it once published.`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(String(test._id));

      await api.patch(`/tests/${test._id}/status`, {
        status: isPublished ? "draft" : "published",
      });

      await fetchTests(true);
    } catch (err) {
      console.error("Failed to update assessment status:", err);
      alert(
        err.response?.data?.message ||
          `Could not ${isPublished ? "unpublish" : "publish"} this assessment.`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const getQuestionCount = (test) => {
    if (test.questionCount != null) return test.questionCount;

    const bankQuestions = Array.isArray(test.questionIds)
      ? test.questionIds.length
      : Array.isArray(test.questions)
      ? test.questions.length
      : 0;

    const manualQuestions = Array.isArray(test.manualQuestions)
      ? test.manualQuestions.length
      : 0;

    return bankQuestions + manualQuestions;
  };

  const getSubjectName = (test) => {
    if (test.subject && typeof test.subject === "object") {
      return test.subject.name || test.subject.code || "—";
    }

    const subject = subjects.find(
      (item) => String(item._id) === String(test.subject)
    );

    return subject?.name || subject?.code || "—";
  };

  const getAttemptCount = (test) =>
    Number(
      test.uniqueStudentsAttempted ??
        test.studentsAttempted ??
        test.attemptedStudents ??
        0
    );

  const getQuestionText = (question) =>
    question.questionText ||
    question.text ||
    question.title ||
    "Untitled question";

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const statusClasses = {
    published: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    draft: "bg-slate-100 text-slate-600 ring-slate-500/20",
    closed: "bg-amber-50 text-amber-700 ring-amber-600/20",
  };

  const publishedCount = tests.filter(
    (test) => test.status === "published"
  ).length;

  const draftCount = tests.filter(
    (test) => test.status === "draft"
  ).length;

  const attemptedCount = tests.reduce(
    (total, test) => total + getAttemptCount(test),
    0
  );

  const selectedMarks = questions
    .filter((question) =>
      form.questionIds.includes(String(question._id))
    )
    .reduce((total, question) => total + Number(question.marks || 1), 0);

  return (
    <div className="min-h-full space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            Assessment management
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            All assessments
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create, manage, publish, and review your assessments.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fetchTests(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          >
            <Plus size={18} />
            Create Test
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total assessments"
          value={tests.length}
          description="Matching current filters"
          icon={ClipboardList}
          iconClass="bg-indigo-50 text-indigo-600"
        />
        <SummaryCard
          title="Published"
          value={publishedCount}
          description="Currently published"
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          title="Drafts"
          value={draftCount}
          description="Not yet published"
          icon={Clock}
          iconClass="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          title="Students attempted"
          value={attemptedCount}
          description="Across listed assessments"
          icon={Users}
          iconClass="bg-sky-50 text-sky-600"
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assessments..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name || subject.code}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">
              Assessment list
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {tests.length} {tests.length === 1 ? "test" : "tests"} found
            </p>
          </div>
          {refreshing && (
            <LoaderCircle
              size={18}
              className="animate-spin text-indigo-600"
            />
          )}
        </div>

        {error && (
          <div className="m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Could not load assessments</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => fetchTests(true)}
                className="mt-2 font-semibold underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {loading && !error ? (
          <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-slate-500">
            <LoaderCircle
              size={20}
              className="animate-spin text-indigo-600"
            />
            Loading assessments...
          </div>
        ) : !error && tests.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <ClipboardList size={30} className="text-slate-400" />
            <h3 className="mt-4 font-semibold text-slate-900">
              No assessments found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Change the filters or create your first test.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={17} />
              Create Test
            </button>
          </div>
        ) : !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Assessment</th>
                  <th className="px-5 py-4 font-semibold">Subject</th>
                  <th className="px-5 py-4 font-semibold">Questions</th>
                  <th className="px-5 py-4 font-semibold">Duration</th>
                  <th className="px-5 py-4 font-semibold">Schedule</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">
                    Students attempted
                  </th>
                  <th className="px-5 py-4 font-semibold">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tests.map((test) => {
                  const isPublished = test.status === "published";
                  const isUpdating = updatingId === String(test._id);
                  const attempts = getAttemptCount(test);

                  return (
                    <tr
                      key={test._id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <BookOpen size={19} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {test.title || "Untitled assessment"}
                            </p>
                            <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                              {test.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {getSubjectName(test)}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {getQuestionCount(test)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {test.durationMinutes ?? test.duration ?? "—"}
                        {(test.durationMinutes ?? test.duration) != null
                          ? " min"
                          : ""}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <CalendarDays
                            size={15}
                            className="text-slate-400"
                          />
                          {formatDate(
                            test.scheduledAt ||
                              test.startDate ||
                              test.createdAt
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
                              statusClasses[test.status] ||
                              statusClasses.draft
                            }`}
                          >
                            {test.status || "draft"}
                          </span>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={isPublished}
                            aria-label={`${
                              isPublished ? "Unpublish" : "Publish"
                            } ${test.title || "assessment"}`}
                            title={
                              isPublished
                                ? "Unpublish assessment"
                                : "Publish assessment"
                            }
                            disabled={
                              isUpdating || test.status === "closed"
                            }
                            onClick={() => handleTogglePublish(test)}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                              isPublished
                                ? "bg-emerald-600"
                                : "bg-slate-300"
                            }`}
                          >
                            {isUpdating ? (
                              <LoaderCircle
                                size={15}
                                className="absolute left-1/2 -translate-x-1/2 animate-spin text-white"
                              />
                            ) : (
                              <span
                                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                  isPublished
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-slate-400" />
                          <span className="font-semibold tabular-nums text-slate-800">
                            {attempts}
                          </span>
                          <span className="text-xs text-slate-500">
                            {attempts === 1 ? "student" : "students"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/admin/tests/${test._id}/results`)
                          }
                          className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                        >
                          <Eye size={15} />
                          View Results
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {tests.length} assessments</span>
          <span>New assessments are saved as drafts.</span>
        </div>
      </div>

      {/* Create test modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <div className="my-auto flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Create assessment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set the test details and choose questions from your question bank.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                aria-label="Close create assessment form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreateTest}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                {createError && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Assessment title *
                  </label>
                  <input
                    required
                    maxLength={150}
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    placeholder="e.g. Data Structures Mid-Sem Test"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    placeholder="Add instructions or a short description..."
                    className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Subject *
                    </label>
                    <select
                      required
                      value={form.subject}
                      onChange={(event) => {
                        updateForm("subject", event.target.value);
                        updateForm("questionIds", []);
                        setCreateError("");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="">Select subject</option>
                      {subjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                          {subject.name || subject.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Duration (minutes) *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="600"
                      value={form.durationMinutes}
                      onChange={(event) =>
                        updateForm("durationMinutes", event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Scheduled date and time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(event) =>
                      updateForm("scheduledAt", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    The assessment will be created as a draft regardless of this date.
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Select questions *
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Choose questions for the selected subject.
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-indigo-700">
                      {form.questionIds.length} selected · {selectedMarks} marks
                    </div>
                  </div>

                  {!form.subject ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      Select a subject first to load its questions.
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      No questions returned. Add active questions to this subject in the question bank.
                    </div>
                  ) : (
                    <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                      {questions.map((question) => {
                        const id = String(question._id);
                        const selected = form.questionIds.includes(id);

                        return (
                          <label
                            key={id}
                            className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                              selected ? "bg-indigo-50/60" : "bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleQuestion(id)}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-slate-800">
                                {getQuestionText(question)}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>
                                  {Number(question.marks || 1)} marks
                                </span>
                                {question.difficulty && (
                                  <span className="capitalize">
                                    {question.difficulty}
                                  </span>
                                )}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-500">
                  Assessment will be saved as a draft.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}
                    {saving ? "Creating..." : "Create Test"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}
