import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Sparkles,
  Plus,
  X,
  CheckCircle,
  ChevronRight,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { AA_COMPANY_PILLARS, DAVID_PERSONAL_PILLARS } from "@/lib/pillars";

type Idea = {
  id: number;
  title: string;
  description: string;
  suggestedPillar: string | null;
  suggestedProfile: "aa_company" | "david_personal" | null;
  rationale: string | null;
  status: "pending" | "queued" | "rejected";
  jobId: number | null;
};

type QueueDialogState = {
  open: boolean;
  idea: Idea | null;
  profile: "aa_company" | "david_personal";
  contentPillar: string;
  toneHint: string;
};

export default function IdeaGenerator() {
  const [, navigate] = useLocation();

  // Form state
  const [promptTopic, setPromptTopic] = useState("");
  const [profile, setProfile] = useState<"aa_company" | "david_personal" | "both">("both");
  const [contentPillar, setContentPillar] = useState<string>("any");

  // Results state
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Queue dialog
  const [queueDialog, setQueueDialog] = useState<QueueDialogState>({
    open: false,
    idea: null,
    profile: "aa_company",
    contentPillar: "",
    toneHint: "",
  });

  const generateMutation = trpc.ideas.generate.useMutation({
    onSuccess: (data) => {
      setIdeas(data.ideas as Idea[]);
      setBatchId(data.batchId);
      setHasGenerated(true);
      toast.success(`${data.ideas.length} ideas generated`);
    },
    onError: (err) => toast.error(err.message),
  });

  const addToQueueMutation = trpc.ideas.addToQueue.useMutation({
    onSuccess: (data) => {
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === queueDialog.idea?.id ? { ...i, status: "queued", jobId: data.jobId } : i
        )
      );
      setQueueDialog((d) => ({ ...d, open: false }));
      toast.success("Added to generation queue", {
        action: {
          label: "View Job",
          onClick: () => navigate(`/jobs/${data.jobId}`),
        },
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.ideas.reject.useMutation({
    onSuccess: (_, vars) => {
      setIdeas((prev) =>
        prev.map((i) => (i.id === vars.ideaId ? { ...i, status: "rejected" } : i))
      );
    },
    onError: (err) => toast.error(err.message),
  });

  const allPillars =
    profile === "aa_company"
      ? AA_COMPANY_PILLARS
      : profile === "david_personal"
      ? DAVID_PERSONAL_PILLARS
      : [...AA_COMPANY_PILLARS, ...DAVID_PERSONAL_PILLARS];

  const pendingCount = ideas.filter((i) => i.status === "pending").length;
  const queuedCount = ideas.filter((i) => i.status === "queued").length;
  const rejectedCount = ideas.filter((i) => i.status === "rejected").length;

  function openQueueDialog(idea: Idea) {
    setQueueDialog({
      open: true,
      idea,
      profile: idea.suggestedProfile ?? "aa_company",
      contentPillar: idea.suggestedPillar ?? "",
      toneHint: "",
    });
  }

  return (
    <AppLayout title="Idea Generator">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            Batch Idea Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Describe a theme or topic and Claude will generate 10 specific, brand-aligned LinkedIn
            content ideas. Add any to the generation queue or dismiss them.
          </p>
        </div>

        {/* Generation form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Generate Ideas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="topic">Topic or Theme</Label>
              <Textarea
                id="topic"
                value={promptTopic}
                onChange={(e) => setPromptTopic(e.target.value)}
                placeholder="e.g. 'GC-MS testing and quality assurance', 'private label trends in 2025', 'lavender sourcing from Provence', 'why most essential oil brands don't test their products'..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Be specific — the more context you give, the more targeted the ideas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Profile</Label>
                <Select
                  value={profile}
                  onValueChange={(v) => setProfile(v as typeof profile)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both profiles</SelectItem>
                    <SelectItem value="aa_company">AA Company Page</SelectItem>
                    <SelectItem value="david_personal">David Personal Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Content Pillar (optional)</Label>
                <Select value={contentPillar} onValueChange={setContentPillar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any pillar</SelectItem>
                    {allPillars.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() =>
                  generateMutation.mutate({
                    promptTopic,
                    contentPillar: contentPillar === "any" ? undefined : contentPillar,
                    profile,
                  })
                }
                disabled={promptTopic.trim().length < 5 || generateMutation.isPending}
                className="gap-2"
              >
                {generateMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                {generateMutation.isPending ? "Generating..." : "Generate 10 Ideas"}
              </Button>
              {hasGenerated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setIdeas([]);
                    setBatchId(null);
                    setHasGenerated(false);
                    setPromptTopic("");
                  }}
                >
                  <RefreshCw size={13} />
                  Start Over
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {generateMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Claude is generating 10 ideas tailored to your topic...
            </p>
          </div>
        )}

        {hasGenerated && ideas.length > 0 && (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{ideas.length} ideas</span>
              {pendingCount > 0 && <span>{pendingCount} pending</span>}
              {queuedCount > 0 && (
                <span className="text-cyan-400 font-medium">{queuedCount} queued</span>
              )}
              {rejectedCount > 0 && <span className="text-muted-foreground">{rejectedCount} dismissed</span>}
            </div>

            {/* Idea cards */}
            <div className="space-y-3">
              {ideas.map((idea, idx) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  index={idx + 1}
                  onAddToQueue={() => openQueueDialog(idea)}
                  onReject={() => rejectMutation.mutate({ ideaId: idea.id })}
                  onViewJob={() => idea.jobId && navigate(`/jobs/${idea.jobId}`)}
                  isRejecting={rejectMutation.isPending}
                />
              ))}
            </div>

            {queuedCount > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
                  View Dashboard
                  <ChevronRight size={13} />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Queue confirmation dialog */}
        <Dialog
          open={queueDialog.open}
          onOpenChange={(o) => setQueueDialog((d) => ({ ...d, open: o }))}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Add to Generation Queue</DialogTitle>
            </DialogHeader>
            {queueDialog.idea && (
              <div className="space-y-4 py-2">
                <div className="bg-muted/50 rounded-md p-3 text-sm">
                  <p className="font-medium text-foreground">{queueDialog.idea.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{queueDialog.idea.description}</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Profile</Label>
                  <Select
                    value={queueDialog.profile}
                    onValueChange={(v) =>
                      setQueueDialog((d) => ({ ...d, profile: v as "aa_company" | "david_personal" }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aa_company">AA Company Page</SelectItem>
                      <SelectItem value="david_personal">David Personal Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Content Pillar</Label>
                  <Select
                    value={queueDialog.contentPillar}
                    onValueChange={(v) => setQueueDialog((d) => ({ ...d, contentPillar: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select pillar" />
                    </SelectTrigger>
                    <SelectContent>
                      {(queueDialog.profile === "aa_company"
                        ? AA_COMPANY_PILLARS
                        : DAVID_PERSONAL_PILLARS
                      ).map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tone Hint (optional)</Label>
                  <Input
                    value={queueDialog.toneHint}
                    onChange={(e) => setQueueDialog((d) => ({ ...d, toneHint: e.target.value }))}
                    placeholder="e.g. 'authoritative but accessible', 'conversational'"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQueueDialog((d) => ({ ...d, open: false }))}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!queueDialog.contentPillar || addToQueueMutation.isPending}
                onClick={() => {
                  if (!queueDialog.idea) return;
                  addToQueueMutation.mutate({
                    ideaId: queueDialog.idea.id,
                    profile: queueDialog.profile,
                    contentPillar: queueDialog.contentPillar,
                    toneHint: queueDialog.toneHint || undefined,
                  });
                }}
              >
                {addToQueueMutation.isPending ? (
                  <Loader2 size={13} className="mr-1.5 animate-spin" />
                ) : (
                  <Plus size={13} className="mr-1.5" />
                )}
                Add to Queue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// ─── Idea Card ────────────────────────────────────────────────────────────────

function IdeaCard({
  idea,
  index,
  onAddToQueue,
  onReject,
  onViewJob,
  isRejecting,
}: {
  idea: Idea;
  index: number;
  onAddToQueue: () => void;
  onReject: () => void;
  onViewJob: () => void;
  isRejecting: boolean;
}) {
  const isQueued = idea.status === "queued";
  const isRejected = idea.status === "rejected";

  return (
    <Card
      className={`transition-all border ${
        isRejected
          ? "opacity-40 border-border"
          : isQueued
          ? "border-primary/40 bg-primary/5"
          : "border-border hover:border-border/80"
      }`}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          {/* Index */}
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-medium text-muted-foreground">{index}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground leading-snug flex-1">
                {idea.title}
              </p>
              {isQueued && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs shrink-0">
                  <CheckCircle size={10} className="mr-1" />
                  Queued
                </Badge>
              )}
              {isRejected && (
                <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                  Dismissed
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{idea.description}</p>

            <div className="flex items-center gap-2 flex-wrap">
              {idea.suggestedPillar && (
                <Badge variant="outline" className="text-xs">
                  <Lightbulb size={9} className="mr-1" />
                  {idea.suggestedPillar}
                </Badge>
              )}
              {idea.suggestedProfile && (
                <Badge variant="outline" className="text-xs">
                  {idea.suggestedProfile === "aa_company" ? "AA Company" : "David Personal"}
                </Badge>
              )}
            </div>

            {idea.rationale && (
              <p className="text-xs text-muted-foreground italic">{idea.rationale}</p>
            )}
          </div>

          {/* Actions */}
          {!isRejected && (
            <div className="flex items-center gap-1.5 shrink-0">
              {isQueued ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={onViewJob}
                >
                  View Job
                  <ChevronRight size={11} />
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={onAddToQueue}
                  >
                    <Plus size={11} />
                    Queue
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={onReject}
                    disabled={isRejecting}
                  >
                    <X size={13} />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
