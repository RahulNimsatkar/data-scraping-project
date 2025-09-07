import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Download, FileText, Database, Grid, Code, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

export default function DataExportPage() {
  const [selectedFormat, setSelectedFormat] = useState("json");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [enablePythonFilter, setEnablePythonFilter] = useState(false);
  const [pythonScript, setPythonScript] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);
  const { toast } = useToast();

  const mockTasks = [
    { id: "1", name: "E-commerce Product Data", items: 1250, status: "completed" },
    { id: "2", name: "News Articles Scraping", items: 89, status: "running" },
    { id: "3", name: "Social Media Posts", items: 2100, status: "completed" },
    { id: "4", name: "Real Estate Listings", items: 456, status: "completed" },
  ];

  const formatOptions = [
    { value: "json", label: "JSON", icon: Code, description: "JavaScript Object Notation (Default)" },
    { value: "csv", label: "CSV", icon: FileText, description: "Comma-separated values" },
    { value: "xlsx", label: "Excel", icon: Grid, description: "Microsoft Excel format" },
    { value: "sql", label: "SQL", icon: Database, description: "SQL insert statements" },
  ];

  const handleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const generatePythonScript = async () => {
    if (selectedTasks.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select tasks first to generate a Python script.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingScript(true);
    try {
      const response = await fetch(`/api/tasks/generate-python-filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: selectedTasks })
      });
      
      const result = await response.json();
      setPythonScript(result.script);
      toast({
        title: "Python script generated!",
        description: "Data cleaning script has been created based on your selected tasks.",
      });
    } catch (error) {
      toast({
        title: "Error generating script",
        description: "Failed to generate Python script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleExport = async () => {
    if (selectedTasks.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      for (const taskId of selectedTasks) {
        const url = `/api/tasks/${taskId}/export?format=${selectedFormat}${enablePythonFilter && pythonScript ? '&python_filter=true' : ''}`;
        
        if (enablePythonFilter && pythonScript) {
          // Send Python script in POST request for filtering
          const response = await fetch(`/api/tasks/${taskId}/export-filtered`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              format: selectedFormat,
              pythonScript: pythonScript 
            })
          });
          
          if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `filtered-data-${taskId}.${selectedFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
          }
        } else {
          // Regular export
          window.open(url, '_blank');
        }
      }

      toast({
        title: "Export started!",
        description: `Exporting ${selectedTasks.length} task(s) in ${selectedFormat.toUpperCase()} format${enablePythonFilter ? ' with Python filtering' : ''}.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getTotalItems = () => {
    return mockTasks
      .filter(task => selectedTasks.includes(task.id))
      .reduce((total, task) => total + task.items, 0);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Data Export</h1>
              <p className="text-muted-foreground">Export your scraped data in various formats</p>
            </div>
            <Button onClick={handleExport} disabled={selectedTasks.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Export Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Export Summary</CardTitle>
              <CardDescription>Current selection summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold">{selectedTasks.length}</div>
                  <p className="text-sm text-muted-foreground">Tasks selected</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{getTotalItems().toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Total items</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{selectedFormat.toUpperCase()}</div>
                  <p className="text-sm text-muted-foreground">Export format</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Tasks</CardTitle>
                <CardDescription>Choose which tasks to include in the export</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockTasks.map((task) => (
                  <div key={task.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={() => handleTaskSelection(task.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{task.name}</h4>
                        <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.items.toLocaleString()} items
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Export Format</CardTitle>
                <CardDescription>Choose the output format for your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formatOptions.map((format) => {
                  const Icon = format.icon;
                  return (
                    <div
                      key={format.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedFormat === format.value
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedFormat(format.value)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <div>
                          <h4 className="font-medium">{format.label}</h4>
                          <p className="text-sm text-muted-foreground">{format.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>Additional settings for your export</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Data Options</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox defaultChecked />
                      <label className="text-sm">Include headers</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox defaultChecked />
                      <label className="text-sm">Include timestamps</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox />
                      <label className="text-sm">Include metadata</label>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Compression</h4>
                  <Select defaultValue="none">
                    <SelectTrigger>
                      <SelectValue placeholder="Select compression" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No compression</SelectItem>
                      <SelectItem value="zip">ZIP archive</SelectItem>
                      <SelectItem value="gzip">GZIP compression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Python Script Filtering */}
          <Card>
            <CardHeader>
              <CardTitle>Python Script Filtering</CardTitle>
              <CardDescription>Filter and clean your data using custom Python scripts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={enablePythonFilter}
                  onCheckedChange={(checked) => setEnablePythonFilter(checked === true)}
                  data-testid="checkbox-python-filter"
                />
                <label className="text-sm font-medium">Enable Python script filtering</label>
              </div>
              
              {enablePythonFilter && (
                <div className="space-y-4 border-l-2 border-primary pl-4">
                  <div className="flex gap-2">
                    <Button 
                      onClick={generatePythonScript}
                      disabled={generatingScript || selectedTasks.length === 0}
                      variant="outline" 
                      size="sm"
                      data-testid="button-generate-script"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      {generatingScript ? "Generating..." : "Auto-Generate Script"}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Python Script</label>
                    <Textarea
                      placeholder="# Python script will be generated here
# You can also write your own script
# The data will be available as 'data' variable (list of dictionaries)
# Return the filtered data

def filter_data(data):
    # Example: Remove empty fields
    filtered = []
    for item in data:
        if all(value for value in item.values()):
            filtered.append(item)
    return filtered

# The script should return the filtered data
filtered_data = filter_data(data)"
                      value={pythonScript}
                      onChange={(e) => setPythonScript(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                      data-testid="textarea-python-script"
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>📝 <strong>How it works:</strong></p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Your data is available as a 'data' variable (list of dictionaries)</li>
                      <li>Write Python code to filter, clean, or transform the data</li>
                      <li>Return the modified data for export</li>
                      <li>Supports pandas operations if needed</li>
                    </ul>
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