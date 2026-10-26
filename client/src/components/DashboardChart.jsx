
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const data = [
  { day: "Mon", tests: 24, score: 68 },
  { day: "Tue", tests: 36, score: 72 },
  { day: "Wed", tests: 29, score: 70 },
  { day: "Thu", tests: 48, score: 78 },
  { day: "Fri", tests: 41, score: 75 },
  { day: "Sat", tests: 57, score: 83 },
  { day: "Sun", tests: 33, score: 79 },
];

export default function DashboardChart() {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">Assessment overview</h3>
          <p className="mt-1 text-sm text-slate-500">
            Weekly activity and average student score
          </p>
        </div>
        <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
          This week
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-5">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          Tests attempted
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Average score
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="testsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="tests" name="Tests attempted" stroke="#6366f1" strokeWidth={2.5} fill="url(#testsFill)" />
            <Area type="monotone" dataKey="score" name="Average score" stroke="#10b981" strokeWidth={2.5} fill="url(#scoreFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
