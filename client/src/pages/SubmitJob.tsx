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
import { AlertTriangle, Loader2, PenLine, Info } from "lucide-react";

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

  const pillars = profile === "aa_company" ? AA_PILLARS : profile === "david_personal" ? DAVID_PILLARS : [];

  const submitMutation = trpc.jobs.submit.useMutation({
    onSuccess: (data) => {
      if (data.status === "pending_confirmation") {
        setSubmittedJobId(data.jobId);
        setShowConfirmation(true);
      } else {
        toast.success("Content idea submitted! Generation has started.");
        navigate("/dashboard");
      }
    },
    onError: (err) => {
      toast.error(`Submission failed: ${err.message}`);
    },
  });

  const confirmMutation = trpc.jobs.confirmNamedClient.useMutation({
    onSuccess: () => {
      toast.success("Confirmed. Generation has started.");
      navigate("/dashboard");
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
