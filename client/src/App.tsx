import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import SubmitJob from "./pages/SubmitJob";
import Dashboard from "./pages/Dashboard";
import ApprovalPage from "./pages/ApprovalPage";
import QueuePage from "./pages/QueuePage";
import HistoryPage from "./pages/HistoryPage";
import AdminPage from "./pages/AdminPage";
import JobDetailPage from "./pages/JobDetailPage";
import IdeaGenerator from "./pages/IdeaGenerator";
import GuardrailReviewPage from "./pages/GuardrailReviewPage";
import ApprovalQueuePage from "./pages/ApprovalQueuePage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/submit" component={SubmitJob} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/job/:id" component={JobDetailPage} />
      <Route path="/jobs/:id" component={JobDetailPage} />
      <Route path="/approve/:token" component={ApprovalPage} />
      <Route path="/queue" component={QueuePage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/approval-queue" component={ApprovalQueuePage} />
      <Route path="/guardrails" component={GuardrailReviewPage} />
      <Route path="/ideas" component={IdeaGenerator} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
