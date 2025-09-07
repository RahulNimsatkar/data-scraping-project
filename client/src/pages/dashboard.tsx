import { Sidebar } from "@/components/sidebar";
import { StatsCards } from "@/components/stats-cards";
import { LiveTaskMonitor } from "@/components/live-task-monitor";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { DataTable } from "@/components/data-table";
import { GeneratedCode } from "@/components/generated-code";
import { CodeExecutionPanel } from "@/components/code-execution-panel";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DashboardStats {
  totalScraped: number;
  activeTasks: number;
  successRate: number;
  apiCalls: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: activeTasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/active"],
    refetchInterval: 5000,
  });


  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Monitor and manage your AI-powered scraping operations</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span data-testid="active-jobs-indicator">
                  {(activeTasks as any[])?.length || 0} Active Jobs
                </span>
              </div>
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-new-scrape"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Scrape
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats Cards */}
          <StatsCards stats={stats} isLoading={statsLoading} />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Live Task Monitor */}
            <div className="xl:col-span-2">
              <LiveTaskMonitor tasks={activeTasks} isLoading={tasksLoading} />
            </div>

            {/* AI Analysis Panel */}
            <AIAnalysisPanel />
          </div>

          {/* Code Execution Panel */}
          <CodeExecutionPanel />

          {/* Data Table Section */}
          <DataTable />

          {/* Generated Code Section */}
          <GeneratedCode />
        </div>
      </main>
    </div>
  );
}
