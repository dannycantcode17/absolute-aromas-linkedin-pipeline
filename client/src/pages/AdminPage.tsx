import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Settings, Users, Shield, BookOpen, BarChart3, Save,
  RefreshCw, CheckCircle, AlertTriangle, Loader2,
} from "lucide-react";

type TabId = "style-guides" | "guardrails" | "approvers" | "rhythm" | "users";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "style-guides", label: "Style Guides", icon: <BookOpen className="w-4 h-4" /> },
  { id: "guardrails", label: "Guardrails", icon: <Shield className="w-4 h-4" /> },
  { id: "approvers", label: "Approvers", icon: <CheckCircle className="w-4 h-4" /> },
  { id: "rhythm", label: "Posting Rhythm", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
];

// ─── Style Guides Tab ─────────────────────────────────────────────────────────
function StyleGuidesTab() {
  const { data: guides, refetch } = trpc.settings.listStyleGuides.useQuery();
  const upsert = trpc.settings.upsertStyleGuide.useMutation({
    onSuccess: () => { toast.success("Style guide saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const profiles: { key: "aa_company" | "david_personal" | "blog_post"; label: string; desc: string }[] = [
    { key: "aa_company", label: "AA Company Page", desc: "Brand voice for Absolute Aromas LinkedIn company posts" },
    { key: "david_personal", label: "David Personal Page", desc: "Tone and style for David's personal LinkedIn posts" },
    { key: "blog_post", label: "Blog Posts", desc: "Writing guidelines for long-form blog content" },
  ];
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (guides) {
      const init: Record<string, string> = {};
      for (const g of guides) init[g.profile] = g.content;
      setDrafts(init);
    }
  }, [guides]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Style Guides</h2>
        <p className="text-sm text-muted-foreground mt-1">
          These guides are injected into every AI generation prompt. Keep them concise — bullet points work well.
        </p>
      </div>
      {profiles.map((p) => (
        <Card key={p.key} className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">{p.label}</CardTitle>
            <CardDescription>{p.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              className="min-h-[200px] font-mono text-sm bg-background border-border text-foreground"
              placeholder={`Enter style guide for ${p.label}…`}
              value={drafts[p.key] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
            />
            <Button
              size="sm"
              onClick={() => upsert.mutate({ profile: p.key, content: drafts[p.key] ?? "" })}
              disabled={upsert.isPending || !drafts[p.key]?.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 text-black"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save {p.label} Guide
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Guardrails Config Tab ────────────────────────────────────────────────────
function GuardrailsTab() {
  const { data: config, refetch } = trpc.settings.getGuardrailConfig.useQuery();
  const update = trpc.settings.updateGuardrailConfig.useMutation({
    onSuccess: () => { toast.success("Guardrail config saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [competitors, setCompetitors] = useState("");
  const [banned, setBanned] = useState("");
  const [claims, setClaims] = useState("");
  useEffect(() => {
    if (config) {
      setCompetitors(config.competitorNames ?? "");
      setBanned(config.bannedPhrases ?? "");
      setClaims(config.flaggedClaimTypes ?? "");
    }
  }, [config]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Guardrail Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">One entry per line. These lists flag posts before they reach the approval queue.</p>
      </div>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">Competitor Names</CardTitle>
          <CardDescription>Posts mentioning these names will be flagged for review.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea className="min-h-[120px] font-mono text-sm bg-background border-border text-foreground"
            placeholder={"CompetitorA\nCompetitorB"} value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">Banned Phrases</CardTitle>
          <CardDescription>Exact phrases that must never appear in generated content.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea className="min-h-[120px] font-mono text-sm bg-background border-border text-foreground"
            placeholder={"guaranteed results\nbest in class"} value={banned} onChange={(e) => setBanned(e.target.value)} />
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground">Flagged Claim Types</CardTitle>
          <CardDescription>Claim categories to flag (e.g. medical_claim, revenue_figure, superlative_claim).</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea className="min-h-[100px] font-mono text-sm bg-background border-border text-foreground"
            placeholder={"medical_claim\nrevenue_figure\nsuperlative_claim"} value={claims} onChange={(e) => setClaims(e.target.value)} />
        </CardContent>
      </Card>
      <Button onClick={() => update.mutate({ competitorNames: competitors, bannedPhrases: banned, flaggedClaimTypes: claims })}
        disabled={update.isPending} className="bg-cyan-500 hover:bg-cyan-400 text-black">
        <Save className="w-4 h-4 mr-2" />
        Save Guardrail Config
      </Button>
    </div>
  );
}

// ─── Approvers Tab ────────────────────────────────────────────────────────────
function ApproversTab() {
  const { data: configs, refetch } = trpc.admin.getApproverConfig.useQuery();
  const update = trpc.admin.updateApproverConfig.useMutation({
    onSuccess: () => { toast.success("Approver config saved"); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const [drafts, setDrafts] = useState<Record<string, { name: string; email: string }>>({});
  useEffect(() => {
    if (configs) {
      const init: Record<string, { name: string; email: string }> = {};
      for (const c of configs) init[c.approverRole] = { name: c.name, email: c.email };
      setDrafts(init);
    }
  }, [configs]);

  const roles: { key: "danny" | "david"; label: string; desc: string }[] = [
    { key: "danny", label: "Danny", desc: "Approver for AA Company Page posts" },
    { key: "david", label: "David", desc: "Approver for David Personal Page posts" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Approver Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">Approval notification emails are sent to these addresses.</p>
      </div>
      {roles.map((r) => (
        <Card key={r.key} className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">{r.label}</CardTitle>
            <CardDescription>{r.desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Display Name</Label>
                <Input className="bg-background border-border text-foreground"
                  value={drafts[r.key]?.name ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.key]: { ...d[r.key], name: e.target.value } }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email Address</Label>
                <Input type="email" className="bg-background border-border text-foreground"
                  value={drafts[r.key]?.email ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [r.key]: { ...d[r.key], email: e.target.value } }))} />
              </div>
            </div>
            <Button size="sm"
              onClick={() => update.mutate({ role: r.key, name: drafts[r.key]?.name ?? "", email: drafts[r.key]?.email ?? "" })}
              disabled={update.isPending} className="bg-cyan-500 hover:bg-cyan-400 text-black">
              <Save className="w-3.5 h-3.5 mr-1.5" />Save {r.label}
            </Button>
          </CardContent>
        </Card>
      ))}
      <Card className="bg-card border-border border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Registered Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Promote these members to admin via the Users tab after their first login.</p>
          <div className="space-y-1.5 text-sm">
            {[
              { name: "Danny", email: "danny@absolute-aromas.com", role: "Admin (Approver)" },
              { name: "David", email: "David@absolute-aromas.com", role: "Admin (Approver)" },
              { name: "Harriet", email: "Harriet@absolute-aromas.com", role: "Pending first login" },
              { name: "Amy Klaire", email: "AmyK@absolute-aromas.com", role: "Pending first login" },
            ].map((m) => (
              <div key={m.email} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div>
                  <span className="text-foreground font-medium">{m.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{m.email}</span>
                </div>
                <Badge variant="outline" className="text-xs border-border text-muted-foreground">{m.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Posting Rhythm Tab ───────────────────────────────────────────────────────
function PostingRhythmTab() {
  const { data: rhythms, refetch } = trpc.settings.listPostingRhythm.useQuery();
  const upsert = trpc.settings.upsertPostingRhythm.useMutation({
    onSuccess: () => { toast.success("Posting rhythm saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (rhythms) {
      const init: Record<string, number> = {};
      for (const r of rhythms) init[r.profile] = r.targetPerWeek;
      setDrafts(init);
    }
  }, [rhythms]);

  const profiles: { key: "aa_company" | "david_personal" | "blog_post"; label: string; desc: string }[] = [
    { key: "aa_company", label: "AA Company Page", desc: "Target LinkedIn posts per week for the company page" },
    { key: "david_personal", label: "David Personal Page", desc: "Target LinkedIn posts per week for David's personal page" },
    { key: "blog_post", label: "Blog Posts", desc: "Target blog posts per week" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Posting Rhythm</h2>
        <p className="text-sm text-muted-foreground mt-1">Set weekly posting targets per profile. Used to calculate the avg posts/week stat on the dashboard.</p>
      </div>
      <div className="grid gap-4">
        {profiles.map((p) => (
          <Card key={p.key} className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input type="number" min={0} max={20}
                    className="w-20 text-center bg-background border-border text-foreground"
                    value={drafts[p.key] ?? 0}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.key]: parseInt(e.target.value) || 0 }))} />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">per week</span>
                  <Button size="sm"
                    onClick={() => upsert.mutate({ profile: p.key, targetPerWeek: drafts[p.key] ?? 0 })}
                    disabled={upsert.isPending} className="bg-cyan-500 hover:bg-cyan-400 text-black">
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const usersQuery = trpc.admin.listUsers.useQuery();
  const setRoleMutation = trpc.admin.setUserRole.useMutation({
    onSuccess: () => { toast.success("Role updated."); usersQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const users = usersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">User Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Promote users to admin to grant approval access. Harriet and Amy Klaire will appear here after their first login.
        </p>
      </div>
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-cyan-500" size={20} /></div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No users have logged in yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email ?? u.openId}</p>
                  </div>
                  <Select value={u.role}
                    onValueChange={(role) => setRoleMutation.mutate({ userId: u.id, role: role as "user" | "admin" })}>
                    <SelectTrigger className="w-28 h-8 text-xs bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("style-guides");

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    </AppLayout>
  );

  if (!isAuthenticated || user?.role !== "admin") return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-cyan-500" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Admin Settings</h1>
            <p className="text-sm text-muted-foreground">Manage style guides, guardrails, approvers, and posting targets</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-card border border-border rounded-lg p-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
                activeTab === t.id
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "style-guides" && <StyleGuidesTab />}
        {activeTab === "guardrails" && <GuardrailsTab />}
        {activeTab === "approvers" && <ApproversTab />}
        {activeTab === "rhythm" && <PostingRhythmTab />}
        {activeTab === "users" && <UsersTab />}
      </div>
    </AppLayout>
  );
}
