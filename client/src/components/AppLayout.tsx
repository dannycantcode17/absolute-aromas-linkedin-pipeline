import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CheckSquare,
  History,
  Settings,
  LogOut,
  Leaf,
  Menu,
  X,
  AlertTriangle,
  Sparkles,
  Loader2,
  Bookmark,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  matchPrefix?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={15} />, matchPrefix: "/dashboard" },
  { label: "Idea Generator", href: "/ideas", icon: <Sparkles size={15} /> },
  { label: "Saved Ideas", href: "/saved-ideas", icon: <Bookmark size={15} /> },
  { label: "Approval Queue", href: "/approval-queue", icon: <ClipboardList size={15} />, adminOnly: true },
  { label: "Ready to Post", href: "/queue", icon: <CheckSquare size={15} />, adminOnly: true },
  { label: "Post History", href: "/history", icon: <History size={15} />, adminOnly: true },
  { label: "Admin", href: "/admin", icon: <Settings size={15} />, adminOnly: true },
];

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pendingGuardrailsQuery = trpc.guardrails.listPending.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30000,
  });
  const pendingGuardrailCount = pendingGuardrailsQuery.data?.length ?? 0;

  const pendingApprovalQuery = trpc.approval.listPending.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30000,
  });
  // Badge shows ALL items needing attention: awaiting approval + guardrail review
  const pendingApprovalCount = (pendingApprovalQuery.data ?? []).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-primary animate-spin" size={28} />
          <p className="text-muted-foreground text-xs tracking-wide">Loading poster...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.72 0.18 200) 1px, transparent 1px), linear-gradient(90deg, oklch(0.72 0.18 200) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative text-center max-w-sm mx-auto px-6">
          {/* Logo mark */}
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Leaf size={20} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="text-foreground font-bold text-lg leading-tight tracking-tight" style={{color:'#06B6D4'}}>poster</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to poster</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Brand-compliant social content — from idea to approved post, with a full audit trail.
          </p>

          <Button asChild className="w-full h-10 font-medium">
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Access is restricted to your team.
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  function isActive(item: NavItem): boolean {
    if (item.matchPrefix) return location.startsWith(item.matchPrefix);
    // Exact match for most items; also match /admin without tab param
    if (item.href === "/admin") return location === "/admin" || location.startsWith("/admin?tab=");
    if (item.href.includes("?")) {
      const base = item.href.split("?")[0];
      const param = item.href.split("?")[1];
      return location === base + "?" + param || location.startsWith(base + "?" + param);
    }
    return location === item.href;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center flex-shrink-0">
            <Leaf size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[15px] leading-tight truncate" style={{color:'#06B6D4'}}>poster</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all relative border-l-2 ${
                active
                  ? "border-l-primary bg-primary/10 text-primary"
                  : "border-l-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span className={active ? "text-primary" : "text-muted-foreground"}>{item.icon}</span>
              <span>{item.label}</span>
              {item.href === "/approval-queue" && pendingApprovalCount > 0 && (
                <Badge className="ml-auto bg-amber-500/80 text-white text-[10px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center">
                  {pendingApprovalCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-[11px] font-semibold">
              {(user?.name ?? "U")[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-[12px] font-medium truncate">{user?.name ?? "User"}</p>
            <p className="text-muted-foreground text-[11px] truncate">{isAdmin ? "Admin" : "Contributor"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-white/5 text-[12px] px-2 h-7"
          onClick={() => logout()}
        >
          <LogOut size={13} className="mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-sidebar flex-col flex-shrink-0 border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col border-r border-sidebar-border">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <span className="text-foreground font-semibold text-sm">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-7 w-7"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={15} />
              </Button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={17} />
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[15px]" style={{color:'#06B6D4'}}>poster</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {title && (
            <div className="border-b border-border bg-card/50 px-6 py-3.5">
              <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
            </div>
          )}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
