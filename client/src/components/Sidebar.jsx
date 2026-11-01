
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Users,
  FileQuestion,
  BarChart3,
  Settings,
  GraduationCap,
  ChevronLeft,
  Library,
} from "lucide-react";

const adminNavigation = [
  { label: "Overview", page: "Overview", icon: LayoutDashboard },
  { label: "Students", page: "Students", icon: Users },
  { label: "Subjects", page: "Subjects", icon: BookOpen },
  { label: "Question Bank", page: "Question Bank", icon: FileQuestion },
  { label: "Tests & Exams", page: "Tests & Exams", icon: ClipboardList },
  { label: "Results", page: "Results", icon: BarChart3 },
];

const studentNavigation = [
  { label: "Overview", page: "overview", icon: LayoutDashboard },
  { label: "My Assessments", page: "tests", icon: ClipboardList },
  { label: "Question Bank", page: "question-bank", icon: Library },
  { label: "My Results", page: "results", icon: BarChart3 },
];

export default function Sidebar({
  activePage,
  setActivePage,
  mobileOpen,
  setMobileOpen,
  role = "admin",
}) {
  const isStudent = String(role).toLowerCase() === "student";
  const navigation = isStudent ? studentNavigation : adminNavigation;

  const activeColor = isStudent
    ? "bg-indigo-700 text-white shadow-lg shadow-indigo-950/30"
    : "bg-rose-500 text-white shadow-lg shadow-rose-950/30";

  const handleNavigation = (page) => {
    setActivePage(page);
    setMobileOpen(false);
  };

  const isActive = (page, label) =>
    activePage === page || activePage === label;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-6">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${
              isStudent ? "bg-indigo-700" : "bg-rose-500"
            }`}
          >
            <GraduationCap size={23} />
          </div>

          <div>
            <h1
              className={`text-xl font-extrabold tracking-tight ${
                isStudent ? "text-indigo-700" : "text-white"
              }`}
            >
              TestPilot
            </h1>

            <p className="text-xs text-slate-400">
              {isStudent ? "Student portal" : "Assessment platform"}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 hover:bg-white/10 lg:hidden"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {isStudent ? "My Learning" : "Workspace"}
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, page, icon: Icon }) => {
              const active = isActive(page, label);

              return (
                <button
                  key={page}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => handleNavigation(page)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    active
                      ? activeColor
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings and status */}
        <div className="shrink-0 p-4">
          <button
            type="button"
            onClick={() => handleNavigation("Settings")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
              isActive("Settings", "Settings")
                ? activeColor
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings size={18} />
            Settings
          </button>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-white">
                Workspace status
              </span>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              {isStudent
                ? "Your learning workspace is ready."
                : "Your assessment workspace is ready to configure."}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
