import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, PenLine, CheckSquare, Shield, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Leaf size={16} className="text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground leading-tight">Absolute Aromas</p>
              <p className="text-xs text-muted-foreground leading-tight">LinkedIn Pipeline</p>
            </div>
          </div>
          <div>
            {loading ? null : isAuthenticated ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-medium mb-6">
            <Shield size={12} />
            Brand-compliant. Human-approved. Never auto-published.
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4">
            LinkedIn content,{" "}
            <span className="text-primary">crafted to your voice</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Submit a content idea. The system fetches your live style guide, generates 3–5 brand-compliant
            variants using Claude AI, and routes them to the right approver. You review, approve, and
            publish manually — always in control.
          </p>
          <div className="flex flex-wrap gap-3">
            {isAuthenticated ? (
              <>
                <Button asChild size="lg">
                  <Link href="/submit">
                    <PenLine size={16} className="mr-2" />
                    Submit an Idea
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/dashboard">
                    View Dashboard
                    <ArrowRight size={16} className="ml-2" />
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild size="lg">
                <a href={getLoginUrl()}>
                  Get Started
                  <ArrowRight size={16} className="ml-2" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <PenLine size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Two distinct voices</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Separate system prompts for the Absolute Aromas company page and David's personal page.
                Each post sounds exactly right for its profile.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                <Shield size={20} className="text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Guardrails enforced</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every draft is automatically checked for medical claims, competitor names, revenue figures,
                and more — before it reaches the approver.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="pt-6">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <CheckSquare size={20} className="text-green-700" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Human approval, always</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No post ever publishes automatically. Approved posts sit in the Ready to Post queue
                until you copy and publish them manually on LinkedIn.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container py-4">
          <p className="text-xs text-muted-foreground">
            Absolute Aromas LinkedIn Content Pipeline — internal tool. No LinkedIn API integration.
            All publishing is manual.
          </p>
        </div>
      </footer>
    </div>
  );
}
