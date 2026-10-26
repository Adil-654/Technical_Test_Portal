
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
}) {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">
            Workspace / Admin
          </p>
          <h2 className="truncate text-lg font-bold text-slate-900">
            {activePage}
          </h2>
        </div>
      </div>

      <div className="hidden max-w-sm flex-1 md:block">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50">
          <Search size={17} className="text-slate-400" />
          <input
            aria-label="Search dashboard"
            placeholder="Search anything..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="whitespace-nowrap rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
            /
          </kbd>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <button
          aria-label="Notifications"
          className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
        >
          <Bell size={19} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <div className="hidden items-center gap-2.5 text-left sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
            {(user?.name || user?.email || "A")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="hidden lg:block">
            <p className="max-w-32 truncate text-sm font-semibold text-slate-800">
              {user?.name || "Admin"}
            </p>
            <p className="text-xs text-slate-500">
              Administrator
            </p>
          </div>

          <ChevronDown
            size={15}
            className="hidden text-slate-400 lg:block"
          />
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 sm:px-4"
          title="Logout"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
