
import { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import api from "./services/api";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Subjects from "./pages/Subjects";
import QuestionBank from "./pages/QuestionBank";
import Tests from "./pages/Tests";

import StudentLayout from "./components/StudentLayout";
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

/* ==================== Main Application ==================== */

function AppContent() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Restore the authenticated session on page refresh.
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

  // Log in and redirect to the correct portal.
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

  // Log out and clear the local session.
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

  const homePath =
    user?.role === "admin"
      ? "/admin/dashboard"
      : "/student/dashboard";

  return (
    <Routes>
      {/* Public login page */}
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={homePath} replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />

      {/* Public student registration */}
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to={homePath} replace />
          ) : (
            <Register />
          )
        }
      />

      {/* Administrator portal */}
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

      {/* Student portal with its own sidebar */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute user={user} role="student">
            <StudentLayout
              user={user}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />

      {/* Home route */}
      <Route
        path="/"
        element={
          <Navigate
            to={user ? homePath : "/login"}
            replace
          />
        }
      />

      {/* Unknown routes */}
      <Route
        path="*"
        element={
          <Navigate
            to={user ? homePath : "/login"}
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
