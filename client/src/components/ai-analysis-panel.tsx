import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, Search, Target, Network, Settings, Lightbulb } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResult {
  selectors: {
    primary: string;
    fallback: string[];
  };
  patterns: {
    itemContainer: string;
    pagination: boolean;
    infiniteScroll: boolean;
    ajaxLoading: boolean;
  };
  strategy: string;
  confidence: number;
  recommendations?: string[];
}

export function AIAnalysisPanel() {
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async ({ url, prompt }: { url: string; prompt?: string }) => {
      const response = await apiRequest("POST", "/api/analyze", { url, prompt });
      return response.json();
    },
    onSuccess: (data) => {
      // Store the analysis result in state to enable the Create Task button
      setAnalysis(data);
      toast({
        title: "Analysis Complete",
        description: "Website structure analysis completed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze website",
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!analysis) throw new Error("No analysis data available");
      
      const response = await apiRequest("POST", "/api/tasks", {
        name: `Analysis of ${new URL(url).hostname}`,
        url,
        selectors: analysis.selectors,
        strategy: analysis.strategy,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Created",
        description: "Scraping task created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Task Creation Failed",
        description: error.message || "Failed to create scraping task",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!url) return;
    analyzeMutation.mutate({ url, prompt });
  };

  const handleCreateTask = () => {
    createTaskMutation.mutate();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <Brain className="w-5 h-5 text-primary" />
          AI Analysis
        </h3>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* URL Input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url-input" className="text-sm font-medium text-foreground">
              Website URL
            </Label>
            <Input
              id="url-input"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-input border-border text-foreground"
              data-testid="input-website-url"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="prompt-input" className="text-sm font-medium text-foreground">
              Custom Instructions (Optional)
            </Label>
            <Input
              id="prompt-input"
              type="text"
              placeholder="e.g., Focus on product listings, extract prices and titles"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-input border-border text-foreground"
              data-testid="input-custom-prompt"
            />
          </div>
          
          <Button
            onClick={handleAnalyze}
            disabled={!url || analyzeMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-analyze-website"
          >
            <Search className="w-4 h-4 mr-2" />
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Website"}
          </Button>
        </div>
        
        {/* Analysis Results */}
        {analyzeMutation.isPending && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              Analyzing website structure...
            </div>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-400" />
                <span className="font-medium text-sm text-foreground">Recommended Selector</span>
              </div>
              <code 
                className="text-xs bg-background px-2 py-1 rounded font-mono text-foreground block"
                data-testid="text-recommended-selector"
              >
                {analysis.selectors.primary}
              </code>
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-confidence">
                {analysis.confidence}% confidence match
              </p>
            </div>
            
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-4 h-4 text-chart-2" />
                <span className="font-medium text-sm text-foreground">Detected Patterns</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">• Container:</span>
                  <code className="bg-background px-1 rounded text-foreground">
                    {analysis.patterns.itemContainer}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">• Pagination:</span>
                  <Badge variant={analysis.patterns.pagination ? "default" : "secondary"} className="text-xs">
                    {analysis.patterns.pagination ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">• Infinite Scroll:</span>
                  <Badge variant={analysis.patterns.infiniteScroll ? "default" : "secondary"} className="text-xs">
                    {analysis.patterns.infiniteScroll ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">• AJAX Loading:</span>
                  <Badge variant={analysis.patterns.ajaxLoading ? "default" : "secondary"} className="text-xs">
                    {analysis.patterns.ajaxLoading ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-chart-4" />
                <span className="font-medium text-sm text-foreground">Suggested Strategy</span>
              </div>
              <p className="text-xs text-muted-foreground" data-testid="text-suggested-strategy">
                {analysis.strategy}
              </p>
            </div>

            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lightbulb className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground mb-1">AI Recommendations</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <Button
          onClick={handleCreateTask}
          disabled={!analysis || createTaskMutation.isPending}
          className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground"
          data-testid="button-create-scraping-task"
        >
          {createTaskMutation.isPending ? "Creating..." : "Create Scraping Task"}
        </Button>
      </CardContent>
    </Card>
  );
}
