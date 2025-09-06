import { Sidebar } from "@/components/sidebar";
import { GeneratedCode } from "@/components/generated-code";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Code, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CodeGeneratorPage() {
  const [selectedTask, setSelectedTask] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const { toast } = useToast();

  const handleCopyCode = () => {
    toast({
      title: "Code copied!",
      description: "The generated code has been copied to your clipboard.",
    });
  };

  const handleDownloadCode = () => {
    toast({
      title: "Code downloaded!",
      description: "The generated code file has been downloaded.",
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Code Generator</h1>
              <p className="text-muted-foreground">Generate production-ready scraping code from your tasks</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCopyCode}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
              <Button onClick={handleDownloadCode}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Generator Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Code Generation Settings</CardTitle>
              <CardDescription>
                Select a task and programming language to generate custom scraping code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Task</label>
                  <Input 
                    placeholder="Enter task ID or search..."
                    value={selectedTask}
                    onChange={(e) => setSelectedTask(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Programming Language</label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="nodejs">Node.js</SelectItem>
                      <SelectItem value="curl">cURL</SelectItem>
                      <SelectItem value="postman">Postman Collection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full">
                <Code className="w-4 h-4 mr-2" />
                Generate Code
              </Button>
            </CardContent>
          </Card>

          {/* Language Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Python</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• BeautifulSoup & Requests</li>
                  <li>• Selenium WebDriver</li>
                  <li>• Error handling & retries</li>
                  <li>• Data export to CSV/JSON</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">JavaScript</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Puppeteer & Cheerio</li>
                  <li>• Async/await patterns</li>
                  <li>• Browser automation</li>
                  <li>• JSON data handling</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Node.js</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Express server setup</li>
                  <li>• API endpoints</li>
                  <li>• Database integration</li>
                  <li>• Scalable architecture</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Generated Code */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Code</CardTitle>
              <CardDescription>
                AI-generated, production-ready code based on your scraping task
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneratedCode />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}