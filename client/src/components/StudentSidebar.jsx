
import {
  LayoutDashboard,
  ClipboardList,
  ChartNoAxesColumn,
  UserRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  GraduationCap,
} from "lucide-react";

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tests", label: "Available Tests", icon: ClipboardList },
  { id: "results", label: "My Results", icon: ChartNoAxesColumn },
  { id: "profile", label: "My Profile", icon: UserRound },
];

export default function StudentSidebar({
  activePage,
  onNavigate,
  user,
  onLogout,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex min-w-0 items-center gap-3 text-left"
            title="TestPilot dashboard"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <GraduationCap size={25} />
            </span>

            {!collapsed && (
              <span className="min-w-0">
                <span className="block text-lg font-extrabold tracking-tight text-slate-900">
                  TestPilot
                </span>
                <span className="block text-[10px] font-bold tracking-[0.16em] text-slate-400">
                  STUDENT PORTAL
                </span>
              </span>
            )}
          </button>

          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>

          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:block"
          >
            {collapsed ? (
              <PanelLeftOpen size={19} />
            ) : (
              <PanelLeftClose size={19} />
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="px-6 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </div>
        )}

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map(({ id, label, icon: Icon }) => {
            const active = activePage === id;

            return (
              <button
                key={id}
                onClick={() => {
                  onNavigate(id);
                  onCloseMobile();
                }}
                title={collapsed ? label : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
                {active && !collapsed && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-indigo-600" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
              {(user?.name || "S").charAt(0).toUpperCase()}
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                  {user?.name || "Student"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user?.studentId || "Student account"}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut size={20} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
