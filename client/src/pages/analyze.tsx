import { Sidebar } from "@/components/sidebar";
import { AIAnalysisPanel } from "@/components/ai-analysis-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Zap, Target } from "lucide-react";

export default function AnalyzePage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Website Analysis</h1>
              <p className="text-muted-foreground">Analyze websites with AI to create optimal scraping strategies</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI-Powered</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Advanced AI analyzes website structure and generates optimal selectors
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Smart Detection</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Automatically identifies data patterns and extraction points
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fast Analysis</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Get analysis results in seconds with actionable recommendations
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Website Analysis</CardTitle>
                <CardDescription>
                  Enter a website URL to analyze its structure and get AI-generated scraping recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIAnalysisPanel />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}