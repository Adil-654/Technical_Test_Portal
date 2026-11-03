
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Search,
  X,
  Trash2,
  PenLine,
  Library,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Power,
} from "lucide-react";
import api from "../services/api";

const initialForm = {
  title: "",
  description: "",
  subject: "",
  durationMinutes: 30,
  startAt: "",
  endAt: "",
  attemptsAllowed: 1,
  questionIds: [],
};

const emptyManualQuestion = () => ({
  questionText: "",
  options: ["", "", "", ""],
  correctOption: "0",
  explanation: "",
  difficulty: "medium",
  marks: 1,
});

const styles = {
  page: {
    padding: "24px",
    color: "#172033",
    fontFamily: "inherit",
    minHeight: "100vh",
    background: "#f8fafc",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "26px",
    fontWeight: 750,
  },
  muted: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  button: {
    border: "1px solid #dbe1ea",
    borderRadius: "8px",
    padding: "10px 14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    background: "#fff",
    color: "#172033",
    fontSize: "13px",
    fontWeight: 600,
  },
  primary: {
    background: "#4f46e5",
    borderColor: "#4f46e5",
    color: "#fff",
  },
  danger: {
    color: "#b91c1c",
    borderColor: "#fecaca",
    background: "#fff",
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    minWidth: 0,
  },
  label: {
    fontSize: "13px",
    fontWeight: 650,
    color: "#334155",
  },
  input: {
    boxSizing: "border-box",
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "10px 12px",
    background: "#fff",
    color: "#172033",
    fontSize: "14px",
    outlineColor: "#6366f1",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "850px",
  },
  th: {
    textAlign: "left",
    padding: "13px 12px",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: ".05em",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf0f5",
    fontSize: "13px",
    verticalAlign: "middle",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.58)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modal: {
    width: "100%",
    maxWidth: "900px",
    maxHeight: "92vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: "14px",
    boxShadow: "0 25px 70px rgba(0,0,0,.25)",
  },
  modalHeader: {
    position: "sticky",
    top: 0,
    zIndex: 5,
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "18px 22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalBody: {
    padding: "22px",
  },
  section: {
    marginBottom: "25px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 750,
    margin: "0 0 6px",
  },
  modeButton: {
    flex: 1,
    minWidth: "150px",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    textAlign: "left",
    cursor: "pointer",
    color: "#172033",
  },
  questionCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "9px",
    padding: "13px",
    marginTop: "10px",
    background: "#fff",
  },
  alert: {
    padding: "11px 14px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "13px",
  },
};

function getId(value) {
  if (!value) return "";
  return String(value._id ?? value.id ?? value);
}

function formatDate(value) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [form, setForm] = useState(initialForm);
  const [manualQuestions, setManualQuestions] = useState([]);
  const [manualDraft, setManualDraft] = useState(emptyManualQuestion);

  const [search, setSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [questionMode, setQuestionMode] = useState("manual");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successType, setSuccessType] = useState("success");

  // Automatically dismiss toast after 2 seconds.
  useEffect(() => {
    if (!success) return undefined;

    const timeoutId = setTimeout(() => {
      setSuccess("");
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [success]);

  const loadTests = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/tests");
      setTests(response.data?.tests ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const response = await api.get("/subjects", {
        params: { status: "active" },
      });

      const data = response.data?.subjects ?? response.data?.data ?? [];

      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadTests();
    loadSubjects();
  }, [loadTests, loadSubjects]);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      if (!form.subject) {
        setQuestions([]);
        return;
      }

      setLoadingQuestions(true);

      try {
        const response = await api.get("/questions", {
          params: {
            subject: form.subject,
            status: "active",
          },
        });

        const data = response.data?.questions ?? response.data?.data ?? [];

        if (!cancelled) {
          setQuestions(
            Array.isArray(data)
              ? data.filter(
                  (question) =>
                    question.isActive !== false &&
                    getId(question.subject) === form.subject
                )
              : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setQuestions([]);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [form.subject]);

  const visibleTests = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return tests;

    return tests.filter((test) => {
      const title = String(test.title ?? "").toLowerCase();
      const subject = String(test.subject?.name ?? "").toLowerCase();

      return title.includes(query) || subject.includes(query);
    });
  }, [tests, search]);

  const visibleQuestions = useMemo(() => {
    const query = questionSearch.trim().toLowerCase();

    if (!query) return questions;

    return questions.filter((question) =>
      String(question.questionText ?? "").toLowerCase().includes(query)
    );
  }, [questions, questionSearch]);

  const selectedMarks = useMemo(() => {
    const existingMarks = questions
      .filter((question) => form.questionIds.includes(getId(question)))
      .reduce(
        (total, question) => total + Number(question.marks || 1),
        0
      );

    const manualMarks = manualQuestions.reduce(
      (total, question) => total + Number(question.marks || 1),
      0
    );

    return existingMarks + manualMarks;
  }, [questions, form.questionIds, manualQuestions]);

  function openCreateModal() {
    setForm(initialForm);
    setManualQuestions([]);
    setManualDraft(emptyManualQuestion());
    setQuestionSearch("");
    setQuestionMode("manual");
    setError("");
    setSuccess("");
    setSuccessType("success");
    setShowModal(true);
  }

  function closeCreateModal() {
    if (saving) return;

    setShowModal(false);
    setError("");
  }

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function toggleQuestion(questionId) {
    setForm((previous) => ({
      ...previous,
      questionIds: previous.questionIds.includes(questionId)
        ? previous.questionIds.filter((id) => id !== questionId)
        : [...previous.questionIds, questionId],
    }));
  }

  function updateManualDraft(field, value) {
    setManualDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateManualOption(index, value) {
    setManualDraft((previous) => ({
      ...previous,
      options: previous.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      ),
    }));
  }

  function addManualQuestion() {
    setError("");

    const questionText = manualDraft.questionText.trim();
    const options = manualDraft.options.map((option) => option.trim());
    const correctOption = Number(manualDraft.correctOption);
    const marks = Number(manualDraft.marks);

    if (!form.subject) {
      setError("Please select a subject first.");
      return;
    }

    if (!questionText) {
      setError("Please enter the question.");
      return;
    }

    if (options.some((option) => !option)) {
      setError("Please fill all four options.");
      return;
    }

    if (
      !Number.isInteger(correctOption) ||
      correctOption < 0 ||
      correctOption > 3
    ) {
      setError("Please select the correct answer.");
      return;
    }

    if (!Number.isInteger(marks) || marks < 1) {
      setError("Marks must be a positive whole number.");
      return;
    }

    setManualQuestions((previous) => [
      ...previous,
      {
        questionText,
        options,
        correctOption,
        explanation: manualDraft.explanation.trim(),
        difficulty: manualDraft.difficulty,
        marks,
      },
    ]);

    setManualDraft(emptyManualQuestion());
  }

  function removeManualQuestion(indexToRemove) {
    setManualQuestions((previous) =>
      previous.filter((_, index) => index !== indexToRemove)
    );
  }

  async function handleCreateTest(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Test title is required.");
      return;
    }

    if (!form.subject) {
      setError("Please select a subject.");
      return;
    }

    if (form.questionIds.length === 0 && manualQuestions.length === 0) {
      setError("Please add at least one question.");
      return;
    }

    const durationMinutes = Number(form.durationMinutes);
    const attemptsAllowed = Number(form.attemptsAllowed);

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 600
    ) {
      setError("Duration must be between 1 and 600 minutes.");
      return;
    }

    if (
      !Number.isInteger(attemptsAllowed) ||
      attemptsAllowed < 1 ||
      attemptsAllowed > 10
    ) {
      setError("Allowed attempts must be between 1 and 10.");
      return;
    }

    const startDate = form.startAt ? new Date(form.startAt) : null;
    const endDate = form.endAt ? new Date(form.endAt) : null;

    if (startDate && Number.isNaN(startDate.getTime())) {
      setError("Please select a valid start date.");
      return;
    }

    if (endDate && Number.isNaN(endDate.getTime())) {
      setError("Please select a valid end date.");
      return;
    }

    if (startDate && endDate && endDate <= startDate) {
      setError("End date must be after the start date.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      subject: form.subject,
      questionIds: form.questionIds,
      manualQuestions: manualQuestions.map((question) => ({
        questionText: question.questionText,
        options: question.options.map((text) => ({ text })),
        correctOption: Number(question.correctOption),
        explanation: question.explanation,
        difficulty: question.difficulty,
        marks: Number(question.marks),
      })),
      durationMinutes,
      attemptsAllowed,
      startAt: startDate ? startDate.toISOString() : null,
      endAt: endDate ? endDate.toISOString() : null,
    };

    setSaving(true);

    try {
      const response = await api.post("/tests", payload);

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to create test."
        );
      }

      setSuccessType("success");
      setSuccess("Test created successfully! It is currently deactivated.");

      setShowModal(false);
      setForm(initialForm);
      setManualQuestions([]);
      setManualDraft(emptyManualQuestion());
      setQuestionSearch("");

      await loadTests();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(test) {
    const id = getId(test);

    if (!id || changingStatus || success) return;

    const nextStatus =
      test.status === "published" ? "draft" : "published";

    setError("");
    setChangingStatus(id);

    try {
      await api.patch(`/tests/${id}/status`, {
        status: nextStatus,
      });

      // Update only the selected test; avoid reloading the full table.
      setTests((previous) =>
        previous.map((item) =>
          getId(item) === id
            ? { ...item, status: nextStatus }
            : item
        )
      );

      setSuccessType(
        nextStatus === "published" ? "success" : "error"
      );

      setSuccess(
        nextStatus === "published"
          ? "Test activated successfully."
          : "Test deactivated successfully."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setChangingStatus("");
    }
  }

  const selectedQuestionCount =
    form.questionIds.length + manualQuestions.length;

  return (
    <div style={styles.page}>
      {/* SUCCESS / ERROR TOAST */}
      {success && (
        <div
          key={success}
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 2000,
            width: "min(380px, calc(100vw - 32px))",
            overflow: "hidden",
            background: "#ffffff",
            border:
              successType === "success"
                ? "1px solid #bbf7d0"
                : "1px solid #fecaca",
            borderLeft:
              successType === "success"
                ? "4px solid #16a34a"
                : "4px solid #dc2626",
            borderRadius: "12px",
            boxShadow: "0 12px 35px rgba(15, 23, 42, 0.16)",
            animation: "testPilotToastSlide 2s ease-in-out forwards",
          }}
        >
          <div
            style={{
              padding: "15px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background:
                  successType === "success" ? "#dcfce7" : "#fee2e2",
              }}
            >
              {successType === "success" ? (
                <CheckCircle2 size={22} color="#16a34a" />
              ) : (
                <XCircle size={22} color="#dc2626" />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <strong
                style={{
                  display: "block",
                  color:
                    successType === "success" ? "#166534" : "#991b1b",
                  fontSize: "14px",
                  marginBottom: "3px",
                }}
              >
                {successType === "success" ? "Success" : "Deactivated"}
              </strong>

              <span
                style={{
                  color: "#475569",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {success}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss notification"
              style={{
                border: "none",
                background: "transparent",
                color: "#64748b",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                flexShrink: 0,
              }}
            >
              <X size={17} />
            </button>
          </div>

          {/* Horizontal progress line */}
          <div style={{ height: "4px", background: "#f1f5f9" }}>
            <div
              style={{
                height: "100%",
                width: "100%",
                transformOrigin: "left",
                background:
                  successType === "success" ? "#16a34a" : "#dc2626",
                animation: "testPilotToastProgress 2s linear forwards",
              }}
            />
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes testPilotToastSlide {
            0% {
              opacity: 0;
              transform: translateX(120%);
            }

            15% {
              opacity: 1;
              transform: translateX(0);
            }

            80% {
              opacity: 1;
              transform: translateX(0);
            }

            100% {
              opacity: 0;
              transform: translateX(120%);
            }
          }

          @keyframes testPilotToastProgress {
            from {
              transform: scaleX(1);
            }

            to {
              transform: scaleX(0);
            }
          }

          @keyframes testPilotSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Assessments</h1>
          <p style={styles.muted}>
            Create and manage your student assessments.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            style={styles.button}
            onClick={loadTests}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              style={loading ? { animation: "testPilotSpin 1s linear infinite" } : {}}
            />
            Refresh
          </button>

          <button
            type="button"
            style={{ ...styles.button, ...styles.primary }}
            onClick={openCreateModal}
          >
            <Plus size={17} />
            Create Test
          </button>
        </div>
      </div>

      {error && !showModal && (
        <div
          role="alert"
          style={{
            ...styles.alert,
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          }}
        >
          <AlertCircle size={15} style={{ verticalAlign: "middle" }} />{" "}
          {error}
        </div>
      )}

      {/* CREATE TEST MODAL */}
      {showModal && (
        <div
          style={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <div
            style={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-test-heading"
          >
            <div style={styles.modalHeader}>
              <div>
                <h2
                  id="create-test-heading"
                  style={{ margin: 0, fontSize: "19px" }}
                >
                  Create New Test
                </h2>
                <p style={{ ...styles.muted, margin: "4px 0 0" }}>
                  Configure your assessment and add questions.
                </p>
              </div>

              <button
                type="button"
                style={styles.button}
                onClick={closeCreateModal}
                disabled={saving}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTest}>
              <div style={styles.modalBody}>
                {error && (
                  <div
                    role="alert"
                    style={{
                      ...styles.alert,
                      background: "#fef2f2",
                      color: "#b91c1c",
                      border: "1px solid #fecaca",
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* TEST DETAILS */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Test Details</h3>
                  <p style={styles.muted}>
                    Enter the basic information about your test.
                  </p>

                  <div style={styles.grid}>
                    <div style={styles.field}>
                      <label style={styles.label} htmlFor="title">
                        Test title *
                      </label>
                      <input
                        id="title"
                        name="title"
                        style={styles.input}
                        value={form.title}
                        onChange={updateForm}
                        placeholder="e.g. DBMS Mid-Sem Test"
                        maxLength={200}
                        required
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label} htmlFor="subject">
                        Subject *
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        style={styles.input}
                        value={form.subject}
                        onChange={(event) => {
                          setForm((previous) => ({
                            ...previous,
                            subject: event.target.value,
                            questionIds: [],
                          }));
                          setManualQuestions([]);
                          setManualDraft(emptyManualQuestion());
                          setQuestionSearch("");
                        }}
                        required
                      >
                        <option value="">Select subject</option>
                        {subjects.map((subject) => (
                          <option
                            key={getId(subject)}
                            value={getId(subject)}
                          >
                            {subject.name}
                            {subject.code ? ` (${subject.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.field}>
                      <label
                        style={styles.label}
                        htmlFor="durationMinutes"
                      >
                        Duration (minutes) *
                      </label>
                      <input
                        id="durationMinutes"
                        name="durationMinutes"
                        type="number"
                        min="1"
                        max="600"
                        style={styles.input}
                        value={form.durationMinutes}
                        onChange={updateForm}
                        required
                      />
                    </div>

                    <div style={styles.field}>
                      <label
                        style={styles.label}
                        htmlFor="attemptsAllowed"
                      >
                        Allowed attempts *
                      </label>
                      <input
                        id="attemptsAllowed"
                        name="attemptsAllowed"
                        type="number"
                        min="1"
                        max="10"
                        style={styles.input}
                        value={form.attemptsAllowed}
                        onChange={updateForm}
                        required
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label} htmlFor="startAt">
                        <Calendar size={13} /> Start date and time
                      </label>
                      <input
                        id="startAt"
                        name="startAt"
                        type="datetime-local"
                        style={styles.input}
                        value={form.startAt}
                        onChange={updateForm}
                      />
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label} htmlFor="endAt">
                        <Calendar size={13} /> End date and time
                      </label>
                      <input
                        id="endAt"
                        name="endAt"
                        type="datetime-local"
                        style={styles.input}
                        value={form.endAt}
                        onChange={updateForm}
                      />
                    </div>
                  </div>

                  <div style={{ ...styles.field, marginTop: "16px" }}>
                    <label style={styles.label} htmlFor="description">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      style={{
                        ...styles.input,
                        minHeight: "65px",
                        resize: "vertical",
                      }}
                      value={form.description}
                      onChange={updateForm}
                      placeholder="Enter test instructions..."
                    />
                  </div>
                </div>

                {/* QUESTION SELECTION */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Add Questions</h3>
                  <p style={styles.muted}>
                    Choose how you want to add questions to this test.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginTop: "15px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setQuestionMode("manual")}
                      style={{
                        ...styles.modeButton,
                        borderColor:
                          questionMode === "manual" ? "#6366f1" : "#e2e8f0",
                        background:
                          questionMode === "manual" ? "#eef2ff" : "#fff",
                      }}
                    >
                      <PenLine
                        size={22}
                        color="#4f46e5"
                        style={{ marginBottom: "9px" }}
                      />
                      <strong style={{ display: "block" }}>
                        Manual Questions
                      </strong>
                      <span style={styles.muted}>
                        Write your own MCQs.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuestionMode("bank")}
                      style={{
                        ...styles.modeButton,
                        borderColor:
                          questionMode === "bank" ? "#6366f1" : "#e2e8f0",
                        background:
                          questionMode === "bank" ? "#eef2ff" : "#fff",
                      }}
                    >
                      <Library
                        size={22}
                        color="#4f46e5"
                        style={{ marginBottom: "9px" }}
                      />
                      <strong style={{ display: "block" }}>
                        Question Bank
                      </strong>
                      <span style={styles.muted}>
                        Select existing questions.
                      </span>
                    </button>
                  </div>
                </div>

                {/* MANUAL QUESTION FORM */}
                {questionMode === "manual" && (
                  <div style={styles.section}>
                    <div
                      style={{
                        padding: "16px",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                      }}
                    >
                      <h4 style={{ margin: "0 0 14px", fontSize: "15px" }}>
                        Write MCQ
                      </h4>

                      {!form.subject && (
                        <p style={{ ...styles.muted, color: "#b45309" }}>
                          Please select a subject in Test Details first.
                        </p>
                      )}

                      <div style={styles.field}>
                        <label style={styles.label}>Question *</label>
                        <textarea
                          style={{
                            ...styles.input,
                            minHeight: "75px",
                            resize: "vertical",
                          }}
                          value={manualDraft.questionText}
                          onChange={(event) =>
                            updateManualDraft(
                              "questionText",
                              event.target.value
                            )
                          }
                          placeholder="Enter your question..."
                        />
                      </div>

                      <div style={{ ...styles.grid, marginTop: "14px" }}>
                        {manualDraft.options.map((option, index) => (
                          <div style={styles.field} key={index}>
                            <label style={styles.label}>
                              Option {String.fromCharCode(65 + index)} *
                            </label>
                            <input
                              style={styles.input}
                              value={option}
                              onChange={(event) =>
                                updateManualOption(index, event.target.value)
                              }
                              placeholder={`Enter option ${String.fromCharCode(
                                65 + index
                              )}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ ...styles.grid, marginTop: "14px" }}>
                        <div style={styles.field}>
                          <label style={styles.label}>
                            Correct answer *
                          </label>
                          <select
                            style={styles.input}
                            value={manualDraft.correctOption}
                            onChange={(event) =>
                              updateManualDraft(
                                "correctOption",
                                event.target.value
                              )
                            }
                          >
                            {manualDraft.options.map((option, index) => (
                              <option key={index} value={String(index)}>
                                {String.fromCharCode(65 + index)}
                                {option.trim() ? ` - ${option}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={styles.field}>
                          <label style={styles.label}>Difficulty</label>
                          <select
                            style={styles.input}
                            value={manualDraft.difficulty}
                            onChange={(event) =>
                              updateManualDraft(
                                "difficulty",
                                event.target.value
                              )
                            }
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>

                        <div style={styles.field}>
                          <label style={styles.label}>Marks</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            style={styles.input}
                            value={manualDraft.marks}
                            onChange={(event) =>
                              updateManualDraft("marks", event.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div style={{ ...styles.field, marginTop: "14px" }}>
                        <label style={styles.label}>
                          Explanation (optional)
                        </label>
                        <textarea
                          style={{
                            ...styles.input,
                            minHeight: "55px",
                            resize: "vertical",
                          }}
                          value={manualDraft.explanation}
                          onChange={(event) =>
                            updateManualDraft(
                              "explanation",
                              event.target.value
                            )
                          }
                          placeholder="Explain the correct answer..."
                        />
                      </div>

                      <button
                        type="button"
                        style={{
                          ...styles.button,
                          ...styles.primary,
                          marginTop: "15px",
                        }}
                        onClick={addManualQuestion}
                        disabled={!form.subject}
                      >
                        <Plus size={16} />
                        Add Question
                      </button>
                    </div>

                    {manualQuestions.length > 0 && (
                      <div style={{ marginTop: "18px" }}>
                        <strong>
                          Added Questions ({manualQuestions.length})
                        </strong>

                        {manualQuestions.map((question, index) => (
                          <div key={index} style={styles.questionCard}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "12px",
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <strong>
                                  Q{index + 1}. {question.questionText}
                                </strong>

                                <ol
                                  type="A"
                                  style={{
                                    paddingLeft: "22px",
                                    fontSize: "13px",
                                  }}
                                >
                                  {question.options.map(
                                    (option, optionIndex) => (
                                      <li key={optionIndex}>
                                        {option}
                                        {optionIndex ===
                                          question.correctOption && (
                                          <strong
                                            style={{ color: "#15803d" }}
                                          >
                                            {" "}✓ Correct
                                          </strong>
                                        )}
                                      </li>
                                    )
                                  )}
                                </ol>

                                <span style={styles.muted}>
                                  {question.difficulty} · {question.marks}{" "}
                                  mark(s)
                                </span>
                              </div>

                              <button
                                type="button"
                                style={{
                                  ...styles.button,
                                  ...styles.danger,
                                  padding: "7px",
                                  height: "34px",
                                }}
                                onClick={() => removeManualQuestion(index)}
                                aria-label={`Remove question ${index + 1}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* QUESTION BANK */}
                {questionMode === "bank" && (
                  <div style={styles.section}>
                    {!form.subject ? (
                      <p style={styles.muted}>
                        Select a subject in Test Details to view its questions.
                      </p>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginBottom: "12px",
                          }}
                        >
                          <strong>Available Questions</strong>

                          <input
                            style={{
                              ...styles.input,
                              maxWidth: "250px",
                            }}
                            value={questionSearch}
                            onChange={(event) =>
                              setQuestionSearch(event.target.value)
                            }
                            placeholder="Search questions..."
                          />
                        </div>

                        {loadingQuestions ? (
                          <p style={styles.muted}>Loading questions...</p>
                        ) : visibleQuestions.length === 0 ? (
                          <p style={styles.muted}>
                            No active questions found for this subject.
                          </p>
                        ) : (
                          <div
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "9px",
                              maxHeight: "300px",
                              overflowY: "auto",
                            }}
                          >
                            {visibleQuestions.map((question) => {
                              const id = getId(question);
                              const checked =
                                form.questionIds.includes(id);

                              return (
                                <label
                                  key={id}
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "12px",
                                    padding: "13px",
                                    borderBottom: "1px solid #edf0f5",
                                    cursor: "pointer",
                                    background: checked ? "#eef2ff" : "#fff",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleQuestion(id)}
                                    style={{ marginTop: "4px" }}
                                  />

                                  <span style={{ flex: 1 }}>
                                    <span
                                      style={{
                                        display: "block",
                                        fontSize: "13px",
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      {question.questionText ||
                                        "Untitled question"}
                                    </span>

                                    <span style={styles.muted}>
                                      {question.difficulty || "Unspecified"}
                                      {" · "}
                                      {Number(question.marks || 1)} mark(s)
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* SELECTED QUESTIONS SUMMARY */}
                <div
                  style={{
                    padding: "15px",
                    borderRadius: "9px",
                    background: "#eef2ff",
                    border: "1px solid #c7d2fe",
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <strong>
                      {selectedQuestionCount} Questions Selected
                    </strong>
                    <p style={{ ...styles.muted, margin: "4px 0 0" }}>
                      {form.questionIds.length} from bank ·{" "}
                      {manualQuestions.length} manual
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <strong>{selectedMarks} Marks</strong>
                    <p style={{ ...styles.muted, margin: "4px 0 0" }}>
                      Total assessment marks
                    </p>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div
                style={{
                  position: "sticky",
                  bottom: 0,
                  background: "#fff",
                  borderTop: "1px solid #e2e8f0",
                  padding: "15px 22px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  style={styles.button}
                  onClick={closeCreateModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{ ...styles.button, ...styles.primary }}
                  disabled={saving || !form.subject}
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={15}
                        style={{
                          animation: "testPilotSpin 1s linear infinite",
                        }}
                      />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Create Test
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSESSMENTS TABLE */}
      <section style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "18px" }}>
              All Assessments
            </h2>
            <p style={styles.muted}>
              {visibleTests.length} test(s) found
            </p>
          </div>

          <div style={{ position: "relative", minWidth: "230px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "11px",
                top: "12px",
                color: "#64748b",
              }}
            />
            <input
              aria-label="Search assessments"
              style={{
                ...styles.input,
                paddingLeft: "35px",
              }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tests..."
            />
          </div>
        </div>

        {loading ? (
          <p style={styles.muted}>Loading assessments...</p>
        ) : visibleTests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "45px 12px" }}>
            <FileText
              size={38}
              color="#94a3b8"
              style={{ marginBottom: "10px" }}
            />

            <h3 style={{ margin: "0 0 7px", fontSize: "16px" }}>
              No assessments yet
            </h3>

            <p style={styles.muted}>
              Create your first test to get started.
            </p>

            <button
              type="button"
              style={{
                ...styles.button,
                ...styles.primary,
                marginTop: "10px",
              }}
              onClick={openCreateModal}
            >
              <Plus size={16} />
              Create Your First Test
            </button>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Test</th>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Questions</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Start</th>
                  <th style={styles.th}>End</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {visibleTests.map((test) => {
                  const id = getId(test);
                  const isActive = test.status === "published";
                  const isClosed = test.status === "closed";

                  return (
                    <tr key={id}>
                      <td style={styles.td}>
                        <strong>
                          {test.title || "Untitled test"}
                        </strong>

                        {test.description && (
                          <div style={styles.muted}>
                            {test.description}
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        {test.subject?.name || "—"}
                      </td>

                      <td style={styles.td}>
                        {test.questionCount ??
                          test.questionIds?.length ??
                          0}
                        <div style={styles.muted}>
                          {test.totalMarks ?? 0} marks
                        </div>
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <Clock size={14} />
                          {test.durationMinutes} min
                        </span>
                      </td>

                      <td style={styles.td}>
                        {formatDate(test.startAt)}
                      </td>

                      <td style={styles.td}>
                        {formatDate(test.endAt)}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            borderRadius: "20px",
                            padding: "5px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: isActive
                              ? "#dcfce7"
                              : isClosed
                                ? "#fee2e2"
                                : "#f1f5f9",
                            color: isActive
                              ? "#166534"
                              : isClosed
                                ? "#991b1b"
                                : "#475569",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: "currentColor",
                            }}
                          />
                          {isActive
                            ? "Active"
                            : isClosed
                              ? "Closed"
                              : "Draft"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {isClosed ? (
                          <span style={styles.muted}>Closed</span>
                        ) : (
                          <button
                            type="button"
                            style={{
                              ...styles.button,
                              padding: "7px 10px",
                              fontSize: "12px",
                              ...(isActive
                                ? styles.danger
                                : styles.primary),
                              opacity:
                                changingStatus || success ? 0.6 : 1,
                              cursor:
                                changingStatus || success
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                            disabled={
                              Boolean(changingStatus) || Boolean(success)
                            }
                            onClick={() => handleStatusChange(test)}
                          >
                            {changingStatus === id ? (
                              <>
                                <RefreshCw
                                  size={14}
                                  style={{
                                    animation:
                                      "testPilotSpin 1s linear infinite",
                                  }}
                                />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Power size={14} />
                                {isActive ? "Deactivate" : "Activate"}
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
