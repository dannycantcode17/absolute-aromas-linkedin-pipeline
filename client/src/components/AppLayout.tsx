import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  PenLine,
  CheckSquare,
  Clock,
  History,
  Settings,
  LogOut,
  Leaf,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Submit Idea", href: "/submit", icon: <PenLine size={18} /> },
  { label: "Ready to Post", href: "/queue", icon: <CheckSquare size={18} />, adminOnly: true },
  { label: "Guardrail Review", href: "/admin?tab=guardrails", icon: <AlertTriangle size={18} />, adminOnly: true },
  { label: "Post History", href: "/history", icon: <History size={18} />, adminOnly: true },
  { label: "Admin", href: "/admin", icon: <Settings size={18} />, adminOnly: true },
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Leaf className="text-primary animate-pulse" size={32} />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Leaf className="text-primary" size={28} />
            <span className="text-xl font-semibold text-foreground">Absolute Aromas</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">LinkedIn Content Pipeline</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Sign in to submit content ideas, manage approvals, and access the ready-to-post queue.
          </p>
          <Button asChild className="w-full">
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Leaf size={16} className="text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-semibold text-sm leading-tight truncate">
              Absolute Aromas
            </p>
            <p className="text-sidebar-foreground/60 text-xs truncate">LinkedIn Pipeline</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "?") ||
            (item.href === "/dashboard" && location.startsWith("/dashboard"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.href.includes("guardrail") && pendingGuardrailCount > 0 && (
                <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0 h-5">
                  {pendingGuardrailCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <span className="text-sidebar-accent-foreground text-xs font-medium">
              {(user?.name ?? "U")[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-foreground text-xs font-medium truncate">{user?.name ?? "User"}</p>
            <p className="text-sidebar-foreground/50 text-xs truncate">{isAdmin ? "Admin" : "Contributor"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-xs px-2"
          onClick={() => logout()}
        >
          <LogOut size={14} className="mr-2" />
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
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
              <span className="text-sidebar-foreground font-semibold text-sm">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground h-8 w-8"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={16} />
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
            className="h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </Button>
          <div className="flex items-center gap-2">
            <Leaf size={18} className="text-primary" />
            <span className="font-semibold text-sm text-foreground">Absolute Aromas</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {title && (
            <div className="border-b border-border bg-card px-6 py-4">
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            </div>
          )}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
