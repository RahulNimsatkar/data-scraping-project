import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Square, Code, BarChart3, FileCode, Copy, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
  processedData?: any[];
}

export function CodeExecutionPanel() {
  const [customCode, setCustomCode] = useState(`# Data Processing Script
# Process scraped data with custom logic

def process_data(data):
    """
    Custom data processing function
    Args:
        data: List of scraped data items
    Returns:
        Processed data list
    """
    processed = []
    
    for item in data:
        # Example: Filter items with valid titles
        if item.get('title') and len(item['title']) > 3:
            processed_item = {
                'title': item['title'].strip().title(),
                'url': item.get('url', ''),
                'processed_at': 'now'
            }
            processed.append(processed_item)
    
    return processed

# Run the processing
result = process_data(data)
print(f"Processed {len(result)} items from {len(data)} total")
return result
`);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [language, setLanguage] = useState<'python' | 'javascript'>('python');
  const { toast } = useToast();

  // Get user's tasks for data source selection
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Get data from selected task
  const { data: taskData } = useQuery<any[]>({
    queryKey: ["/api/tasks", selectedTaskId, "data"],
    enabled: !!selectedTaskId,
  });

  const executeCodeMutation = useMutation({
    mutationFn: async ({ code, taskId, language }: { code: string; taskId: string; language: string }) => {
      const response = await apiRequest("POST", "/api/execute-code", {
        code,
        taskId,
        language
      });
      return response.json();
    },
    onSuccess: (result) => {
      setExecutionResult(result);
      toast({
        title: result.success ? "Code Executed Successfully" : "Execution Failed",
        description: result.success 
          ? `Processed ${result.processedData?.length || 0} items in ${result.executionTime}ms`
          : result.error,
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      const errorResult: ExecutionResult = {
        success: false,
        error: error.message || "Failed to execute code"
      };
      setExecutionResult(errorResult);
      toast({
        title: "Execution Error",
        description: error.message || "Failed to execute code",
        variant: "destructive"
      });
    },
  });

  const handleExecuteCode = () => {
    if (!selectedTaskId) {
      toast({
        title: "No Data Source",
        description: "Please select a task to process data from",
        variant: "destructive"
      });
      return;
    }

    if (!customCode.trim()) {
      toast({
        title: "No Code",
        description: "Please enter code to execute",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);
    executeCodeMutation.mutate({
      code: customCode,
      taskId: selectedTaskId,
      language
    });
  };

  const handleStopExecution = () => {
    setIsExecuting(false);
    // In a real implementation, you would cancel the execution
  };

  const handleCopyResult = async () => {
    if (executionResult?.processedData) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(executionResult.processedData, null, 2));
        toast({
          title: "Result Copied",
          description: "Processed data copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy result",
          variant: "destructive"
        });
      }
    }
  };

  const handleDownloadResult = () => {
    if (executionResult?.processedData) {
      const dataStr = JSON.stringify(executionResult.processedData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `processed-data-${Date.now()}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast({
        title: "Download Started",
        description: "Processed data file download started",
      });
    }
  };

  const loadTemplate = (templateType: string) => {
    const templates: Record<string, string> = {
      filter: `# Data Filtering Template
def process_data(data):
    """Filter data based on custom criteria"""
    filtered = []
    
    for item in data:
        # Add your filtering logic here
        if item.get('title') and len(item['title']) > 5:
            if item.get('price'):
                # Convert price to number if possible
                try:
                    price_num = float(str(item['price']).replace('$', '').replace(',', ''))
                    if 0 < price_num < 1000:  # Price range filter
                        filtered.append(item)
                except:
                    pass
            else:
                filtered.append(item)
    
    return filtered

result = process_data(data)
print(f"Filtered to {len(result)} items")
return result`,

      transform: `# Data Transformation Template
def process_data(data):
    """Transform and enrich data"""
    transformed = []
    
    for item in data:
        new_item = {
            'title': item.get('title', '').strip().title(),
            'clean_price': clean_price(item.get('price', '0')),
            'domain': extract_domain(item.get('url', '')),
            'word_count': len(item.get('description', '').split()),
            'has_image': bool(item.get('image_url')),
            'category': categorize_item(item),
            'original_data': item
        }
        transformed.append(new_item)
    
    return transformed

def clean_price(price_str):
    """Extract numeric price from string"""
    import re
    numbers = re.findall(r'\\d+\\.?\\d*', str(price_str))
    return float(numbers[0]) if numbers else 0

def extract_domain(url):
    """Extract domain from URL"""
    try:
        from urllib.parse import urlparse
        return urlparse(url).netloc
    except:
        return 'unknown'

def categorize_item(item):
    """Simple item categorization"""
    title = item.get('title', '').lower()
    if 'book' in title: return 'books'
    elif 'tech' in title or 'phone' in title: return 'electronics'
    elif 'cloth' in title or 'shirt' in title: return 'clothing'
    return 'other'

result = process_data(data)
return result`,

      analytics: `# Data Analytics Template
def process_data(data):
    """Analyze data and generate insights"""
    analysis = {
        'total_items': len(data),
        'items_with_titles': len([item for item in data if item.get('title')]),
        'avg_title_length': 0,
        'price_count': 0,
        'categories': {}
    }
    
    # Calculate average title length
    titles = [item.get('title', '') for item in data if item.get('title')]
    if titles:
        analysis['avg_title_length'] = sum(len(title) for title in titles) / len(titles)
    
    # Count items with prices
    for item in data:
        if item.get('price'):
            analysis['price_count'] += 1
    
    # Basic categorization
    categories = {'books': 0, 'electronics': 0, 'other': 0}
    for item in data:
        title = str(item.get('title', '')).lower()
        if 'book' in title:
            categories['books'] += 1
        elif 'tech' in title or 'phone' in title:
            categories['electronics'] += 1
        else:
            categories['other'] += 1
    
    analysis['categories'] = categories
    
    # Create summary report
    print("📊 Data Analysis Report")
    print(f"Total Items: {analysis['total_items']}")
    print(f"Items with Titles: {analysis['items_with_titles']}")
    print(f"Average Title Length: {analysis['avg_title_length']:.1f} chars")
    print(f"Items with Prices: {analysis['price_count']}")
    print(f"Categories: {analysis['categories']}")
    
    return analysis

result = process_data(data)
return result`
    };
    
    setCustomCode(templates[templateType] || templates.filter);
  };

  const availableTasks = (tasks as any[])?.filter(task => task.status === 'completed' && task.scrapedItems > 0) || [];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Code className="w-5 h-5 text-primary" />
            Custom Code Execution
            {isExecuting && <Badge variant="secondary" className="ml-2 animate-pulse">Running</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger className="w-48 bg-input border-border text-foreground" data-testid="select-data-source">
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                {availableTasks.length > 0 ? (
                  availableTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name} ({task.scrapedItems} items)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-data" disabled>
                    No completed tasks available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={language} onValueChange={(value: 'python' | 'javascript') => setLanguage(value)}>
              <SelectTrigger className="w-32 bg-input border-border text-foreground" data-testid="select-code-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <Tabs defaultValue="code" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="code" className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Code Editor
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-4">
            <div className="space-y-4">
              <Textarea
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                className="font-mono text-sm min-h-[300px] bg-background border-border resize-none"
                placeholder="Write your custom data processing code here..."
                data-testid="textarea-custom-code"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedTaskId && taskData && (
                    <Badge variant="outline" className="text-xs">
                      {taskData.length} items available
                    </Badge>
                  )}
                  {executionResult && (
                    <Badge variant={executionResult.success ? "default" : "destructive"} className="text-xs">
                      {executionResult.success ? "✓ Success" : "✗ Failed"}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {isExecuting ? (
                    <Button
                      onClick={handleStopExecution}
                      variant="destructive"
                      size="sm"
                      data-testid="button-stop-execution"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      onClick={handleExecuteCode}
                      size="sm"
                      disabled={!selectedTaskId || !customCode.trim() || executeCodeMutation.isPending}
                      data-testid="button-run-code"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Run Code
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => loadTemplate('filter')}>
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Data Filtering</h4>
                    <p className="text-sm text-muted-foreground">Filter and clean scraped data based on custom criteria</p>
                  </div>
                </Card>
                
                <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => loadTemplate('transform')}>
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Data Transformation</h4>
                    <p className="text-sm text-muted-foreground">Transform and enrich data with additional fields</p>
                  </div>
                </Card>
                
                <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => loadTemplate('analytics')}>
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Data Analytics</h4>
                    <p className="text-sm text-muted-foreground">Generate insights and statistics from your data</p>
                  </div>
                </Card>
              </div>
              
              <div className="text-sm text-muted-foreground">
                💡 Click on a template above to load it into the code editor. You can then customize it for your specific needs.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {executionResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">Execution Results</h4>
                  {executionResult.success && executionResult.processedData && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleCopyResult}
                        variant="outline"
                        size="sm"
                        data-testid="button-copy-result"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        onClick={handleDownloadResult}
                        variant="outline"
                        size="sm"
                        data-testid="button-download-result"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
                
                {executionResult.success ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="p-3">
                        <div className="text-sm text-muted-foreground">Execution Time</div>
                        <div className="text-lg font-semibold text-foreground">{executionResult.executionTime}ms</div>
                      </Card>
                      <Card className="p-3">
                        <div className="text-sm text-muted-foreground">Output Items</div>
                        <div className="text-lg font-semibold text-foreground">{executionResult.processedData?.length || 0}</div>
                      </Card>
                      <Card className="p-3">
                        <div className="text-sm text-muted-foreground">Success Rate</div>
                        <div className="text-lg font-semibold text-green-600">100%</div>
                      </Card>
                      <Card className="p-3">
                        <div className="text-sm text-muted-foreground">Status</div>
                        <div className="text-lg font-semibold text-green-600">✓ Complete</div>
                      </Card>
                    </div>
                    
                    {executionResult.output && (
                      <div>
                        <h5 className="text-sm font-medium text-foreground mb-2">Console Output</h5>
                        <div className="p-3 bg-muted/30 border border-border rounded font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                          {executionResult.output}
                        </div>
                      </div>
                    )}
                    
                    {executionResult.processedData && executionResult.processedData.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-foreground mb-2">Processed Data Preview</h5>
                        <div className="p-3 bg-background border border-border rounded font-mono text-sm max-h-40 overflow-y-auto">
                          <pre className="text-foreground">{JSON.stringify(executionResult.processedData.slice(0, 3), null, 2)}</pre>
                          {executionResult.processedData.length > 3 && (
                            <div className="text-muted-foreground mt-2">... and {executionResult.processedData.length - 3} more items</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-destructive">Execution Failed</div>
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      {executionResult.error}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No execution results yet. Run your code to see results here.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}