import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  Clock, CheckCircle2, Inbox, TrendingUp,
  ChevronLeft, ChevronRight, AlertTriangle, Loader2,
  ExternalLink, PenLine, Sparkles, RefreshCw,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending_confirmation: "Awaiting Confirmation",
  pending_style_guide: "Fetching Style Guide",
  generating: "Generating",
  pending_guardrail: "Guardrail Review",
  pending_approval: "Awaiting Approval",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
};

const STATUS_COLOURS: Record<string, string> = {
  pending_confirmation: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  pending_style_guide: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
  generating: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  pending_guardrail: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  pending_approval: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  approved: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
  rejected: "bg-red-500/15 text-red-400 border border-red-500/30",
  published: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOURS[status] ?? "bg-slate-700 text-slate-300"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent = false,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-5 flex flex-col gap-3 ${accent ? "border-cyan-500/40 bg-cyan-500/5" : "border-white/5 bg-[#1a1d27]"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${accent ? "text-cyan-400" : "text-slate-600"}`} />
      </div>
      <div>
        <span className={`text-3xl font-bold ${accent ? "text-cyan-400" : "text-slate-100"}`}>{value}</span>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Monthly Calendar ─────────────────────────────────────────────────────────

function MonthlyCalendar({
  calendarData,
}: {
  calendarData: { date: string; aaCount: number; davidCount: number }[];
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const dataMap = useMemo(() => {
    const m: Record<string, { aaCount: number; davidCount: number }> = {};
    for (const d of calendarData) m[d.date] = { aaCount: d.aaCount, davidCount: d.davidCount };
    return m;
  }, [calendarData]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="rounded-lg border border-white/5 bg-[#1a1d27] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Posting Calendar</h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-300 min-w-[110px] text-center">{monthName} {year}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="text-center text-xs text-slate-600 py-1 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="aspect-square" />;
          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const entry = dataMap[dateStr];
          const isToday = dateStr === todayStr;
          const hasAA = entry && entry.aaCount > 0;
          const hasDavid = entry && entry.davidCount > 0;
          const hasPost = hasAA || hasDavid;
          return (
            <div key={dateStr} className={`aspect-square flex flex-col items-center justify-center rounded text-xs ${isToday ? "ring-1 ring-cyan-500/60 bg-cyan-500/10" : hasPost ? "bg-white/5" : ""}`}>
              <span className={`font-medium ${isToday ? "text-cyan-400" : hasPost ? "text-slate-200" : "text-slate-600"}`}>{day}</span>
              {hasPost && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasAA && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  {hasDavid && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> AA Company
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> David Personal
        </div>
      </div>
    </div>
  );
}

// ─── Pillar Chart ─────────────────────────────────────────────────────────────

const PILLAR_COLOURS = ["#06b6d4","#0891b2","#0e7490","#155e75","#164e63","#0c4a6e"];

function PillarChart({ data }: { data: { pillar: string; count: number }[] }) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-white/5 bg-[#1a1d27] p-5 flex items-center justify-center h-48">
        <p className="text-slate-600 text-sm">No published posts yet — pillar data will appear here</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-white/5 bg-[#1a1d27] p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-4">Pillar Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="pillar" width={160} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}
            labelStyle={{ color: "#f1f5f9", fontSize: 12 }}
            itemStyle={{ color: "#06b6d4", fontSize: 12 }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={PILLAR_COLOURS[i % PILLAR_COLOURS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Jobs Table ───────────────────────────────────────────────────────────────

function JobsTable({ jobs, onRefetch, isFetching }: {
  jobs: Array<Record<string, unknown>>;
  onRefetch?: () => void;
  isFetching?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => jobs.filter((j) => {
    const topic = String(j.topic ?? "").toLowerCase();
    const matchSearch = !search || topic.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchStatus;
  }), [jobs, search, statusFilter]);

  return (
    <div className="rounded-lg border border-white/5 bg-[#1a1d27]">
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <input
          type="text"
          placeholder="Search topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[#0f1117] border border-white/10 rounded px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#0f1117] border border-white/10 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {onRefetch && (
          <button
            onClick={onRefetch}
            disabled={isFetching}
            className="p-1.5 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Topic</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Profile</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Approver</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-600 text-sm">No jobs found</td>
              </tr>
            ) : filtered.map((j) => (
              <tr key={String(j.id)} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-slate-200 font-medium truncate max-w-xs">{String(j.topic ?? "")}</p>
                  <p className="text-slate-600 text-xs mt-0.5">{String(j.contentPillar ?? "")}</p>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                  {j.profile === "aa_company" ? "AA Company" : "David Personal"}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                  {String(j.approverName ?? j.requiredApprover ?? "")}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={String(j.status ?? "")} />
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {j.createdAt ? formatDistanceToNow(new Date(j.createdAt as string | number | Date), { addSuffix: true }) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/job/${j.id}`}>
                    <button className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 ml-auto">
                      View <ExternalLink className="w-3 h-3" />
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const enrichedQuery = trpc.jobsEnriched.list.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 15000,
  });

  const statsQuery = trpc.queue.dashboardStats.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  const myJobsQuery = trpc.jobs.list.useQuery(undefined, {
    enabled: !isAdmin,
    refetchInterval: 15000,
  });

  if (isAdmin) {
    const loading = enrichedQuery.isLoading || statsQuery.isLoading;
    const jobs = (enrichedQuery.data ?? []) as Array<Record<string, unknown>>;
    const stats = statsQuery.data;

    return (
      <AppLayout title="Dashboard">
        <div className="space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">Pipeline overview and content calendar</p>
            </div>
            <div className="flex gap-2">
              <Link href="/ideas">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" /> Generate Ideas
                </button>
              </Link>
              <Link href="/submit">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 text-[#0f1117] text-xs font-semibold hover:bg-cyan-400 transition-colors">
                  <PenLine className="w-3.5 h-3.5" /> Submit Post
                </button>
              </Link>
            </div>
          </div>

          {/* 4-stat row */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg border border-white/5 bg-[#1a1d27] h-28 animate-pulse" />
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Posts This Week" value={stats.postsThisWeek} sub="confirmed live" icon={CheckCircle2} accent />
              <StatCard label="In Queue" value={stats.inQueue} sub="approved, not yet posted" icon={Inbox} />
              <StatCard label="Awaiting Approval" value={stats.awaitingApproval} sub={stats.awaitingApproval > 0 ? "needs attention" : "all clear"} icon={Clock} />
              <StatCard label="Avg Posts / Week" value={stats.avgPostsPerWeek} sub="rolling 4-week average" icon={TrendingUp} />
            </div>
          ) : null}

          {/* Pending approval alert */}
          {stats && stats.awaitingApproval > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-300">
                {stats.awaitingApproval} job{stats.awaitingApproval > 1 ? "s" : ""} awaiting approval.{" "}
                <Link href="/approval">
                  <span className="underline cursor-pointer hover:text-amber-200">Review now →</span>
                </Link>
              </p>
            </div>
          )}

          {/* Charts row */}
          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MonthlyCalendar calendarData={stats.calendarData} />
              <PillarChart data={stats.pillarDistribution} />
            </div>
          )}

          {/* Jobs table */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">All Jobs</h2>
            {loading ? (
              <div className="rounded-lg border border-white/5 bg-[#1a1d27] h-40 animate-pulse" />
            ) : (
              <JobsTable
                jobs={jobs}
                onRefetch={() => enrichedQuery.refetch()}
                isFetching={enrichedQuery.isFetching}
              />
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Standard user view ──────────────────────────────────────────────────────
  const myJobs = (myJobsQuery.data ?? []) as Array<Record<string, unknown>>;

  return (
    <AppLayout title="My Submissions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">My Submissions</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track your submitted content ideas</p>
          </div>
          <div className="flex gap-2">
            <Link href="/ideas">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors">
                <Sparkles className="w-3.5 h-3.5" /> Generate Ideas
              </button>
            </Link>
            <Link href="/submit">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 text-[#0f1117] text-xs font-semibold hover:bg-cyan-400 transition-colors">
                <PenLine className="w-3.5 h-3.5" /> Submit Post
              </button>
            </Link>
          </div>
        </div>

        {myJobsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : myJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 p-10 text-center">
            <PenLine className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium mb-1">No content jobs yet</p>
            <p className="text-sm text-slate-600 mb-4">Submit your first content idea to get started.</p>
            <Link href="/submit">
              <button className="px-4 py-2 bg-cyan-500 text-[#0f1117] rounded font-semibold text-sm hover:bg-cyan-400 transition-colors">
                Submit an Idea
              </button>
            </Link>
          </div>
        ) : (
          <JobsTable jobs={myJobs} onRefetch={() => myJobsQuery.refetch()} isFetching={myJobsQuery.isFetching} />
        )}
      </div>
    </AppLayout>
  );
}
