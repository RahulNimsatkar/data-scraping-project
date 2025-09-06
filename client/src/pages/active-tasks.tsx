import { Sidebar } from "@/components/sidebar";
import { LiveTaskMonitor } from "@/components/live-task-monitor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Activity, Pause, Square, RefreshCw } from "lucide-react";

export default function ActiveTasksPage() {
  const { data: activeTasks, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/tasks/active"],
    refetchInterval: 2000,
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Active Tasks</h1>
              <p className="text-muted-foreground">Monitor currently running scraping operations</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{activeTasks?.length || 0} Running</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeTasks?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Currently running</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activeTasks?.reduce((total, task) => total + (task.itemsScraped || 0), 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">Items scraped so far</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Speed</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.4</div>
                <p className="text-xs text-muted-foreground">items/second</p>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bulk Actions</CardTitle>
                  <CardDescription>Control multiple active tasks at once</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause All
                  </Button>
                  <Button variant="outline" size="sm">
                    <Square className="w-4 h-4 mr-2" />
                    Stop All
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Live Task Monitor */}
          <Card>
            <CardHeader>
              <CardTitle>Live Task Monitor</CardTitle>
              <CardDescription>
                Real-time status and progress of your active scraping tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTasks && activeTasks.length > 0 ? (
                <LiveTaskMonitor tasks={activeTasks} isLoading={isLoading} />
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Active Tasks</h3>
                  <p className="text-muted-foreground">
                    All your scraping tasks are currently idle. Start a new task to see live monitoring here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}