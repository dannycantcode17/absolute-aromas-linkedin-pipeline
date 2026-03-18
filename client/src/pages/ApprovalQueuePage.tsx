import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  Loader2, CheckSquare, Building2, User, FileText,
  Clock, AlertTriangle, ChevronRight, CheckCircle2
} from "lucide-react";
import { Link } from "wouter";

function ProfileBadge({ profile }: { profile: string }) {
  if (profile === "david_personal") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <User size={10} /> LinkedIn · David
      </span>
    );
  }
  if (profile === "blog_post") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
        <FileText size={10} /> Blog Post
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
      <Building2 size={10} /> LinkedIn · AA
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending_guardrail") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertTriangle size={10} /> Guardrail Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock size={10} /> Awaiting Approval
    </span>
  );
}

export default function ApprovalQueuePage() {
  const { data: pendingJobs, isLoading } = trpc.approval.listPending.useQuery();
  const { data: approverNames } = trpc.settings.getApproverNames.useQuery();

  const jobs = pendingJobs ?? [];
  type Job = NonNullable<typeof pendingJobs>[number];
  const awaitingApproval = jobs.filter((j: Job) => j.status === "pending_approval");
  const guardrailReview = jobs.filter((j: Job) => j.status === "pending_guardrail");

  return (
    <AppLayout title="Approval Queue">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-cyan-400" />
              Approval Queue
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Posts ready for your review — approve, request edits, or reject.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-400">{jobs.length}</p>
            <p className="text-xs text-slate-500">awaiting action</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-[#1a1d27] p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-cyan-500/40 mx-auto mb-3" />
            <p className="text-slate-200 font-semibold mb-1">All caught up</p>
            <p className="text-sm text-slate-500 mb-4">
              No posts are waiting for approval right now.
            </p>
            <Link href="/dashboard">
              <button className="px-4 py-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors">
                Back to Dashboard
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Guardrail review section */}
            {guardrailReview.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Guardrail Review Required ({guardrailReview.length})
                </h2>
                <div className="space-y-2">
                  {guardrailReview.map((job: Job) => (
                    <JobCard key={job.id} job={job} approverNames={approverNames} />
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting approval section */}
            {awaitingApproval.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock size={12} /> Awaiting Approval ({awaitingApproval.length})
                </h2>
                <div className="space-y-2">
                  {awaitingApproval.map((job: Job) => (
                    <JobCard key={job.id} job={job} approverNames={approverNames} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

interface JobCardProps {
  id: number;
  topic: string;
  profile: string;
  contentPillar: string;
  status: string;
  requiredApprover: string;
  createdAt: Date;
}

function JobCard({ job, approverNames }: { job: JobCardProps; approverNames?: { danny: string; david: string } }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="rounded-lg border border-white/5 bg-[#1a1d27] hover:border-cyan-500/30 hover:bg-[#1e2235] transition-all cursor-pointer group">
        <div className="p-4 flex items-center gap-4">
          {/* Profile icon */}
          <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
            job.profile === "david_personal"
              ? "bg-amber-500/10 border-amber-500/20"
              : job.profile === "blog_post"
              ? "bg-violet-500/10 border-violet-500/20"
              : "bg-cyan-500/10 border-cyan-500/20"
          }`}>
            {job.profile === "david_personal"
              ? <User size={14} className="text-amber-400" />
              : job.profile === "blog_post"
              ? <FileText size={14} className="text-violet-400" />
              : <Building2 size={14} className="text-cyan-400" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <ProfileBadge profile={job.profile} />
              <StatusBadge status={job.status} />
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500">{job.contentPillar}</span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500">Reviewer</span>
            </div>
            <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
              {job.topic}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Submitted {format(new Date(job.createdAt), "d MMM yyyy 'at' HH:mm")}
            </p>
          </div>

          <ChevronRight size={16} className="text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
        </div>
      </div>
    </Link>
  );
}
