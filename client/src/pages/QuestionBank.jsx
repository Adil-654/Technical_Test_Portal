
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  RefreshCw,
  X,
  BookOpen,
  CircleHelp,
  CheckCircle2,
  XCircle,
  LoaderCircle,
  AlertCircle,
  Filter,
  Layers3,
} from "lucide-react";
import api from "../services/api";

const emptyForm = {
  subject: "",
  questionText: "",
  options: ["", "", "", ""],
  correctOption: 0,
  explanation: "",
  difficulty: "medium",
  marks: 1,
};

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadSubjects = useCallback(async () => {
    try {
      const response = await api.get("/subjects", {
        params: { status: "active" },
      });
      setSubjects(response.data.subjects ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load subjects."));
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/questions", {
        params: {
          search,
          subject: subjectFilter,
          difficulty: difficultyFilter,
          status: statusFilter,
        },
      });

      setQuestions(response.data.questions ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load questions."));
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, difficultyFilter, statusFilter]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  function openCreateModal() {
    setEditingQuestion(null);
    setForm({
      ...emptyForm,
      subject: subjects[0]?._id ?? "",
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  async function openEditModal(question) {
    setEditingQuestion(question);
    setError("");
    setNotice("");

    try {
      const response = await api.get("/questions", {
        params: { search: "", subject: "", difficulty: "all", status: "all" },
      });

      const fullQuestion = (response.data.questions ?? []).find(
        (item) => item._id === question._id
      );

      if (!fullQuestion) {
        setError(
          "Question details could not be loaded. Please refresh and try again."
        );
        setEditingQuestion(null);
        return;
      }

      // The list endpoint intentionally omits the correct answer and explanation.
      // Load these fields through a dedicated admin detail endpoint when available.
      setForm({
        subject: fullQuestion.subject?._id ?? "",
        questionText: fullQuestion.questionText ?? "",
        options: (fullQuestion.options ?? []).map((option) => option.text),
        correctOption: 0,
        explanation: "",
        difficulty: fullQuestion.difficulty ?? "medium",
        marks: fullQuestion.marks ?? 1,
      });

      setError(
        "The list API hides the correct answer and explanation. Add a protected GET /api/questions/:id endpoint before editing existing answers. You can still edit the visible fields once that endpoint is added."
      );
      setModalOpen(true);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load question details."));
      setEditingQuestion(null);
    }
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleOptionChange(index, value) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      ),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      options: form.options.map((text) => ({ text: text.trim() })),
      correctOption: Number(form.correctOption),
      marks: Number(form.marks),
    };

    try {
      if (editingQuestion) {
        await api.patch(`/questions/${editingQuestion._id}`, payload);
        setNotice("Question updated successfully.");
      } else {
        await api.post("/questions", payload);
        setNotice("Question created successfully.");
      }

      setModalOpen(false);
      setEditingQuestion(null);
      setForm(emptyForm);
      await loadQuestions();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save the question."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(question) {
    const action = question.isActive ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} this question?`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await api.patch(`/questions/${question._id}`, {
        isActive: !question.isActive,
      });
      setNotice(`Question ${action}d successfully.`);
      await loadQuestions();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update question status."));
    }
  }

  const activeCount = questions.filter((question) => question.isActive).length;
  const totalMarks = questions.reduce(
    (total, question) => total + (question.marks || 0),
    0
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
            <Layers3 size={16} />
            Assessment management
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Question Bank
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Build and organize MCQs for your technical assessments.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={subjects.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={18} />
          Add question
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            type="button"
            className="ml-auto"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            className="ml-auto"
            onClick={() => {
              loadSubjects();
              loadQuestions();
            }}
            aria-label="Retry"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {subjects.length === 0 && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Create and activate at least one subject before adding questions.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Questions shown"
          value={questions.length}
          icon={<CircleHelp size={20} />}
        />
        <SummaryCard
          title="Active questions"
          value={activeCount}
          icon={<CheckCircle2 size={20} />}
        />
        <SummaryCard
          title="Marks shown"
          value={totalMarks}
          icon={<BookOpen size={20} />}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-900">All questions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter by subject, difficulty, or status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadQuestions}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search questions..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400"
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={(event) => setDifficultyFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400"
          >
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Question</th>
                <th className="px-5 py-4 font-semibold">Subject</th>
                <th className="px-5 py-4 font-semibold">Difficulty</th>
                <th className="px-5 py-4 font-semibold">Marks</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <LoaderCircle
                      className="mx-auto animate-spin text-indigo-600"
                      size={28}
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading questions...
                    </p>
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <CircleHelp
                      className="mx-auto text-slate-300"
                      size={34}
                    />
                    <p className="mt-3 font-medium text-slate-700">
                      No questions found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Change your filters or add your first MCQ.
                    </p>
                  </td>
                </tr>
              ) : (
                questions.map((question) => (
                  <tr key={question._id} className="transition hover:bg-slate-50/70">
                    <td className="max-w-sm px-5 py-4">
                      <p className="line-clamp-2 font-medium leading-6 text-slate-800">
                        {question.questionText}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {question.options?.length ?? 0} options
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">
                        {question.subject?.name ?? "Unknown subject"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {question.subject?.code ?? "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <DifficultyBadge difficulty={question.difficulty} />
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {question.marks}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                          question.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            question.isActive
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          }`}
                        />
                        {question.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(question)}
                          title="Edit question"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStatus(question)}
                          title={question.isActive ? "Deactivate question" : "Activate question"}
                          className={`rounded-lg border p-2 transition ${
                            question.isActive
                              ? "border-red-100 text-red-600 hover:bg-red-50"
                              : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {question.isActive ? (
                            <XCircle size={16} />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          Showing {questions.length} question{questions.length === 1 ? "" : "s"}
        </div>
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-modal-title"
            className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2
                  id="question-modal-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingQuestion ? "Edit question" : "Create an MCQ"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add the question, four options, and answer details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="question-subject"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Subject *
                </label>
                <select
                  id="question-subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="question-text"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Question text *
                </label>
                <textarea
                  id="question-text"
                  name="questionText"
                  value={form.questionText}
                  onChange={handleFormChange}
                  required
                  maxLength={5000}
                  rows={3}
                  placeholder="Enter your MCQ question..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Answer options *
                  </label>
                  <span className="text-xs text-slate-400">
                    Select the correct answer
                  </span>
                </div>

                <div className="space-y-3">
                  {form.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            correctOption: index,
                          }))
                        }
                        aria-label={`Mark option ${index + 1} as correct`}
                        aria-pressed={Number(form.correctOption) === index}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition ${
                          Number(form.correctOption) === index
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-200 text-slate-500 hover:border-indigo-300"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </button>

                      <input
                        value={option}
                        onChange={(event) =>
                          handleOptionChange(index, event.target.value)
                        }
                        required
                        maxLength={1000}
                        aria-label={`Option ${String.fromCharCode(65 + index)}`}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="question-explanation"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Answer explanation
                </label>
                <textarea
                  id="question-explanation"
                  name="explanation"
                  value={form.explanation}
                  onChange={handleFormChange}
                  maxLength={3000}
                  rows={2}
                  placeholder="Explain why the selected option is correct..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="question-difficulty"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Difficulty *
                  </label>
                  <select
                    id="question-difficulty"
                    name="difficulty"
                    value={form.difficulty}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="question-marks"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Marks *
                  </label>
                  <input
                    id="question-marks"
                    type="number"
                    name="marks"
                    value={form.marks}
                    onChange={handleFormChange}
                    min="1"
                    max="100"
                    step="1"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!saving) setModalOpen(false);
                  }}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || subjects.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={17} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingQuestion
                      ? "Save changes"
                      : "Create question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function DifficultyBadge({ difficulty }) {
  const styles = {
    easy: "bg-emerald-50 text-emerald-700",
    medium: "bg-amber-50 text-amber-700",
    hard: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ${
        styles[difficulty] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {difficulty?.charAt(0).toUpperCase() + difficulty?.slice(1)}
    </span>
  );
}
