
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  BookOpen,
  RefreshCw,
  ArrowRight,
  Clock3,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import api from "../services/api";

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ setActivePage }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    totalSubjects: 0,
  });

  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/dashboard/stats");
      const data = response.data;

      if (!data.success) {
        throw new Error("Unable to load dashboard data.");
      }

      setStats({
        totalStudents: data.stats?.totalStudents ?? 0,
        activeStudents: data.stats?.activeStudents ?? 0,
        inactiveStudents: data.stats?.inactiveStudents ?? 0,
        totalSubjects: data.stats?.totalSubjects ?? 0,
      });

      setRecentStudents(data.recentStudents ?? []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      description: "Registered student accounts",
      icon: Users,
    },
    {
      title: "Active Students",
      value: stats.activeStudents,
      description: "Accounts currently enabled",
      icon: UserCheck,
    },
    {
      title: "Inactive Students",
      value: stats.inactiveStudents,
      description: "Accounts currently disabled",
      icon: UserX,
    },
    {
      title: "Total Subjects",
      value: stats.totalSubjects,
      description: "Subjects in your question portal",
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            TestPilot Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Monitor students and manage your technical assessment portal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadDashboard(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={20} className="mt-0.5 shrink-0" />

          <div className="flex-1">
            <p className="font-semibold">Dashboard data unavailable</p>
            <p className="mt-1">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard()}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <section
        aria-label="Dashboard statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            {...card}
            value={loading ? "—" : card.value}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Recent Registrations
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                The five most recently registered students.
              </p>
            </div>

            {setActivePage && (
              <button
                type="button"
                onClick={() => setActivePage("Students")}
                className="inline-flex items-center gap-2 self-start text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View students <ArrowRight size={16} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
              <RefreshCw size={18} className="animate-spin" />
              Loading registrations...
            </div>
          ) : recentStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="rounded-full bg-slate-100 p-4 text-slate-500">
                <GraduationCap size={28} />
              </div>
              <p className="mt-4 font-semibold text-slate-800">
                No students yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                New registrations will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Student</th>
                    <th className="px-5 py-4 font-semibold">Student ID</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Joined</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentStudents.map((student) => (
                    <tr
                      key={student._id || student.id || student.email}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700">
                            {(student.name || "S")
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {student.name || "Unnamed student"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-600">
                        {student.studentId || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            student.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {student.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(student.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Clock3 size={22} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">Quick Overview</h2>
              <p className="text-sm text-slate-500">Current portal totals</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm text-slate-600">
                  Active students
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {loading ? "—" : stats.activeStudents}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{
                    width: `${
                      stats.totalStudents
                        ? (stats.activeStudents / stats.totalStudents) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Student accounts</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {loading ? "—" : stats.totalStudents}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {loading
                  ? "Loading data..."
                  : `${stats.inactiveStudents} inactive account(s)`}
              </p>
            </div>

            <div className="rounded-xl bg-indigo-50 p-4">
              <p className="text-sm font-medium text-indigo-700">
                Subjects available
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-900">
                {loading ? "—" : stats.totalSubjects}
              </p>
              <p className="mt-1 text-xs text-indigo-700">
                Manage subjects from the sidebar.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
