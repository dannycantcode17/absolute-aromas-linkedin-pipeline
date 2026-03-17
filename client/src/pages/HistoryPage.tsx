import AppLayout from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  Loader2, History, ExternalLink, Copy, CheckCircle2,
  Building2, User, FileText, ChevronDown, ChevronUp, Calendar
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

// ─── Blog post content parser ─────────────────────────────────────────────────
// Blog posts are stored as structured markdown with ## H2 sections
function parseBlogContent(content: string) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const metaMatch = content.match(/\*\*Meta Description:\*\*\s*(.+?)(?:\n|$)/i) ??
                    content.match(/Meta Description:\s*(.+?)(?:\n|$)/i);
  const title = titleMatch?.[1]?.trim() ?? null;
  const meta = metaMatch?.[1]?.trim() ?? null;
  return { title, meta };
}

export default function HistoryPage() {
  const { data: publishedPosts, isLoading } = trpc.history.listPublished.useQuery();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleCopy = (content: string, id: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      toast.success("Post copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const posts = publishedPosts ?? [];

  const profileLabel = (profile: string) => {
    if (profile === "aa_company") return "LinkedIn · AA";
    if (profile === "david_personal") return "LinkedIn · David";
    return "Blog Post";
  };

  const profileColour = (profile: string) => {
    if (profile === "aa_company") return "text-cyan-400";
    if (profile === "david_personal") return "text-amber-400";
    return "text-violet-400";
  };

  const profileIconBg = (profile: string) => {
    if (profile === "aa_company") return "bg-cyan-500/10 border-cyan-500/20";
    if (profile === "david_personal") return "bg-amber-500/10 border-amber-500/20";
    return "bg-violet-500/10 border-violet-500/20";
  };

  const profileIconColour = (profile: string) => {
    if (profile === "aa_company") return "text-cyan-400";
    if (profile === "david_personal") return "text-amber-400";
    return "text-violet-400";
  };

  const ProfileIcon = ({ profile }: { profile: string }) => {
    const cls = `w-4 h-4 ${profileIconColour(profile)}`;
    if (profile === "david_personal") return <User className={cls} />;
    if (profile === "blog_post") return <FileText className={cls} />;
    return <Building2 className={cls} />;
  };

  return (
    <AppLayout title="Post History">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              Post History
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              All posts confirmed as published, with links to the live content.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-cyan-400">{posts.length}</p>
            <p className="text-xs text-slate-500">posts published</p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-[#1a1d27] p-12 text-center">
            <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-200 font-semibold mb-1">No published posts yet</p>
            <p className="text-sm text-slate-500 mb-4">
              Once a post is approved and confirmed as published, it will appear here.
            </p>
            <Link href="/queue">
              <button className="px-4 py-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors">
                View Ready-to-Post Queue
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: typeof posts[number]) => {
              const isBlog = post.profile === "blog_post";
              const isExpanded = expandedId === post.id;
              const blogParsed = isBlog ? parseBlogContent(post.content) : null;

              return (
                <div
                  key={post.id}
                  className="rounded-lg border border-white/5 bg-[#1a1d27] hover:border-white/10 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Profile icon */}
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${profileIconBg(post.profile ?? "aa_company")}`}>
                        <ProfileIcon profile={post.profile ?? "aa_company"} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Meta row */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-xs font-semibold ${profileColour(post.profile ?? "aa_company")}`}>
                            {profileLabel(post.profile ?? "aa_company")}
                          </span>
                          <span className="text-slate-700">·</span>
                          <span className="text-xs text-slate-500">{post.contentPillar}</span>
                          {post.approvedBy && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span className="text-xs text-slate-500">Approved by {post.approvedBy}</span>
                            </>
                          )}
                        </div>

                        {/* Topic */}
                        {post.topic && (
                          <p className="text-sm font-semibold text-slate-200 mb-2 line-clamp-1">
                            {post.topic}
                          </p>
                        )}

                        {/* Blog parsed preview OR LinkedIn content preview */}
                        {isBlog && blogParsed ? (
                          <div className="space-y-1 mb-3">
                            {blogParsed.title && (
                              <p className="text-sm font-medium text-slate-300 line-clamp-1">
                                📄 {blogParsed.title}
                              </p>
                            )}
                            {blogParsed.meta && (
                              <p className="text-xs text-slate-500 line-clamp-2 italic">
                                {blogParsed.meta}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed mb-3">
                            {post.content}
                          </p>
                        )}

                        {/* Timestamps + actions */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-cyan-500" />
                              {post.approvedBy ? `Approved by ${post.approvedBy}` : "Approved"}
                            </span>
                            {post.publishedAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Published {format(new Date(post.publishedAt), "d MMM yyyy")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isBlog && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : post.id)}
                                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                              >
                                {isExpanded
                                  ? <><ChevronUp className="w-3 h-3" /> Collapse</>
                                  : <><ChevronDown className="w-3 h-3" /> View full post</>}
                              </button>
                            )}
                            {post.linkedInUrl && (
                              <a
                                href={post.linkedInUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                              >
                                {isBlog ? "View post" : "View on LinkedIn"} <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              onClick={() => handleCopy(post.content, post.id)}
                              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              {copiedId === post.id
                                ? <><CheckCircle2 className="w-3 h-3 text-cyan-400" /> Copied</>
                                : <><Copy className="w-3 h-3" /> Copy</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Blog full content expand */}
                  {isBlog && isExpanded && (
                    <div className="border-t border-white/5 px-4 pb-4 pt-3">
                      <div className="rounded-lg bg-[#0f1117] border border-violet-500/10 p-4">
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                          {post.content}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
