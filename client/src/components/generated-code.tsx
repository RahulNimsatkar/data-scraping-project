import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Code, Copy, Lightbulb, Edit, Save, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Generate dynamic code examples based on actual task data
const generateDynamicCode = (task: any, scrapedData: any[], language: 'python' | 'javascript') => {
  if (!task) return getDefaultCodeExamples(language);
  
  const url = task.url;
  const selectors = task.selectors;
  const hostname = new URL(url).hostname.replace(/\W/g, '_');
  const fields = scrapedData?.length > 0 ? Object.keys(scrapedData[0].data) : ['title', 'link', 'description'];
  
  if (language === 'python') {
    return `import scrapy
from scrapy import Spider
import time

class ${hostname.charAt(0).toUpperCase() + hostname.slice(1)}Spider(Spider):
    name = '${hostname}_scraper'
    start_urls = ['${url}']
    
    custom_settings = {
        'DOWNLOAD_DELAY': 2,  # Be respectful
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'USER_AGENT': 'Mozilla/5.0 (compatible; WebScraper 1.0)'
    }
    
    def parse(self, response):
        # Using AI-detected selectors from your analysis
        items = response.css('${selectors.primary}')
        
        for item in items:
            data = {
${fields.map(field => `                '${field}': item.css('::text').get()${field === 'link' ? ' or item.css("::attr(href)").get()' : ''},`).join('\n')}
                'url': response.url,
                'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            # Clean and validate data
            data = {k: v.strip() if isinstance(v, str) else v for k, v in data.items() if v}
            
            if data:  # Only yield if we have meaningful data
                yield data
        
        # Handle pagination if detected
        ${task.patterns?.pagination ? 
          `next_page = response.css('.next::attr(href), .pagination a::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse)` : 
          '# No pagination detected'}`;
  }
  
  return `const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrape${hostname.charAt(0).toUpperCase() + hostname.slice(1)}() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    
    try {
        console.log('Navigating to ${url}');
        await page.goto('${url}', { waitUntil: 'networkidle2' });
        
        // Wait for content to load
        await page.waitForSelector('${selectors.primary}', { timeout: 10000 });
        
        const data = await page.evaluate(() => {
            const items = document.querySelectorAll('${selectors.primary}');
            return Array.from(items).map(item => {
                return {
${fields.map(field => `                    ${field}: item.querySelector('*')?.textContent?.trim()${field === 'link' ? ' || item.querySelector("a")?.href' : ''},`).join('\n')}
                    url: window.location.href,
                    scraped_at: new Date().toISOString()
                };
            }).filter(item => Object.values(item).some(v => v)); // Remove empty items
        });
        
        console.log(\`Scraped \${data.length} items\`);
        
        // Save to JSON file
        fs.writeFileSync('${hostname}_data.json', JSON.stringify(data, null, 2));
        
        return data;
        
    } catch (error) {
        console.error('Scraping failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the scraper
scrape${hostname.charAt(0).toUpperCase() + hostname.slice(1)}()
    .then(data => console.log('Scraping completed!', data?.length, 'items'))
    .catch(console.error);`;
};

const getDefaultCodeExamples = (language: 'python' | 'javascript') => {
  const codeExamples = {
    python: `import scrapy
from scrapy import Spider

class ProductSpider(Spider):
    name = 'products'
    start_urls = ['https://example-shop.com/products']
    
    def parse(self, response):
        # Extract product links
        product_links = response.css('.product-item a::attr(href)').getall()
        
        for link in product_links:
            yield response.follow(link, self.parse_product)
        
        # Follow pagination
        next_page = response.css('.pagination .next::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse)
    
    def parse_product(self, response):
        yield {
            'name': response.css('.product-title::text').get(),
            'price': response.css('.price::text').get(),
            'description': response.css('.description::text').get(),
            'url': response.url,
        }`,
    
    javascript: `const puppeteer = require('puppeteer');

async function scrapeProducts() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto('https://example-shop.com/products');
    
    const products = await page.evaluate(() => {
        const items = document.querySelectorAll('.product-item');
        return Array.from(items).map(item => ({
            name: item.querySelector('.product-title')?.textContent,
            price: item.querySelector('.price')?.textContent,
            description: item.querySelector('.description')?.textContent,
            url: item.querySelector('a')?.href
        }));
    });
    
    await browser.close();
    return products;
}`
  };
  return codeExamples[language];
};

export function GeneratedCode() {
  const [language, setLanguage] = useState<'python' | 'javascript'>('python');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's tasks to show generated code
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Get scraped data for more accurate code generation
  const { data: scrapedData } = useQuery<any[]>({
    queryKey: ["/api/tasks", activeTaskId, "data"],
    enabled: !!activeTaskId,
  });

  // Use the first task with generated code, or fallback to example
  const taskWithCode = (tasks as any[])?.find((task: any) => task.generatedCode);
  const baseCode = taskWithCode?.generatedCode || getDefaultCodeExamples(language);
  const displayCode = isEditing ? editedCode : baseCode;

  // Update edited code when switching tasks or languages
  useEffect(() => {
    if (!isEditing) {
      setEditedCode(baseCode);
    }
  }, [baseCode, isEditing]);

  // Set active task when available
  useEffect(() => {
    if (taskWithCode && !activeTaskId) {
      setActiveTaskId(taskWithCode.id);
    }
  }, [taskWithCode, activeTaskId]);

  const generateCodeMutation = useMutation({
    mutationFn: async ({ taskId, language }: { taskId: string; language: string }) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/generate-code`, { language });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEditedCode(data.code);
      toast({
        title: "Code Generated",
        description: `${data.language} code generated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate code",
        variant: "destructive",
      });
    },
  });

  const saveCodeMutation = useMutation({
    mutationFn: async ({ taskId, code }: { taskId: string; code: string }) => {
      const response = await apiRequest("PUT", `/api/tasks/${taskId}`, { generatedCode: code });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsEditing(false);
      toast({
        title: "Code Saved",
        description: "Your custom code has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save code",
        variant: "destructive",
      });
    },
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      toast({
        title: "Code Copied",
        description: "Code copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy code to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSaveCode = () => {
    if (taskWithCode && editedCode) {
      saveCodeMutation.mutate({ taskId: taskWithCode.id, code: editedCode });
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing, revert to original
      setEditedCode(baseCode);
    }
    setIsEditing(!isEditing);
  };

  const handleRegenerateCode = () => {
    if (taskWithCode) {
      generateCodeMutation.mutate({ taskId: taskWithCode.id, language });
    }
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as 'python' | 'javascript');
    
    if (taskWithCode) {
      generateCodeMutation.mutate({
        taskId: taskWithCode.id,
        language: newLanguage
      });
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Code className="w-5 h-5 text-primary" />
            Generated Scraping Code
            {isEditing && <Badge variant="secondary" className="ml-2">Editing</Badge>}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowRecommendations(!showRecommendations)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-toggle-recommendations"
            >
              {showRecommendations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-48 bg-input border-border text-foreground" data-testid="select-code-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python (Scrapy)</SelectItem>
                <SelectItem value="javascript">Node.js (Puppeteer)</SelectItem>
              </SelectContent>
            </Select>
            {taskWithCode && (
              <Button
                onClick={handleRegenerateCode}
                variant="outline"
                size="sm"
                disabled={generateCodeMutation.isPending}
                data-testid="button-regenerate-code"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generateCodeMutation.isPending ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            )}
            <Button
              onClick={handleEditToggle}
              variant={isEditing ? "secondary" : "outline"}
              size="sm"
              data-testid="button-edit-code"
            >
              <Edit className="w-4 h-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
            {isEditing && (
              <Button
                onClick={handleSaveCode}
                size="sm"
                disabled={saveCodeMutation.isPending}
                data-testid="button-save-code"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            )}
            <Button
              onClick={handleCopyCode}
              variant="secondary"
              size="sm"
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              data-testid="button-copy-code"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editedCode}
              onChange={(e) => setEditedCode(e.target.value)}
              className="font-mono text-sm min-h-[400px] bg-background border-border"
              placeholder="Edit your scraping code here..."
              data-testid="textarea-edit-code"
            />
            <div className="text-xs text-muted-foreground">
              💡 Tip: Make sure to test your code changes in a safe environment before running on production data.
            </div>
          </div>
        ) : (
          <div className="syntax-highlight rounded-lg p-4 font-mono text-sm overflow-x-auto bg-muted/20">
            <pre className="text-foreground whitespace-pre-wrap">
              <code data-testid="text-generated-code">{taskWithCode ? generateDynamicCode(taskWithCode, scrapedData || [], language) : getDefaultCodeExamples(language)}</code>
            </pre>
          </div>
        )}
        
        {showRecommendations && (
          <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-3 h-3 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">AI Recommendations</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  {taskWithCode ? (
                    taskWithCode.analysis?.recommendations?.length > 0 ? 
                      taskWithCode.analysis.recommendations.map((rec: string, index: number) => (
                        <li key={index}>• {rec}</li>
                      )) : [
                        <li key="delay">• Add 2-3 second delays between requests for {new URL(taskWithCode.url).hostname}</li>,
                        <li key="headers">• Use proper headers and user agents to avoid detection</li>,
                        <li key="selectors">• The detected selectors have {taskWithCode.analysis?.confidence || 'medium'}% confidence</li>,
                        <li key="data">• {(scrapedData || []).length} items successfully scraped with current configuration</li>
                      ]
                  ) : (
                    [
                      <li key="delay">• Add delay of 1-2 seconds between requests to avoid rate limiting</li>,
                      <li key="agents">• Consider using rotating user agents for better success rate</li>,
                      <li key="js">• Enable JavaScript rendering for dynamic content</li>,
                      <li key="error">• Implement proper error handling and retry mechanisms</li>
                    ]
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {taskWithCode && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Task: {taskWithCode.name}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Confidence: {taskWithCode.analysis?.confidence || 95}%
              </Badge>
              {scrapedData && scrapedData.length > 0 && (
                <Badge variant="default" className="text-xs">
                  {scrapedData.length} items scraped
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(taskWithCode.updatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
