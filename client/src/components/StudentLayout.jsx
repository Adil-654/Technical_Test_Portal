
import { useState } from "react";
import {
  Menu,
  ArrowLeft,
  LogOut,
  X,
  UserRound,
} from "lucide-react";

import StudentSidebar from "./StudentSidebar";
import StudentDashboard from "../pages/StudentDashboard";
import TakeTest from "../pages/TakeTest";
import StudentResult from "../pages/StudentResult";
// import StudentResults from "../pages/StudentResults";

export default function StudentLayout({ user, onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTest, setActiveTest] = useState(null);
  const [completedAttempt, setCompletedAttempt] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function navigate(page) {
    setActivePage(page);
    setActiveTest(null);
    setCompletedAttempt(null);
  }

  function startTest(test) {
    setActiveTest(test);
    setCompletedAttempt(null);
  }

  function finishTest(attempt) {
    setActiveTest(null);
    setCompletedAttempt(attempt);
    setActivePage("results");
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

  const pageTitles = {
    dashboard: [
      "Student Dashboard",
      "Your learning and assessment overview.",
    ],
    tests: [
      "Available Tests",
      "Choose an assessment and put your skills to the test.",
    ],
    results: [
      "My Results",
      "Review your assessment performance.",
    ],
    profile: [
      "My Profile",
      "View your student account details.",
    ],
  };

  const [title, subtitle] =
    pageTitles[activePage] || pageTitles.dashboard;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <StudentSidebar
        activePage={activePage}
        onNavigate={navigate}
        user={user}
        onLogout={() => setShowLogoutConfirm(true)}
        collapsed={collapsed}
        onToggleCollapse={() =>
          setCollapsed((value) => !value)
        }
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={20} />
            </button>

            {activeTest && (
              <button
                type="button"
                onClick={() => {
                  setActiveTest(null);
                  setActivePage("tests");
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Back to tests"
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">
                {activeTest ? activeTest.title : title}
              </h1>

              <p className="hidden text-sm text-slate-500 sm:block">
                {activeTest
                  ? "Focus, do your best, and submit when ready."
                  : subtitle}
              </p>
            </div>
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {user?.name || "Student"}
              </p>
              <p className="text-xs text-slate-500">
                {user?.studentId || "Student workspace"}
              </p>
            </div>

            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
              {(user?.name || "S").charAt(0).toUpperCase()}
            </span>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              title="Log out of TestPilot"
            >
              <LogOut size={17} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-7 lg:p-9">
          {activeTest ? (
            <TakeTest
              test={activeTest}
              onFinished={finishTest}
              onBack={() => {
                setActiveTest(null);
                setActivePage("tests");
              }}
            />
          ) : activePage === "dashboard" ? (
            <StudentDashboard
              user={user}
              onLogout={() => setShowLogoutConfirm(true)}
              onStartTest={startTest}
            />
          ) : activePage === "tests" ? (
            <StudentDashboard
              user={user}
              onLogout={() => setShowLogoutConfirm(true)}
              onStartTest={startTest}
              showAllTests
            />
          ) : activePage === "results" ? (
            completedAttempt ? (
              <StudentResult
                attempt={completedAttempt}
                onBack={() => {
                  setCompletedAttempt(null);
                  setActivePage("tests");
                }}
              />
            ) : (
              <StudentResults />
            )
          ) : (
            <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <UserRound size={23} />
                </span>
                <div>
                  <h2 className="text-xl font-bold">
                    Student profile
                  </h2>
                  <p className="text-sm text-slate-500">
                    Your account information.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <ProfileField
                  label="Full name"
                  value={user?.name}
                />
                <ProfileField
                  label="Email address"
                  value={user?.email}
                />
                <ProfileField
                  label="Student ID"
                  value={user?.studentId}
                />
                <ProfileField
                  label="Account type"
                  value="Student"
                />
              </div>
            </section>
          )}
        </div>

        <footer className="px-5 pb-6 text-center text-xs text-slate-400">
          TestPilot · Technical Assessment Platform
        </footer>
      </main>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loggingOut) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <LogOut size={23} />
            </div>

            <h2
              id="logout-title"
              className="mt-5 text-xl font-bold text-slate-900"
            >
              Log out of TestPilot?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to end your student session?
              Any saved assessment answers will remain saved, but
              unsaved answers may be lost.
            </p>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={loggingOut}
                onClick={confirmLogout}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    Yes, log out
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              aria-label="Close confirmation"
              disabled={loggingOut}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute hidden"
            >
              <X size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words font-medium text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}
