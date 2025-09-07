import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface MonitoringData {
  task: any;
  status: string;
  totalItemsScraped: number;
  recentItems: number;
  lastUpdate: string;
  progressRate: number;
  recentData: any[];
  logs: any[];
  performance: {
    startTime: string;
    runTime: number;
    itemsPerMinute: number;
    errorRate: number;
  };
}

export default function AnalyticsMonitorPage() {
  const [taskId, setTaskId] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Real-time monitoring query
  const { data: monitorData, isLoading, refetch } = useQuery<MonitoringData>({
    queryKey: ["/api/analytics/monitor", taskId],
    enabled: !!taskId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Format runtime duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-500';
      case 'completed': return 'text-blue-500';
      case 'failed': return 'text-red-500';
      case 'paused': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Task Monitoring</h1>
              <p className="text-muted-foreground">Real-time task performance and progress tracking</p>
            </div>
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm"
              data-testid="button-refresh-monitor"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Task ID Input */}
          <Card>
            <CardHeader>
              <CardTitle>Monitor Task</CardTitle>
              <CardDescription>Enter a task ID to monitor its real-time progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="task-id">Task ID</Label>
                  <Input
                    id="task-id"
                    placeholder="Enter task ID to monitor"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    data-testid="input-task-id"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && taskId && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading monitoring data...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monitoring Dashboard */}
          {monitorData && (
            <>
              {/* Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                    <div className={getStatusColor(monitorData.status)}>
                      {getStatusIcon(monitorData.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getStatusColor(monitorData.status)}`}>
                      {monitorData.status.charAt(0).toUpperCase() + monitorData.status.slice(1)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Items Scraped</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{monitorData.totalItemsScraped}</div>
                    <p className="text-xs text-muted-foreground">
                      {monitorData.recentItems} in last 5 updates
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Items/Minute</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{monitorData.performance.itemsPerMinute.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">
                      Current processing rate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Runtime</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatDuration(monitorData.performance.runTime)}</div>
                    <p className="text-xs text-muted-foreground">
                      Since {new Date(monitorData.performance.startTime).toLocaleTimeString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Error Rate</span>
                      <span>{monitorData.performance.errorRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={monitorData.performance.errorRate} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Task Name:</span>
                      <p className="font-medium">{monitorData.task?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target URL:</span>
                      <p className="font-medium break-all">{monitorData.task?.url || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Update:</span>
                      <p className="font-medium">{new Date(monitorData.lastUpdate).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Progress Rate:</span>
                      <p className="font-medium">{monitorData.progressRate.toFixed(2)} items/min</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Data */}
              {monitorData.recentData && monitorData.recentData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Scraped Data</CardTitle>
                    <CardDescription>Latest {monitorData.recentData.length} items extracted</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {monitorData.recentData.map((item, index) => (
                        <div key={index} className="p-3 bg-muted/30 rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline">Item #{index + 1}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.scrapedAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                            {JSON.stringify(item.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Logs */}
              {monitorData.logs && monitorData.logs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Logs</CardTitle>
                    <CardDescription>Latest task execution logs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {monitorData.logs.map((log, index) => (
                        <div key={index} className="p-2 bg-muted/20 rounded text-sm">
                          <div className="flex justify-between items-center">
                            <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'}>
                              {log.level}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="mt-1">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* No Data State */}
          {!monitorData && taskId && !isLoading && (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Task Not Found</h3>
                <p className="text-muted-foreground">
                  No task found with ID "{taskId}". Please check the task ID and try again.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}