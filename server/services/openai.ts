import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface WebsiteAnalysisResult {
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
  recommendations: string[];
}

export async function analyzeWebsiteStructure(url: string, htmlContent: string, customPrompt?: string): Promise<WebsiteAnalysisResult> {
  try {
    const basePrompt = `Analyze the following HTML content from ${url} and provide web scraping recommendations.`;
    const customInstructions = customPrompt ? `\n\nAdditional Instructions: ${customPrompt}` : '';
    
    const prompt = `${basePrompt}${customInstructions}

HTML Content (truncated):
${htmlContent.substring(0, 10000)}

Please analyze and provide a JSON response with:
1. Recommended CSS selectors for data extraction
2. Detected patterns (pagination, infinite scroll, AJAX)
3. Suggested scraping strategy
4. Confidence level (0-100)
5. Specific recommendations

Return JSON in this exact format:
{
  "selectors": {
    "primary": "main CSS selector for data items",
    "fallback": ["alternative", "selectors", "array"]
  },
  "patterns": {
    "itemContainer": "container selector for individual items",
    "pagination": true/false,
    "infiniteScroll": true/false,
    "ajaxLoading": true/false
  },
  "strategy": "recommended scraping approach description",
  "confidence": number between 0-100,
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert web scraping analyst. Analyze HTML structure and provide detailed scraping recommendations in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as WebsiteAnalysisResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("OpenAI analysis error:", error);
    
    // Fallback response when OpenAI is not available
    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
      console.log('OpenAI quota exceeded, using fallback analysis');
      return {
        selectors: {
          primary: ".post, .listing, .item, .card, article",
          fallback: [".content", ".entry", ".product", ".hoarding"]
        },
        patterns: {
          itemContainer: ".post, .listing, .item",
          pagination: true,
          infiniteScroll: false,
          ajaxLoading: false
        },
        strategy: "Standard content extraction with pagination support. Focus on main content areas and listing containers.",
        confidence: 75,
        recommendations: [
          "Use rate limiting between requests",
          "Handle pagination with proper delays",
          "Extract structured data from list items",
          "Consider using CSS selectors for reliable targeting"
        ]
      };
    }
    
    throw new Error(`Failed to analyze website structure: ${errorMessage}`);
  }
}

export async function generateScrapingCode(
  url: string, 
  selectors: any, 
  strategy: string, 
  language: 'python' | 'javascript' = 'python'
): Promise<string> {
  try {
    const prompt = `Generate ${language} web scraping code for:
URL: ${url}
Selectors: ${JSON.stringify(selectors)}
Strategy: ${strategy}

Requirements:
- Use ${language === 'python' ? 'Scrapy framework' : 'Puppeteer library'}
- Handle pagination if detected
- Include error handling and rate limiting
- Add appropriate delays between requests
- Make the code production-ready

Return only the code without markdown formatting.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert web scraping developer. Generate clean, production-ready ${language} code.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Code generation error:", error);
    
    // Fallback code when OpenAI is not available
    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
      console.log('OpenAI quota exceeded, using fallback code generation');
      
      const fallbackCode = language === 'python' ? 
        `import scrapy
from scrapy import Spider

class WebsiteScraper(Spider):
    name = 'website_scraper'
    start_urls = ['${url}']
    
    def parse(self, response):
        # Extract items using the recommended selectors
        items = response.css('${selectors.primary || ".post, .listing, .item"}')
        
        for item in items:
            yield {
                'title': item.css('.title, .name, h1, h2, h3 ::text').get(),
                'price': item.css('.price, .cost ::text').get(),
                'description': item.css('.description, .summary ::text').get(),
                'link': item.css('a ::attr(href)').get(),
                'url': response.url,
            }
        
        # Handle pagination
        next_page = response.css('.next, .pagination .next ::attr(href)').get()
        if next_page:
            yield response.follow(next_page, self.parse)` 
        : 
        `const puppeteer = require('puppeteer');

async function scrapeWebsite() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        await page.goto('${url}');
        
        const data = await page.evaluate(() => {
            const items = document.querySelectorAll('${selectors.primary || ".post, .listing, .item"}');
            return Array.from(items).map(item => ({
                title: item.querySelector('.title, .name, h1, h2, h3')?.textContent?.trim(),
                price: item.querySelector('.price, .cost')?.textContent?.trim(),
                description: item.querySelector('.description, .summary')?.textContent?.trim(),
                link: item.querySelector('a')?.href,
                url: window.location.href
            }));
        });
        
        console.log('Scraped data:', data);
        return data;
        
    } finally {
        await browser.close();
    }
}

scrapeWebsite().catch(console.error);`;
      
      return fallbackCode;
    }
    
    throw new Error(`Failed to generate scraping code: ${errorMessage}`);
  }
}
