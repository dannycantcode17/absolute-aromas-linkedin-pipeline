import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Bookmark,
  Sparkles,
  Plus,
  X,
  Building2,
  User,
  Lightbulb,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { AA_COMPANY_PILLARS, DAVID_PERSONAL_PILLARS } from "@/lib/pillars";

type SavedIdea = {
  id: number;
  title: string;
  description: string;
  suggestedPillar: string | null;
  suggestedProfile: "aa_company" | "david_personal" | "blog_post" | null;
  rationale: string | null;
  status: "pending" | "queued" | "rejected";
  jobId: number | null;
  savedAt: Date | null;
};

function ProfileBadge({ profile }: { profile: "aa_company" | "david_personal" | "blog_post" | null }) {
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

function formatSavedAt(date: Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SavedIdeasPage() {
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [queueProfile, setQueueProfile] = useState<"aa_company" | "david_personal">("aa_company");
  // Note: blog_post ideas default to aa_company profile for queueing
  const [queuePillar, setQueuePillar] = useState<string>("");
  const [queuedIds, setQueuedIds] = useState<Set<number>>(new Set());

  const { data: savedIdeas = [], isLoading, refetch } = trpc.ideas.listSaved.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const addToQueueMutation = trpc.ideas.addToQueue.useMutation({
    onSuccess: (data, vars) => {
      setQueuedIds((prev) => { const next = new Set(prev); next.add(vars.ideaId); return next; });
      toast.success("Added to generation queue", {
        action: { label: "View Job", onClick: () => navigate(`/jobs/${data.jobId}`) },
      });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.ideas.reject.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Idea removed from saved");
      if (selectedId === vars.ideaId) setSelectedId(null);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedIdea = savedIdeas.find((i) => i.id === selectedId) ?? null;

  // Auto-populate profile/pillar from selected idea
  function selectIdea(idea: SavedIdea) {
    setSelectedId(idea.id);
    // blog_post ideas default to aa_company for queueing
    setQueueProfile((idea.suggestedProfile === "blog_post" || idea.suggestedProfile === null) ? "aa_company" : idea.suggestedProfile);
    setQueuePillar(idea.suggestedPillar ?? "");
  }

  const pillarsForProfile =
    queueProfile === "aa_company" ? AA_COMPANY_PILLARS : DAVID_PERSONAL_PILLARS;

  const pendingIdeas = savedIdeas.filter((i) => i.status === "pending");
  const queuedIdeas = savedIdeas.filter((i) => i.status === "queued");

  return (
    <AppLayout title="Saved Ideas">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bookmark size={20} className="text-cyan-400" />
              Saved Ideas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ideas you've ticked in the generator. Select one to queue it for generation.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/ideas")}>
            <Sparkles size={13} />
            Generate More
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : pendingIdeas.length === 0 && queuedIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Bookmark size={20} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No saved ideas yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Go to the Idea Generator and tick the ideas you want to keep.
              </p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => navigate("/ideas")}>
              <Sparkles size={13} />
              Open Idea Generator
            </Button>
          </div>
        ) : (
          <div className="flex gap-5 flex-1 min-h-0">
            {/* Left panel: idea list */}
            <div className="w-80 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
              {pendingIdeas.length > 0 && (
                <>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-1 mb-1">
                    Pending ({pendingIdeas.length})
                  </p>
                  {pendingIdeas.map((idea) => (
                    <IdeaListItem
                      key={idea.id}
                      idea={idea}
                      isSelected={selectedId === idea.id}
                      isQueued={queuedIds.has(idea.id)}
                      onClick={() => selectIdea(idea)}
                      onRemove={() => rejectMutation.mutate({ ideaId: idea.id })}
                    />
                  ))}
                </>
              )}
              {queuedIdeas.length > 0 && (
                <>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-1 mt-3 mb-1">
                    Already Queued ({queuedIdeas.length})
                  </p>
                  {queuedIdeas.map((idea) => (
                    <IdeaListItem
                      key={idea.id}
                      idea={idea}
                      isSelected={selectedId === idea.id}
                      isQueued={true}
                      onClick={() => selectIdea(idea)}
                      onRemove={() => {}}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Right panel: drafting workspace */}
            <div className="flex-1 min-w-0">
              {!selectedIdea ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center rounded-lg border border-dashed border-border/60">
                  <ArrowLeft size={20} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Select an idea to queue it for generation</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card p-6 space-y-5">
                  {/* Idea detail */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <h2 className="text-base font-semibold text-foreground flex-1 leading-snug">
                        {selectedIdea.title}
                      </h2>
                      <ProfileBadge profile={selectedIdea.suggestedProfile} />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedIdea.description}
                    </p>
                    {selectedIdea.suggestedPillar && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground border border-border/60">
                          <Lightbulb size={9} />
                          {selectedIdea.suggestedPillar}
                        </span>
                      </div>
                    )}
                    {selectedIdea.rationale && (
                      <p className="text-xs text-muted-foreground/70 italic">{selectedIdea.rationale}</p>
                    )}
                    {selectedIdea.savedAt && (
                      <p className="text-[11px] text-muted-foreground/50">
                        Saved {formatSavedAt(selectedIdea.savedAt)}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-border/60 pt-5 space-y-4">
                    <p className="text-sm font-medium text-foreground">Queue for generation</p>

                    {selectedIdea.status === "queued" ? (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle size={15} />
                        Already in the generation queue
                        {selectedIdea.jobId && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 ml-2"
                            onClick={() => navigate(`/jobs/${selectedIdea.jobId}`)}
                          >
                            View Job <ChevronRight size={11} />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Profile</Label>
                            <Select
                              value={queueProfile}
                              onValueChange={(v) => {
                                setQueueProfile(v as "aa_company" | "david_personal");
                                setQueuePillar("");
                              }}
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
                            <Select value={queuePillar} onValueChange={setQueuePillar}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select pillar" />
                              </SelectTrigger>
                              <SelectContent>
                                {pillarsForProfile.map((p) => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            className="gap-1.5"
                            disabled={!queuePillar || addToQueueMutation.isPending}
                            onClick={() => {
                              addToQueueMutation.mutate({
                                ideaId: selectedIdea.id,
                                profile: queueProfile,
                                contentPillar: queuePillar,
                              });
                            }}
                          >
                            {addToQueueMutation.isPending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Plus size={13} />
                            )}
                            Add to Queue
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive gap-1.5"
                            onClick={() => rejectMutation.mutate({ ideaId: selectedIdea.id })}
                          >
                            <X size={13} />
                            Remove
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Idea List Item ───────────────────────────────────────────────────────────

function IdeaListItem({
  idea,
  isSelected,
  isQueued,
  onClick,
  onRemove,
}: {
  idea: SavedIdea;
  isSelected: boolean;
  isQueued: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`rounded-md border p-3 cursor-pointer transition-all ${
        isSelected
          ? "border-primary/50 bg-primary/5"
          : isQueued
          ? "border-border/40 bg-muted/30 opacity-60"
          : "border-border hover:border-border/80 hover:bg-muted/20"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
            {idea.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <ProfileBadge profile={idea.suggestedProfile} />
            {isQueued && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                <CheckCircle size={8} /> Queued
              </span>
            )}
            {idea.savedAt && (
              <span className="text-[10px] text-muted-foreground/50">
                {formatSavedAt(idea.savedAt)}
              </span>
            )}
          </div>
        </div>
        {!isQueued && (
          <button
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
