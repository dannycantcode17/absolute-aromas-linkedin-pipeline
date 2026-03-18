import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Loader2,
  Sparkles,
  Plus,
  X,
  CheckCircle,
  ChevronRight,
  Lightbulb,
  Bookmark,
  BookmarkCheck,
  Building2,
  User,
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

function ProfileBadge({ profile }: { profile: "aa_company" | "david_personal" | null }) {
  if (profile === "david_personal") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <User size={9} /> David
      </span>
    );
  }
  if (profile === null) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
      <Building2 size={9} /> AA
    </span>
  );
}

export default function IdeaGenerator() {
  const [, navigate] = useLocation();

  const [promptTopic, setPromptTopic] = useState("");
  const [profile, setProfile] = useState<"aa_company" | "david_personal" | "both">("both");
  const [contentPillar, setContentPillar] = useState<string>("any");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
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
      setSavedIds(new Set());
      setHasGenerated(true);
      toast.success(`${data.ideas.length} ideas generated`);
    },
    onError: (err) => toast.error(err.message),
  });

  const saveMutation = trpc.ideas.save.useMutation({
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
        action: { label: "View Job", onClick: () => navigate(`/jobs/${data.jobId}`) },
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.ideas.reject.useMutation({
    onSuccess: (_, vars) => {
      setIdeas((prev) => prev.map((i) => (i.id === vars.ideaId ? { ...i, status: "rejected" } : i)));
    },
    onError: (err) => toast.error(err.message),
  });

  const allPillars =
    profile === "aa_company"
      ? AA_COMPANY_PILLARS
      : profile === "david_personal"
      ? DAVID_PERSONAL_PILLARS
      : [...AA_COMPANY_PILLARS, ...DAVID_PERSONAL_PILLARS];

  const queuedCount = ideas.filter((i) => i.status === "queued").length;
  const savedCount = savedIds.size;

  function openQueueDialog(idea: Idea) {
    setQueueDialog({
      open: true,
      idea,
      profile: idea.suggestedProfile ?? "aa_company",
      contentPillar: idea.suggestedPillar ?? "",
      toneHint: "",
    });
  }

  function toggleSave(idea: Idea) {
    if (savedIds.has(idea.id)) {
      setSavedIds((prev) => { const next = new Set(prev); next.delete(idea.id); return next; });
    } else {
      setSavedIds((prev) => { const next = new Set(prev); next.add(idea.id); return next; });
      saveMutation.mutate({ ideaId: idea.id });
      toast.success("Idea saved — find it in Saved Ideas");
    }
  }

  return (
    <AppLayout title="Idea Generator">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles size={20} className="text-primary" />
              Idea Generator
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Describe a theme or leave it blank for a broad mix. Claude generates 10 brand-aligned ideas.
              Tick the ones worth keeping — they go to <strong>Saved Ideas</strong>.
            </p>
          </div>
          {savedCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate("/saved-ideas")}>
              <BookmarkCheck size={13} className="text-cyan-400" />
              View {savedCount} saved
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic">
              Topic or Theme{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="topic"
              value={promptTopic}
              onChange={(e) => setPromptTopic(e.target.value)}
              placeholder="e.g. 'GC-MS testing and quality assurance', 'private label trends in 2025', 'lavender sourcing from Provence'… or leave blank for a broad mix."
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Profile</Label>
              <Select value={profile} onValueChange={(v) => setProfile(v as typeof profile)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both profiles</SelectItem>
                  <SelectItem value="aa_company">AA Company Page</SelectItem>
                  <SelectItem value="david_personal">David Personal Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Content Pillar <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={contentPillar} onValueChange={setContentPillar}>
                <SelectTrigger><SelectValue placeholder="Any pillar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any pillar</SelectItem>
                  {allPillars.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => generateMutation.mutate({
                promptTopic: promptTopic.trim() || "broad mix of brand-aligned topics",
                profile: profile === "both" ? undefined : profile,
                contentPillar: contentPillar === "any" ? undefined : contentPillar,
              })}
              disabled={generateMutation.isPending}
              className="gap-2"
            >
              {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generateMutation.isPending ? "Generating…" : "Generate 10 Ideas"}
            </Button>
            {hasGenerated && (
              <Button variant="ghost" size="sm" className="text-muted-foreground"
                onClick={() => { setIdeas([]); setSavedIds(new Set()); setHasGenerated(false); setPromptTopic(""); }}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {generateMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating 10 brand-aligned ideas…</p>
          </div>
        )}

        {hasGenerated && ideas.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
              <span className="font-medium text-foreground">{ideas.length} ideas</span>
              {savedCount > 0 && (
                <span className="text-cyan-400 font-medium flex items-center gap-1">
                  <Bookmark size={10} /> {savedCount} saved
                </span>
              )}
              {queuedCount > 0 && <span className="text-primary font-medium">{queuedCount} queued</span>}
            </div>
            {ideas.map((idea, idx) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                index={idx + 1}
                isSaved={savedIds.has(idea.id)}
                onToggleSave={() => toggleSave(idea)}
                onAddToQueue={() => openQueueDialog(idea)}
                onReject={() => rejectMutation.mutate({ ideaId: idea.id })}
                onViewJob={() => idea.jobId && navigate(`/jobs/${idea.jobId}`)}
              />
            ))}
            {savedCount > 0 && (
              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/saved-ideas")} className="gap-1.5">
                  <BookmarkCheck size={13} className="text-cyan-400" />
                  Go to Saved Ideas ({savedCount})
                  <ChevronRight size={13} />
                </Button>
              </div>
            )}
          </div>
        )}

        <Dialog open={queueDialog.open} onOpenChange={(o) => setQueueDialog((d) => ({ ...d, open: o }))}>
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
                  <Select value={queueDialog.profile}
                    onValueChange={(v) => setQueueDialog((d) => ({ ...d, profile: v as "aa_company" | "david_personal" }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aa_company">AA Company Page</SelectItem>
                      <SelectItem value="david_personal">David Personal Page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Content Pillar</Label>
                  <Select value={queueDialog.contentPillar}
                    onValueChange={(v) => setQueueDialog((d) => ({ ...d, contentPillar: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select pillar" /></SelectTrigger>
                    <SelectContent>
                      {(queueDialog.profile === "aa_company" ? AA_COMPANY_PILLARS : DAVID_PERSONAL_PILLARS).map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setQueueDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
              <Button size="sm" disabled={!queueDialog.contentPillar || addToQueueMutation.isPending}
                onClick={() => {
                  if (!queueDialog.idea) return;
                  addToQueueMutation.mutate({
                    ideaId: queueDialog.idea.id,
                    profile: queueDialog.profile,
                    contentPillar: queueDialog.contentPillar,
                    toneHint: queueDialog.toneHint || undefined,
                  });
                }}>
                {addToQueueMutation.isPending ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Plus size={13} className="mr-1.5" />}
                Add to Queue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function IdeaCard({
  idea, index, isSaved, onToggleSave, onAddToQueue, onReject, onViewJob,
}: {
  idea: Idea; index: number; isSaved: boolean;
  onToggleSave: () => void; onAddToQueue: () => void; onReject: () => void; onViewJob: () => void;
}) {
  const isQueued = idea.status === "queued";
  const isRejected = idea.status === "rejected";

  return (
    <div className={`rounded-lg border transition-all ${
      isRejected ? "opacity-35 border-border/40 bg-card/50"
      : isQueued ? "border-primary/40 bg-primary/5"
      : isSaved ? "border-cyan-500/30 bg-cyan-500/5"
      : "border-border bg-card hover:border-border/80"
    }`}>
      <div className="p-4 flex items-start gap-3">
        {!isRejected && !isQueued && (
          <div className="mt-0.5 shrink-0">
            <Checkbox checked={isSaved} onCheckedChange={onToggleSave}
              className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500" />
          </div>
        )}
        {(isRejected || isQueued) && (
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-medium text-muted-foreground">{index}</span>
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-snug flex-1">{idea.title}</p>
            {isQueued && (
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] shrink-0">
                <CheckCircle size={9} className="mr-1" />Queued
              </Badge>
            )}
            {isRejected && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">Dismissed</Badge>
            )}
            {isSaved && !isQueued && !isRejected && (
              <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/25 text-[10px] shrink-0">
                <Bookmark size={9} className="mr-1" />Saved
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{idea.description}</p>
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <ProfileBadge profile={idea.suggestedProfile} />
            {idea.suggestedPillar && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground border border-border/60">
                <Lightbulb size={9} />{idea.suggestedPillar}
              </span>
            )}
          </div>
          {idea.rationale && (
            <p className="text-[11px] text-muted-foreground/70 italic pt-0.5">{idea.rationale}</p>
          )}
        </div>
        {!isRejected && (
          <div className="flex items-center gap-1 shrink-0">
            {isQueued ? (
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={onViewJob}>
                View Job<ChevronRight size={11} />
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={onAddToQueue}>
                  <Plus size={11} />Queue
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={onReject}>
                  <X size={13} />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
