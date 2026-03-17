import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { PenLine, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  pending_confirmation: "bg-amber-100 text-amber-800 border-amber-200",
  pending_style_guide: "bg-blue-100 text-blue-800 border-blue-200",
  generating: "bg-purple-100 text-purple-800 border-purple-200",
  pending_guardrail: "bg-red-100 text-red-800 border-red-200",
  pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-gray-100 text-gray-600 border-gray-200",
  published: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function Dashboard() {
  const jobsQuery = trpc.jobs.list.useQuery(undefined, { refetchInterval: 15000 });
  const jobs = jobsQuery.data ?? [];

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => ["pending_approval", "pending_guardrail"].includes(j.status)).length,
    approved: jobs.filter((j) => j.status === "approved").length,
    published: jobs.filter((j) => j.status === "published").length,
  };

  return (
    <AppLayout title="Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Jobs", value: stats.total, color: "text-foreground" },
          { label: "Awaiting Action", value: stats.pending, color: "text-yellow-600" },
          { label: "Approved", value: stats.approved, color: "text-green-600" },
          { label: "Published", value: stats.published, color: "text-emerald-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Recent Jobs</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => jobsQuery.refetch()}
            disabled={jobsQuery.isFetching}
          >
            <RefreshCw size={14} className={`mr-1.5 ${jobsQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild size="sm">
            <Link href="/submit">
              <PenLine size={14} className="mr-1.5" />
              New Idea
            </Link>
          </Button>
        </div>
      </div>

      {/* Jobs list */}
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
