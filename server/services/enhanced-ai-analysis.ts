import OpenAI from "openai";
import { storage } from "../storage";

// Enhanced AI analysis service with multiple model support and fallbacks
const defaultOpenAI = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

// Helper function to get user's AI client with fallback
async function getAIClient(userId?: string): Promise<OpenAI> {
  if (userId) {
    try {
      const userKey = await storage.getAiProviderKey(userId, 'openai');
      if (userKey && userKey.isActive) {
        await storage.updateAiProviderKey(userKey.id!, {
          lastUsed: new Date(),
          usageCount: userKey.usageCount + 1
        });
        return new OpenAI({ apiKey: userKey.apiKey });
      }
    } catch (error) {
      console.error("Error getting user's AI key:", error);
    }
  }
  return defaultOpenAI;
}

interface EnhancedWebsiteAnalysis {
  structure: {
    contentContainers: string[];
    navigationElements: string[];
    dataPatterns: {
      repeatingElements: string[];
      listContainers: string[];
      cardLayouts: string[];
    };
  };
  selectors: {
    primary: string;
    fallback: string[];
    fields: {
      title: string[];
      price: string[];
      description: string[];
      image: string[];
      link: string[];
      date: string[];
      rating: string[];
      category: string[];
    };
  };
  technology: {
    framework: string;
    hasJavaScript: boolean;
    hasSPA: boolean;
    hasInfiniteScroll: boolean;
    hasAjaxPagination: boolean;
    hasLazyLoading: boolean;
  };
  antiBot: {
    cloudflare: boolean;
    recaptcha: boolean;
    rateLimiting: boolean;
    requiresHeaders: string[];
    suspiciousPatterns: string[];
  };
  strategy: {
    renderMode: 'static' | 'dynamic' | 'stealth';
    browserType: 'chromium' | 'firefox' | 'webkit';
    waitConditions: string[];
    scrollStrategy: 'none' | 'full' | 'incremental';
    delayBetweenRequests: number;
    maxPages: number;
  };
  confidence: number;
  recommendations: string[];
  estimatedComplexity: 'low' | 'medium' | 'high' | 'extreme';
}

export async function performEnhancedWebsiteAnalysis(
  url: string, 
  htmlContent: string, 
  customPrompt?: string, 
  userId?: string
): Promise<EnhancedWebsiteAnalysis> {
  try {
    const openai = await getAIClient(userId);
    
    // Enhanced prompt with more sophisticated analysis
    const analysisPrompt = `
You are an expert web scraping analyst with deep knowledge of modern web technologies, anti-bot measures, and data extraction strategies. Analyze the provided HTML content from ${url} and provide a comprehensive scraping strategy.

${customPrompt ? `Additional Context: ${customPrompt}` : ''}

HTML Content (first 15000 characters):
${htmlContent.substring(0, 15000)}

Analyze the website and provide a detailed JSON response with the following structure. Be very thorough and specific:

{
  "structure": {
    "contentContainers": ["specific CSS selectors for main content areas"],
    "navigationElements": ["navigation selectors"],
    "dataPatterns": {
      "repeatingElements": ["selectors for recurring data items"],
      "listContainers": ["container selectors for lists"],
      "cardLayouts": ["card/tile layout selectors"]
    }
  },
  "selectors": {
    "primary": "best primary selector for data items",
    "fallback": ["alternative selectors if primary fails"],
    "fields": {
      "title": ["selectors for titles/names"],
      "price": ["selectors for prices/costs"],
      "description": ["selectors for descriptions"],
      "image": ["selectors for images"],
      "link": ["selectors for links/URLs"],
      "date": ["selectors for dates"],
      "rating": ["selectors for ratings/reviews"],
      "category": ["selectors for categories/tags"]
    }
  },
  "technology": {
    "framework": "detected JS framework (react/vue/angular/vanilla/unknown)",
    "hasJavaScript": true/false,
    "hasSPA": true/false,
    "hasInfiniteScroll": true/false,
    "hasAjaxPagination": true/false,
    "hasLazyLoading": true/false
  },
  "antiBot": {
    "cloudflare": true/false,
    "recaptcha": true/false,
    "rateLimiting": true/false,
    "requiresHeaders": ["specific headers needed"],
    "suspiciousPatterns": ["patterns that indicate bot detection"]
  },
  "strategy": {
    "renderMode": "static/dynamic/stealth based on complexity",
    "browserType": "chromium/firefox/webkit based on compatibility",
    "waitConditions": ["specific elements/events to wait for"],
    "scrollStrategy": "none/full/incremental for dynamic loading",
    "delayBetweenRequests": number in milliseconds,
    "maxPages": recommended page limit
  },
  "confidence": number 0-100,
  "recommendations": ["specific actionable recommendations"],
  "estimatedComplexity": "low/medium/high/extreme"
}

Focus on:
1. Identifying the most reliable selectors for data extraction
2. Detecting anti-bot measures and evasion strategies  
3. Optimizing for the specific technology stack used
4. Providing realistic complexity assessment
5. Suggesting appropriate delays and limits`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert web scraping analyst. Provide detailed, accurate analysis in valid JSON format only. No explanations outside the JSON."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
      temperature: 0.1,
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");
    return analysis as EnhancedWebsiteAnalysis;

  } catch (error) {
    console.error("Enhanced AI analysis error:", error);
    
    // Intelligent fallback analysis when no API key or analysis fails
    console.log('Using intelligent fallback analysis due to:', error instanceof Error ? error.message : 'unknown error');
    return generateIntelligentFallbackAnalysis(url, htmlContent);
  }
}

function generateIntelligentFallbackAnalysis(url: string, htmlContent: string): EnhancedWebsiteAnalysis {
  console.log('Generating intelligent fallback analysis...');
  
  const html = htmlContent.toLowerCase();
  const domain = new URL(url).hostname.toLowerCase();
  
  // Detect technology patterns
  const hasReact = html.includes('react') || html.includes('_react') || html.includes('reactdom');
  const hasVue = html.includes('vue') || html.includes('v-if') || html.includes('v-for');
  const hasAngular = html.includes('angular') || html.includes('ng-') || html.includes('ngfor');
  const hasJQuery = html.includes('jquery') || html.includes('$.');
  
  // Detect anti-bot measures
  const hasCloudflare = html.includes('cloudflare') || html.includes('cf-browser-verification') || html.includes('ray id');
  const hasRecaptcha = html.includes('recaptcha') || html.includes('g-recaptcha');
  const hasRateLimiting = html.includes('rate limit') || html.includes('too many requests') || html.includes('429');
  
  // Detect dynamic loading patterns
  const hasInfiniteScroll = html.includes('infinite') || html.includes('load more') || html.includes('lazy');
  const hasAjaxPagination = html.includes('ajax') || html.includes('xhr') || html.includes('fetch(');
  const hasSPA = hasReact || hasVue || hasAngular;
  
  // Generate smart selectors based on content patterns
  let framework = 'vanilla';
  if (hasReact) framework = 'react';
  else if (hasVue) framework = 'vue';  
  else if (hasAngular) framework = 'angular';
  else if (hasJQuery) framework = 'jquery';
  
  // Determine complexity
  let complexity: 'low' | 'medium' | 'high' | 'extreme' = 'low';
  if (hasCloudflare || hasRecaptcha) complexity = 'extreme';
  else if (hasSPA || hasInfiniteScroll) complexity = 'high';
  else if (hasAjaxPagination || framework !== 'vanilla') complexity = 'medium';
  
  // Determine strategy
  let renderMode: 'static' | 'dynamic' | 'stealth' = 'static';
  if (hasCloudflare || hasRecaptcha) renderMode = 'stealth';
  else if (hasSPA || hasInfiniteScroll || hasAjaxPagination) renderMode = 'dynamic';
  
  return {
    structure: {
      contentContainers: ['.content', '.main', '.container', '.wrapper', '#content'],
      navigationElements: ['nav', '.navigation', '.nav', '.menu', 'header'],
      dataPatterns: {
        repeatingElements: ['.item', '.card', '.product', '.post', '.listing', 'article'],
        listContainers: ['.list', '.grid', '.items', '.products', '.posts'],
        cardLayouts: ['.card', '.tile', '.box', '.panel']
      }
    },
    selectors: {
      primary: '.item, .card, .product, .post, .listing, article',
      fallback: ['.content > div', '.main > div', '[class*="item"]', '[class*="card"]', '[class*="product"]'],
      fields: {
        title: ['h1', 'h2', 'h3', '.title', '.name', '.heading', '[class*="title"]', '[class*="name"]'],
        price: ['.price', '.cost', '.amount', '[class*="price"]', '[class*="cost"]', '[data-price]'],
        description: ['.description', '.summary', '.excerpt', 'p', '[class*="description"]'],
        image: ['img', '.image img', '.thumbnail img', '[class*="image"] img'],
        link: ['a', '.link', '[href]'],
        date: ['.date', '.time', '.published', '[class*="date"]', '[datetime]'],
        rating: ['.rating', '.stars', '.score', '[class*="rating"]', '[class*="star"]'],
        category: ['.category', '.tag', '.label', '[class*="category"]', '[class*="tag"]']
      }
    },
    technology: {
      framework,
      hasJavaScript: hasSPA || hasInfiniteScroll || hasAjaxPagination,
      hasSPA,
      hasInfiniteScroll,
      hasAjaxPagination,
      hasLazyLoading: html.includes('lazy') || html.includes('loading="lazy"')
    },
    antiBot: {
      cloudflare: hasCloudflare,
      recaptcha: hasRecaptcha,
      rateLimiting: hasRateLimiting,
      requiresHeaders: ['User-Agent', 'Accept', 'Accept-Language'],
      suspiciousPatterns: hasCloudflare ? ['cloudflare challenge'] : []
    },
    strategy: {
      renderMode,
      browserType: 'chromium',
      waitConditions: hasSPA ? ['networkidle'] : ['load'],
      scrollStrategy: hasInfiniteScroll ? 'incremental' : 'none',
      delayBetweenRequests: complexity === 'extreme' ? 5000 : complexity === 'high' ? 3000 : 2000,
      maxPages: complexity === 'extreme' ? 2 : complexity === 'high' ? 3 : 5
    },
    confidence: complexity === 'extreme' ? 60 : complexity === 'high' ? 75 : 85,
    recommendations: [
      `Use ${renderMode} rendering mode for optimal results`,
      `Set delays of ${complexity === 'extreme' ? '5+' : complexity === 'high' ? '3-5' : '2-3'} seconds between requests`,
      hasCloudflare ? 'Consider using stealth mode to bypass Cloudflare' : 'Standard scraping should work',
      hasSPA ? 'Wait for dynamic content to load completely' : 'Static scraping is sufficient',
      `Estimated difficulty: ${complexity}`,
    ],
    estimatedComplexity: complexity
  };
}

export async function generateAdvancedScrapingCode(
  url: string,
  analysis: EnhancedWebsiteAnalysis,
  language: 'python' | 'javascript' = 'javascript',
  userId?: string
): Promise<string> {
  try {
    const openai = await getAIClient(userId);
    
    const codePrompt = `Generate production-ready ${language} web scraping code based on this analysis:

URL: ${url}
Analysis: ${JSON.stringify(analysis, null, 2)}

Requirements:
- Use ${language === 'python' ? 'Playwright with Python' : 'Playwright with Node.js'}
- Implement the recommended strategy from analysis
- Handle anti-bot measures if detected
- Include proper error handling and logging
- Add realistic delays and human-like behavior
- Handle pagination and infinite scroll as needed
- Include data validation and cleaning
- Make it production-ready with proper structure

Generate clean, well-commented code without markdown formatting.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system", 
          content: `You are an expert web scraping developer. Generate clean, production-ready ${language} code with proper error handling and best practices.`
        },
        {
          role: "user",
          content: codePrompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.1,
    });

    return response.choices[0].message.content || '';

  } catch (error) {
    console.error("Code generation error:", error);
    
    // Return fallback code template
    return generateFallbackCode(url, analysis, language);
  }
}

function generateFallbackCode(url: string, analysis: EnhancedWebsiteAnalysis, language: 'python' | 'javascript'): string {
  if (language === 'python') {
    return `
import asyncio
import json
import random
from playwright.async_api import async_playwright

class AdvancedWebScraper:
    def __init__(self):
        self.delays = [${analysis.strategy.delayBetweenRequests}, ${analysis.strategy.delayBetweenRequests + 1000}]
        
    async def scrape_website(self):
        async with async_playwright() as p:
            # Launch browser with stealth settings
            browser = await p.${analysis.strategy.browserType}.launch(
                headless=${analysis.strategy.renderMode !== 'stealth'},
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                viewport={'width': 1366, 'height': 768}
            )
            
            page = await context.new_page()
            
            try:
                await page.goto('${url}', wait_until='networkidle')
                await page.wait_for_timeout(random.choice(self.delays))
                
                # Extract data using analyzed selectors
                items = await page.query_selector_all('${analysis.selectors.primary}')
                data = []
                
                for item in items:
                    item_data = {}
                    
                    # Extract title
                    title_elem = await item.query_selector('${analysis.selectors.fields.title[0]}')
                    if title_elem:
                        item_data['title'] = await title_elem.text_content()
                    
                    # Extract price
                    price_elem = await item.query_selector('${analysis.selectors.fields.price[0]}')
                    if price_elem:
                        item_data['price'] = await price_elem.text_content()
                    
                    # Add more fields as needed
                    if item_data:
                        data.append(item_data)
                
                return data
                
            except Exception as e:
                print(f"Scraping error: {e}")
                return []
            finally:
                await browser.close()

if __name__ == "__main__":
    scraper = AdvancedWebScraper()
    data = asyncio.run(scraper.scrape_website())
    print(json.dumps(data, indent=2))
`;
  } else {
    return `
const { ${analysis.strategy.browserType} } = require('playwright');

class AdvancedWebScraper {
  constructor() {
    this.delays = [${analysis.strategy.delayBetweenRequests}, ${analysis.strategy.delayBetweenRequests + 1000}];
  }
  
  async scrapeWebsite() {
    const browser = await ${analysis.strategy.browserType}.launch({
      headless: ${analysis.strategy.renderMode !== 'stealth'},
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1366, height: 768 }
    });
    
    const page = await context.newPage();
    
    try {
      await page.goto('${url}', { waitUntil: 'networkidle' });
      await page.waitForTimeout(this.delays[Math.floor(Math.random() * this.delays.length)]);
      
      ${analysis.strategy.scrollStrategy === 'full' ? 'await this.autoScroll(page);' : ''}
      
      // Extract data using analyzed selectors
      const data = await page.evaluate((selectors) => {
        const items = document.querySelectorAll(selectors.primary);
        const results = [];
        
        items.forEach((item, index) => {
          const itemData = {
            id: index,
            title: item.querySelector('${analysis.selectors.fields.title[0]}')?.textContent?.trim() || '',
            price: item.querySelector('${analysis.selectors.fields.price[0]}')?.textContent?.trim() || '',
            description: item.querySelector('${analysis.selectors.fields.description[0]}')?.textContent?.trim() || '',
            link: item.querySelector('${analysis.selectors.fields.link[0]}')?.getAttribute('href') || '',
            image: item.querySelector('${analysis.selectors.fields.image[0]}')?.getAttribute('src') || ''
          };
          
          if (itemData.title || itemData.price || itemData.description) {
            results.push(itemData);
          }
        });
        
        return results;
      }, {
        primary: '${analysis.selectors.primary}'
      });
      
      return data;
      
    } catch (error) {
      console.error('Scraping error:', error);
      return [];
    } finally {
      await browser.close();
    }
  }
  
  async autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }
}

// Usage
const scraper = new AdvancedWebScraper();
scraper.scrapeWebsite().then(data => {
  console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
`;
  }
}