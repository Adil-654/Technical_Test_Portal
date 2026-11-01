
import { useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  ChartNoAxesColumn,
  Library,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import StudentDashboard from "../pages/StudentDashboard";

const navigation = [
  {
    label: "Dashboard",
    path: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Assessments",
    path: "/student/assessments",
    icon: ClipboardList,
  },
  {
    label: "Question Bank",
    path: "/student/question-bank",
    icon: Library,
  },
  {
    label: "Results",
    path: "/student/results",
    icon: ChartNoAxesColumn,
  },
];

export default function StudentLayout({ user, onLogout }) {
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const activePage =
    navigation.find((item) => item.path === location.pathname)?.label ||
    "Dashboard";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-indigo-700">
              TestPilot
            </h1>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Assessment Platform
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Student information */}
        <div className="border-b border-slate-100 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Student Workspace
          </p>

          <p className="mt-2 truncate font-semibold text-slate-800">
            {user?.name
  ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
  : "Student"}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {/* {user?.email || ""} */}
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 p-4">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            <div>
              <p className="text-xs text-slate-400">
                Student Workspace
              </p>
              <h2 className="font-bold text-slate-900">
                {activePage}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.name || "Student"}
              </p>
              <p className="text-xs text-slate-500">Student</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
              {(user?.name || "S").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-7 lg:p-9">
          <Routes>
            <Route
              index
              element={<Navigate to="dashboard" replace />}
            />

            <Route
              path="dashboard"
              element={
                <StudentDashboard
                  mode="dashboard"
                  user={user}
                />
              }
            />

            <Route
              path="assessments"
              element={
                <StudentDashboard
                  mode="assessments"
                  user={user}
                />
              }
            />

            <Route
              path="question-bank"
              element={<StudentQuestionBankPlaceholder />}
            />

            <Route
              path="results"
              element={
                <StudentDashboard
                  mode="results"
                  user={user}
                />
              }
            />

            <Route
              path="*"
              element={<Navigate to="dashboard" replace />}
            />
          </Routes>
        </main>

        <footer className="px-5 pb-6 text-center text-xs text-slate-400">
          TestPilot · Technical Assessment Platform
        </footer>
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
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
            <div className="flex items-center justify-between">
              <h2
                id="student-logout-title"
                className="text-xl font-bold text-slate-900"
              >
                Logout from TestPilot?
              </h2>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close confirmation"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Are you sure you want to log out? You will need to sign in
              again to access your assessments and results.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
              >
                <LogOut size={17} />
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Temporary page until the student Question Bank is implemented */
function StudentQuestionBankPlaceholder() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Library size={30} />
      </div>

      <h1 className="mt-5 text-2xl font-bold text-slate-900">
        Student Question Bank
      </h1>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Your practice question library will appear here. You will be able
        to explore questions by subject, topic, and difficulty.
      </p>

      <span className="mt-5 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
        Question Bank setup pending
      </span>
    </section>
  );
}
