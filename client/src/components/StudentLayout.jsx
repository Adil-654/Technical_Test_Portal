import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Trophy,
  UserRound,
  X,
} from "lucide-react";

import StudentDashboard from "../pages/StudentDashboard";
import StudentResults from "../pages/StudentResult";

/* ==================== Student Layout ==================== */

export default function StudentLayout({ user, onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [activeTest, setActiveTest] = useState(null);
  const [completedAttempt, setCompletedAttempt] = useState(null);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigation = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "assessments",
      label: "Assessments",
      icon: ClipboardList,
    },
    {
      id: "results",
      label: "My Results",
      icon: Trophy,
    },
  ];

  function navigateTo(page) {
    setActivePage(page);
    setActiveTest(null);
    setCompletedAttempt(null);
    setMobileOpen(false);
  }

  function startTest(test) {
    setActiveTest(test);
    setCompletedAttempt(null);
    setMobileOpen(false);
  }

  function finishTest(attempt) {
    setActiveTest(null);
    setCompletedAttempt(attempt);
    setActivePage("results");
  }

  function goBackToAssessments() {
    setActiveTest(null);
    setCompletedAttempt(null);
    setActivePage("assessments");
  }

  function viewResult(result) {
    setActiveTest(null);
    setCompletedAttempt(result);
    setActivePage("results");
  }

  async function confirmLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await onLogout?.();
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }

  function renderContent() {
    // A test is selected, but the test-taking component
    // has not yet been created in the frontend.
    if (activeTest) {
      return (
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ClipboardList size={28} />
          </div>

          <h3 className="mt-5 text-xl font-bold text-slate-900">
            {activeTest.title || "Assessment"}
          </h3>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            The test-taking page has not been added to the frontend yet.
            Your assessment is selected, but the questions cannot be
            displayed until that component is implemented.
          </p>

          <button
            type="button"
            onClick={goBackToAssessments}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Back to Assessments
          </button>
        </div>
      );
    }

    // Detailed result view.
    if (completedAttempt) {
      return (
        <StudentResult
          attempt={completedAttempt}
          onBack={() => {
            setCompletedAttempt(null);
            setActivePage("results");
          }}
        />
      );
    }

    switch (activePage) {
      case "dashboard":
      case "assessments":
        return (
          <StudentDashboard onStartTest={startTest} />
        );

      case "results":
        return (
          <StudentResults onViewResult={viewResult} />
        );

      default:
        return (
          <StudentDashboard onStartTest={startTest} />
        );
    }
  }

  const pageTitle = activeTest
    ? activeTest.title || "Assessment"
    : completedAttempt
      ? "Assessment Result"
      : navigation.find((item) => item.id === activePage)?.label ||
        "Dashboard";

  const displayName =
    user?.name || user?.fullName || "Student";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <BookOpen size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                TestPilot
              </h1>
              <p className="text-xs text-slate-500">
                Student Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Student profile */}
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              <UserRound size={22} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {user?.email || "Student account"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              activePage === item.id &&
              !activeTest &&
              !completedAttempt;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={19} />
            Logout
          </button>

          <p className="mt-3 text-center text-xs text-slate-400">
            TestPilot © {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                {pageTitle}
              </h2>

              <p className="hidden text-sm text-slate-500 sm:block">
                Manage your assessments and track your progress.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
                {displayName}
              </p>

              <p className="text-xs capitalize text-slate-500">
                {user?.role || "student"}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-7 lg:p-9">
          <div className="mx-auto w-full max-w-7xl">
            {renderContent()}
          </div>
        </main>

        <footer className="px-5 pb-6 text-center text-xs text-slate-400">
          TestPilot · Technical Assessment Platform
        </footer>
      </div>

      {/* Logout confirmation modal */}
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
            aria-labelledby="student-logout-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle size={25} />
              </div>

              <button
                type="button"
                aria-label="Close logout confirmation"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <h2
              id="student-logout-title"
              className="text-xl font-bold text-slate-900"
            >
              Logout from Student Portal?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to log out of TestPilot?
              You will need to sign in again to access your assessments.
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
