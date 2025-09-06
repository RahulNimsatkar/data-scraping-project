import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Code, Copy, Lightbulb } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export function GeneratedCode() {
  const [language, setLanguage] = useState<'python' | 'javascript'>('python');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const { toast } = useToast();

  // Get user's tasks to show generated code
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Use the first task with generated code, or fallback to example
  const taskWithCode = (tasks as any[])?.find((task: any) => task.generatedCode);
  const displayCode = taskWithCode?.generatedCode || codeExamples[language];

  const generateCodeMutation = useMutation({
    mutationFn: async ({ taskId, language }: { taskId: string; language: string }) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/generate-code`, { language });
      return response.json();
    },
    onSuccess: (data) => {
      // Code generation would update the display
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
          </h3>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-48 bg-input border-border text-foreground" data-testid="select-code-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python (Scrapy)</SelectItem>
                <SelectItem value="javascript">Node.js (Puppeteer)</SelectItem>
              </SelectContent>
            </Select>
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
        <div className="syntax-highlight rounded-lg p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-foreground">
            <code data-testid="text-generated-code">{displayCode}</code>
          </pre>
        </div>
        
        <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lightbulb className="w-3 h-3 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">AI Recommendations</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Add delay of 1-2 seconds between requests to avoid rate limiting</li>
                <li>• Consider using rotating user agents for better success rate</li>
                <li>• The site uses lazy loading - enable JavaScript rendering</li>
                <li>• Implement proper error handling and retry mechanisms</li>
              </ul>
            </div>
          </div>
        </div>

        {taskWithCode && (
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Generated for: {taskWithCode.name}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Confidence: 95%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
