import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronUp, ExternalLink, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const FLAG_LABELS: Record<string, string> = {
  medical_claim: "Medical Claim",
  revenue_figure: "Revenue Figure",
  competitor_name: "Competitor Mention",
  auto_publish_trigger: "Auto-Publish Trigger",
  named_client: "Named Client",
  superlative_claim: "Superlative Claim",
};

const FLAG_DESCRIPTIONS: Record<string, string> = {
  medical_claim: "Post contains language that could be interpreted as a medical or health claim.",
  revenue_figure: "Post references specific revenue, sales, or financial figures.",
  competitor_name: "Post mentions a competitor brand or product by name.",
  auto_publish_trigger: "Post contains language that could trigger automated publishing.",
  named_client: "Post names a specific client without the named-client flag being set.",
  superlative_claim: "Post uses superlative language (best, #1, world-leading) without substantiation.",
};

export default function GuardrailReviewPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: reviews, isLoading, refetch } = trpc.guardrails.listPending.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  const resolveMutation = trpc.guardrails.resolve.useMutation({
    onSuccess: () => {
      toast.success("Guardrail review resolved");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [expanded, setExpanded] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  if (!isAdmin) {
    return (
      <AppLayout title="Guardrail Review">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Admin access required.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Guardrail Review">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-400" />
              Guardrail Review
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Posts flagged by automated brand compliance checks — review and resolve each flag before the post can proceed to approval.
            </p>
          </div>
        </div>

        {/* How-to banner */}
        <div className="rounded-lg border border-white/5 bg-[#1a1d27] p-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-slate-200 font-semibold">How this works:</span> When Claude generates a post, it's automatically checked against 6 brand compliance rules. If any rule fires, the post lands here before reaching the approver. You can <span className="text-cyan-400">approve despite flag</span> (if you've reviewed and it's acceptable), <span className="text-red-400">reject</span> (removes the post), or go back to the job and request a regeneration.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-[#1a1d27] p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
            <p className="text-slate-200 font-semibold mb-1">All clear</p>
            <p className="text-sm text-slate-500">No posts are currently flagged for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const isOpen = expanded === review.review.id;
              const flags = [review.review.flagType].filter(Boolean) as string[];

              return (
                <div key={review.review.id} className="rounded-lg border border-orange-500/20 bg-[#1a1d27]">
                  {/* Header row */}
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpanded(isOpen ? null : review.review.id)}
                  >
                    <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {flags.map((f) => (
                          <span key={f} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30">
                            {FLAG_LABELS[f] ?? f}
                          </span>
                        ))}
                      </div>
                      <p className="text-slate-300 text-sm font-medium truncate">
                        Post #{review.review.postId} — Job #{review.post.jobId}
                      </p>
                      <p className="text-slate-600 text-xs mt-0.5">
                        Flagged {review.review.createdAt ? formatDistanceToNow(new Date(review.review.createdAt), { addSuffix: true }) : "recently"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/dashboard/job/${review.post.jobId}`} onClick={(e) => e.stopPropagation()}>
                        <button className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                          View Job <ExternalLink className="w-3 h-3" />
                        </button>
                      </Link>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                      {/* Flag explanations */}
                      <div className="space-y-2">
                        {flags.map((f) => (
                          <div key={f} className="flex gap-2 text-sm">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="text-slate-300 font-medium">{FLAG_LABELS[f] ?? f}: </span>
                              <span className="text-slate-500">{FLAG_DESCRIPTIONS[f] ?? "Brand compliance flag."}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Post content preview */}
                      {review.post.content && (
                        <div className="rounded border border-white/5 bg-[#0f1117] p-3">
                          <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Post Content</p>
                          <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                            {review.post.content}
                          </p>
                        </div>
                      )}
                      {review.review.excerpt && (
                        <div className="rounded border border-orange-500/20 bg-orange-500/5 p-3">
                          <p className="text-xs text-orange-400 mb-1 font-medium">Flagged excerpt</p>
                          <p className="text-orange-300 text-sm italic">"{review.review.excerpt}"</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => resolveMutation.mutate({ reviewId: review.review.id })}
                          disabled={resolveMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Despite Flag
                        </button>
                        <button
                          onClick={() => resolveMutation.mutate({ reviewId: review.review.id })}
                          disabled={resolveMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject Post
                        </button>
                        <Link href={`/dashboard/job/${review.post.jobId}`}>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-slate-400 text-xs font-medium hover:border-white/20 hover:text-slate-200 transition-colors">
                            Request Regeneration
                          </button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
