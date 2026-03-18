import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Edit3,
  Copy,
  Check,
  Loader2,
  Leaf,
  AlertTriangle,
  Info,
  List,
  Columns2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Post = {
  id: number;
  variantLabel: string;
  content: string;
  characterCount: number;
};

// ─── Side-by-side comparison ──────────────────────────────────────────────────

function CompareView({
  posts,
  selectedPostId,
  onSelect,
  copiedId,
  onCopy,
}: {
  posts: Post[];
  selectedPostId: number | null;
  onSelect: (id: number) => void;
  copiedId: number | null;
  onCopy: (text: string, id: number) => void;
}) {
  // Show up to 3 columns; if more, paginate in pairs
  const [page, setPage] = useState(0);
  const perPage = 2;
  const totalPages = Math.ceil(posts.length / perPage);
  const visible = posts.slice(page * perPage, page * perPage + perPage);

  return (
    <div className="space-y-3">
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, posts.length)} of {posts.length}</span>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
      <div className={`grid gap-4 ${visible.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {visible.map((post) => {
          const isSelected = selectedPostId === post.id;
          return (
            <div
              key={post.id}
              onClick={() => onSelect(post.id)}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all flex flex-col gap-3 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Variant {post.variantLabel}</span>
                  {isSelected && (
                    <Badge className="bg-primary text-primary-foreground text-xs">Selected</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{post.characterCount} chars</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => { e.stopPropagation(); onCopy(post.content, post.id); }}
                  >
                    {copiedId === post.id ? (
                      <Check size={13} className="text-green-600" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </Button>
                </div>
              </div>
              {/* Content */}
              <div className="flex-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed border border-border/60 rounded-md p-3 bg-background min-h-[180px]">
                {post.content}
              </div>
              {/* Select button */}
              <Button
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className={`w-full ${isSelected ? "bg-primary text-primary-foreground" : ""}`}
                onClick={(e) => { e.stopPropagation(); onSelect(post.id); }}
              >
                {isSelected ? <><Check size={13} className="mr-1.5" />Selected</> : "Select this variant"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({
  posts,
  selectedPostId,
  onSelect,
  copiedId,
  onCopy,
}: {
  posts: Post[];
  selectedPostId: number | null;
  onSelect: (id: number) => void;
  copiedId: number | null;
  onCopy: (text: string, id: number) => void;
}) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card
          key={post.id}
          onClick={() => onSelect(post.id)}
          className={`cursor-pointer transition-all border-2 ${
            selectedPostId === post.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
        >
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Variant {post.variantLabel}</span>
                {selectedPostId === post.id && (
                  <Badge className="bg-primary text-primary-foreground text-xs">Selected</Badge>
                )}
                <span className="text-xs text-muted-foreground">{post.characterCount} chars</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={(e) => { e.stopPropagation(); onCopy(post.content, post.id); }}
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [editFeedback, setEditFeedback] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [mode, setMode] = useState<"review" | "edit" | "reject" | "done">("review");
  const [doneMessage, setDoneMessage] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "compare">("compare");

  const approvalQuery = trpc.approval.getByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );
  const { data: approverNames } = trpc.settings.getApproverNames.useQuery();

  const approveMutation = trpc.approval.approve.useMutation({
    onSuccess: (data) => { setDoneMessage(data.message); setMode("done"); },
    onError: (err) => toast.error(err.message),
  });

  const editMutation = trpc.approval.requestEdit.useMutation({
    onSuccess: (data) => { setDoneMessage(data.message); setMode("done"); },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.approval.reject.useMutation({
    onSuccess: (data) => { setDoneMessage(data.message); setMode("done"); },
    onError: (err) => toast.error(err.message),
  });

  const copyToClipboard = async (text: string, postId: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(postId);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!token) return <ErrorScreen message="Invalid approval link." />;
  if (approvalQuery.isLoading) return <LoadingScreen />;
  if (approvalQuery.error) return <ErrorScreen message={approvalQuery.error.message} />;
  if (mode === "done") return <SuccessScreen message={doneMessage} />;

  const { job, posts, approverRole } = approvalQuery.data!;
  const profileLabel =
    job.profile === "aa_company"
      ? "AA Company Page"
      : `${approverNames?.david ?? "David"} Personal Page`;
  const approverName = approverRole === "david"
    ? (approverNames?.david ?? "David")
    : (approverNames?.danny ?? "Danny");

  // Enrich posts with character count
  const enrichedPosts: Post[] = posts.map((p) => ({
    ...p,
    characterCount: p.content.length,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Leaf size={14} className="text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-[15px] leading-tight" style={{color:'#06B6D4'}}>poster</p>
            <p className="text-xs text-muted-foreground leading-tight">Post Approval</p>
          </div>
        </div>
      </header>

      <div className="container py-6 max-w-5xl">
        {/* Intro */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground mb-1">Review Post</h1>
          <p className="text-sm text-muted-foreground">
            Hi {approverName}, review the variants below and choose an action. Select a variant to approve it.
          </p>
        </div>

        {/* Job context */}
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Profile</p>
                <p className="font-medium">{profileLabel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Content Pillar</p>
                <p className="font-medium">{job.contentPillar}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Topic</p>
                <p className="font-medium">{job.topic}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {approverRole === "david" && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info size={14} className="text-blue-600" />
            <AlertDescription className="text-muted-foreground text-sm">
              These posts are for your personal LinkedIn page. Only you can approve them.
            </AlertDescription>
          </Alert>
        )}

        {/* View toggle + variants */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Post Variants ({enrichedPosts.length}) — select one to approve
            </h2>
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                  viewMode === "compare"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setViewMode("compare")}
              >
                <Columns2 size={13} />
                Compare
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setViewMode("list")}
              >
                <List size={13} />
                List
              </button>
            </div>
          </div>

          {viewMode === "compare" ? (
            <CompareView
              posts={enrichedPosts}
              selectedPostId={selectedPostId}
              onSelect={setSelectedPostId}
              copiedId={copiedId}
              onCopy={copyToClipboard}
            />
          ) : (
            <ListView
              posts={enrichedPosts}
              selectedPostId={selectedPostId}
              onSelect={setSelectedPostId}
              copiedId={copiedId}
              onCopy={copyToClipboard}
            />
          )}
        </div>

        {/* Actions */}
        {mode === "review" && (
          <div className="space-y-3 max-w-2xl">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
              disabled={!selectedPostId || approveMutation.isPending}
              onClick={() => {
                if (!selectedPostId) return;
                approveMutation.mutate({ token: token!, postId: selectedPostId });
              }}
            >
              {approveMutation.isPending ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <CheckCircle size={16} className="mr-2" />
              )}
              {selectedPostId ? "Approve Selected Variant" : "Select a variant above to approve"}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setMode("edit")}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Edit3 size={16} className="mr-2" />
                Request Edits
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setMode("reject")}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle size={16} className="mr-2" />
                Reject
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Approving moves the post to the Ready to Post queue. It will not be published automatically.
            </p>
          </div>
        )}

        {mode === "edit" && (
          <Card className="border-amber-200 bg-amber-50 max-w-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">Request Edits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="feedback" className="text-foreground">Feedback for the AI</Label>
                <Textarea
                  id="feedback"
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  placeholder="Describe what needs to change. Be specific — e.g. 'Make it shorter', 'Lead with the GC-MS testing angle', 'Remove the pricing reference in variant B'..."
                  rows={4}
                  className="bg-white"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={editFeedback.trim().length < 10 || editMutation.isPending}
                  onClick={() => editMutation.mutate({ token: token!, feedback: editFeedback })}
                >
                  {editMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
                  Send Feedback & Regenerate
                </Button>
                <Button variant="outline" onClick={() => setMode("review")}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "reject" && (
          <Card className="border-red-200 bg-red-50 max-w-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">Reject Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reason" className="text-foreground">Reason for rejection</Label>
                <Textarea
                  id="reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Briefly explain why this post is being rejected..."
                  rows={3}
                  className="bg-white"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate({ token: token!, reason: rejectReason })}
                >
                  {rejectMutation.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
                  Confirm Rejection
                </Button>
                <Button variant="outline" onClick={() => setMode("review")}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Leaf className="text-primary mx-auto mb-3 animate-pulse" size={32} />
        <p className="text-muted-foreground text-sm">Loading approval request...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-sm px-4">
        <AlertTriangle className="text-destructive mx-auto mb-3" size={32} />
        <h1 className="text-lg font-semibold text-foreground mb-2">Unable to load approval</h1>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

function SuccessScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-sm px-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="text-primary" size={28} />
        </div>
        <h1 className="text-lg font-semibold text-foreground mb-2">Done</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-4">You can close this window.</p>
      </div>
    </div>
  );
}
