
import {
  Bell,
  Menu,
  Search,
  ChevronDown,
  LogOut,
} from "lucide-react";

export default function Topbar({
  activePage,
  setMobileOpen,
  user,
  onLogout,
  role = "admin",
}) {
  const isAdmin = String(role).toLowerCase() === "admin";

  const accent = isAdmin ? "rose" : "indigo";

  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl sm:px-7 lg:px-9">

      {/* Left: Page title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className={`rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 lg:hidden ${
            isAdmin
              ? "hover:border-rose-300 hover:text-rose-600"
              : "hover:border-indigo-300 hover:text-indigo-600"
          }`}
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">
            Workspace / {isAdmin ? "Admin" : "Student"}
          </p>

          <h2 className="truncate text-lg font-bold text-slate-950">
            {activePage}
          </h2>
        </div>
      </div>

      {/* Center: Search */}
      <div className="hidden max-w-sm flex-1 md:block">
        <div
          className={`flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 transition focus-within:bg-white ${
            isAdmin
              ? "focus-within:border-rose-400 focus-within:ring-4 focus-within:ring-rose-500/10"
              : "focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10"
          }`}
        >
          <Search size={17} className="text-slate-400" />

          <input
            aria-label="Search dashboard"
            placeholder="Search anything..."
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />

          <kbd className="whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Notifications and profile */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-5">

        <button
          type="button"
          aria-label="Notifications"
          className={`relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition ${
            isAdmin
              ? "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              : "hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          }`}
        >
          <Bell size={19} />

          <span
            className={`absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white ${
              isAdmin ? "bg-rose-500" : "bg-indigo-500"
            }`}
          />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        {/* Profile */}
        <div className="hidden items-center gap-2.5 text-left sm:flex">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-bold ${
              isAdmin
                ? "border-rose-200 bg-rose-100 text-rose-700"
                : "border-indigo-200 bg-indigo-100 text-indigo-700"
            }`}
          >
            {(user?.name || user?.email || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="hidden lg:block">
            <p className="max-w-32 truncate text-sm font-semibold text-slate-900">
              {user?.name || (isAdmin ? "Admin" : "Student")}
            </p>

            <p className="text-xs font-medium text-slate-500">
              {isAdmin ? "Administrator" : "Student"}
            </p>
          </div>

          <ChevronDown
            size={15}
            className="hidden text-slate-400 lg:block"
          />
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
            isAdmin
              ? "border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
              : "border-indigo-200 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50"
          }`}
          title="Logout"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>

      </div>
    </header>
  );
}
