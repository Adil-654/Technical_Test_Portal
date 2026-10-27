
import { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { LoaderCircle, LogOut, X, AlertTriangle } from "lucide-react";

import api from "./services/api";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Subjects from "./pages/Subjects";
import QuestionBank from "./pages/QuestionBank";
import Tests from "./pages/Tests";
import TestResults from "./pages/TestResults";

import StudentLayout from "./components/StudentLayout";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <LoaderCircle size={34} className="mx-auto animate-spin text-indigo-600" />
        <p className="mt-4 text-sm text-slate-500">Preparing TestPilot...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ user, role, children }) {
  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== role) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin/dashboard" : "/student/dashboard"}
        replace
      />
    );
  }

  return children;
}

function AllTestResults() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/tests");
      const data = response.data;
      const list = Array.isArray(data)
        ? data
        : data.tests || data.data || [];

      setTests(list);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load tests."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Results</h1>
          <p className="mt-1 text-sm text-slate-500">
            View attempts, marks, and student performance for each test.
          </p>
        </div>

        <button
          onClick={fetchTests}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl bg-white p-6 text-slate-500">
          <LoaderCircle size={20} className="animate-spin" />
          Loading tests...
        </div>
      ) : tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="font-semibold text-slate-800">No tests available</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create a test before viewing results.
          </p>
          <button
            onClick={() => navigate("/admin/tests")}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to Tests
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4">Test Name</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Students attempted</th>
                <th className="p-4">Results</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tests.map((test) => (
                <tr key={test._id} className="transition hover:bg-slate-50">
                  <td className="p-4 font-semibold text-slate-900">
                    {test.title || test.name || "Untitled Test"}
                  </td>
                  <td className="p-4 text-slate-600">
                    {typeof test.subject === "object"
                      ? test.subject?.name || "—"
                      : test.subject || "—"}
                  </td>
                  <td className="p-4 text-slate-600">
                    {test.durationMinutes
                      ? `${test.durationMinutes} min`
                      : "—"}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
                      {Number(test.uniqueStudentsAttempted ?? 0)}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() =>
                        navigate(`/admin/tests/${test._id}/results`)
                      }
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      View Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const activePage = (() => {
    const path = location.pathname;

    if (
      path === "/admin/results" ||
      /^\/admin\/tests\/[^/]+\/results\/?$/.test(path)
    ) return "Results";

    if (path.startsWith("/admin/students")) return "Students";
    if (path.startsWith("/admin/subjects")) return "Subjects";
    if (path.startsWith("/admin/questions")) return "Question Bank";
    if (path.startsWith("/admin/tests")) return "Tests & Exams";
    if (path.startsWith("/admin/settings")) return "Settings";

    return "Overview";
  })();

  function setActivePage(page) {
    const routes = {
      Overview: "/admin/dashboard",
      Students: "/admin/students",
      Subjects: "/admin/subjects",
      "Question Bank": "/admin/questions",
      "Tests & Exams": "/admin/tests",
      Results: "/admin/results",
      Settings: "/admin/settings",
    };

    navigate(routes[page] || "/admin/dashboard");
    setMobileOpen(false);
  }

  async function confirmLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="min-h-screen lg:pl-64">
        <Topbar
          activePage={activePage}
          setMobileOpen={setMobileOpen}
          user={user}
          onLogout={() => setShowLogoutConfirm(true)}
        />

        <main className="p-4 sm:p-7 lg:p-9">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={<Dashboard setActivePage={setActivePage} />}
            />
            <Route path="students" element={<Students />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="questions" element={<QuestionBank />} />
            <Route path="tests" element={<Tests />} />
            <Route path="tests/:id/results" element={<TestResults />} />
            <Route path="results" element={<AllTestResults />} />
            <Route
              path="settings"
              element={
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h1 className="text-xl font-bold text-slate-900">Settings</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Settings page coming soon.
                  </p>
                </section>
              }
            />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </main>

        <footer className="px-5 pb-6 text-center text-xs text-slate-400">
          TestPilot · Technical Assessment Platform
        </footer>
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !loggingOut) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-logout-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle size={25} />
              </div>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                aria-label="Close logout confirmation"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <h2 id="admin-logout-title" className="text-xl font-bold text-slate-900">
              Logout from Admin Panel?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to log out of TestPilot? You will need to
              sign in again to access the administrator dashboard.
            </p>

            <div className="mt-7 flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                disabled={loggingOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                <LogOut size={17} />
                {loggingOut ? "Logging out..." : "Yes, Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const checkSession = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function handleLogin(credentials) {
    const response = await api.post("/auth/login", credentials);
    const loggedInUser = response.data.user;
    setUser(loggedInUser);

    navigate(
      loggedInUser.role === "admin"
        ? "/admin/dashboard"
        : "/student/dashboard",
      { replace: true }
    );
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setUser(null);
      navigate("/login", { replace: true });
    }
  }

  if (loading) return <LoadingScreen />;

  const homePath =
    user?.role === "admin" ? "/admin/dashboard" : "/student/dashboard";

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={homePath} replace /> : <Login onLogin={handleLogin} />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to={homePath} replace /> : <Register />}
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute user={user} role="admin">
            <AdminLayout user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/*"
        element={
          <ProtectedRoute user={user} role="student">
            <StudentLayout user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={<Navigate to={user ? homePath : "/login"} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? homePath : "/login"} replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
