import { scraperService } from './scraper';

// Job data interface
interface ScrapingJobData {
  taskId: string;
  url: string;
  selectors: any;
  strategy: string;
  maxPages?: number;
  delay?: number;
}

// Simple in-memory queue for demo purposes
class SimpleQueue {
  private jobs: Map<string, ScrapingJobData> = new Map();
  private processing = false;

  async add(name: string, data: ScrapingJobData): Promise<{ id: string; data: ScrapingJobData }> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.jobs.set(jobId, data);
    
    console.log(`Added scraping job ${jobId} for task: ${data.taskId}`);
    
    // Process job immediately in background
    this.processNext();
    
    return { id: jobId, data };
  }

  private async processNext() {
    if (this.processing || this.jobs.size === 0) return;
    
    this.processing = true;
    const [jobId, jobData] = this.jobs.entries().next().value;
    this.jobs.delete(jobId);
    
    try {
      console.log(`Processing scraping job ${jobId} for task: ${jobData.taskId}`);
      
      await scraperService.startScraping(jobData.taskId, {
        url: jobData.url,
        selectors: jobData.selectors,
        strategy: jobData.strategy,
        maxPages: jobData.maxPages,
        delay: jobData.delay
      });
      
      console.log(`Scraping job ${jobId} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Scraping job ${jobId} failed:`, errorMessage);
    }
    
    this.processing = false;
    
    // Process next job if any
    if (this.jobs.size > 0) {
      setTimeout(() => this.processNext(), 1000);
    }
  }
}

const scrapingQueue = new SimpleQueue();

export async function addScrapingJob(data: ScrapingJobData): Promise<{ id: string; data: ScrapingJobData }> {
  return await scrapingQueue.add('scrape-website', data);
}

export async function getJobStatus(jobId: string) {
  // For simple queue, jobs are processed immediately
  return {
    id: jobId,
    progress: 100,
    state: 'completed',
    data: null,
    failedReason: null,
  };
}

export async function removeJob(jobId: string) {
  // No-op for simple queue
  console.log(`Job ${jobId} removal requested`);
}
