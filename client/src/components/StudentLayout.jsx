
import { useState } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  ChartNoAxesColumn,
  Library,
  LogOut,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  Sparkles,
  Target,
  BookOpen,
} from "lucide-react";

import StudentDashboard from "../pages/StudentDashboard";
import StudentExam from "../pages/StudentExam";
import api from "../services/api";

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
    label: "My Results",
    path: "/student/results",
    icon: ChartNoAxesColumn,
  },
];

export default function StudentLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [startingTest, setStartingTest] = useState(false);
  const [startError, setStartError] = useState("");

  const isExamPage = location.pathname.startsWith("/student/exam/");

  const activePage = isExamPage
    ? "Assessment in Progress"
    : navigation.find((item) => item.path === location.pathname)?.label ||
    "Dashboard";

  const studentName = user?.name || "Student";

  const initials = studentName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  async function handleStartTest(test) {
    if (!test?._id && !test?.id) {
      setStartError("Invalid assessment. Please refresh and try again.");
      return;
    }

    if (startingTest) return;

    setStartingTest(true);
    setStartError("");

    try {
      const testId = test._id || test.id;

      const response = await api.post(
        `/student-assessments/${testId}/start`
      );

      const attempt = response.data?.attempt;

      if (!attempt?._id && !attempt?.id) {
        throw new Error("The server did not return a valid attempt.");
      }

      const attemptId = attempt._id || attempt.id;

      if (attempt.status !== "in_progress") {
        navigate("/student/results");
        return;
      }

      navigate(`/student/exam/${attemptId}`);
    } catch (error) {
      setStartError(
        error.response?.data?.message ||
        error.message ||
        "Unable to start this assessment."
      );
    } finally {
      setStartingTest(false);
    }
  }

  function handleNavigate(destination) {
    const paths = {
      tests: "/student/assessments",
      assessments: "/student/assessments",
      dashboard: "/student/dashboard",
      results: "/student/results",
      "question-bank": "/student/question-bank",
    };

    navigate(paths[destination] || "/student/dashboard");
  }

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  if (isExamPage) {
    return (
      <Routes>
        <Route path="exam/:attemptId" element={<StudentExam />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FC] text-slate-800">

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-[#101B3C]/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col overflow-y-auto border-r border-white/10 bg-[#19284F] text-white shadow-2xl transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
      >

        {/* Brand */}
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/[0.08] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF7417] text-white shadow-lg shadow-orange-950/30">
              <GraduationCap size={24} strokeWidth={2.3} />
            </div>

            <div>
              <h1 className="text-[21px] font-black leading-none tracking-tight text-white">
                Test<span className="text-[#FFAD70]">Pilot</span>
              </h1>
              <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.19em] text-blue-200/60">
                Learning platform
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMobileMenu}
            className="rounded-lg p-2 text-blue-100 hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        {/* Student profile */}
        <div className="mx-4 mt-5 shrink-0 rounded-xl border border-white/[0.09] bg-white/[0.055] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF7417] text-sm font-extrabold text-white shadow-md shadow-orange-950/20">
              {initials || "S"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-white">
                {(studentName || "").trim().charAt(0).toUpperCase() +
                  (studentName || "").trim().slice(1)}
              </p>
              <p className="mt-1 truncate text-[11px] text-blue-100/60">
                {user?.email || "Student account"}
              </p>
            </div>

            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 ring-4 ring-emerald-400/10" />
          </div>


        </div>

        {/* Navigation */}
        <nav className="mt-7 flex-1 px-4">
          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.17em] text-blue-200/40">
            Main menu
          </p>

          <div className="space-y-4">
            {navigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-200 ${isActive
                    ? "bg-[#FF7417] text-white shadow-lg shadow-orange-950/20"
                    : "text-blue-100/65 hover:bg-white/[0.07] hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2.4 : 1.9}
                      className={
                        isActive
                          ? "text-white"
                          : "text-blue-200/60 group-hover:text-[#FFAD70]"
                      }
                    />

                    <span className="flex-1 text-[13px] font-semibold">
                      {label}
                    </span>

                    {isActive && (
                      <ChevronRight size={16} strokeWidth={2.5} />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>


        {/* Logout */}
        <div className="shrink-0 border-t border-white/[0.09] p-4">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-semibold text-blue-100/65 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={19} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="min-h-screen lg:pl-[260px]">

        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-200 p-2.5 text-[#19284F] transition hover:border-orange-200 hover:bg-orange-50 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Student portal</span>
                <ChevronRight size={12} />
                <span className="font-semibold text-[#F97316]">
                  {activePage}
                </span>
              </div>

              <h2 className="mt-1 text-[15px] font-bold text-[#19284F]">
                {activePage}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-bold text-[#19284F]">
                {(studentName || "").trim().charAt(0).toUpperCase() +
                  (studentName || "").trim().slice(1)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Student
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-sm font-extrabold text-orange-600">
              {initials || "S"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto min-h-[calc(100vh-72px)] w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">

          {startError && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span>{startError}</span>
              <button
                type="button"
                onClick={() => setStartError("")}
                className="font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {startingTest && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#FF7417]" />
              Preparing your assessment...
            </div>
          )}

          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />

            <Route
              path="dashboard"
              element={
                <StudentDashboard
                  mode="dashboard"
                  user={user}
                  onStartTest={handleStartTest}
                  onNavigate={handleNavigate}
                />
              }
            />

            <Route
              path="assessments"
              element={
                <StudentDashboard
                  mode="assessments"
                  user={user}
                  onStartTest={handleStartTest}
                  onNavigate={handleNavigate}
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
                  onNavigate={handleNavigate}
                />
              }
            />

            <Route
              path="*"
              element={<Navigate to="dashboard" replace />}
            />
          </Routes>
        </main>

        <footer className="border-t border-slate-200/70 bg-white px-5 py-5 text-center text-[11px] font-medium text-slate-400">
          © {new Date().getFullYear()} TestPilot · Technical Assessment Platform
        </footer>
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101B3C]/60 p-4 backdrop-blur-sm"
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
            className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-7 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <LogOut size={22} />
            </div>

            <h2
              id="student-logout-title"
              className="mt-5 text-xl font-extrabold text-[#19284F]"
            >
              Sign out of TestPilot?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to log out? You will need to sign in again
              to access your assessments and results.
            </p>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentQuestionBankPlaceholder() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
        <Library size={34} />
      </div>

      <span className="mt-6 rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
        Coming soon
      </span>

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#19284F]">
        Student Question Bank
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
        Your practice library will appear here. Explore questions by subject,
        topic, and difficulty to strengthen your concepts.
      </p>
    </section>
  );
}
