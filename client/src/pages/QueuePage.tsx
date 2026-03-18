import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Loader2,
  Building2,
  User,
  BookOpen,
  Copy,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Image as ImageIcon,
  RotateCcw,
  CheckSquare,
  Check,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/AppLayout";

type Profile = "aa_company" | "david_personal" | "blog_post";

type QueueItem = {
  post: {
    id: number;
    jobId: number;
    content: string;
    approvedAt: Date | null;
    approvedBy: string | null;
    variantLabel: string;
    suggestedPublishDate?: Date | null;
    publishedAt?: Date | null;
    linkedInUrl?: string | null;
    publicationStatus?: string | null;
  };
  job: {
    id: number;
    profile: Profile;
    topic: string;
    contentPillar: string;
  };
};

function profileConfig(profile: Profile) {
  if (profile === "david_personal") {
    return {
      label: "Next LinkedIn Post — David",
      shortLabel: "LinkedIn · David",
      icon: <User size={13} className="text-amber-400" />,
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      accentClass: "border-amber-500/30",
      headerClass: "text-amber-400",
      emptyIcon: <User size={22} className="text-amber-400/25" />,
    };
  }
  if (profile === "blog_post") {
    return {
      label: "Next Blog Post",
      shortLabel: "Blog Post",
      icon: <BookOpen size={13} className="text-purple-400" />,
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      accentClass: "border-purple-500/30",
      headerClass: "text-purple-400",
      emptyIcon: <BookOpen size={22} className="text-purple-400/25" />,
    };
  }
  return {
    label: "Next LinkedIn Post — AA Company",
    shortLabel: "LinkedIn · AA",
    icon: <Building2 size={13} className="text-cyan-400" />,
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    accentClass: "border-cyan-500/30",
    headerClass: "text-cyan-400",
    emptyIcon: <Building2 size={22} className="text-cyan-400/25" />,
  };
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Publish Dialog ───────────────────────────────────────────────────────────
function PublishDialog({
  post,
  open,
  onClose,
}: {
  post: QueueItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const utils = trpc.useUtils();

  const markPublished = trpc.queue.markPublished.useMutation({
    onSuccess: () => {
      toast.success("Post marked as published — LinkedIn URL saved.");
      utils.queue.list.invalidate();
      setUrl("");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setUrl(""); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 size={16} className="text-primary" />
            Confirm Publication
          </DialogTitle>
          <DialogDescription>
            Paste the live LinkedIn post URL to confirm publication and create a permanent audit trail entry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="linkedin-url" className="text-xs font-medium">LinkedIn Post URL</Label>
            <Input
              id="linkedin-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/posts/..."
              className="mt-1.5 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              After publishing, copy the URL from the post's "···" menu → "Copy link to post".
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setUrl(""); onClose(); }}>Cancel</Button>
          <Button
            disabled={!url.trim() || markPublished.isPending}
            onClick={() => markPublished.mutate({ postId: post.post.id, linkedInUrl: url.trim() })}
          >
            {markPublished.isPending ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <CheckSquare size={13} className="mr-1.5" />}
            Confirm Published
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Image Prompt Dialog ──────────────────────────────────────────────────────
function ImagePromptDialog({
  item,
  open,
  onClose,
}: {
  item: QueueItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [imagePrompt, setImagePrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const generateMutation = trpc.queue.generateImagePrompt.useMutation({
    onSuccess: (data) => {
      setImagePrompt(typeof data.imagePrompt === "string" ? data.imagePrompt : JSON.stringify(data.imagePrompt));
      setGeneratedImageUrl(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const generateImageMutation = trpc.queue.generateImage.useMutation({
    onSuccess: (data) => {
      setGeneratedImageUrl(data.imageUrl ?? null);
      toast.success("Image generated!");
    },
    onError: (err) => toast.error("Image generation failed: " + err.message),
  });

  function handleGenerate() {
    if (!item) return;
    setImagePrompt("");
    setGeneratedImageUrl(null);
    generateMutation.mutate({
      postId: item.post.id,
      postContent: item.post.content,
      profile: item.job.profile,
    });
  }

  function handleGenerateImage() {
    if (!item || !imagePrompt) return;
    generateImageMutation.mutate({ prompt: imagePrompt, postId: item.post.id });
  }

  function handleCopy() {
    navigator.clipboard.writeText(imagePrompt);
    setCopied(true);
    toast.success("Image prompt copied");
    setTimeout(() => setCopied(false), 2500);
  }

  function handleClose() {
    setImagePrompt("");
    setGeneratedImageUrl(null);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else if (item && !imagePrompt && !generateMutation.isPending) handleGenerate();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon size={15} className="text-primary" />
            Image Generation
          </DialogTitle>
          <DialogDescription>
            AI-generated brief based on the post and your image guidelines. Copy for Midjourney or generate inline.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {generateMutation.isPending ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 size={18} className="animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating prompt…</span>
            </div>
          ) : imagePrompt ? (
            <div className="space-y-3">
              <div className="bg-muted/40 rounded-md p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {imagePrompt}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy Prompt"}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleGenerate} disabled={generateMutation.isPending}>
                  <RotateCcw size={12} />
                  Regenerate Prompt
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 ml-auto"
                  onClick={handleGenerateImage}
                  disabled={generateImageMutation.isPending}
                >
                  {generateImageMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <ImageIcon size={12} />
                  )}
                  {generateImageMutation.isPending ? "Generating…" : "Generate Image"}
                </Button>
              </div>
              {generateImageMutation.isPending && (
                <div className="flex items-center justify-center gap-2 py-4 rounded-md border border-border bg-muted/20">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Creating image… this may take 15–30 seconds</span>
                </div>
              )}
              {generatedImageUrl && (
                <div className="space-y-2">
                  <img
                    src={generatedImageUrl}
                    alt="AI-generated post image"
                    className="w-full rounded-md border border-border object-cover"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 flex-1"
                      onClick={() => window.open(generatedImageUrl, "_blank")}
                    >
                      <ExternalLink size={11} />
                      Open Full Size
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={handleGenerateImage}
                      disabled={generateImageMutation.isPending}
                    >
                      <RotateCcw size={11} />
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground text-center">
                Generate a prompt tailored to this post and your brand image guidelines. Then copy it or generate an image inline.
              </p>
              <Button className="gap-1.5" onClick={handleGenerate}>
                <Sparkles size={13} />
                Generate Prompt
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Spotlight Block ──────────────────────────────────────────────────────────
function SpotlightBlock({
  profile,
  item,
  onPublish,
  onImagePrompt,
}: {
  profile: Profile;
  item: QueueItem | null;
  onPublish: (item: QueueItem) => void;
  onImagePrompt: (item: QueueItem) => void;
}) {
  const cfg = profileConfig(profile);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!item) return;
    navigator.clipboard.writeText(item.post.content);
    setCopied(true);
    toast.success("Post text copied");
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className={`rounded-lg border bg-card flex flex-col ${item ? cfg.accentClass : "border-border"}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        {cfg.icon}
        <span className={`text-xs font-semibold ${cfg.headerClass}`}>{cfg.label}</span>
        {item && profile === "blog_post" && (
          <span className="ml-auto text-[10px] text-muted-foreground">{wordCount(item.post.content)} words</span>
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 p-4 ${profile === "blog_post" ? "overflow-y-auto max-h-72" : ""}`}>
        {!item ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            {cfg.emptyIcon}
            <p className="text-xs text-muted-foreground mt-1">Nothing queued</p>
            <p className="text-[10px] text-muted-foreground/50">Submit an idea to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.job.contentPillar}</p>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{item.post.content}</p>
            {item.post.approvedAt && (
              <p className="text-[10px] text-muted-foreground/50 pt-1">
                Approved {format(new Date(item.post.approvedAt), "d MMM yyyy")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {item && (
        <div className="px-4 py-3 border-t border-border flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleCopy}>
            {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={() => onImagePrompt(item)}>
            <Sparkles size={11} />
            Image Prompt
          </Button>
          <Button size="sm" className="gap-1.5 text-xs h-7 ml-auto" onClick={() => onPublish(item)}>
            <CheckCircle2 size={11} />
            Mark Published
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function QueuePage() {
  const { data: queueData, isLoading } = trpc.queue.list.useQuery();
  const [publishTarget, setPublishTarget] = useState<QueueItem | null>(null);
  const [imagePromptTarget, setImagePromptTarget] = useState<QueueItem | null>(null);
  const [imagePromptOpen, setImagePromptOpen] = useState(false);

  const items: QueueItem[] = (queueData ?? []) as QueueItem[];

  // Get the oldest approved post per profile (last in desc-sorted list = oldest)
  function nextForProfile(profile: Profile): QueueItem | null {
    const filtered = items.filter((i) => i.job.profile === profile);
    if (filtered.length === 0) return null;
    return filtered[filtered.length - 1];
  }

  const aaNext = nextForProfile("aa_company");
  const davidNext = nextForProfile("david_personal");
  const blogNext = nextForProfile("blog_post");

  return (
    <AppLayout title="Ready to Post">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckSquare size={18} className="text-primary" />
              Ready to Post
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Approved posts awaiting manual publication.
            </p>
          </div>
          {items.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{items.length}</p>
              <p className="text-xs text-muted-foreground">in queue</p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Three content-type spotlight blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SpotlightBlock
                profile="aa_company"
                item={aaNext}
                onPublish={setPublishTarget}
                onImagePrompt={(item) => { setImagePromptTarget(item); setImagePromptOpen(true); }}
              />
              <SpotlightBlock
                profile="david_personal"
                item={davidNext}
                onPublish={setPublishTarget}
                onImagePrompt={(item) => { setImagePromptTarget(item); setImagePromptOpen(true); }}
              />
              <SpotlightBlock
                profile="blog_post"
                item={blogNext}
                onPublish={setPublishTarget}
                onImagePrompt={(item) => { setImagePromptTarget(item); setImagePromptOpen(true); }}
              />
            </div>

            {/* Full approved posts list */}
            {items.length > 0 ? (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  All Approved Posts ({items.length})
                </h2>
                <div className="rounded-lg border border-border overflow-hidden">
                  {items.map((item, idx) => {
                    const cfg = profileConfig(item.job.profile);
                    return (
                      <div
                        key={item.post.id}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          idx < items.length - 1 ? "border-b border-border" : ""
                        } hover:bg-muted/20 transition-colors`}
                      >
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${cfg.badgeClass}`}>
                          {cfg.icon}
                          {cfg.shortLabel}
                        </span>
                        <p className="text-sm text-foreground flex-1 min-w-0 truncate">
                          {item.post.content.slice(0, 80)}{item.post.content.length > 80 ? "…" : ""}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {item.post.approvedAt
                            ? format(new Date(item.post.approvedAt), "d MMM yyyy")
                            : "—"}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs shrink-0 h-7"
                          onClick={() => setPublishTarget(item)}
                        >
                          <ExternalLink size={10} />
                          Copy & Mark Published
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-12 text-center">
                <CheckCircle2 size={32} className="text-primary/30 mx-auto mb-3" />
                <p className="text-foreground font-semibold mb-1">Queue is empty</p>
                <p className="text-sm text-muted-foreground">
                  No approved posts waiting to be published. Submit ideas in Saved Ideas to get started.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <PublishDialog
        post={publishTarget}
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
      />
      <ImagePromptDialog
        item={imagePromptTarget}
        open={imagePromptOpen}
        onClose={() => { setImagePromptOpen(false); setImagePromptTarget(null); }}
      />
    </AppLayout>
  );
}
