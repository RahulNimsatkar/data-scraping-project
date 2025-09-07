import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Globe, 
  TrendingUp, 
  Zap,
  Monitor,
  Users,
  Database,
  Settings
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AutoAnalysisResult {
  analysis: any;
  autoTask?: any;
  metrics: {
    loadTime: number;
    contentSize: number;
    title: string;
    links: number;
    images: number;
    forms: number;
  };
  recommendations: string[];
  message: string;
}

interface BulkAnalysisResult {
  results: Array<{
    url: string;
    analysis?: any;
    status: string;
    error?: string;
    taskId?: string;
    timestamp: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    tasksCreated: number;
  };
}

export default function AnalyticsPage() {
  const [url, setUrl] = useState("");
  const [enableAutoScraping, setEnableAutoScraping] = useState(false);
  const [bulkUrls, setBulkUrls] = useState("");
  const [autoCreateTasks, setAutoCreateTasks] = useState(false);
  const { toast } = useToast();

  // Auto analysis mutation
  const autoAnalyzeMutation = useMutation({
    mutationFn: async ({ url, enableAutoScraping }: { url: string; enableAutoScraping: boolean }) => {
      const response = await apiRequest("POST", "/api/analytics/auto-analyze", { url, enableAutoScraping });
      return response.json() as Promise<AutoAnalysisResult>;
    },
    onSuccess: (data) => {
      toast({
        title: "Auto Analysis Complete",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to auto-analyze website",
        variant: "destructive",
      });
    },
  });

  // Bulk analysis mutation
  const bulkAnalyzeMutation = useMutation({
    mutationFn: async ({ urls, autoCreateTasks }: { urls: string[]; autoCreateTasks: boolean }) => {
      const response = await apiRequest("POST", "/api/analytics/bulk-analyze", { urls, autoCreateTasks });
      return response.json() as Promise<BulkAnalysisResult>;
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Analysis Complete",
        description: `Processed ${data.summary.successful}/${data.summary.total} websites successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Analysis Failed",
        description: error.message || "Failed to process bulk analysis",
        variant: "destructive",
      });
    },
  });

  const handleAutoAnalyze = () => {
    if (!url) return;
    autoAnalyzeMutation.mutate({ url, enableAutoScraping });
  };

  const handleBulkAnalyze = () => {
    const urls = bulkUrls.split('\n').filter(line => line.trim()).map(line => line.trim());
    if (urls.length === 0) return;
    if (urls.length > 10) {
      toast({
        title: "Too Many URLs",
        description: "Maximum 10 URLs allowed per bulk analysis",
        variant: "destructive",
      });
      return;
    }
    bulkAnalyzeMutation.mutate({ urls, autoCreateTasks });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Advanced Analytics</h1>
              <p className="text-muted-foreground">Dynamic website analysis and automated scraping</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dynamic Analysis</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Real-time website analysis with automatic scraping
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bulk Processing</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Process multiple websites simultaneously
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Live Monitoring</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Real-time progress tracking and performance metrics
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auto Tasks</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Automatic task creation and queue management
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Auto Analysis Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Dynamic Website Analysis
              </CardTitle>
              <CardDescription>
                Analyze websites with enhanced metrics and automatic scraping capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auto-url">Website URL</Label>
                <Input
                  id="auto-url"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  data-testid="input-auto-analysis-url"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-scraping"
                  checked={enableAutoScraping}
                  onCheckedChange={setEnableAutoScraping}
                  data-testid="switch-auto-scraping"
                />
                <Label htmlFor="auto-scraping">Enable automatic scraping task creation</Label>
              </div>
              
              <Button
                onClick={handleAutoAnalyze}
                disabled={!url || autoAnalyzeMutation.isPending}
                className="w-full"
                data-testid="button-auto-analyze"
              >
                <Activity className="w-4 h-4 mr-2" />
                {autoAnalyzeMutation.isPending ? "Analyzing..." : "Start Dynamic Analysis"}
              </Button>
              
              {/* Analysis Results */}
              {autoAnalyzeMutation.data && (
                <div className="mt-4 space-y-4">
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Website Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div>Load Time: <Badge variant="secondary">{autoAnalyzeMutation.data.metrics.loadTime}ms</Badge></div>
                      <div>Content Size: <Badge variant="secondary">{Math.round(autoAnalyzeMutation.data.metrics.contentSize / 1024)}KB</Badge></div>
                      <div>Links: <Badge variant="secondary">{autoAnalyzeMutation.data.metrics.links}</Badge></div>
                      <div>Images: <Badge variant="secondary">{autoAnalyzeMutation.data.metrics.images}</Badge></div>
                      <div>Forms: <Badge variant="secondary">{autoAnalyzeMutation.data.metrics.forms}</Badge></div>
                    </div>
                    {autoAnalyzeMutation.data.metrics.title && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Title: </span>
                        <span className="text-sm">{autoAnalyzeMutation.data.metrics.title}</span>
                      </div>
                    )}
                  </div>
                  
                  {autoAnalyzeMutation.data.autoTask && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 dark:text-green-200">Task Created</h4>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Scraping task "{autoAnalyzeMutation.data.autoTask.name}" created and started automatically
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bulk Analysis Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Bulk Website Analysis
              </CardTitle>
              <CardDescription>
                Process multiple websites simultaneously (up to 10 per batch)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-urls">Website URLs (one per line)</Label>
                <Textarea
                  id="bulk-urls"
                  placeholder="https://example1.com&#10;https://example2.com&#10;https://example3.com"
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  rows={5}
                  data-testid="textarea-bulk-urls"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-create-tasks"
                  checked={autoCreateTasks}
                  onCheckedChange={setAutoCreateTasks}
                  data-testid="switch-auto-create-tasks"
                />
                <Label htmlFor="auto-create-tasks">Automatically create scraping tasks for each website</Label>
              </div>
              
              <Button
                onClick={handleBulkAnalyze}
                disabled={!bulkUrls.trim() || bulkAnalyzeMutation.isPending}
                className="w-full"
                data-testid="button-bulk-analyze"
              >
                <Database className="w-4 h-4 mr-2" />
                {bulkAnalyzeMutation.isPending ? "Processing..." : "Start Bulk Analysis"}
              </Button>
              
              {/* Bulk Results */}
              {bulkAnalyzeMutation.data && (
                <div className="mt-4 space-y-4">
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Bulk Analysis Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>Total: <Badge variant="secondary">{bulkAnalyzeMutation.data.summary.total}</Badge></div>
                      <div>Success: <Badge variant="default">{bulkAnalyzeMutation.data.summary.successful}</Badge></div>
                      <div>Failed: <Badge variant="destructive">{bulkAnalyzeMutation.data.summary.failed}</Badge></div>
                      <div>Tasks: <Badge variant="outline">{bulkAnalyzeMutation.data.summary.tasksCreated}</Badge></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bulkAnalyzeMutation.data.results.map((result, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border text-sm ${
                          result.status === 'success' 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{result.url}</span>
                          <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                            {result.status}
                          </Badge>
                        </div>
                        {result.error && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{result.error}</p>
                        )}
                        {result.taskId && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Task ID: {result.taskId}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}