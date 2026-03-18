import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
  Loader2,
  Bookmark,
  Trash2,
  ChevronRight,
  Sparkles,
  RotateCcw,
  Send,
  FileText,
  Building2,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { AA_COMPANY_PILLARS, DAVID_PERSONAL_PILLARS } from "@/lib/pillars";

type Profile = "aa_company" | "david_personal" | "blog_post";

type SavedIdea = {
  id: number;
  title: string;
  description: string;
  suggestedPillar: string | null;
  suggestedProfile: Profile | null;
  status: "pending" | "queued" | "rejected";
  savedAt: string | null;
  jobId: number | null;
};

type DraftState =
  | { phase: "idle" | "configuring" | "generating" }
  | { phase: "draft" | "redrafting" | "submitting"; jobId: number; postId: number; content: string }
  | { phase: "submitted"; status: "pending_approval" | "pending_guardrail"; message: string };

function profileLabel(p: Profile | null) {
  if (p === "david_personal") return "David Personal";
  if (p === "blog_post") return "Blog Post";
  return "AA Company";
}

function ProfileIcon({ profile }: { profile: Profile | null }) {
  if (profile === "david_personal") return <User size={11} className="text-amber-400" />;
  if (profile === "blog_post") return <BookOpen size={11} className="text-purple-400" />;
  return <Building2 size={11} className="text-cyan-400" />;
}

function profileColor(p: Profile | null) {
  if (p === "david_personal") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (p === "blog_post") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
}

export default function SavedIdeasPage() {
  const [, navigate] = useLocation();
  const [selectedIdea, setSelectedIdea] = useState<SavedIdea | null>(null);
  const [draft, setDraft] = useState<DraftState>({ phase: "idle" });

  const [draftProfile, setDraftProfile] = useState<Profile>("aa_company");
  const [draftPillar, setDraftPillar] = useState<string>("");
  const [draftTone, setDraftTone] = useState<string>("");
  const [redraftFeedback, setRedraftFeedback] = useState<string>("");

  const utils = trpc.useUtils();

  const { data: savedIdeas = [], isLoading } = trpc.ideas.listSaved.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  const deleteMutation = trpc.ideas.reject.useMutation({
    onSuccess: () => {
      utils.ideas.listSaved.invalidate();
      setSelectedIdea(null);
      setDraft({ phase: "idle" });
      toast.success("Idea removed from Saved Ideas");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateDraftMutation = trpc.ideas.generateDraft.useMutation({
    onSuccess: (data) => {
      setDraft({ phase: "draft", jobId: data.jobId, postId: data.postId, content: data.content });
      setRedraftFeedback("");
      toast.success("Draft generated");
    },
    onError: (err) => {
      setDraft((prev) => {
        if (prev.phase === "redrafting") {
          return { phase: "draft", jobId: prev.jobId, postId: prev.postId, content: prev.content };
        }
        return { phase: "configuring" };
      });
      toast.error(err.message);
    },
  });

  const [challengerReviews, setChallengerReviews] = useState<Array<{ persona: string; review: string }> | null>(null);
  const [challengerLoading, setChallengerLoading] = useState(false);

  const challengerReviewMutation = trpc.ideas.challengerReview.useMutation({
    onSuccess: (data) => {
      setChallengerReviews(data.reviews);
      setChallengerLoading(false);
    },
    onError: (err) => {
      setChallengerLoading(false);
      toast.error("Challenger Review failed: " + err.message);
    },
  });

  const submitMutation = trpc.ideas.submitForApproval.useMutation({
    onSuccess: (data) => {
      setDraft({ phase: "submitted", status: data.status, message: data.message });
      utils.ideas.listSaved.invalidate();
      toast.success(data.message);
    },
    onError: (err) => {
      setDraft((prev) => {
        if (prev.phase === "submitting") {
          return { phase: "draft", jobId: prev.jobId, postId: prev.postId, content: prev.content };
        }
        return prev;
      });
      toast.error(err.message);
    },
  });

  function selectIdea(idea: SavedIdea) {
    setSelectedIdea(idea);
    const profile = idea.suggestedProfile ?? "aa_company";
    setDraftProfile(profile);
    const pillars = profile === "david_personal" ? DAVID_PERSONAL_PILLARS : AA_COMPANY_PILLARS;
    setDraftPillar(idea.suggestedPillar ?? pillars[0] ?? "");
    setDraftTone("");
    setRedraftFeedback("");
    setDraft({ phase: "configuring" });
  }

  function handleGenerate() {
    if (!selectedIdea) return;
    setDraft({ phase: "generating" });
    generateDraftMutation.mutate({
      ideaId: selectedIdea.id,
      profile: draftProfile,
      contentPillar: draftPillar || "General",
      toneHint: draftTone || undefined,
    });
  }

  function handleChallengerReview() {
    if (draft.phase !== "draft") return;
    setChallengerLoading(true);
    setChallengerReviews(null);
    challengerReviewMutation.mutate({ postId: draft.postId });
  }

  function handleRedraft() {
    if (!selectedIdea || draft.phase !== "draft") return;
    const { jobId, postId, content } = draft;
    setChallengerReviews(null);
    setDraft({ phase: "redrafting", jobId, postId, content });
    generateDraftMutation.mutate({
      ideaId: selectedIdea.id,
      profile: draftProfile,
      contentPillar: draftPillar || "General",
      toneHint: draftTone || undefined,
      redraftFeedback: redraftFeedback || undefined,
      existingJobId: jobId,
    });
  }

  function handleSubmit() {
    if (draft.phase !== "draft") return;
    const { jobId, postId, content } = draft;
    setDraft({ phase: "submitting", jobId, postId, content });
    submitMutation.mutate({
      jobId,
      postId,
      appBaseUrl: window.location.origin,
    });
  }

  const pillarsForProfile = draftProfile === "david_personal" ? DAVID_PERSONAL_PILLARS : AA_COMPANY_PILLARS;

  return (
    <AppLayout title="Saved Ideas">
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Left panel */}
        <div className="w-72 shrink-0 flex flex-col border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Bookmark size={14} className="text-cyan-400" />
            <span className="text-sm font-semibold text-foreground">Saved Ideas</span>
            {savedIdeas.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                {savedIdeas.length}
              </Badge>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </div>
            ) : savedIdeas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2">
                <Bookmark size={24} className="text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No saved ideas yet.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-cyan-400"
                  onClick={() => navigate("/idea-generator")}
                >
                  Generate ideas <ChevronRight size={11} />
                </Button>
              </div>
            ) : (
              savedIdeas.map((idea) => (
                <button
                  key={idea.id}
                  onClick={() => selectIdea(idea as SavedIdea)}
                  className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors hover:bg-muted/40 ${
                    selectedIdea?.id === idea.id ? "bg-muted/60 border-l-2 border-l-cyan-500" : ""
                  }`}
                >
                  <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{idea.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] border ${profileColor(idea.suggestedProfile)}`}>
                      <ProfileIcon profile={idea.suggestedProfile} />
                      {profileLabel(idea.suggestedProfile)}
                    </span>
                    {idea.jobId && (
                      <span className="text-[9px] text-muted-foreground/60">• draft exists</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="p-3 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs" onClick={() => navigate("/idea-generator")}>
              <Sparkles size={11} />
              Generate more ideas
            </Button>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col border border-border rounded-lg bg-card overflow-hidden">
          {!selectedIdea ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <FileText size={32} className="text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Select an idea to start drafting</p>
              <p className="text-xs text-muted-foreground/60 max-w-xs">
                Pick a saved idea from the left. Generate a draft, request a redraft with feedback, then submit for approval.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${profileColor(selectedIdea.suggestedProfile)}`}>
                      <ProfileIcon profile={selectedIdea.suggestedProfile} />
                      {profileLabel(selectedIdea.suggestedProfile)}
                    </span>
                    {selectedIdea.suggestedPillar && (
                      <span className="text-[10px] text-muted-foreground">{selectedIdea.suggestedPillar}</span>
                    )}
                  </div>
                  <h2 className="text-sm font-semibold text-foreground leading-snug">{selectedIdea.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selectedIdea.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteMutation.mutate({ ideaId: selectedIdea.id })}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={13} />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {(draft.phase === "configuring" || draft.phase === "idle") && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">Configure the draft before generating.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Profile</Label>
                        <Select value={draftProfile} onValueChange={(v) => { setDraftProfile(v as Profile); setDraftPillar(""); }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aa_company">AA Company Page</SelectItem>
                            <SelectItem value="david_personal">David Personal Page</SelectItem>
                            <SelectItem value="blog_post">Blog Post</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Content Pillar</Label>
                        <Select value={draftPillar} onValueChange={setDraftPillar}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select pillar" /></SelectTrigger>
                          <SelectContent>
                            {pillarsForProfile.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tone hint <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Textarea
                        value={draftTone}
                        onChange={(e) => setDraftTone(e.target.value)}
                        placeholder="e.g. 'conversational and direct', 'authoritative but approachable'"
                        rows={2}
                        className="resize-none text-xs"
                      />
                    </div>
                    <Button onClick={handleGenerate} className="gap-2 w-full" disabled={generateDraftMutation.isPending}>
                      <Sparkles size={13} />
                      Generate Draft
                    </Button>
                  </div>
                )}

                {draft.phase === "generating" && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 size={28} className="animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Generating draft…</p>
                    <p className="text-xs text-muted-foreground/60">This usually takes 10–20 seconds</p>
                  </div>
                )}

                {(draft.phase === "draft" || draft.phase === "redrafting" || draft.phase === "submitting") && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText size={13} className="text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Draft</span>
                        {draft.phase === "redrafting" && (
                          <span className="ml-auto flex items-center gap-1 text-xs text-amber-400">
                            <Loader2 size={11} className="animate-spin" /> Regenerating…
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{draft.content}</p>
                    </div>

                    {draft.phase === "draft" && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Redraft feedback <span className="text-muted-foreground font-normal">(optional)</span></Label>
                          <Textarea
                            value={redraftFeedback}
                            onChange={(e) => setRedraftFeedback(e.target.value)}
                            placeholder="e.g. 'Make it shorter and punchier', 'Add a stat about GC-MS testing', 'Less formal tone'"
                            rows={2}
                            className="resize-none text-xs"
                          />
                        </div>
                        {/* Challenger Review panel */}
                        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-violet-500/10">
                            <div className="flex items-center gap-1.5">
                              <Users size={12} className="text-violet-400" />
                              <span className="text-xs font-semibold text-violet-300">Challenger Review</span>
                            </div>
                            <button
                              onClick={handleChallengerReview}
                              disabled={challengerLoading}
                              className="text-[11px] text-violet-400 hover:text-violet-300 disabled:opacity-50 flex items-center gap-1"
                            >
                              {challengerLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                              {challengerLoading ? "Running…" : challengerReviews ? "Re-run" : "Run"}
                            </button>
                          </div>
                          {challengerReviews && challengerReviews.length > 0 ? (
                            <div className="divide-y divide-violet-500/10">
                              {challengerReviews.map((r, i) => (
                                <div key={i} className="px-3 py-2">
                                  <p className="text-[10px] font-semibold text-violet-400 mb-0.5">{r.persona}</p>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">{r.review}</p>
                                </div>
                              ))}
                            </div>
                          ) : !challengerLoading ? (
                            <p className="px-3 py-2 text-[11px] text-muted-foreground/60">6-persona AI critique of this draft. Run before submitting.</p>
                          ) : null}
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={handleRedraft}>
                            <RotateCcw size={12} />
                            Redraft
                          </Button>
                          <Button size="sm" className="gap-1.5 flex-1" onClick={handleSubmit}>
                            <Send size={12} />
                            Submit for Approval
                          </Button>
                        </div>
                      </>
                    )}

                    {draft.phase === "submitting" && (
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 size={16} className="animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Running guardrails and submitting…</span>
                      </div>
                    )}
                  </div>
                )}

                {draft.phase === "submitted" && (
                  <div className="space-y-4">
                    {draft.status === "pending_approval" ? (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 flex items-start gap-3">
                        <CheckCircle2 size={16} className="text-green-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-400">Submitted for approval</p>
                          <p className="text-xs text-muted-foreground mt-1">{draft.message}</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">The reviewer will receive an email with a review link.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
                        <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-400">Guardrail flags detected</p>
                          <p className="text-xs text-muted-foreground mt-1">{draft.message}</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">The post is in the Approval Queue with a red flag indicator for review.</p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => navigate("/approval-queue")}>
                        View in Approval Queue <ChevronRight size={11} />
                      </Button>
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setSelectedIdea(null); setDraft({ phase: "idle" }); }}>
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
