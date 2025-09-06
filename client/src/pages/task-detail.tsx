import { Sidebar } from "@/components/sidebar";
import { LiveTaskMonitor } from "@/components/live-task-monitor";
import { GeneratedCode } from "@/components/generated-code";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Play, Pause, Square, Download, Code } from "lucide-react";

export default function TaskDetailPage() {
  const [match, params] = useRoute("/tasks/:taskId");
  const taskId = params?.taskId;

  const { data: task, isLoading } = useQuery<any>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId,
  });

  const { data: taskData } = useQuery<any[]>({
    queryKey: [`/api/tasks/${taskId}/data`],
    enabled: !!taskId,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading task details...</div>
        </main>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Task Not Found</h1>
            <p className="text-muted-foreground mb-4">The requested task could not be found.</p>
            <Link href="/tasks">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tasks
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "failed": return "bg-red-500";
      case "paused": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/tasks">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">Task Details</h1>
                  <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                </div>
                <p className="text-muted-foreground">{task.url}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button variant="outline" size="sm">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button variant="outline" size="sm">
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Code className="w-4 h-4 mr-2" />
                Generate Code
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Task Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Items Scraped</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskData?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total collected</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">{task.strategy || "Standard"}</div>
                <p className="text-xs text-muted-foreground">Scraping method</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {new Date(task.createdAt).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">Start date</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Updated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {new Date(task.updatedAt).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">Last activity</p>
              </CardContent>
            </Card>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Live Monitor */}
            <Card>
              <CardHeader>
                <CardTitle>Live Monitoring</CardTitle>
                <CardDescription>Real-time task progress and status</CardDescription>
              </CardHeader>
              <CardContent>
                <LiveTaskMonitor tasks={[task]} isLoading={false} />
              </CardContent>
            </Card>

            {/* Generated Code */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Code</CardTitle>
                <CardDescription>AI-generated scraping code for this task</CardDescription>
              </CardHeader>
              <CardContent>
                <GeneratedCode />
              </CardContent>
            </Card>
          </div>

          {/* Scraped Data */}
          <Card>
            <CardHeader>
              <CardTitle>Scraped Data</CardTitle>
              <CardDescription>
                Data collected from this scraping task
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}