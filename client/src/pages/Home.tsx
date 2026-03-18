import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Leaf, Sparkles, ShieldCheck, CheckCircle, ArrowRight, Loader2 } from "lucide-react";

const features = [
  {
    icon: <Sparkles size={17} className="text-primary" />,
    title: "AI-Powered Generation",
    description:
      "Claude generates 3–5 brand-aligned post variants per submission, informed by the live Absolute Aromas style guide.",
  },
  {
    icon: <ShieldCheck size={17} className="text-primary" />,
    title: "8-Rule Guardrail Engine",
    description:
      "Every draft is checked for medical claims, competitor mentions, revenue figures, and tone compliance before reaching an approver.",
  },
  {
    icon: <CheckCircle size={17} className="text-primary" />,
    title: "Dual-Profile Approval",
    description:
      "Company page posts route to Danny. David's personal page posts route to David only. No cross-approval, no auto-publish.",
  },
];

const steps = [
  { step: "01", label: "Submit idea" },
  { step: "02", label: "Style guide fetch" },
  { step: "03", label: "AI generation" },
  { step: "04", label: "Guardrail check" },
  { step: "05", label: "Approval & queue" },
];

export default function Home() {
  const { loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect authenticated users — must be in useEffect, not render body
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="text-primary animate-spin" size={26} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Subtle dot grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(oklch(0.72 0.18 200 / 0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Nav */}
      <header className="relative border-b border-border/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center">
              <Leaf size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-[13px] leading-tight">Absolute Aromas</p>
              <p className="text-muted-foreground text-[11px]">LinkedIn Pipeline</p>
            </div>
          </div>
          <Button size="sm" asChild className="h-8 text-[13px] font-medium">
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/8 text-primary text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Brand-compliant content, every time
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight tracking-tight">
            LinkedIn content that{" "}
            <span className="text-primary">never goes off-brand</span>
          </h1>

          <p className="text-muted-foreground text-base leading-relaxed max-w-xl mx-auto">
            Submit an idea. Claude generates post variants using the live Absolute Aromas style guide.
            Guardrails check every word. Approvers review and approve. You copy and post.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg" asChild className="h-11 px-6 font-medium gap-2">
              <a href={getLoginUrl()}>
                Get Started
                <ArrowRight size={15} />
              </a>
            </Button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="max-w-4xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card border border-border rounded-lg p-5 space-y-3"
            >
              <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="text-foreground font-semibold text-[14px]">{f.title}</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        {/* Pipeline steps */}
        <div className="max-w-4xl mx-auto mt-16 w-full">
          <p className="text-center text-[11px] text-muted-foreground uppercase tracking-widest mb-8 font-medium">
            How it works
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {steps.map((s, i) => (
              <div key={s.step} className="flex flex-col items-center gap-2 text-center relative">
                <div className="w-9 h-9 rounded-full border border-primary/30 bg-primary/8 flex items-center justify-center">
                  <span className="text-primary text-[11px] font-bold">{s.step}</span>
                </div>
                <p className="text-[12px] text-muted-foreground font-medium">{s.label}</p>
                {i < 4 && (
                  <div className="hidden md:block absolute top-[18px] left-[calc(50%+20px)] right-[calc(-50%+20px)] h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-border/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-muted-foreground text-[11px]">
            © {new Date().getFullYear()} Absolute Aromas — internal tool only.
          </p>
          <p className="text-muted-foreground text-[11px]">No auto-publish. No exceptions.</p>
        </div>
      </footer>
    </div>
  );
}
