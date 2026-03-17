import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  PenLine,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  TrendingUp,
  Shield,
  Timer,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";

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

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending_confirmation: <AlertTriangle size={12} />,
  pending_style_guide: <RefreshCw size={12} className="animate-spin" />,
  generating: <Loader2 size={12} className="animate-spin" />,
  pending_guardrail: <AlertTriangle size={12} />,
  pending_approval: <Clock size={12} />,
  approved: <CheckCircle size={12} />,
  rejected: <XCircle size={12} />,
  published: <CheckCircle size={12} />,
};

const STATUS_COLORS: Record<string, string> = {
  pending_confirmation: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending_style_guide:  "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
  generating:           "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
  pending_guardrail:    "bg-red-500/15 text-red-400 border-red-500/30",
  pending_approval:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved:             "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  rejected:             "bg-white/5 text-muted-foreground border-border",
  published:            "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const jobsQuery = trpc.jobs.list.useQuery(undefined, { refetchInterval: 15000 });
  const analyticsQuery = trpc.queue.analytics.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 60000,
  });

  const jobs = jobsQuery.data ?? [];
  const analytics = analyticsQuery.data;

  const localStats = {
    total: jobs.length,
    pending: jobs.filter((j) => ["pending_approval", "pending_guardrail"].includes(j.status)).length,
    approved: jobs.filter((j) => j.status === "approved").length,
    published: jobs.filter((j) => j.status === "published").length,
  };

  return (
    <AppLayout title="Dashboard">
      {/* ── Analytics strip (admin only) ── */}
      {isAdmin && analytics && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Generated", value: analytics.totalGenerated, suffix: "",  icon: <PenLine size={13} /> },
            { label: "Approval Rate",   value: analytics.approvalRate,   suffix: "%", icon: <TrendingUp size={13} /> },
            { label: "Avg Approval",    value: analytics.avgHoursToApproval, suffix: "h", icon: <Timer size={13} /> },
            { label: "Flag Rate",       value: analytics.flagRate,       suffix: "%", icon: <Shield size={13} /> },
            { label: "In Queue",        value: analytics.queueCount,     suffix: "",  icon: <Clock size={13} /> },
            { label: "Confirmed Live",  value: analytics.publishedCount, suffix: "",  icon: <CheckSquare size={13} /> },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                <span className="text-primary">{stat.icon}</span>
                <span className="text-[11px] font-medium">{stat.label}</span>
              </div>
              <span className="text-2xl font-bold text-primary">
                {stat.value}
                <span className="text-sm font-normal text-muted-foreground ml-0.5">{stat.suffix}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Basic stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Jobs",     value: localStats.total,     color: "text-foreground" },
          { label: "Awaiting Action",value: localStats.pending,   color: "text-amber-400" },
          { label: "Approved",       value: localStats.approved,  color: "text-primary" },
          { label: "Published",      value: localStats.published, color: "text-primary" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Actions row ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Recent Jobs</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => jobsQuery.refetch()}
            disabled={jobsQuery.isFetching}
            className="h-8 text-[12px]"
          >
            <RefreshCw size={13} className={`mr-1.5 ${jobsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="h-8 text-[12px] gap-1.5">
            <Link href="/ideas">
              <Sparkles size={13} />
              Generate Ideas
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-[12px] gap-1.5">
            <Link href="/submit">
              <PenLine size={13} />
              Submit Post
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Jobs list ── */}
      {jobsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <PenLine size={32} className="text-muted-foreground mb-3" />
            <p className="font-medium text-foreground mb-1">No content jobs yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Submit your first content idea to get started.
            </p>
            <Button asChild size="sm">
              <Link href="/submit">Submit an Idea</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Card key={job.id} className="border-border hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge
                        variant="outline"
                        className={`text-xs flex items-center gap-1 ${STATUS_COLORS[job.status] ?? ""}`}
                      >
                        {STATUS_ICONS[job.status]}
                        {STATUS_LABELS[job.status] ?? job.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs border-border text-muted-foreground"
                      >
                        {job.profile === "aa_company" ? "AA Company" : "David Personal"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{job.contentPillar}</span>
                    </div>
                    <p className="text-sm text-foreground font-medium line-clamp-1">{job.topic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      {" · "}Approver: {job.requiredApprover === "david" ? "David" : "Danny"}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0">
                    <Link href={`/dashboard/job/${job.id}`}>
                      <Eye size={14} />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
