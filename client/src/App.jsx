
import { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { LoaderCircle, LogOut } from "lucide-react";

import api from "./services/api";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Subjects from "./pages/Subjects";
import QuestionBank from "./pages/QuestionBank";
import Tests from "./pages/Tests";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

/* ==================== Loading Screen ==================== */

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <LoaderCircle
          size={34}
          className="mx-auto animate-spin text-indigo-600"
        />

        <p className="mt-4 text-sm text-slate-500">
          Preparing TestPilot...
        </p>
      </div>
    </div>
  );
}

/* ==================== Protected Route ==================== */

function ProtectedRoute({ user, role, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return (
      <Navigate
        to={
          user.role === "admin"
            ? "/admin/dashboard"
            : "/student/dashboard"
        }
        replace
      />
    );
  }

  return children;
}

/* ==================== Admin Layout ==================== */

function AdminLayout({ user, onLogout }) {
  const [activePage, setActivePage] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  function renderPage() {
    switch (activePage) {
      case "Overview":
        return <Dashboard setActivePage={setActivePage} />;

      case "Students":
        return <Students />;

      case "Subjects":
        return <Subjects />;

      case "Question Bank":
        return <QuestionBank />;

      case "Tests & Exams":
        return <Tests />;

      default:
        return (
          <section className="flex min-h-[55vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h1 className="text-xl font-bold text-slate-900">
              {activePage}
            </h1>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              This module is coming soon.
            </p>

            <button
              type="button"
              onClick={() => setActivePage("Overview")}
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Back to overview
            </button>
          </section>
        );
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
          onLogout={onLogout}
        />

        <main className="p-4 sm:p-7 lg:p-9">
          {renderPage()}
        </main>

        <footer className="px-5 pb-6 text-center text-xs text-slate-400">
          TestPilot · Technical Assessment Platform
        </footer>
      </div>
    </div>
  );
}

/* ==================== Student Dashboard ==================== */

function StudentDashboard({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            TestPilot
          </h1>

          <p className="text-sm text-slate-500">
            Student Portal
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <LogOut size={16} />
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
        <section className="rounded-2xl bg-indigo-600 p-6 text-white sm:p-8">
          <p className="text-sm text-indigo-100">
            Welcome back,
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            {user.name}
          </h2>

          <p className="mt-2 text-sm text-indigo-100">
            Access your assigned assessments and track your progress.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">
            My Assessments
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your assigned tests will appear here once your instructor
            publishes an assessment.
          </p>
        </section>

        <p className="text-center text-xs text-slate-400">
          TestPilot · Technical Assessment Platform
        </p>
      </main>
    </div>
  );
}

/* ==================== Main Application ==================== */

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Restore the existing session when the app starts.
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

  // Log in and redirect according to the authenticated role.
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

  // Log out and clear the current session.
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public login page */}
      <Route
        path="/login"
        element={<Login onLogin={handleLogin} />}
      />

      {/* Public student registration */}
      <Route
        path="/register"
        element={<Register />}
      />

      {/* Admin-only application */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute user={user} role="admin">
            <AdminLayout
              user={user}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      {/* Student-only application */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute user={user} role="student">
            <StudentDashboard
              user={user}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      {/* Root redirects to the appropriate portal */}
      <Route
        path="/"
        element={
          <Navigate
            to={
              user
                ? user.role === "admin"
                  ? "/admin/dashboard"
                  : "/student/dashboard"
                : "/login"
            }
            replace
          />
        }
      />

      {/* Unknown routes */}
      <Route
        path="*"
        element={
          <Navigate
            to={
              user
                ? user.role === "admin"
                  ? "/admin/dashboard"
                  : "/student/dashboard"
                : "/login"
            }
            replace
          />
        }
      />
    </Routes>
  );
}

/* ==================== Router ==================== */

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
