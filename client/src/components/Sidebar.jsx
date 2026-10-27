
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
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Students", icon: Users },
  { label: "Subjects", icon: BookOpen },
  { label: "Question Bank", icon: FileQuestion },
  { label: "Tests & Exams", icon: ClipboardList },
  { label: "Results", icon: BarChart3 },
];

export default function Sidebar({
  activePage,
  setActivePage,
  mobileOpen,
  setMobileOpen,
}) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-slate-300 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white">
            <GraduationCap size={23} />
          </div>

          <div>
            <h1 className="font-bold tracking-tight text-white">
              TestPilot
            </h1>
            <p className="text-xs text-slate-400">
              Assessment platform
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
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, icon: Icon }) => {
              const active = activePage === label;

              return (
                <button
                  key={label}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    setActivePage(label);
                    setMobileOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "bg-indigo-500 text-white shadow-lg shadow-indigo-950/30"
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

        {/* Settings */}
        <div className="shrink-0 p-4">
          <button
            type="button"
            onClick={() => {
              setActivePage("Settings");
              setMobileOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
              activePage === "Settings"
                ? "bg-indigo-500 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings size={18} />
            Settings
          </button>

          {/* Workspace status */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              <span className="text-xs font-medium text-white">
                Workspace status
              </span>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              Your assessment workspace is ready to configure.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
