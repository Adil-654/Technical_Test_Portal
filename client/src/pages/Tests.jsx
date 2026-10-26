
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FileText,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import api from "../services/api";

const initialForm = {
  title: "",
  description: "",
  subject: "",
  questionIds: [],
  durationMinutes: 30,
  startAt: "",
  endAt: "",
  attemptsAllowed: 1,
};

function formatDate(date) {
  if (!date) return "Not scheduled";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Invalid date";

  return parsed.toLocaleString();
}

function StatusBadge({ status }) {
  const styles = {
    draft: "bg-amber-50 text-amber-700 ring-amber-200",
    published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    closed: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
        styles[status] || styles.draft
      }`}
    >
      {status}
    </span>
  );
}

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/tests", {
        params: {
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          subject: subjectFilter || undefined,
        },
      });

      setTests(response.data.tests || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load tests. Please check your backend."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, subjectFilter]);

  const loadSubjects = useCallback(async () => {
    try {
      const response = await api.get("/subjects", {
        params: { status: "active" },
      });

      setSubjects(
        (response.data.subjects || []).filter(
          (subject) => subject.isActive !== false
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load subjects."
      );
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  useEffect(() => {
    if (!modalOpen || !form.subject) {
      setQuestions([]);
      return;
    }

    let cancelled = false;

    async function loadQuestions() {
      setQuestionsLoading(true);
      setError("");

      try {
        const response = await api.get("/questions", {
          params: {
            subject: form.subject,
            status: "active",
          },
        });

        if (!cancelled) {
          setQuestions(response.data.questions || []);
        }
      } catch (err) {
        if (!cancelled) {
          setQuestions([]);
          setError(
            err.response?.data?.message ||
              "Unable to load questions for this subject."
          );
        }
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [modalOpen, form.subject]);

  function openCreateModal() {
    setForm(initialForm);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setError("");
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "subject" ? { questionIds: [] } : {}),
    }));
  }

  function toggleQuestion(questionId) {
    setForm((current) => {
      const alreadySelected = current.questionIds.includes(questionId);

      return {
        ...current,
        questionIds: alreadySelected
          ? current.questionIds.filter((id) => id !== questionId)
          : [...current.questionIds, questionId],
      };
    });
  }

  const selectedQuestions = questions.filter((question) =>
    form.questionIds.includes(question._id)
  );

  const selectedMarks = selectedQuestions.reduce(
    (total, question) => total + Number(question.marks || 1),
    0
  );

  async function handleCreate(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.title.trim()) {
      setError("Enter a test title.");
      return;
    }

    if (!form.subject) {
      setError("Select a subject.");
      return;
    }

    if (form.questionIds.length === 0) {
      setError("Select at least one question.");
      return;
    }

    if (
      form.startAt &&
      form.endAt &&
      new Date(form.endAt) <= new Date(form.startAt)
    ) {
      setError("The end date must be after the start date.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        durationMinutes: Number(form.durationMinutes),
        attemptsAllowed: Number(form.attemptsAllowed),
        startAt: form.startAt
          ? new Date(form.startAt).toISOString()
          : null,
        endAt: form.endAt
          ? new Date(form.endAt).toISOString()
          : null,
      };

      const response = await api.post("/tests", payload);

      setModalOpen(false);
      setForm(initialForm);
      setNotice(
        response.data.message || "Test created successfully."
      );

      await loadTests();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create the test."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(test, status) {
    const action = status === "published" ? "publish" : "close";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${test.title}"?`
    );

    if (!confirmed) return;

    setUpdatingId(test._id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch(
        `/tests/${test._id}/status`,
        { status }
      );

      setNotice(
        response.data.message ||
          `Test ${action}ed successfully.`
      );

      await loadTests();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Unable to ${action} this test.`
      );
    } finally {
      setUpdatingId("");
    }
  }

  const totalTests = tests.length;
  const draftCount = tests.filter(
    (test) => test.status === "draft"
  ).length;
  const publishedCount = tests.filter(
    (test) => test.status === "published"
  ).length;

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
            <BookOpen size={16} />
            Assessment management
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tests & Exams
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Build technical assessments from your question bank,
            configure timing, and manage publication.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadTests}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={17} />
            Create test
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && !modalOpen && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>{notice}</p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Tests shown
            </p>
            <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <FileText size={20} />
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold text-slate-900">
            {totalTests}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Matching your current filters
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Draft tests
            </p>
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <FilePlus2 size={20} />
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold text-slate-900">
            {draftCount}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Ready for review and publication
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Published tests
            </p>
            <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <CheckCircle2 size={20} />
            </span>
          </div>

          <p className="mt-4 text-3xl font-bold text-slate-900">
            {publishedCount}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Published assessment records
          </p>
        </div>
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tests..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </section>

      {/* Tests table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              All assessments
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage test settings and publication status.
            </p>
          </div>

          <span className="text-xs font-medium text-slate-500">
            {tests.length} result{tests.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle
              size={28}
              className="animate-spin text-indigo-600"
            />
          </div>
        ) : tests.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="rounded-2xl bg-slate-100 p-4 text-slate-500">
              <FileText size={28} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No tests found
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Create your first assessment or change the filters
              to view other tests.
            </p>

            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={16} />
              Create your first test
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4">Assessment</th>
                  <th className="px-5 py-4">Questions</th>
                  <th className="px-5 py-4">Duration</th>
                  <th className="px-5 py-4">Schedule</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {tests.map((test) => (
                  <tr
                    key={test._id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {test.title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {test.subject?.name || "Subject unavailable"}
                        {test.subject?.code
                          ? ` · ${test.subject.code}`
                          : ""}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {test.questionCount ??
                          test.questions?.length ??
                          0}{" "}
                        questions
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {test.totalMarks} marks
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <Clock3 size={15} className="text-slate-400" />
                        {test.durationMinutes} min
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <CalendarClock
                          size={15}
                          className="shrink-0 text-slate-400"
                        />
                        {formatDate(test.startAt)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={test.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        {updatingId === test._id ? (
                          <LoaderCircle
                            size={19}
                            className="animate-spin text-indigo-600"
                          />
                        ) : test.status === "draft" ? (
                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(test, "published")
                            }
                            className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            Publish
                          </button>
                        ) : test.status === "published" ? (
                          <button
                            type="button"
                            onClick={() =>
                              changeStatus(test, "closed")
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                          >
                            Close test
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            No actions
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create test modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                  <FilePlus2 size={17} />
                  New assessment
                </div>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Create test
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configure the assessment and select its questions.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="max-h-[65vh] space-y-6 overflow-y-auto p-5 sm:p-7">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    <AlertCircle
                      size={17}
                      className="mt-0.5 shrink-0"
                    />
                    {error}
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Test title *
                    </span>

                    <input
                      name="title"
                      value={form.title}
                      onChange={updateField}
                      required
                      maxLength={150}
                      placeholder="e.g. DBMS Mid-Semester Test"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Description
                    </span>

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={updateField}
                      rows={2}
                      maxLength={1000}
                      placeholder="Describe the assessment..."
                      className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Subject *
                    </span>

                    <select
                      name="subject"
                      value={form.subject}
                      onChange={updateField}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    >
                      <option value="">Choose a subject</option>

                      {subjects.map((subject) => (
                        <option
                          key={subject._id}
                          value={subject._id}
                        >
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </select>

                    {subjects.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        Create and activate a subject before creating a test.
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Duration (minutes) *
                    </span>

                    <input
                      type="number"
                      name="durationMinutes"
                      value={form.durationMinutes}
                      onChange={updateField}
                      min="1"
                      max="600"
                      required
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Allowed attempts
                    </span>

                    <input
                      type="number"
                      name="attemptsAllowed"
                      value={form.attemptsAllowed}
                      onChange={updateField}
                      min="1"
                      max="10"
                      required
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Start date and time
                    </span>

                    <input
                      type="datetime-local"
                      name="startAt"
                      value={form.startAt}
                      onChange={updateField}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />

                    <span className="mt-1 block text-xs text-slate-400">
                      Leave empty for an unscheduled test.
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      End date and time
                    </span>

                    <input
                      type="datetime-local"
                      name="endAt"
                      value={form.endAt}
                      onChange={updateField}
                      min={form.startAt || undefined}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                    />
                  </label>
                </div>

                {/* Question selection */}
                <section className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="flex flex-col gap-3 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Select questions *
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Only active questions from the selected subject are shown.
                      </p>
                    </div>

                    <div className="shrink-0 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
                      {form.questionIds.length} selected · {selectedMarks} marks
                    </div>
                  </div>

                  {!form.subject ? (
                    <p className="p-6 text-center text-sm text-slate-500">
                      Select a subject to load its questions.
                    </p>
                  ) : questionsLoading ? (
                    <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                      Loading questions...
                    </div>
                  ) : questions.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-500">
                      No active questions found for this subject.
                      Add questions in the Question Bank first.
                    </p>
                  ) : (
                    <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                      {questions.map((question, index) => {
                        const checked = form.questionIds.includes(
                          question._id
                        );

                        return (
                          <label
                            key={question._id}
                            className={`flex cursor-pointer items-start gap-3 p-4 transition ${
                              checked
                                ? "bg-indigo-50/70"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleQuestion(question._id)
                              }
                              className="mt-1 size-4 accent-indigo-600"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium leading-6 text-slate-800">
                                <span className="mr-2 text-xs text-slate-400">
                                  Q{index + 1}.
                                </span>
                                {question.questionText}
                              </span>

                              <span className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                  {question.marks || 1} marks
                                </span>

                                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs capitalize text-slate-600">
                                  {question.difficulty || "medium"}
                                </span>
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    questionsLoading ||
                    !form.subject ||
                    form.questionIds.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Save as draft
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
