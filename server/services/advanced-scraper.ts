import { Browser, chromium, firefox, webkit, Page, BrowserContext } from 'playwright';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import { WebSocketServer } from 'ws';

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

interface AdvancedScrapingOptions {
  url: string;
  selectors: any;
  strategy: string;
  maxPages?: number;
  delay?: number;
  renderMode?: 'static' | 'dynamic' | 'stealth';
  browserType?: 'chromium' | 'firefox' | 'webkit';
  waitForSelector?: string;
  waitForNetworkIdle?: boolean;
  scrollToBottom?: boolean;
  captureScreenshots?: boolean;
}

interface WebsiteStructure {
  contentContainers: string[];
  navigationElements: string[];
  paginationElements: string[];
  dynamicLoadTriggers: string[];
  jsFramework?: string;
  hasInfiniteScroll: boolean;
  hasAjaxPagination: boolean;
  antiDetection: {
    hasCloudflare: boolean;
    hasRecaptcha: boolean;
    requiresJavaScript: boolean;
  };
}

export class AdvancedScraperService {
  private wss: WebSocketServer | null = null;
  private activeTasks = new Map<string, any>();
  private browsers = new Map<string, Browser>();

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  private broadcastProgress(progress: any) {
    if (this.wss) {
      const message = JSON.stringify({
        type: 'advanced_scraping_progress',
        data: progress
      });
      
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(message);
        }
      });
    }
  }

  /**
   * Analyze website structure and determine optimal scraping strategy
   */
  async analyzeWebsiteStructure(url: string): Promise<WebsiteStructure> {
    console.log(`Analyzing website structure for: ${url}`);
    
    try {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      const page = await context.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const structure = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement.outerHTML;
        
        // Detect content containers
        const contentContainers: string[] = [];
        const containerSelectors = [
          '[class*="container"]', '[class*="content"]', '[class*="wrapper"]',
          '[class*="main"]', '[class*="body"]', '[class*="article"]',
          '[class*="post"]', '[class*="item"]', '[class*="card"]',
          '[class*="listing"]', '[class*="product"]'
        ];
        
        containerSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            contentContainers.push(selector);
          }
        });

        // Detect navigation elements
        const navigationElements: string[] = [];
        const navSelectors = [
          'nav', '[class*="nav"]', '[class*="menu"]', '[class*="header"]',
          '[class*="toolbar"]', '[class*="breadcrumb"]'
        ];
        
        navSelectors.forEach(selector => {
          if (document.querySelector(selector)) {
            navigationElements.push(selector);
          }
        });

        // Detect pagination elements
        const paginationElements: string[] = [];
        const paginationSelectors = [
          '[class*="pagination"]', '[class*="pager"]', '[class*="next"]',
          '[class*="prev"]', '[class*="page-"]', '.load-more'
        ];
        
        paginationSelectors.forEach(selector => {
          if (document.querySelector(selector)) {
            paginationElements.push(selector);
          }
        });

        // Detect infinite scroll and AJAX loading
        const hasInfiniteScroll = !!(
          document.querySelector('[data-infinite]') ||
          document.querySelector('[class*="infinite"]') ||
          html.includes('infinite') ||
          html.includes('loadMore') ||
          html.includes('load-more')
        );

        const hasAjaxPagination = !!(
          html.includes('ajax') ||
          html.includes('xhr') ||
          document.querySelector('[data-ajax]')
        );

        // Detect JavaScript framework
        let jsFramework = 'vanilla';
        if ((window as any).React || html.includes('react')) jsFramework = 'react';
        else if ((window as any).Vue || html.includes('vue')) jsFramework = 'vue';
        else if ((window as any).angular || html.includes('ng-')) jsFramework = 'angular';
        else if (html.includes('jquery')) jsFramework = 'jquery';

        // Detect anti-detection measures
        const hasCloudflare = !!(
          html.includes('cloudflare') ||
          html.includes('cf-browser-verification') ||
          document.querySelector('[data-cf-beacon]')
        );

        const hasRecaptcha = !!(
          html.includes('recaptcha') ||
          document.querySelector('.g-recaptcha')
        );

        const requiresJavaScript = !!(
          html.includes('Please enable JavaScript') ||
          html.includes('noscript') ||
          document.querySelector('noscript')
        );

        return {
          contentContainers,
          navigationElements,
          paginationElements,
          dynamicLoadTriggers: ['.load-more', '[data-load]', '.pagination a'],
          jsFramework,
          hasInfiniteScroll,
          hasAjaxPagination,
          antiDetection: {
            hasCloudflare,
            hasRecaptcha,
            requiresJavaScript
          }
        };
      });

      await browser.close();
      return structure;
      
    } catch (error) {
      console.error('Error analyzing website structure:', error);
      // Return default structure
      return {
        contentContainers: ['.content', '.main', '.container'],
        navigationElements: ['nav', '.navigation'],
        paginationElements: ['.pagination', '.pager'],
        dynamicLoadTriggers: ['.load-more'],
        jsFramework: 'unknown',
        hasInfiniteScroll: false,
        hasAjaxPagination: false,
        antiDetection: {
          hasCloudflare: false,
          hasRecaptcha: false,
          requiresJavaScript: true
        }
      };
    }
  }

  /**
   * Generate intelligent selectors based on page structure
   */
  async generateIntelligentSelectors(url: string): Promise<any> {
    console.log('Generating intelligent selectors...');
    
    try {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });

      const selectors = await page.evaluate(() => {
        const getElementScore = (element: Element) => {
          let score = 0;
          const classes = element.className.toLowerCase();
          const id = element.id.toLowerCase();
          
          // Score based on semantic class names
          if (classes.includes('item') || classes.includes('product') || classes.includes('post')) score += 10;
          if (classes.includes('card') || classes.includes('tile')) score += 8;
          if (classes.includes('content') || classes.includes('article')) score += 6;
          if (classes.includes('container') || classes.includes('wrapper')) score += 4;
          
          // Score based on element structure
          if (element.children.length > 2) score += 5;
          if (element.querySelector('h1, h2, h3, h4')) score += 8;
          if (element.querySelector('img')) score += 6;
          if (element.querySelector('a')) score += 4;
          if (element.querySelector('p')) score += 3;
          
          // Penalty for navigation elements
          if (classes.includes('nav') || classes.includes('menu') || classes.includes('header')) score -= 10;
          
          return score;
        };

        const findBestContainers = () => {
          const allElements = Array.from(document.querySelectorAll('*'));
          const scored = allElements
            .map(el => ({ element: el, score: getElementScore(el) }))
            .filter(item => item.score > 5)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

          return scored.map(item => {
            const el = item.element;
            let selector = el.tagName.toLowerCase();
            
            if (el.id) {
              selector = `#${el.id}`;
            } else if (el.className) {
              const classes = el.className.split(' ').filter(c => c.trim()).slice(0, 2);
              if (classes.length > 0) {
                selector = `.${classes.join('.')}`;
              }
            }
            
            return selector;
          });
        };

        const containers = findBestContainers();
        
        // Generate field selectors
        const titleSelectors = [
          'h1', 'h2', 'h3', '.title', '.name', '.heading',
          '[class*="title"]', '[class*="name"]', '[class*="heading"]'
        ];
        
        const priceSelectors = [
          '.price', '.cost', '.amount', '[class*="price"]',
          '[class*="cost"]', '[data-price]'
        ];
        
        const descriptionSelectors = [
          '.description', '.summary', '.excerpt', '.content p',
          '[class*="description"]', '[class*="summary"]'
        ];
        
        const imageSelectors = [
          'img', '.image img', '.thumbnail img', '[class*="image"] img'
        ];
        
        const linkSelectors = [
          'a', '.link', '[class*="link"]'
        ];

        return {
          primary: containers[0] || '.content',
          fallback: containers.slice(1, 5),
          fields: {
            title: titleSelectors,
            price: priceSelectors,
            description: descriptionSelectors,
            image: imageSelectors,
            link: linkSelectors
          }
        };
      });

      await browser.close();
      return selectors;
      
    } catch (error) {
      console.error('Error generating selectors:', error);
      return {
        primary: '.content',
        fallback: ['.item', '.card', '.post', 'article'],
        fields: {
          title: ['h1', 'h2', 'h3', '.title'],
          price: ['.price', '.cost'],
          description: ['.description', 'p'],
          image: ['img'],
          link: ['a']
        }
      };
    }
  }

  /**
   * Enhanced scraping with dynamic content support
   */
  async startAdvancedScraping(taskId: string, options: AdvancedScrapingOptions): Promise<void> {
    try {
      await storage.updateScrapingTask(taskId, { status: 'running' });
      
      // Analyze website structure first
      const structure = await this.analyzeWebsiteStructure(options.url);
      const intelligentSelectors = await this.generateIntelligentSelectors(options.url);
      
      this.broadcastProgress({
        taskId,
        status: 'analyzing',
        message: 'Website structure analyzed',
        analysis: {
          framework: structure.jsFramework,
          hasInfiniteScroll: structure.hasInfiniteScroll,
          antiDetection: structure.antiDetection
        }
      });

      // Choose scraping method based on analysis
      let renderMode = options.renderMode || 'dynamic';
      if (structure.antiDetection.hasCloudflare || structure.antiDetection.hasRecaptcha) {
        renderMode = 'stealth';
      } else if (!structure.antiDetection.requiresJavaScript) {
        renderMode = 'static';
      }

      console.log(`Using render mode: ${renderMode}`);
      
      let scrapedData;
      switch (renderMode) {
        case 'stealth':
          scrapedData = await this.scrapeWithStealth(taskId, options, intelligentSelectors);
          break;
        case 'dynamic':
          scrapedData = await this.scrapeWithPlaywright(taskId, options, intelligentSelectors, structure);
          break;
        default:
          scrapedData = await this.scrapeStatic(taskId, options, intelligentSelectors);
      }

      await storage.updateScrapingTask(taskId, { 
        status: 'completed',
        scrapedItems: scrapedData.length,
        progress: 100
      });

      this.broadcastProgress({
        taskId,
        status: 'completed',
        progress: 100,
        totalItems: scrapedData.length,
        scrapedItems: scrapedData.length,
        message: `Successfully scraped ${scrapedData.length} items`
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Advanced scraping error for task ${taskId}:`, error);
      
      await storage.updateScrapingTask(taskId, { 
        status: 'failed',
        errorMessage
      });

      this.broadcastProgress({
        taskId,
        status: 'failed',
        progress: 0,
        message: `Scraping failed: ${errorMessage}`
      });
    }
  }

  /**
   * Scrape with Playwright for dynamic content
   */
  private async scrapeWithPlaywright(
    taskId: string, 
    options: AdvancedScrapingOptions, 
    selectors: any,
    structure: WebsiteStructure
  ): Promise<any[]> {
    console.log('Scraping with Playwright for dynamic content...');
    
    const browserType = options.browserType || 'chromium';
    let browser;
    
    switch (browserType) {
      case 'firefox':
        browser = await firefox.launch({ headless: true });
        break;
      case 'webkit':
        browser = await webkit.launch({ headless: true });
        break;
      default:
        browser = await chromium.launch({ 
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    const allData: any[] = [];
    let currentPage = 1;
    const maxPages = options.maxPages || 3;

    try {
      while (currentPage <= maxPages) {
        const currentUrl = options.url + (currentPage > 1 ? `/page/${currentPage}/` : '');
        console.log(`Scraping page ${currentPage}: ${currentUrl}`);
        
        await page.goto(currentUrl, { 
          waitUntil: 'networkidle',
          timeout: 30000
        });

        // Wait for content to load
        if (options.waitForSelector) {
          await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
        }

        if (options.waitForNetworkIdle) {
          await page.waitForLoadState('networkidle');
        }

        // Scroll to bottom if needed for infinite scroll
        if (options.scrollToBottom || structure.hasInfiniteScroll) {
          await this.autoScroll(page);
        }

        // Extract data
        const pageData = await page.evaluate((sels) => {
          const extractText = (element: Element | null, selectors: string[]) => {
            if (!element) return '';
            for (const selector of selectors) {
              const el = element.querySelector(selector);
              if (el && el.textContent?.trim()) {
                return el.textContent.trim();
              }
            }
            return '';
          };

          const extractAttribute = (element: Element | null, selectors: string[], attr: string) => {
            if (!element) return '';
            for (const selector of selectors) {
              const el = element.querySelector(selector);
              if (el && el.getAttribute(attr)) {
                return el.getAttribute(attr) || '';
              }
            }
            return '';
          };

          const containers = document.querySelectorAll(sels.primary);
          const data: any[] = [];

          containers.forEach((container, index) => {
            const item: any = {
              id: index,
              title: extractText(container, sels.fields.title),
              price: extractText(container, sels.fields.price),
              description: extractText(container, sels.fields.description),
              link: extractAttribute(container, sels.fields.link, 'href'),
              image: extractAttribute(container, sels.fields.image, 'src'),
              scrapedAt: new Date().toISOString()
            };

            // Only add items with meaningful content
            if (item.title || item.price || item.description) {
              // Fix relative URLs
              if (item.link && item.link.startsWith('/')) {
                item.link = new URL(item.link, window.location.origin).href;
              }
              if (item.image && item.image.startsWith('/')) {
                item.image = new URL(item.image, window.location.origin).href;
              }
              data.push(item);
            }
          });

          return data;
        }, selectors);

        // Store scraped data
        for (const item of pageData) {
          await storage.createScrapedData({
            taskId,
            data: item,
            url: currentUrl,
            scrapedAt: new Date()
          });
        }

        allData.push(...pageData);

        this.broadcastProgress({
          taskId,
          status: 'running',
          progress: Math.round((currentPage / maxPages) * 100),
          currentPage,
          itemsOnPage: pageData.length,
          totalScraped: allData.length,
          message: `Page ${currentPage}: Found ${pageData.length} items`
        });

        // Check for next page
        const hasNextPage = await page.evaluate(() => {
          const nextLinks = document.querySelectorAll('.next, .pagination .next, [class*="next"]');
          return nextLinks.length > 0;
        });

        if (!hasNextPage) break;
        
        currentPage++;
        await page.waitForTimeout(options.delay || 2000);
      }

    } finally {
      await browser.close();
    }

    return allData;
  }

  /**
   * Scrape with stealth mode using Puppeteer
   */
  private async scrapeWithStealth(taskId: string, options: AdvancedScrapingOptions, selectors: any): Promise<any[]> {
    console.log('Scraping with stealth mode...');
    
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      headless: true
    });

    const page = await browser.newPage();
    const allData: any[] = [];

    try {
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Add realistic headers
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      await page.goto(options.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Human-like delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));

      // Extract data using the same logic but with Puppeteer
      const pageData = await page.evaluate((sels) => {
        // Same extraction logic as Playwright version
        const extractText = (element: Element | null, selectors: string[]) => {
          if (!element) return '';
          for (const selector of selectors) {
            const el = element.querySelector(selector);
            if (el && el.textContent?.trim()) {
              return el.textContent.trim();
            }
          }
          return '';
        };

        const extractAttribute = (element: Element | null, selectors: string[], attr: string) => {
          if (!element) return '';
          for (const selector of selectors) {
            const el = element.querySelector(selector);
            if (el && el.getAttribute(attr)) {
              return el.getAttribute(attr) || '';
            }
          }
          return '';
        };

        const containers = document.querySelectorAll(sels.primary);
        const data: any[] = [];

        containers.forEach((container, index) => {
          const item: any = {
            id: index,
            title: extractText(container, sels.fields.title),
            price: extractText(container, sels.fields.price),
            description: extractText(container, sels.fields.description),
            link: extractAttribute(container, sels.fields.link, 'href'),
            image: extractAttribute(container, sels.fields.image, 'src'),
            scrapedAt: new Date().toISOString()
          };

          if (item.title || item.price || item.description) {
            if (item.link && item.link.startsWith('/')) {
              item.link = new URL(item.link, window.location.origin).href;
            }
            if (item.image && item.image.startsWith('/')) {
              item.image = new URL(item.image, window.location.origin).href;
            }
            data.push(item);
          }
        });

        return data;
      }, selectors);

      // Store data
      for (const item of pageData) {
        await storage.createScrapedData({
          taskId,
          data: item,
          url: options.url,
          scrapedAt: new Date()
        });
      }

      allData.push(...pageData);

    } finally {
      await browser.close();
    }

    return allData;
  }

  /**
   * Static scraping fallback
   */
  private async scrapeStatic(taskId: string, options: AdvancedScrapingOptions, selectors: any): Promise<any[]> {
    console.log('Using static scraping method...');
    
    const response = await fetch(options.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const allData: any[] = [];

    $(selectors.primary).each((index, element) => {
      const $el = $(element);
      const item: any = {
        id: index,
        title: this.extractFieldData($, $el, selectors.fields.title),
        price: this.extractFieldData($, $el, selectors.fields.price),
        description: this.extractFieldData($, $el, selectors.fields.description),
        link: this.extractFieldAttribute($, $el, selectors.fields.link, 'href'),
        image: this.extractFieldAttribute($, $el, selectors.fields.image, 'src'),
        scrapedAt: new Date().toISOString()
      };

      if (item.title || item.price || item.description) {
        allData.push(item);
      }
    });

    // Store data
    for (const item of allData) {
      await storage.createScrapedData({
        taskId,
        data: item,
        url: options.url,
        scrapedAt: new Date()
      });
    }

    return allData;
  }

  private extractFieldData($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>, selectors: string[]): string {
    for (const selector of selectors) {
      const text = $element.find(selector).first().text().trim();
      if (text && text.length > 0) {
        return text;
      }
    }
    return '';
  }

  private extractFieldAttribute($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>, selectors: string[], attr: string): string {
    for (const selector of selectors) {
      const value = $element.find(selector).first().attr(attr);
      if (value) {
        return value;
      }
    }
    return '';
  }

  /**
   * Auto-scroll for infinite scroll pages
   */
  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
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

  async stopTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (task) {
      this.activeTasks.delete(taskId);
      await storage.updateScrapingTask(taskId, { 
        status: 'failed', 
        errorMessage: 'Task stopped by user' 
      });
    }
  }
}

export const advancedScraperService = new AdvancedScraperService();