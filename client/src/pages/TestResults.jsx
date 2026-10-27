import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, LoaderCircle, AlertCircle } from "lucide-react";
import api from "../services/api";

export default function TestResults() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadResults() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/tests/${id}/results`);
      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load test results."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResults();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoaderCircle className="animate-spin text-indigo-600" size={30} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {data?.test?.title || "Test results"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {data?.test?.subject?.name || "Subject"} · Student performance
          </p>
        </div>

        <button
          onClick={loadResults}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {!error && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Unique students", data.uniqueStudentsAttempted ?? 0],
              ["Submitted attempts", data.totalSubmittedAttempts ?? 0],
              ["Maximum marks", data.test?.totalMarks ?? 0],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold text-slate-900">Student results</h2>
              <p className="mt-1 text-sm text-slate-500">
                Only submitted attempts are shown.
              </p>
            </div>

            {data.students?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Student</th>
                      <th className="px-5 py-4">Student ID</th>
                      <th className="px-5 py-4">Marks</th>
                      <th className="px-5 py-4">Percentage</th>
                      <th className="px-5 py-4">Attempt</th>
                      <th className="px-5 py-4">Submitted at</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.students.map((student) => (
                      <tr key={student.attemptId}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {student.studentName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {student.email}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {student.studentId}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                          {student.marksObtained} / {student.totalMarks}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                            {student.percentage}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {student.attemptNumber}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {student.submittedAt
                            ? new Date(student.submittedAt).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="font-semibold text-slate-900">
                  No submitted results yet
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Student results will appear here after they submit this test.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}