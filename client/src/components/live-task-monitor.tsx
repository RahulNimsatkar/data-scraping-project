import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  name: string;
  url: string;
  status: string;
  progress: number;
  scrapedItems: number;
  totalItems: number;
}

interface LiveTaskMonitorProps {
  tasks?: Task[];
  isLoading: boolean;
}

export function LiveTaskMonitor({ tasks, isLoading }: LiveTaskMonitorProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="p-6 border-b border-border">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-4">
              <Skeleton className="h-5 w-64 mb-2" />
              <Skeleton className="h-4 w-32 mb-3" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-400";
      case "paused":
        return "bg-chart-4";
      case "failed":
        return "bg-destructive";
      default:
        return "bg-chart-2";
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return "bg-chart-4";
    if (progress < 70) return "bg-chart-2";
    return "progress-bar";
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Live Task Monitor</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Real-time updates</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => (
            <div 
              key={task.id} 
              className="border border-border rounded-lg p-4 bg-muted/30"
              data-testid={`task-${task.id}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 ${getStatusColor(task.status)} rounded-full animate-pulse`}></div>
                  <div>
                    <p className="font-medium text-foreground" data-testid={`task-name-${task.id}`}>
                      {task.name}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`task-url-${task.id}`}>
                      {task.url}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground" data-testid={`task-progress-${task.id}`}>
                    {task.scrapedItems} / {task.totalItems || "∞"}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {task.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-foreground">{task.progress}%</span>
                </div>
                <Progress 
                  value={task.progress} 
                  className="w-full h-2"
                  data-testid={`progress-bar-${task.id}`}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No active tasks</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
