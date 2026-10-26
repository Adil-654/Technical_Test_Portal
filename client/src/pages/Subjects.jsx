
import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Pencil,
  RefreshCw,
  X,
  CheckCircle2,
  XCircle,
  LoaderCircle,
  AlertCircle,
  Layers3,
} from "lucide-react";
import api from "../services/api";

const emptyForm = {
  name: "",
  code: "",
  description: "",
};

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/subjects", {
        params: { search, status },
      });

      setSubjects(response.data.subjects ?? []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load subjects. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  function openCreateModal() {
    setEditingSubject(null);
    setForm(emptyForm);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(subject) {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      code: subject.code,
      description: subject.description || "",
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingSubject(null);
    setForm(emptyForm);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (editingSubject) {
        await api.patch(`/subjects/${editingSubject._id}`, {
          ...form,
          code: form.code.trim().toUpperCase(),
        });
        setNotice("Subject updated successfully.");
      } else {
        await api.post("/subjects", {
          ...form,
          code: form.code.trim().toUpperCase(),
        });
        setNotice("Subject created successfully.");
      }

      setModalOpen(false);
      setEditingSubject(null);
      setForm(emptyForm);
      await loadSubjects();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save subject. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(subject) {
    const action = subject.isActive ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${subject.name}"?`
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await api.patch(`/subjects/${subject._id}`, {
        isActive: !subject.isActive,
      });
      setNotice(`Subject ${action}d successfully.`);
      await loadSubjects();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Unable to ${action} subject. Please try again.`
      );
    }
  }

  const activeCount = subjects.filter((subject) => subject.isActive).length;
  const inactiveCount = subjects.length - activeCount;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
            <Layers3 size={16} />
            Academic management
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Subjects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage the subjects used in your tests and examinations.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add subject
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} />
          {notice}
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
            onClick={loadSubjects}
            aria-label="Retry loading subjects"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Subjects shown"
          value={subjects.length}
          icon={<BookOpen size={20} />}
        />
        <SummaryCard
          title="Active subjects"
          value={activeCount}
          icon={<CheckCircle2 size={20} />}
        />
        <SummaryCard
          title="Inactive subjects"
          value={inactiveCount}
          icon={<XCircle size={20} />}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-900">All subjects</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search by subject name or code.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSubjects}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:p-5">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subjects..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Subject</th>
                <th className="px-5 py-4 font-semibold">Code</th>
                <th className="px-5 py-4 font-semibold">Created</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <LoaderCircle className="mx-auto animate-spin text-indigo-600" size={28} />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading subjects...
                    </p>
                  </td>
                </tr>
              ) : subjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <BookOpen className="mx-auto text-slate-300" size={34} />
                    <p className="mt-3 font-medium text-slate-700">
                      No subjects found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or add your first subject.
                    </p>
                  </td>
                </tr>
              ) : (
                subjects.map((subject) => (
                  <tr
                    key={subject._id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <BookOpen size={19} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {subject.name}
                          </p>
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {subject.description || "No description added"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-700">
                        {subject.code}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {subject.createdAt
                        ? new Date(subject.createdAt).toLocaleDateString(
                            "en-IN",
                            { day: "2-digit", month: "short", year: "numeric" }
                          )
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                          subject.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            subject.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {subject.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(subject)}
                          title="Edit subject"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(subject)}
                          title={subject.isActive ? "Deactivate subject" : "Activate subject"}
                          className={`rounded-lg border p-2 transition ${
                            subject.isActive
                              ? "border-red-100 text-red-600 hover:bg-red-50"
                              : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {subject.isActive ? (
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
          Showing {subjects.length} subject{subjects.length === 1 ? "" : "s"}
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subject-modal-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 id="subject-modal-title" className="text-lg font-bold text-slate-900">
                  {editingSubject ? "Edit subject" : "Create a subject"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add the academic details below.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="subject-name" className="mb-2 block text-sm font-medium text-slate-700">
                  Subject name *
                </label>
                <input
                  id="subject-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="e.g. Database Management Systems"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <label htmlFor="subject-code" className="mb-2 block text-sm font-medium text-slate-700">
                  Subject code *
                </label>
                <input
                  id="subject-code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  required
                  maxLength={20}
                  pattern="[A-Za-z0-9_-]{2,20}"
                  title="Use 2–20 letters, numbers, hyphens or underscores."
                  placeholder="e.g. DBMS101"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Letters, numbers, hyphens and underscores are supported.
                </p>
              </div>

              <div>
                <label htmlFor="subject-description" className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="subject-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={500}
                  rows={3}
                  placeholder="Briefly describe the subject..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving && <LoaderCircle size={17} className="animate-spin" />}
                  {saving
                    ? "Saving..."
                    : editingSubject
                      ? "Save changes"
                      : "Create subject"}
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
