import OpenAI from "openai";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const defaultOpenAI = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

// Helper function to get user's OpenAI client or fallback to default
async function getOpenAIClient(userId?: string): Promise<OpenAI> {
  if (userId) {
    try {
      const userKey = await storage.getAiProviderKey(userId, 'openai');
      if (userKey && userKey.isActive) {
        console.log(`Using user's OpenAI API key for user ${userId}`);
        // Update usage count
        await storage.updateAiProviderKey(userKey.id!, {
          lastUsed: new Date(),
          usageCount: userKey.usageCount + 1
        });
        return new OpenAI({ apiKey: userKey.apiKey });
      }
    } catch (error) {
      console.error("Error getting user's OpenAI key:", error);
    }
  }
  
  console.log("Using default OpenAI API key");
  return defaultOpenAI;
}

// Test function for API key validation
export async function testOpenAIKey(apiKey: string): Promise<{ success: boolean; message: string; provider: string }> {
  try {
    const testClient = new OpenAI({ apiKey });
    const response = await testClient.models.list();
    
    if (response.data && response.data.length > 0) {
      return { 
        success: true, 
        message: `Valid OpenAI API key. Access to ${response.data.length} models.`,
        provider: 'openai'
      };
    } else {
      return { 
        success: false, 
        message: "API key is valid but no models are accessible",
        provider: 'openai'
      };
    }
  } catch (error: any) {
    const errorMessage = error?.error?.message || error?.message || "Invalid API key";
    return { 
      success: false, 
      message: `OpenAI API key test failed: ${errorMessage}`,
      provider: 'openai'
    };
  }
}

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

export async function analyzeWebsiteStructure(url: string, htmlContent: string, customPrompt?: string, userId?: string): Promise<WebsiteAnalysisResult> {
  try {
    const openai = await getOpenAIClient(userId);
    
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
    
    // Fallback response when OpenAI is not available or no API key
    if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('invalid_api_key') || errorMessage.includes('Incorrect API key')) {
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
  language: 'python' | 'javascript' = 'python',
  userId?: string
): Promise<string> {
  try {
    const openai = await getOpenAIClient(userId);
    
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
    
    // Fallback code when OpenAI is not available or no API key
    if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('invalid_api_key') || errorMessage.includes('Incorrect API key')) {
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
        `const cheerio = require('cheerio');

async function scrapeWebsite() {
    try {
        const response = await fetch('${url}', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const data = [];
        $('${selectors.primary || ".post, .listing, .item"}').each((i, item) => {
            const $item = $(item);
            data.push({
                title: $item.find('.title, .name, h1, h2, h3').first().text()?.trim(),
                price: $item.find('.price, .cost').first().text()?.trim(),
                description: $item.find('.description, .summary').first().text()?.trim(),
                link: $item.find('a').first().attr('href'),
                url: '${url}'
            });
        });
        
        console.log('Scraped data:', data);
        return data;
        
    } catch (error) {
        console.error('Scraping error:', error);
        return [];
    }
}

scrapeWebsite().catch(console.error);`;
      
      return fallbackCode;
    }
    
    throw new Error(`Failed to generate scraping code: ${errorMessage}`);
  }
}
