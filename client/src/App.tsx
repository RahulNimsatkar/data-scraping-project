import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useWebSocket } from "@/hooks/use-websocket";
import Dashboard from "@/pages/dashboard";
import TasksPage from "@/pages/tasks";
import AnalyzePage from "@/pages/analyze";
import TaskDetailPage from "@/pages/task-detail";
import ActiveTasksPage from "@/pages/active-tasks";
import CodeGeneratorPage from "@/pages/code-generator";
import DataExportPage from "@/pages/data-export";
import ApiKeysPage from "@/pages/api-keys";
import DatabaseManagerPage from "@/pages/database-manager";
import AnalyticsPage from "@/pages/analytics";
import AnalyticsMonitorPage from "@/pages/analytics-monitor";
import NotFound from "@/pages/not-found";

function AppContent() {
  // Enable WebSocket connection globally (inside QueryClientProvider)
  useWebSocket();
  
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/tasks" component={TasksPage} />
      <Route path="/tasks/active" component={ActiveTasksPage} />
      <Route path="/tasks/:taskId" component={TaskDetailPage} />
      <Route path="/analyze" component={AnalyzePage} />
      <Route path="/code" component={CodeGeneratorPage} />
      <Route path="/data" component={DataExportPage} />
      <Route path="/api-keys" component={ApiKeysPage} />
      <Route path="/databases" component={DatabaseManagerPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/analytics/monitor" component={AnalyticsMonitorPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <AppContent />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
