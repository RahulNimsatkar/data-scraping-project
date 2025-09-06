import puppeteer from 'puppeteer';
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
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      let scrapedCount = 0;
      let currentPage = 1;
      let hasNextPage = true;

      this.activeTasks.set(taskId, { browser, page });

      while (hasNextPage && currentPage <= (options.maxPages || 10)) {
        const currentUrl = options.url + (currentPage > 1 ? `?page=${currentPage}` : '');
        
        await page.goto(currentUrl, { waitUntil: 'networkidle0' });
        await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, options.delay || 2000));

        const content = await page.content();
        const $ = cheerio.load(content);

        // Extract data based on selectors
        const items = $(options.selectors.primary || options.selectors.itemContainer);
        
        if (items.length === 0) {
          await storage.createTaskLog({
            taskId,
            level: 'warning',
            message: `No items found on page ${currentPage} with selector ${options.selectors.primary}`,
            metadata: { url: currentUrl, page: currentPage }
          });
          break;
        }

        // Process each item
        for (let i = 0; i < items.length; i++) {
          const item = items.eq(i);
          const data = this.extractItemData($, item, options.selectors);
          
          if (data && Object.keys(data).length > 0) {
            await storage.createScrapedData({
              taskId,
              data,
              url: currentUrl
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

        // Check for pagination
        hasNextPage = await this.hasNextPage(page, options);
        currentPage++;
      }

      await browser.close();
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
        metadata: { error: errorStack }
      });

      this.broadcastProgress({
        taskId,
        status: 'failed',
        progress: 0,
        totalItems: 0,
        scrapedItems: 0
      });

      // Clean up
      const task = this.activeTasks.get(taskId);
      if (task?.browser) {
        await task.browser.close();
      }
      this.activeTasks.delete(taskId);
    }
  }

  private extractItemData($: cheerio.CheerioAPI, item: cheerio.Cheerio<any>, selectors: any): any {
    const data: any = {};

    // Extract based on common patterns
    try {
      // Title/Name
      const titleSelectors = ['.title', '.name', '.product-title', 'h1', 'h2', 'h3'];
      for (const sel of titleSelectors) {
        const title = item.find(sel).first().text().trim();
        if (title) {
          data.title = title;
          break;
        }
      }

      // Price
      const priceSelectors = ['.price', '.cost', '.amount', '[class*="price"]'];
      for (const sel of priceSelectors) {
        const price = item.find(sel).first().text().trim();
        if (price && /[\$£€¥₹]/.test(price)) {
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

  private async hasNextPage(page: any, options: ScrapingOptions): Promise<boolean> {
    try {
      // Check for common pagination patterns
      const nextSelectors = [
        '.next', '.pagination .next', '[aria-label="Next"]', 
        '.pager-next', '.page-numbers.next'
      ];

      for (const selector of nextSelectors) {
        const nextBtn = await page.$(selector);
        if (nextBtn) {
          const isDisabled = await page.evaluate(
            (el: any) => el.disabled || el.classList.contains('disabled'), 
            nextBtn
          );
          return !isDisabled;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async pauseTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (task) {
      await storage.updateScrapingTask(taskId, { status: 'paused' });
      // Implementation for pausing would require more complex state management
    }
  }

  async stopTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId);
    if (task?.browser) {
      await task.browser.close();
      this.activeTasks.delete(taskId);
      await storage.updateScrapingTask(taskId, { status: 'failed', errorMessage: 'Task stopped by user' });
    }
  }
}

export const scraperService = new ScraperService();
