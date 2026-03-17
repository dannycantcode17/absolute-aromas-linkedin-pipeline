import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Loader2, History } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending_confirmation: "bg-amber-500/15 text-amber-400",
  pending_style_guide: "bg-cyan-500/10 text-cyan-400",
  generating: "bg-cyan-500/10 text-cyan-400",
  pending_guardrail: "bg-red-500/15 text-red-400",
  pending_approval: "bg-amber-500/15 text-amber-400",
  approved: "bg-cyan-500/15 text-cyan-400",
  rejected: "bg-white/5 text-muted-foreground",
  published: "bg-cyan-500/15 text-cyan-400",
};

export default function HistoryPage() {
  const jobsQuery = trpc.jobs.list.useQuery({
    status: ["approved", "rejected", "published"],
  });
  const auditQuery = trpc.audit.list.useQuery({});

  const jobs = jobsQuery.data ?? [];
  const auditEntries = auditQuery.data ?? [];

  return (
    <AppLayout title="Post History">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Jobs summary */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Completed Jobs</h2>
          {jobsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : jobs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <History size={28} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No completed jobs yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <Card key={job.id} className="border-border">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={`text-xs ${STATUS_COLORS[job.status] ?? ""}`}>
                            {job.status.replace(/_/g, " ")}
                          </Badge>
                          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                            {job.profile === "aa_company" ? "AA Company" : "David Personal"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{job.contentPillar}</span>
                        </div>
                        <p className="text-sm text-foreground font-medium line-clamp-1">{job.topic}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted {format(new Date(job.createdAt), "d MMM yyyy")}
                          {" · "}Approver: {job.requiredApprover === "david" ? "David" : "Danny"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Audit log */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Full Audit Log</h2>
          {auditQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : auditEntries.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No audit entries yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {auditEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-2 px-3 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-foreground">{entry.actor}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.action.replace(/_/g, " ")}
                      </span>
                      {entry.jobId && (
                        <span className="text-xs text-muted-foreground">Job #{entry.jobId}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(entry.createdAt), "d MMM yyyy 'at' HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
