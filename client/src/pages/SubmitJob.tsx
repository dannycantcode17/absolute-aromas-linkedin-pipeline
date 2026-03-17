import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { AlertTriangle, Loader2, PenLine, Info, ChevronDown, ChevronUp, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const AA_PILLARS = [
  "Manufacturer Authority",
  "Private Label Education",
  "Made by Makers",
  "ICP Pain Points",
  "Social Proof & Case Studies",
  "Industry News & Commentary",
];

const DAVID_PILLARS = [
  "Industry Insider",
  "Sourcing & Origin",
  "Quality & Adulteration",
  "Founder Perspective",
  "Brand Advice",
  "Industry History & Evolution",
];

export default function SubmitJob() {
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<"aa_company" | "david_personal" | "">("");
  const [contentPillar, setContentPillar] = useState("");
  const [topic, setTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [toneHint, setToneHint] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [namedClientFlag, setNamedClientFlag] = useState(false);
  const [variantCount, setVariantCount] = useState(3);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submittedJobId, setSubmittedJobId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  const pillars = profile === "aa_company" ? AA_PILLARS : profile === "david_personal" ? DAVID_PILLARS : [];

  const submitMutation = trpc.jobs.submit.useMutation({
    onSuccess: (data) => {
      if (data.status === "pending_confirmation") {
        setSubmittedJobId(data.jobId);
        setShowConfirmation(true);
      } else {
        setSubmittedJobId(data.jobId);
        setShowSuccess(true);
      }
    },
    onError: (err) => {
      toast.error(`Submission failed: ${err.message}`);
    },
  });

  const confirmMutation = trpc.jobs.confirmNamedClient.useMutation({
    onSuccess: (_, variables) => {
      setShowConfirmation(false);
      setSubmittedJobId(variables.jobId);
      setShowSuccess(true);
    },
    onError: (err) => {
      toast.error(`Confirmation failed: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !contentPillar || !topic.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    submitMutation.mutate({
      profile: profile as "aa_company" | "david_personal",
      contentPillar,
      topic: topic.trim(),
      targetAudience: targetAudience.trim() || undefined,
      toneHint: toneHint.trim() || undefined,
      referenceUrl: referenceUrl.trim() || undefined,
      namedClientFlag,
      variantCount,
    });
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (showSuccess && submittedJobId) {
    return (
      <AppLayout title="Submitted">
        <div className="max-w-lg mx-auto">
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-100 mb-2">Idea Submitted</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Your content idea is in the pipeline. Claude is now fetching the Absolute Aromas style guide
              and generating {variantCount} post variants. The approver will receive an email once drafts
              are ready for review — typically within a few minutes.
            </p>
            <div className="rounded-lg border border-white/5 bg-[#0f1117] p-4 text-left mb-6">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">What happens next</p>
              <ol className="space-y-2">
                {[
                  "Style guide fetched from Notion",
                  "Claude generates " + variantCount + " post variants",
                  "Automated guardrail checks run on each variant",
                  "Approver receives email with drafts for review",
                  "Approved post appears in the Ready-to-Post queue",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex gap-3 justify-center">
              <Link href={`/dashboard/job/${submittedJobId}`}>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-500 text-[#0f1117] text-sm font-semibold hover:bg-cyan-400 transition-colors">
                  Track this job <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setSubmittedJobId(null);
                  setProfile("");
                  setContentPillar("");
                  setTopic("");
                  setTargetAudience("");
                  setToneHint("");
                  setReferenceUrl("");
                  setNamedClientFlag(false);
                  setVariantCount(3);
                }}
                className="px-4 py-2 rounded border border-white/10 text-slate-300 text-sm hover:border-white/20 hover:text-slate-100 transition-colors"
              >
                Submit another
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (showConfirmation && submittedJobId) {
    return (
      <AppLayout title="Confirm Named Client Usage">
        <div className="max-w-lg mx-auto">
          <Card className="border-amber-500/30 bg-amber-500/8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-400" size={18} />
                <CardTitle className="text-foreground text-base">Named Client Confirmation Required</CardTitle>
              </div>
              <CardDescription className="text-muted-foreground">
                You indicated this post may reference a named client. Please confirm this is intentional
                before generation proceeds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground">
                By confirming, you acknowledge that:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>You have permission to reference this client publicly</li>
                <li>The client has approved being named in LinkedIn content</li>
                <li>The post will still require approver sign-off before publishing</li>
              </ul>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => confirmMutation.mutate({ jobId: submittedJobId })}
                  disabled={confirmMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-400 text-background"
                >
                  {confirmMutation.isPending && <Loader2 size={14} className="mr-2 animate-spin" />}
                  Confirm & Generate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmation(false);
                    setSubmittedJobId(null);
                    setNamedClientFlag(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Submit Content Idea">
      <div className="max-w-2xl mx-auto">
        {/* Collapsible how-to */}
        <div className="mb-5 rounded-lg border border-white/5 bg-[#1a1d27] overflow-hidden">
          <button
            type="button"
            onClick={() => setHowToOpen(!howToOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:text-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span className="font-medium">How this works</span>
            </span>
            {howToOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {howToOpen && (
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              <ol className="space-y-2">
                {[
                  { step: "Fill in the form below", detail: "Choose the profile, content pillar, and describe your idea. The more detail you give, the better Claude's output." },
                  { step: "Claude generates variants", detail: "The AI fetches the live Absolute Aromas style guide from Notion and produces 3–5 distinct post drafts tailored to the chosen profile's voice." },
                  { step: "Guardrail checks run automatically", detail: "Every draft is checked against 6 brand compliance rules (medical claims, revenue figures, competitor names, etc.). Flagged posts go to Guardrail Review before the approver sees them." },
                  { step: "Approver receives an email", detail: "Danny (for AA Company posts) or David (for his personal page) gets an email with all drafts and a one-click approve button." },
                  { step: "Approved posts land in the queue", detail: "Once approved, the post appears in Ready-to-Post. Copy it, paste it into LinkedIn, then confirm publication with the LinkedIn URL." },
                ].map(({ step, detail }, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">{i + 1}</span>
                    <div>
                      <span className="text-slate-200 font-medium">{step}: </span>
                      <span className="text-slate-500">{detail}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PenLine size={16} />
                Content Profile
              </CardTitle>
              <CardDescription>
                Select which LinkedIn profile this post is for. This determines the voice and approver.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setProfile("aa_company"); setContentPillar(""); }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    profile === "aa_company"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-sm text-foreground">AA Company Page</p>
                  <p className="text-xs text-muted-foreground mt-1">Brand voice — approved by Danny</p>
                </button>
                <button
                  type="button"
                  onClick={() => { setProfile("david_personal"); setContentPillar(""); }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    profile === "david_personal"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-medium text-sm text-foreground">David Personal Page</p>
                  <p className="text-xs text-muted-foreground mt-1">David's voice — approved by David only</p>
                </button>
              </div>
              {profile === "david_personal" && (
                <Alert className="border-primary/30 bg-primary/8">
                  <Info size={14} className="text-primary" />
                  <AlertDescription className="text-muted-foreground text-xs">
                    Posts for David's personal page can only be approved by David. Danny cannot approve these.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Content details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Content Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Pillar */}
              <div className="space-y-1.5">
                <Label htmlFor="pillar">
                  Content Pillar <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={contentPillar}
                  onValueChange={setContentPillar}
                  disabled={!profile}
                >
                  <SelectTrigger id="pillar">
                    <SelectValue placeholder={profile ? "Select a content pillar" : "Select a profile first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pillars.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic */}
              <div className="space-y-1.5">
                <Label htmlFor="topic">
                  Topic / Idea / Angle <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Describe the content idea in as much detail as you like. The more context, the better the output."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{topic.length}/2000 characters</p>
              </div>

              {/* Target Audience */}
              <div className="space-y-1.5">
                <Label htmlFor="audience">Target Audience <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Scaling wellness brands, private label buyers, B2B procurement"
                />
              </div>

              {/* Tone Hint */}
              <div className="space-y-1.5">
                <Label htmlFor="tone">Tone Hint <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="tone"
                  value={toneHint}
                  onChange={(e) => setToneHint(e.target.value)}
                  placeholder="e.g. Educational, storytelling, direct and punchy"
                />
              </div>

              {/* Reference URL */}
              <div className="space-y-1.5">
                <Label htmlFor="url">Reference URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="url"
                  type="url"
                  value={referenceUrl}
                  onChange={(e) => setReferenceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generation Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Variant count */}
              <div className="space-y-1.5">
                <Label htmlFor="variants">Number of Variants</Label>
                <Select
                  value={String(variantCount)}
                  onValueChange={(v) => setVariantCount(Number(v))}
                >
                  <SelectTrigger id="variants" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} variants</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The AI will generate this many distinct post variants for the approver to choose from.
                </p>
              </div>

              {/* Named client flag */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <Checkbox
                  id="namedClient"
                  checked={namedClientFlag}
                  onCheckedChange={(v) => setNamedClientFlag(Boolean(v))}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="namedClient" className="font-medium text-sm cursor-pointer">
                    This post references a named client
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If checked, a secondary confirmation step is required before generation. If unchecked,
                    the AI is instructed not to include any client names.
                  </p>
                  {namedClientFlag && (
                    <Badge variant="outline" className="mt-2 border-amber-300 text-amber-700 bg-amber-50 text-xs">
                      <AlertTriangle size={10} className="mr-1" />
                      Confirmation required after submission
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitMutation.isPending || !profile || !contentPillar || !topic.trim()}
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <PenLine size={16} className="mr-2" />
                Submit & Generate
              </>
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
