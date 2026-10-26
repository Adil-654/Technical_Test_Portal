
import { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  LoaderCircle,
  LogOut,
  X,
  AlertTriangle,
} from "lucide-react";

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
          onLogout={() => setShowLogoutConfirm(true)}
        />

        <main className="p-4 sm:p-7 lg:p-9">
          {renderPage()}
        </main>

        <footer className="px-5 pb-6 text-center text-xs text-slate-400">
          TestPilot · Technical Assessment Platform
        </footer>
      </div>

      {/* Admin logout confirmation modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              !loggingOut
            ) {
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
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                aria-label="Close logout confirmation"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <h2
              id="admin-logout-title"
              className="text-xl font-bold text-slate-900"
            >
              Logout from Admin Panel?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to log out of TestPilot?
              You will need to sign in again to access the
              administrator dashboard.
            </p>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmLogout}
                disabled={loggingOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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

      <Route
        path="/"
        element={
          <Navigate
            to={user ? homePath : "/login"}
            replace
          />
        }
      />

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
