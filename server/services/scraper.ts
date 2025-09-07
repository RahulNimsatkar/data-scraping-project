// Removed puppeteer - using HTTP requests instead
import * as cheerio from 'cheerio';
import { storage } from '../storage';
import { WebSocketServer } from 'ws';

interface ScrapingOptions {
  url: string;
  selectors: any;
  strategy: string;
  maxPages?: number;
  delay?: number;
}

interface ScrapingProgress {
  taskId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  totalItems: number;
  scrapedItems: number;
  currentUrl?: string;
  rate?: number;
}

export class ScraperService {
  private wss: WebSocketServer | null = null;
  private activeTasks = new Map<string, any>();

  setWebSocketServer(wss: WebSocketServer) {
    this.wss = wss;
  }

  private broadcastProgress(progress: ScrapingProgress) {
    if (this.wss) {
      const message = JSON.stringify({
        type: 'scraping_progress',
        data: progress
      });
      
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
    }
  }

  async startScraping(taskId: string, options: ScrapingOptions): Promise<void> {
    try {
      await storage.updateScrapingTask(taskId, { status: 'running' });
      
      let scrapedCount = 0;
      let currentPage = 1;
      let hasNextPage = true;

      this.activeTasks.set(taskId, { active: true });

      while (hasNextPage && currentPage <= (options.maxPages || 3)) {
        const currentUrl = options.url + (currentPage > 1 ? `/page/${currentPage}/` : '');
        
        console.log(`Scraping page ${currentPage}: ${currentUrl}`);
        
        // Use HTTP request instead of browser
        const response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const content = await response.text();
        await new Promise(resolve => setTimeout(resolve, options.delay || 2000));
        const $ = cheerio.load(content);

        // Extract data based on selectors - try multiple approaches
        let items = $(options.selectors.primary || options.selectors.itemContainer);
        
        // If primary selector doesn't work, try fallback selectors
        if (items.length === 0 && options.selectors.fallback) {
          for (const fallbackSelector of options.selectors.fallback) {
            items = $(fallbackSelector);
            if (items.length > 0) {
              console.log(`Found ${items.length} items using fallback selector: ${fallbackSelector}`);
              break;
            }
          }
        }
        
        // If still no items, try comprehensive common selectors for various website types
        if (items.length === 0) {
          const genericSelectors = [
            // E-commerce and product pages
            'div[class*="product"]', 'div[class*="item"]', 'div[class*="listing"]',
            'div[class*="card"]', 'div[class*="tile"]', 'div[class*="box"]',
            
            // Content and blog pages
            'article', '.post', '.entry', '.content', '.blog-post',
            'div[class*="post"]', 'div[class*="article"]', 'div[class*="content"]',
            
            // Real estate and classified ads
            'div[class*="hoarding"]', 'div[class*="property"]', 'div[class*="ad"]',
            
            // General layout containers
            'div.row > div', 'section > div', '.container > div', '.main > div',
            'li', 'tr', 'div[id*="item"]', 'div[data-*]'
          ];
          
          for (const selector of genericSelectors) {
            items = $(selector);
            if (items.length > 0) {
              console.log(`Found ${items.length} items using generic selector: ${selector}`);
              break;
            }
          }
        }
        
        if (items.length === 0) {
          await storage.createTaskLog({
            taskId,
            level: 'warning',
            message: `No items found on page ${currentPage} with any selector`,
            metadata: { url: currentUrl, page: currentPage, contentLength: content.length },
            createdAt: new Date()
          });
          break;
        }
        
        console.log(`Processing ${items.length} items from page ${currentPage}`);

        // Process each item
        for (let i = 0; i < items.length; i++) {
          const item = items.eq(i);
          const data = this.extractItemData($, item, options.selectors);
          
          if (data && Object.keys(data).length > 0) {
            await storage.createScrapedData({
              taskId,
              data,
              url: currentUrl,
              scrapedAt: new Date()
            });
            scrapedCount++;

            // Broadcast progress
            this.broadcastProgress({
              taskId,
              status: 'running',
              progress: Math.round((scrapedCount / (items.length * (options.maxPages || 10))) * 100),
              totalItems: items.length * (options.maxPages || 10),
              scrapedItems: scrapedCount,
              currentUrl,
              rate: Math.round(scrapedCount / ((Date.now() - Date.now()) / 60000) || 1)
            });
          }
        }

        // Check for pagination by looking for items on next page
        hasNextPage = currentPage < (options.maxPages || 3) && items.length > 0;
        currentPage++;
      }

      this.activeTasks.delete(taskId);

      await storage.updateScrapingTask(taskId, { 
        status: 'completed',
        scrapedItems: scrapedCount,
        progress: 100
      });

      this.broadcastProgress({
        taskId,
        status: 'completed',
        progress: 100,
        totalItems: scrapedCount,
        scrapedItems: scrapedCount
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : String(error);
      console.error(`Scraping error for task ${taskId}:`, error);
      
      await storage.updateScrapingTask(taskId, { 
        status: 'failed',
        errorMessage
      });

      await storage.createTaskLog({
        taskId,
        level: 'error',
        message: errorMessage,
        metadata: { error: errorStack },
        createdAt: new Date()
      });

      this.broadcastProgress({
        taskId,
        status: 'failed',
        progress: 0,
        totalItems: 0,
        scrapedItems: 0
      });

      // Clean up
      this.activeTasks.delete(taskId);
    }
  }

  private extractItemData($: cheerio.CheerioAPI, item: cheerio.Cheerio<any>, selectors: any): any {
    const data: any = {};

    // Extract based on comprehensive patterns
    try {
      // Title/Name - extensive search with priority order
      const titleSelectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        '.title', '.name', '.heading', '.product-title', '.item-title',
        '[class*="title"]', '[class*="name"]', '[class*="heading"]',
        'a[title]', 'strong', 'b', '.lead', '.main-text'
      ];
      
      for (const sel of titleSelectors) {
        const title = item.find(sel).first().text().trim();
        if (title && title.length > 2 && title.length < 200) {
          data.title = title;
          break;
        }
      }
      
      // If no specific title found, try to get any text content
      if (!data.title) {
        const allText = item.text().trim();
        if (allText && allText.length > 5) {
          // Take first meaningful line of text
          data.title = allText.split('\n')[0].trim().substring(0, 100);
        }
      }

      // Price - look for various price patterns
      const priceSelectors = ['.price', '.cost', '.amount', '[class*="price"]', '[class*="cost"]'];
      for (const sel of priceSelectors) {
        const price = item.find(sel).first().text().trim();
        if (price && (price.includes('₹') || price.includes('$') || price.includes('Rs') || /\d+/.test(price))) {
          data.price = price;
          break;
        }
      }

      // Description
      const descSelectors = ['.description', '.summary', '.excerpt', 'p'];
      for (const sel of descSelectors) {
        const desc = item.find(sel).first().text().trim();
        if (desc && desc.length > 10) {
          data.description = desc.substring(0, 200);
          break;
        }
      }

      // Link
      const link = item.find('a').first().attr('href');
      if (link) {
        data.link = link.startsWith('http') ? link : `${new URL(selectors.url).origin}${link}`;
      }

      // Image
      const img = item.find('img').first().attr('src');
      if (img) {
        data.image = img.startsWith('http') ? img : `${new URL(selectors.url).origin}${img}`;
      }

    } catch (error) {
      console.error('Data extraction error:', error);
    }

    return data;
  }

  // Removed hasNextPage method - now using simple page limit check

  async pauseTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (task) {
      await storage.updateScrapingTask(taskId, { status: 'paused' });
      // Implementation for pausing would require more complex state management
    }
  }

  async stopTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (task) {
      this.activeTasks.delete(taskId);
      await storage.updateScrapingTask(taskId, { status: 'failed', errorMessage: 'Task stopped by user' });
    }
  }
}

export const scraperService = new ScraperService();
