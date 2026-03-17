import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Copy, Check, CheckSquare, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function QueuePage() {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const queueQuery = trpc.queue.list.useQuery(undefined, { refetchInterval: 30000 });
  const markPublishedMutation = trpc.queue.markPublished.useMutation({
    onSuccess: () => {
      toast.success("Post marked as published.");
      queueQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const copyToClipboard = async (text: string, postId: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(postId);
    toast.success("Post copied to clipboard — paste it into LinkedIn.");
    setTimeout(() => setCopiedId(null), 3000);
  };

  const items = queueQuery.data ?? [];
  const pending = items.filter((i) => !i.post.publishedAt);
  const published = items.filter((i) => i.post.publishedAt);

  return (
    <AppLayout title="Ready to Post Queue">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Instructions banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-foreground font-medium mb-1">How to publish</p>
          <p className="text-sm text-muted-foreground">
            Copy the post text, go to LinkedIn, paste it into a new post, and publish manually.
            Then return here and click <strong>Mark as Published</strong> to update the record.
            This system never publishes to LinkedIn automatically.
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
          <>
            {/* Pending publish */}
            {pending.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  Awaiting Manual Publish
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">{pending.length}</Badge>
                </h2>
                <div className="space-y-4">
                  {pending.map(({ post, job }) => (
                    <Card key={post.id} className="border-green-200 bg-green-50/20">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className="bg-green-100 text-green-800 text-xs">Approved</Badge>
                              <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                {job.profile === "aa_company" ? "AA Company" : "David Personal"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">Variant {post.variantLabel}</span>
                            </div>
                            <p className="text-sm font-medium text-foreground line-clamp-1">{job.topic}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {job.contentPillar}
                              {post.approvedBy && ` · Approved by ${post.approvedBy}`}
                              {post.approvedAt && ` ${formatDistanceToNow(new Date(post.approvedAt), { addSuffix: true })}`}
                            </p>
                            {post.suggestedPublishDate && (
                              <p className="text-xs text-primary mt-0.5">
                                Suggested publish: {format(new Date(post.suggestedPublishDate), "d MMM yyyy")}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3"
                              onClick={() => copyToClipboard(post.content, post.id)}
                            >
                              {copiedId === post.id ? (
                                <><Check size={13} className="mr-1.5 text-green-600" />Copied</>
                              ) : (
                                <><Copy size={13} className="mr-1.5" />Copy</>
                              )}
                            </Button>
                          </div>
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
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <a
                              href={job.profile === "aa_company"
                                ? "https://www.linkedin.com/company/absolute-aromas/"
                                : "https://www.linkedin.com/in/david-tomlinson-absolute-aromas/"}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink size={13} className="mr-1.5" />
                              Open LinkedIn
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => markPublishedMutation.mutate({ postId: post.id })}
                            disabled={markPublishedMutation.isPending}
                          >
                            {markPublishedMutation.isPending ? (
                              <Loader2 size={13} className="mr-1.5 animate-spin" />
                            ) : (
                              <CheckSquare size={13} className="mr-1.5" />
                            )}
                            Mark as Published
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Published */}
            {published.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                  Recently Published ({published.length})
                </h2>
                <div className="space-y-2">
                  {published.slice(0, 10).map(({ post, job }) => (
                    <Card key={post.id} className="border-border opacity-70">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge className="bg-emerald-100 text-emerald-800 text-xs">Published</Badge>
                              <span className="text-xs text-muted-foreground">
                                {job.profile === "aa_company" ? "AA Company" : "David Personal"}
                              </span>
                            </div>
                            <p className="text-sm text-foreground truncate">{job.topic}</p>
                            <p className="text-xs text-muted-foreground">
                              Published by {post.publishedBy}
                              {post.publishedAt && ` · ${format(new Date(post.publishedAt), "d MMM yyyy")}`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
