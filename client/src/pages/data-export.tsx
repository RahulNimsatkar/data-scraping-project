import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Download, FileText, Database, Grid, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DataExportPage() {
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const { toast } = useToast();

  const mockTasks = [
    { id: "1", name: "E-commerce Product Data", items: 1250, status: "completed" },
    { id: "2", name: "News Articles Scraping", items: 89, status: "running" },
    { id: "3", name: "Social Media Posts", items: 2100, status: "completed" },
    { id: "4", name: "Real Estate Listings", items: 456, status: "completed" },
  ];

  const formatOptions = [
    { value: "csv", label: "CSV", icon: FileText, description: "Comma-separated values" },
    { value: "json", label: "JSON", icon: Code, description: "JavaScript Object Notation" },
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

  const handleExport = () => {
    if (selectedTasks.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to export.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Export started!",
      description: `Exporting ${selectedTasks.length} task(s) in ${selectedFormat.toUpperCase()} format.`,
    });
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
        </div>
      </main>
    </div>
  );
}