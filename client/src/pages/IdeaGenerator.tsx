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
  Loader2,
  Sparkles,
  X,
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
  suggestedProfile: "aa_company" | "david_personal" | "blog_post" | null;
  rationale: string | null;
  status: "pending" | "queued" | "rejected";
  savedAt: string | null;
  jobId: number | null;
};

function ProfileBadge({ profile }: { profile: "aa_company" | "david_personal" | "blog_post" | null }) {
  if (profile === "david_personal") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <User size={9} /> David Personal
      </span>
    );
  }
  if (profile === "blog_post") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
        <Lightbulb size={9} /> Blog Post
      </span>
    );
  }
  if (profile === null) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
      <Building2 size={9} /> AA Company
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

  const generateMutation = trpc.ideas.generate.useMutation({
    onSuccess: (data) => {
      setIdeas(data.ideas as Idea[]);
      setHasGenerated(true);
      toast.success(`${data.ideas.length} ideas generated`);
    },
    onError: (err) => toast.error(err.message),
  });

  const saveMutation = trpc.ideas.save.useMutation({
    onSuccess: (_, vars) => {
      // Update local state to reflect savedAt — derive from DB response
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === vars.ideaId ? { ...i, savedAt: new Date().toISOString() } : i
        )
      );
      toast.success("Idea saved — find it in Saved Ideas", {
        action: { label: "Go there", onClick: () => navigate("/saved-ideas") },
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

  // Derive saved count from DB state (savedAt), not from local Set
  const savedCount = ideas.filter((i) => i.savedAt !== null && i.status !== "rejected").length;

  function toggleSave(idea: Idea) {
    if (idea.savedAt) {
      // Already saved — no unsave action (ideas persist in Saved Ideas until deleted there)
      toast.info("This idea is already in Saved Ideas. Delete it there if you no longer want it.");
      return;
    }
    saveMutation.mutate({ ideaId: idea.id });
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
              Tick the ones worth keeping — they go straight to <strong>Saved Ideas</strong> where you can draft and submit them.
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
                onClick={() => { setIdeas([]); setHasGenerated(false); setPromptTopic(""); }}>
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
            </div>
            {ideas.map((idea, idx) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                index={idx + 1}
                isSaved={idea.savedAt !== null}
                isSaving={saveMutation.isPending && saveMutation.variables?.ideaId === idea.id}
                onToggleSave={() => toggleSave(idea)}
                onReject={() => rejectMutation.mutate({ ideaId: idea.id })}
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
      </div>
    </AppLayout>
  );
}

function IdeaCard({
  idea, index, isSaved, isSaving, onToggleSave, onReject,
}: {
  idea: Idea; index: number; isSaved: boolean; isSaving: boolean;
  onToggleSave: () => void; onReject: () => void;
}) {
  const isRejected = idea.status === "rejected";

  return (
    <div className={`rounded-lg border transition-all ${
      isRejected ? "opacity-35 border-border/40 bg-card/50"
      : isSaved ? "border-cyan-500/30 bg-cyan-500/5"
      : "border-border bg-card hover:border-border/80"
    }`}>
      <div className="p-4 flex items-start gap-3">
        {!isRejected && (
          <div className="mt-0.5 shrink-0">
            {isSaving ? (
              <Loader2 size={14} className="animate-spin text-cyan-400 mt-0.5" />
            ) : (
              <Checkbox
                checked={isSaved}
                onCheckedChange={onToggleSave}
                className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
            )}
          </div>
        )}
        {isRejected && (
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-medium text-muted-foreground">{index}</span>
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-snug flex-1">{idea.title}</p>
            {isRejected && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">Dismissed</Badge>
            )}
            {isSaved && !isRejected && (
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
        {!isRejected && !isSaved && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
            onClick={onReject}
          >
            <X size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}
