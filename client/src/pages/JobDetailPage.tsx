import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { ArrowLeft, RefreshCw, Loader2, Copy, Check } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_COLORS: Record<string, string> = {
  draft:            "bg-white/5 text-muted-foreground border-border",
  flagged:          "bg-red-500/15 text-red-400 border-red-500/30",
  pending_approval: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved:         "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  rejected:         "bg-white/5 text-muted-foreground border-border",
  superseded:       "bg-white/5 text-muted-foreground/50 border-border",
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const jobQuery = trpc.jobs.get.useQuery({ jobId }, { enabled: !isNaN(jobId) });
  const retryMutation = trpc.jobs.retryGeneration.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      jobQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const copyToClipboard = async (text: string, postId: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(postId);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (jobQuery.isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      </AppLayout>
    );
  }

  if (!jobQuery.data) {
    return (
      <AppLayout title="Job Not Found">
        <p className="text-muted-foreground">This job could not be found.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </AppLayout>
    );
  }

  const { job, posts } = jobQuery.data;
  const isAdmin = user?.role === "admin";

  // Show only current iteration posts (not superseded)
  const activePosts = posts.filter((p) => p.status !== "superseded");
  const supersededPosts = posts.filter((p) => p.status === "superseded");

  return (
    <AppLayout title={`Job #${job.id}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft size={14} className="mr-1.5" />
            Back to Dashboard
          </Link>
        </Button>

        {/* Job details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{job.topic}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                </p>
              </div>
              <Badge className={`text-xs ${job.status === "approved" ? "bg-green-100 text-green-800" : job.status === "rejected" ? "bg-gray-100 text-gray-600" : "bg-yellow-100 text-yellow-800"}`}>
                {job.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Profile</p>
                <p className="font-medium">{job.profile === "aa_company" ? "AA Company Page" : "David Personal Page"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Content Pillar</p>
                <p className="font-medium">{job.contentPillar}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Required Approver</p>
                <p className="font-medium">{job.requiredApprover === "david" ? "David Tomlinson" : "Danny Tomlinson"}</p>
              </div>
              {job.targetAudience && (
                <div>
                  <p className="text-xs text-muted-foreground">Target Audience</p>
                  <p className="font-medium">{job.targetAudience}</p>
                </div>
              )}
              {job.referenceUrl && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Reference URL</p>
                  <a href={job.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline truncate block">
                    {job.referenceUrl}
                  </a>
                </div>
              )}
            </div>

            {isAdmin && ["pending_style_guide", "generating"].includes(job.status) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => retryMutation.mutate({ jobId: job.id })}
                disabled={retryMutation.isPending}
              >
                {retryMutation.isPending ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <RefreshCw size={14} className="mr-2" />
                )}
                Retry Generation
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Post variants */}
        {activePosts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Post Variants ({activePosts.length})
            </h2>
            <div className="space-y-4">
              {activePosts.map((post) => (
                <Card
                  key={post.id}
                  className={`border ${post.status === "approved" ? "border-green-300 bg-green-50/30" : post.status === "flagged" ? "border-red-300 bg-red-50/30" : "border-border"}`}
                >
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Variant {post.variantLabel}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[post.status] ?? ""}`}>
                          {post.status.replace(/_/g, " ")}
                        </Badge>
                        {post.iteration > 1 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Iteration {post.iteration}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => copyToClipboard(post.content, post.id)}
                      >
                        {copiedId === post.id ? (
                          <Check size={13} className="text-green-600" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                    {post.approvedBy && (
                      <p className="text-xs text-green-700 mt-3">
                        Approved by {post.approvedBy}
                        {post.approvedAt && ` on ${format(new Date(post.approvedAt), "d MMM yyyy 'at' HH:mm")}`}
                      </p>
                    )}
                    {post.guardrailFlags && Array.isArray(post.guardrailFlags) && post.guardrailFlags.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {(post.guardrailFlags as Array<{type: string; severity: string; description: string}>).map((flag, i) => (
                          <div key={i} className={`text-xs px-2 py-1 rounded ${flag.severity === "block" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                            {flag.severity === "block" ? "BLOCKED" : "WARNING"}: {flag.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Previous iterations */}
        {supersededPosts.length > 0 && (
          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
              Show {supersededPosts.length} superseded variant(s) from previous iterations
            </summary>
            <div className="mt-3 space-y-3 opacity-60">
              {supersededPosts.map((post) => (
                <Card key={post.id} className="border-border">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium">Variant {post.variantLabel}</span>
                      <Badge variant="outline" className="text-xs text-muted-foreground">Superseded — Iteration {post.iteration}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {post.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </details>
        )}

        {activePosts.length === 0 && job.status !== "rejected" && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Loader2 size={24} className="text-muted-foreground mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">
                {job.status === "generating" ? "Generating post variants..." :
                 job.status === "pending_style_guide" ? "Fetching style guide from Notion..." :
                 "Processing..."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
