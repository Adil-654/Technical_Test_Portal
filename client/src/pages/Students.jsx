
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Plus,
  Users,
  Pencil,
  UserCheck,
  UserX,
  X,
  LoaderCircle,
  RefreshCw,
  Mail,
  Hash,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import api from "../services/api";

const initialForm = {
  name: "",
  email: "",
  studentId: "",
  password: "",
};

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    (error.code === "ECONNABORTED"
      ? "The request timed out. Please try again."
      : "Something went wrong. Please try again.")
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(initialForm);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (status !== "all") params.status = status;

      const response = await api.get("/students", { params });
      setStudents(response.data.students || []);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  function openAddModal() {
    setEditingStudent(null);
    setForm(initialForm);
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(student) {
    setEditingStudent(student);
    setForm({
      name: student.name || "",
      email: student.email || "",
      studentId: student.studentId || "",
      password: "",
    });
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingStudent(null);
    setForm(initialForm);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setPageError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      studentId: form.studentId.trim().toUpperCase(),
    };

    if (!editingStudent) {
      payload.password = form.password;
    }

    try {
      if (editingStudent) {
        await api.patch(`/students/${editingStudent._id || editingStudent.id}`, payload);
        setNotice("Student details updated successfully.");
      } else {
        await api.post("/students", payload);
        setNotice("Student created successfully.");
      }

      setModalOpen(false);
      setEditingStudent(null);
      setForm(initialForm);
      await fetchStudents();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStudentStatus(student) {
    const studentId = student._id || student.id;
    const action = student.isActive ? "deactivate" : "activate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${student.name}'s account?`
    );

    if (!confirmed) return;

    setPageError("");
    setNotice("");

    try {
      await api.patch(`/students/${studentId}`, {
        isActive: !student.isActive,
      });
      setNotice(
        `${student.name}'s account has been ${student.isActive ? "deactivated" : "activated"}.`
      );
      await fetchStudents();
    } catch (error) {
      setPageError(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-600">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Student Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage student accounts and access to assessments.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add Student
        </button>
      </div>

      {/* Feedback */}
      {pageError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div className="flex-1">{pageError}</div>
          <button
            onClick={() => setPageError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {notice}
          <button
            onClick={() => setNotice("")}
            className="ml-auto"
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary and filters */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Students in this view</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "—" : students.length}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Users size={23} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active in this view</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {loading
                  ? "—"
                  : students.filter((student) => student.isActive).length}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <UserCheck size={23} />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or student ID..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="all">All students</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={fetchStudents}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Student ID</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Added</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <LoaderCircle
                      size={25}
                      className="mx-auto animate-spin text-indigo-600"
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      Loading students...
                    </p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Users
                      size={30}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-3 font-medium text-slate-700">
                      No students found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try changing your search or add a student.
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student._id || student.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                          {student.name?.charAt(0)?.toUpperCase() || "S"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {student.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail size={13} />
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs text-slate-700">
                        <Hash size={13} />
                        {student.studentId}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          student.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            student.isActive
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          }`}
                        />
                        {student.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-500">
                      {student.createdAt
                        ? new Date(student.createdAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(student)}
                          title="Edit student"
                          aria-label={`Edit ${student.name}`}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => toggleStudentStatus(student)}
                          title={
                            student.isActive
                              ? "Deactivate student"
                              : "Activate student"
                          }
                          aria-label={`${
                            student.isActive ? "Deactivate" : "Activate"
                          } ${student.name}`}
                          className={`rounded-lg border p-2 transition ${
                            student.isActive
                              ? "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {student.isActive ? (
                            <UserX size={16} />
                          ) : (
                            <UserCheck size={16} />
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

        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          Showing {students.length} student{students.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Add/Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2
                  id="student-modal-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingStudent ? "Edit student" : "Add new student"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingStudent
                    ? "Update the student's account details."
                    : "Create a student account for the portal."}
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Enter student's full name"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="student@example.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label
                  htmlFor="studentId"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Student ID
                </label>
                <input
                  id="studentId"
                  name="studentId"
                  value={form.studentId}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  placeholder="e.g. STU001"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {!editingStudent && (
                <div>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Initial password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="At least 12 characters"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Share the initial password securely with the student.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving
                    ? "Saving..."
                    : editingStudent
                      ? "Save changes"
                      : "Create student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
