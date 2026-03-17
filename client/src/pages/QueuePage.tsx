import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  format,
  formatDistanceToNow,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  differenceInDays,
} from "date-fns";
import {
  Copy,
  Check,
  CheckSquare,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Link2,
} from "lucide-react";
import { useState } from "react";

// ─── Publish Confirmation Modal ───────────────────────────────────────────────

function PublishConfirmModal({
  open,
  postId,
  onClose,
}: {
  open: boolean;
  postId: number | null;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const utils = trpc.useUtils();

  const markPublishedMutation = trpc.queue.markPublished.useMutation({
    onSuccess: () => {
      toast.success("Post confirmed as published — LinkedIn URL saved.");
      utils.queue.list.invalidate();
      setUrl("");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleConfirm = () => {
    if (!postId) return;
    if (!url.trim()) {
      toast.error("Please paste the LinkedIn post URL before confirming.");
      return;
    }
    markPublishedMutation.mutate({ postId, linkedInUrl: url.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setUrl(""); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 size={18} className="text-primary" />
            Confirm Publication
          </DialogTitle>
          <DialogDescription>
            Paste the live LinkedIn post URL below. This proves the post went live and creates a
            permanent link in the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="linkedin-url" className="text-sm font-medium">
              LinkedIn Post URL
            </Label>
            <Input
              id="linkedin-url"
              placeholder="https://www.linkedin.com/posts/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              After publishing on LinkedIn, copy the post URL from the "···" menu → "Copy link to post".
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setUrl(""); onClose(); }}>
            Cancel
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleConfirm}
            disabled={markPublishedMutation.isPending || !url.trim()}
          >
            {markPublishedMutation.isPending ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <CheckSquare size={14} className="mr-1.5" />
            )}
            Confirm Published
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

type QueueItem = { post: { id: number; variantLabel: string; content: string; approvedBy: string | null; approvedAt: Date | null; suggestedPublishDate: Date | null; publishedAt: Date | null; publishedBy: string | null; publicationStatus: string | null; linkedInUrl: string | null }; job: { id: number; topic: string; contentPillar: string; profile: string } };

function CalendarView({
  items,
  onMarkPublished,
  onCopy,
  copiedId,
}: {
  items: QueueItem[];
  onMarkPublished: (postId: number) => void;
  onCopy: (text: string, id: number) => void;
  copiedId: number | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start on Monday
  const startPad = (monthStart.getDay() + 6) % 7; // 0=Mon
  const paddedDays = [...Array(startPad).fill(null), ...days];

  const getPostsForDay = (day: Date) =>
    items.filter((i) => {
      const d = i.post.suggestedPublishDate
        ? new Date(i.post.suggestedPublishDate)
        : i.post.approvedAt
        ? new Date(i.post.approvedAt)
        : null;
      return d && isSameDay(d, day);
    });

  const unscheduled = items.filter((i) => !i.post.suggestedPublishDate);

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft size={16} />
        </Button>
        <span className="font-semibold text-foreground">{format(currentMonth, "MMMM yyyy")}</span>
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {paddedDays.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;
          const dayPosts = getPostsForDay(day);
          const isCurrentDay = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[72px] rounded-md border p-1.5 text-xs ${
                isCurrentDay ? "border-primary bg-primary/5" : "border-border bg-background"
              }`}
            >
              <span
                className={`inline-block w-5 h-5 text-center leading-5 rounded-full text-xs font-medium mb-1 ${
                  isCurrentDay ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
              {dayPosts.map(({ post, job }) => (
                <div
                  key={post.id}
                  className={`rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer ${
                    post.publishedAt
                      ? "bg-cyan-500/15 text-cyan-400"
                      : "bg-primary/10 text-primary"
                  }`}
                  title={job.topic}
                  onClick={() => !post.publishedAt && onMarkPublished(post.id)}
                >
                  {job.profile === "aa_company" ? "AA" : "DP"}: {job.topic.slice(0, 18)}…
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            No suggested date ({unscheduled.length})
          </p>
          <div className="space-y-2">
            {unscheduled.map(({ post, job }) => (
              <div
                key={post.id}
                className="flex items-center justify-between gap-3 border border-border rounded-md px-3 py-2 bg-background"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{job.topic}</p>
                  <p className="text-xs text-muted-foreground">{job.contentPillar}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onCopy(post.content, post.id)}
                  >
                    {copiedId === post.id ? <Check size={12} /> : <Copy size={12} />}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => onMarkPublished(post.id)}
                  >
                    <CheckSquare size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QueuePage() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [publishModalPostId, setPublishModalPostId] = useState<number | null>(null);

  const queueQuery = trpc.queue.list.useQuery(undefined, { refetchInterval: 30000 });

  const copyToClipboard = async (text: string, postId: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(postId);
    toast.success("Post copied to clipboard — paste it into LinkedIn.");
    setTimeout(() => setCopiedId(null), 3000);
  };

  const items = (queueQuery.data ?? []) as QueueItem[];
  const pending = items.filter((i) => !i.post.publishedAt);
  const published = items.filter((i) => i.post.publishedAt);

  // Overdue = approved but not published after 7 days
  const isOverdue = (approvedAt: Date | null) => {
    if (!approvedAt) return false;
    return differenceInDays(new Date(), new Date(approvedAt)) >= 7;
  };

  return (
    <AppLayout title="Ready to Post Queue">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Instructions banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-foreground font-medium mb-1">How to publish</p>
          <p className="text-sm text-muted-foreground">
            Copy the post text, open LinkedIn, paste and publish manually. Then return here, click{" "}
            <strong>Mark as Published</strong>, and paste the live LinkedIn post URL to confirm.
            This system <strong>never</strong> publishes to LinkedIn automatically.
          </p>
        </div>

        {queueQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : pending.length === 0 && published.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <CheckSquare size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">Queue is empty</p>
              <p className="text-sm text-muted-foreground">
                Approved posts will appear here once an approver signs off on a draft.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="list">
            <TabsList className="mb-4">
              <TabsTrigger value="list" className="gap-1.5">
                <List size={14} />
                List
                {pending.length > 0 && (
                  <Badge className="bg-amber-500/15 text-amber-400 text-xs ml-1">{pending.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5">
                <Calendar size={14} />
                Calendar
              </TabsTrigger>
            </TabsList>

            {/* ── LIST TAB ── */}
            <TabsContent value="list" className="space-y-6">
              {pending.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-3">
                    Awaiting Manual Publish
                  </h2>
                  <div className="space-y-4">
                    {pending.map(({ post, job }) => {
                      const overdue = isOverdue(post.approvedAt);
                      return (
                        <Card
                          key={post.id}
                          className={`${overdue ? "border-amber-500/30 bg-amber-500/8" : "border-primary/25 bg-primary/5"}`}
                        >
                          <CardHeader className="pb-2 pt-3 px-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge className="bg-cyan-500/15 text-cyan-400 text-xs">Approved</Badge>
                                  {overdue && (
                                    <Badge className="bg-amber-500/15 text-amber-400 text-xs flex items-center gap-1">
                                      <AlertTriangle size={10} />
                                      Overdue
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                    {job.profile === "aa_company" ? "AA Company" : "David Personal"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">Variant {post.variantLabel}</span>
                                </div>
                                <p className="text-sm font-medium text-foreground line-clamp-1">{job.topic}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {job.contentPillar}
                                  {post.approvedBy && ` · Approved by ${post.approvedBy}`}
                                  {post.approvedAt &&
                                    ` ${formatDistanceToNow(new Date(post.approvedAt), { addSuffix: true })}`}
                                </p>
                                {post.suggestedPublishDate && (
                                  <p className="text-xs text-primary mt-0.5">
                                    Suggested publish:{" "}
                                    {format(new Date(post.suggestedPublishDate), "d MMM yyyy")}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 flex-shrink-0"
                                onClick={() => copyToClipboard(post.content, post.id)}
                              >
                                {copiedId === post.id ? (
                                  <><Check size={13} className="mr-1.5 text-primary" />Copied</>
                                ) : (
                                  <><Copy size={13} className="mr-1.5" />Copy</>
                                )}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-4">
                            <div className="bg-white border border-border rounded-md p-3 mb-3">
                              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                {post.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="text-primary border-primary/30 hover:bg-primary/8"
                              >
                                <a
                                  href={
                                    job.profile === "aa_company"
                                      ? "https://www.linkedin.com/company/absolute-aromas/"
                                      : "https://www.linkedin.com/in/david-tomlinson-absolute-aromas/"
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink size={13} className="mr-1.5" />
                                  Open LinkedIn
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                onClick={() => setPublishModalPostId(post.id)}
                              >
                                <CheckSquare size={13} className="mr-1.5" />
                                Mark as Published
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Published */}
              {published.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                    Confirmed Published ({published.length})
                  </h2>
                  <div className="space-y-2">
                    {published.slice(0, 20).map(({ post, job }) => (
                      <Card key={post.id} className="border-border opacity-80">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge className="bg-cyan-500/15 text-cyan-400 text-xs">Published</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {job.profile === "aa_company" ? "AA Company" : "David Personal"}
                                </span>
                              </div>
                              <p className="text-sm text-foreground truncate">{job.topic}</p>
                              <p className="text-xs text-muted-foreground">
                                Published by {post.publishedBy}
                                {post.publishedAt &&
                                  ` · ${format(new Date(post.publishedAt), "d MMM yyyy")}`}
                              </p>
                            </div>
                            {post.linkedInUrl && (
                              <Button asChild variant="ghost" size="sm" className="text-primary h-7 px-2">
                                <a href={post.linkedInUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink size={13} className="mr-1" />
                                  View Post
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── CALENDAR TAB ── */}
            <TabsContent value="calendar">
              <CalendarView
                items={pending}
                onMarkPublished={(id) => setPublishModalPostId(id)}
                onCopy={copyToClipboard}
                copiedId={copiedId}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Publication confirmation modal */}
      <PublishConfirmModal
        open={publishModalPostId !== null}
        postId={publishModalPostId}
        onClose={() => setPublishModalPostId(null)}
      />
    </AppLayout>
  );
}
