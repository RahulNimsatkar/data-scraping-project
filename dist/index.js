// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer } from "ws";

// shared/schema.ts
import { z } from "zod";
var userSchema = z.object({
  id: z.string().optional(),
  // MongoDB will generate _id
  username: z.string().min(1),
  password: z.string().min(1),
  email: z.string().email(),
  plan: z.string().default("free"),
  createdAt: z.date().default(() => /* @__PURE__ */ new Date())
});
var apiKeySchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string().min(1),
  keyHash: z.string().min(1),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => /* @__PURE__ */ new Date())
});
var scrapingTaskSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string().min(1),
  url: z.string().url(),
  status: z.enum(["pending", "running", "completed", "failed", "paused"]).default("pending"),
  progress: z.number().int().min(0).default(0),
  totalItems: z.number().int().min(0).default(0),
  scrapedItems: z.number().int().min(0).default(0),
  selectors: z.record(z.string(), z.string()).optional(),
  // Assuming selectors are key-value pairs
  strategy: z.string().optional(),
  generatedCode: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.date().default(() => /* @__PURE__ */ new Date()),
  updatedAt: z.date().default(() => /* @__PURE__ */ new Date())
});
var scrapedDataSchema = z.object({
  id: z.string().optional(),
  taskId: z.string(),
  data: z.record(z.string(), z.any()),
  // Flexible for various scraped data
  url: z.string().url(),
  scrapedAt: z.date().default(() => /* @__PURE__ */ new Date())
});
var websiteAnalysisSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  selectors: z.record(z.string(), z.string()).optional(),
  patterns: z.record(z.string(), z.any()).optional(),
  strategy: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
  // Assuming confidence is a percentage
  createdAt: z.date().default(() => /* @__PURE__ */ new Date())
});
var taskLogSchema = z.object({
  id: z.string().optional(),
  taskId: z.string(),
  level: z.enum(["info", "warning", "error"]),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date().default(() => /* @__PURE__ */ new Date())
});

// server/db.ts
import { MongoClient } from "mongodb";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var uri = process.env.DATABASE_URL;
var client = new MongoClient(uri);
var _db;
async function connectToDatabase() {
  try {
    await client.connect();
    _db = client.db();
    console.log("Connected to MongoDB!");
    return _db;
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
    throw e;
  }
}
var getDb = () => {
  if (!_db) {
    throw new Error("Database not connected. Call connectToDatabase first.");
  }
  return _db;
};

// server/storage.ts
import { ObjectId } from "mongodb";
var DatabaseStorage = class {
  getUsersCollection() {
    return getDb().collection("users");
  }
  getApiKeysCollection() {
    return getDb().collection("apiKeys");
  }
  getScrapingTasksCollection() {
    return getDb().collection("scrapingTasks");
  }
  getScrapedDataCollection() {
    return getDb().collection("scrapedData");
  }
  getWebsiteAnalysisCollection() {
    return getDb().collection("websiteAnalysis");
  }
  getTaskLogsCollection() {
    return getDb().collection("taskLogs");
  }
  async getUser(id) {
    try {
      const user = await this.getUsersCollection().findOne({ _id: new ObjectId(id) });
      return user ? userSchema.parse({ ...user, id: user._id.toHexString() }) : void 0;
    } catch (error) {
      console.error("Error in getUser:", error);
      return void 0;
    }
  }
  async getUserByUsername(username) {
    const user = await this.getUsersCollection().findOne({ username });
    return user ? userSchema.parse({ ...user, id: user._id.toHexString() }) : void 0;
  }
  async createUser(user) {
    const validatedUser = userSchema.parse(user);
    const result = await this.getUsersCollection().insertOne(validatedUser);
    return userSchema.parse({ ...validatedUser, id: result.insertedId.toHexString() });
  }
  async getApiKeys(userId) {
    const apiKeys = await this.getApiKeysCollection().find({ userId }).toArray();
    return apiKeys.map((key) => apiKeySchema.parse({ ...key, id: key._id.toHexString() }));
  }
  async createApiKey(apiKey) {
    const validatedApiKey = apiKeySchema.parse(apiKey);
    const result = await this.getApiKeysCollection().insertOne(validatedApiKey);
    return apiKeySchema.parse({ ...validatedApiKey, id: result.insertedId.toHexString() });
  }
  async getApiKeyByHash(keyHash) {
    const apiKey = await this.getApiKeysCollection().findOne({ keyHash });
    return apiKey ? apiKeySchema.parse({ ...apiKey, id: apiKey._id.toHexString() }) : void 0;
  }
  async getScrapingTasks(userId) {
    const tasks = await this.getScrapingTasksCollection().find({ userId }).sort({ createdAt: -1 }).toArray();
    return tasks.map((task) => scrapingTaskSchema.parse({ ...task, id: task._id.toHexString() }));
  }
  async getScrapingTask(id) {
    try {
      const task = await this.getScrapingTasksCollection().findOne({ _id: new ObjectId(id) });
      return task ? scrapingTaskSchema.parse({ ...task, id: task._id.toHexString() }) : void 0;
    } catch (error) {
      console.error("Error in getScrapingTask:", error);
      return void 0;
    }
  }
  async createScrapingTask(task) {
    const validatedTask = scrapingTaskSchema.parse(task);
    const result = await this.getScrapingTasksCollection().insertOne(validatedTask);
    return scrapingTaskSchema.parse({ ...validatedTask, id: result.insertedId.toHexString() });
  }
  async updateScrapingTask(id, updates) {
    const validatedUpdates = scrapingTaskSchema.partial().parse(updates);
    const result = await this.getScrapingTasksCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...validatedUpdates, updatedAt: /* @__PURE__ */ new Date() } },
      { returnDocument: "after" }
    );
    if (!result.value) {
      throw new Error(`Scraping task with id ${id} not found.`);
    }
    return scrapingTaskSchema.parse({ ...result.value, id: result.value._id.toHexString() });
  }
  async getActiveScrapingTasks(userId) {
    const tasks = await this.getScrapingTasksCollection().find({ userId, status: "running" }).toArray();
    return tasks.map((task) => scrapingTaskSchema.parse({ ...task, id: task._id.toHexString() }));
  }
  async getScrapedData(taskId, limit = 50, offset = 0) {
    const data = await this.getScrapedDataCollection().find({ taskId }).sort({ scrapedAt: -1 }).skip(offset).limit(limit).toArray();
    return data.map((item) => scrapedDataSchema.parse({ ...item, id: item._id.toHexString() }));
  }
  async createScrapedData(data) {
    const validatedData = scrapedDataSchema.parse(data);
    const result = await this.getScrapedDataCollection().insertOne(validatedData);
    return scrapedDataSchema.parse({ ...validatedData, id: result.insertedId.toHexString() });
  }
  async updateScrapedData(id, updates) {
    const validatedUpdates = scrapedDataSchema.partial().parse(updates);
    const result = await this.getScrapedDataCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: validatedUpdates },
      { returnDocument: "after" }
    );
    if (!result.value) {
      throw new Error(`Scraped data with id ${id} not found.`);
    }
    return scrapedDataSchema.parse({ ...result.value, id: result.value._id.toHexString() });
  }
  async deleteScrapedData(id) {
    await this.getScrapedDataCollection().deleteOne({ _id: new ObjectId(id) });
  }
  async getWebsiteAnalysis(url) {
    const analysis = await this.getWebsiteAnalysisCollection().findOne({ url });
    return analysis ? websiteAnalysisSchema.parse({ ...analysis, id: analysis._id.toHexString() }) : void 0;
  }
  async createWebsiteAnalysis(analysis) {
    const validatedAnalysis = websiteAnalysisSchema.parse(analysis);
    const result = await this.getWebsiteAnalysisCollection().insertOne(validatedAnalysis);
    return websiteAnalysisSchema.parse({ ...validatedAnalysis, id: result.insertedId.toHexString() });
  }
  async getTaskLogs(taskId) {
    const logs = await this.getTaskLogsCollection().find({ taskId }).sort({ createdAt: -1 }).toArray();
    return logs.map((log2) => taskLogSchema.parse({ ...log2, id: log2._id.toHexString() }));
  }
  async createTaskLog(log2) {
    const validatedLog = taskLogSchema.parse(log2);
    const result = await this.getTaskLogsCollection().insertOne(validatedLog);
    return taskLogSchema.parse({ ...validatedLog, id: result.insertedId.toHexString() });
  }
  async getUserStats(userId) {
    const userTasks = await this.getScrapingTasksCollection().find({ userId }).project({ _id: 1, status: 1 }).toArray();
    const taskIds = userTasks.map((task) => task._id.toHexString());
    const totalScraped = await this.getScrapedDataCollection().countDocuments({ taskId: { $in: taskIds } });
    const activeTasks = userTasks.filter((task) => task.status === "running").length;
    const completedTasks = userTasks.filter((task) => task.status === "completed").length;
    const totalTasks = userTasks.length;
    const successRate = totalTasks > 0 ? completedTasks / totalTasks * 100 : 0;
    return {
      totalScraped,
      activeTasks,
      successRate: Math.round(successRate * 10) / 10,
      apiCalls: Math.floor(Math.random() * 5e4) + 1e4
      // Mock for now
    };
  }
};
var storage = new DatabaseStorage();

// server/services/openai.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});
async function analyzeWebsiteStructure(url, htmlContent, customPrompt) {
  try {
    const basePrompt = `Analyze the following HTML content from ${url} and provide web scraping recommendations.`;
    const customInstructions = customPrompt ? `

Additional Instructions: ${customPrompt}` : "";
    const prompt = `${basePrompt}${customInstructions}

HTML Content (truncated):
${htmlContent.substring(0, 1e4)}

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
      max_tokens: 1500
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("OpenAI analysis error:", error);
    if (errorMessage.includes("quota") || errorMessage.includes("429")) {
      console.log("OpenAI quota exceeded, using fallback analysis");
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
async function generateScrapingCode(url, selectors, strategy, language = "python") {
  try {
    const prompt = `Generate ${language} web scraping code for:
URL: ${url}
Selectors: ${JSON.stringify(selectors)}
Strategy: ${strategy}

Requirements:
- Use ${language === "python" ? "Scrapy framework" : "Puppeteer library"}
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
      max_tokens: 2e3
    });
    return response.choices[0].message.content || "";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Code generation error:", error);
    if (errorMessage.includes("quota") || errorMessage.includes("429")) {
      console.log("OpenAI quota exceeded, using fallback code generation");
      const fallbackCode = language === "python" ? `import scrapy
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
            yield response.follow(next_page, self.parse)` : `const cheerio = require('cheerio');

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

// server/services/scraper.ts
import * as cheerio from "cheerio";
var ScraperService = class {
  wss = null;
  activeTasks = /* @__PURE__ */ new Map();
  setWebSocketServer(wss) {
    this.wss = wss;
  }
  broadcastProgress(progress) {
    if (this.wss) {
      const message = JSON.stringify({
        type: "scraping_progress",
        data: progress
      });
      this.wss.clients.forEach((client2) => {
        if (client2.readyState === 1) {
          client2.send(message);
        }
      });
    }
  }
  async startScraping(taskId, options) {
    try {
      await storage.updateScrapingTask(taskId, { status: "running" });
      let scrapedCount = 0;
      let currentPage = 1;
      let hasNextPage = true;
      this.activeTasks.set(taskId, { active: true });
      while (hasNextPage && currentPage <= (options.maxPages || 3)) {
        const currentUrl = options.url + (currentPage > 1 ? `/page/${currentPage}/` : "");
        console.log(`Scraping page ${currentPage}: ${currentUrl}`);
        const response = await fetch(currentUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const content = await response.text();
        await new Promise((resolve) => setTimeout(resolve, options.delay || 2e3));
        const $ = cheerio.load(content);
        let items = $(options.selectors.primary || options.selectors.itemContainer);
        if (items.length === 0 && options.selectors.fallback) {
          for (const fallbackSelector of options.selectors.fallback) {
            items = $(fallbackSelector);
            if (items.length > 0) {
              console.log(`Found ${items.length} items using fallback selector: ${fallbackSelector}`);
              break;
            }
          }
        }
        if (items.length === 0) {
          const genericSelectors = [
            'div[class*="listing"]',
            'div[class*="item"]',
            'div[class*="product"]',
            'div[class*="card"]',
            'div[class*="hoarding"]',
            'div[class*="content"]',
            "article",
            ".entry",
            ".post",
            "div.row > div",
            "section > div"
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
            level: "warning",
            message: `No items found on page ${currentPage} with any selector`,
            metadata: { url: currentUrl, page: currentPage, contentLength: content.length },
            createdAt: /* @__PURE__ */ new Date()
          });
          break;
        }
        console.log(`Processing ${items.length} items from page ${currentPage}`);
        for (let i = 0; i < items.length; i++) {
          const item = items.eq(i);
          const data = this.extractItemData($, item, options.selectors);
          if (data && Object.keys(data).length > 0) {
            await storage.createScrapedData({
              taskId,
              data,
              url: currentUrl,
              scrapedAt: /* @__PURE__ */ new Date()
            });
            scrapedCount++;
            this.broadcastProgress({
              taskId,
              status: "running",
              progress: Math.round(scrapedCount / (items.length * (options.maxPages || 10)) * 100),
              totalItems: items.length * (options.maxPages || 10),
              scrapedItems: scrapedCount,
              currentUrl,
              rate: Math.round(scrapedCount / ((Date.now() - Date.now()) / 6e4) || 1)
            });
          }
        }
        hasNextPage = currentPage < (options.maxPages || 3) && items.length > 0;
        currentPage++;
      }
      this.activeTasks.delete(taskId);
      await storage.updateScrapingTask(taskId, {
        status: "completed",
        scrapedItems: scrapedCount,
        progress: 100
      });
      this.broadcastProgress({
        taskId,
        status: "completed",
        progress: 100,
        totalItems: scrapedCount,
        scrapedItems: scrapedCount
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : String(error);
      console.error(`Scraping error for task ${taskId}:`, error);
      await storage.updateScrapingTask(taskId, {
        status: "failed",
        errorMessage
      });
      await storage.createTaskLog({
        taskId,
        level: "error",
        message: errorMessage,
        metadata: { error: errorStack },
        createdAt: /* @__PURE__ */ new Date()
      });
      this.broadcastProgress({
        taskId,
        status: "failed",
        progress: 0,
        totalItems: 0,
        scrapedItems: 0
      });
      this.activeTasks.delete(taskId);
    }
  }
  extractItemData($, item, selectors) {
    const data = {};
    try {
      const titleSelectors = [".title", ".name", ".product-title", "h1", "h2", "h3", "h4", '[class*="title"]', '[class*="name"]'];
      for (const sel of titleSelectors) {
        const title = item.find(sel).first().text().trim();
        if (title && title.length > 3) {
          data.title = title;
          break;
        }
      }
      if (!data.title) {
        const allText = item.text().trim();
        if (allText && allText.length > 5) {
          data.title = allText.split("\n")[0].trim().substring(0, 100);
        }
      }
      const priceSelectors = [".price", ".cost", ".amount", '[class*="price"]', '[class*="cost"]'];
      for (const sel of priceSelectors) {
        const price = item.find(sel).first().text().trim();
        if (price && (price.includes("\u20B9") || price.includes("$") || price.includes("Rs") || /\d+/.test(price))) {
          data.price = price;
          break;
        }
      }
      const descSelectors = [".description", ".summary", ".excerpt", "p"];
      for (const sel of descSelectors) {
        const desc = item.find(sel).first().text().trim();
        if (desc && desc.length > 10) {
          data.description = desc.substring(0, 200);
          break;
        }
      }
      const link = item.find("a").first().attr("href");
      if (link) {
        data.link = link.startsWith("http") ? link : `${new URL(selectors.url).origin}${link}`;
      }
      const img = item.find("img").first().attr("src");
      if (img) {
        data.image = img.startsWith("http") ? img : `${new URL(selectors.url).origin}${img}`;
      }
    } catch (error) {
      console.error("Data extraction error:", error);
    }
    return data;
  }
  // Removed hasNextPage method - now using simple page limit check
  async pauseTask(taskId) {
    const task = this.activeTasks.get(taskId);
    if (task) {
      await storage.updateScrapingTask(taskId, { status: "paused" });
    }
  }
  async stopTask(taskId) {
    const task = this.activeTasks.get(taskId);
    if (task) {
      this.activeTasks.delete(taskId);
      await storage.updateScrapingTask(taskId, { status: "failed", errorMessage: "Task stopped by user" });
    }
  }
};
var scraperService = new ScraperService();

// server/services/queue.ts
var SimpleQueue = class {
  jobs = /* @__PURE__ */ new Map();
  processing = false;
  async add(name, data) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.jobs.set(jobId, data);
    console.log(`Added scraping job ${jobId} for task: ${data.taskId}`);
    this.processNext();
    return { id: jobId, data };
  }
  async processNext() {
    if (this.processing || this.jobs.size === 0) return;
    this.processing = true;
    const nextEntry = this.jobs.entries().next();
    if (nextEntry.done) {
      this.processing = false;
      return;
    }
    const [jobId, jobData] = nextEntry.value;
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`Scraping job ${jobId} failed:`, errorMessage);
    }
    this.processing = false;
    if (this.jobs.size > 0) {
      setTimeout(() => this.processNext(), 1e3);
    }
  }
};
var scrapingQueue = new SimpleQueue();
async function addScrapingJob(data) {
  return await scrapingQueue.add("scrape-website", data);
}

// server/routes.ts
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  scraperService.setWebSocketServer(wss);
  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
  const authenticateUser = async (req, res, next) => {
    const defaultUser = {
      id: "demo-user-123",
      username: "demo-user",
      email: "demo@example.com",
      plan: "pro"
    };
    req.user = defaultUser;
    next();
  };
  app2.get("/api/stats", authenticateUser, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  app2.get("/api/tasks", authenticateUser, async (req, res) => {
    try {
      const tasks = await storage.getScrapingTasks(req.user.id);
      res.json(tasks);
    } catch (error) {
      console.error("Tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  app2.get("/api/tasks/active", authenticateUser, async (req, res) => {
    try {
      const activeTasks = await storage.getActiveScrapingTasks(req.user.id);
      res.json(activeTasks);
    } catch (error) {
      console.error("Active tasks error:", error);
      res.status(500).json({ message: "Failed to fetch active tasks" });
    }
  });
  app2.post("/api/analyze", authenticateUser, async (req, res) => {
    try {
      const { url, prompt } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }
      const existingAnalysis = await storage.getWebsiteAnalysis(url);
      if (existingAnalysis && Date.now() - new Date(existingAnalysis.createdAt).getTime() < 24 * 60 * 60 * 1e3) {
        return res.json(existingAnalysis);
      }
      let htmlContent = "";
      console.log("Fetching website content using HTTP request...");
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      htmlContent = await response.text();
      const analysis = await analyzeWebsiteStructure(url, htmlContent, prompt);
      const validatedAnalysis = websiteAnalysisSchema.parse({
        url,
        selectors: analysis.selectors,
        patterns: analysis.patterns,
        strategy: analysis.strategy,
        confidence: parseFloat(analysis.confidence.toString())
        // Ensure confidence is a number
      });
      const savedAnalysis = await storage.createWebsiteAnalysis(validatedAnalysis);
      res.json({
        ...savedAnalysis,
        recommendations: analysis.recommendations
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Analysis error:", error);
      res.status(500).json({ message: `Failed to analyze website: ${errorMessage}` });
    }
  });
  app2.post("/api/tasks", authenticateUser, async (req, res) => {
    try {
      const validatedData = scrapingTaskSchema.parse({
        ...req.body,
        userId: req.user.id,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      });
      const task = await storage.createScrapingTask(validatedData);
      const generatedCode = await generateScrapingCode(
        task.url,
        task.selectors || {},
        // Provide an empty object as fallback
        task.strategy || "Standard web scraping"
      );
      await storage.updateScrapingTask(task.id, { generatedCode });
      await addScrapingJob({
        taskId: task.id,
        url: task.url,
        selectors: task.selectors || {},
        // Provide an empty object as fallback
        strategy: task.strategy ?? "Standard web scraping",
        maxPages: 5,
        delay: 2e3
      });
      res.json({ ...task, generatedCode });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Create task error:", error);
      res.status(500).json({ message: `Failed to create scraping task: ${errorMessage}` });
    }
  });
  app2.get("/api/tasks/:taskId/data", authenticateUser, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const data = await storage.getScrapedData(taskId, parseInt(limit), parseInt(offset));
      res.json(data);
    } catch (error) {
      console.error("Get data error:", error);
      res.status(500).json({ message: "Failed to fetch scraped data" });
    }
  });
  app2.put("/api/data/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedData = await storage.updateScrapedData(id, updates);
      res.json(updatedData);
    } catch (error) {
      console.error("Update data error:", error);
      res.status(500).json({ message: "Failed to update scraped data" });
    }
  });
  app2.delete("/api/data/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteScrapedData(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete data error:", error);
      res.status(500).json({ message: "Failed to delete scraped data" });
    }
  });
  app2.get("/api/tasks/:taskId/export", authenticateUser, async (req, res) => {
    try {
      const { taskId } = req.params;
      const data = await storage.getScrapedData(taskId, 1e4, 0);
      if (data.length === 0) {
        return res.status(404).json({ message: "No data found to export" });
      }
      const headers = Object.keys(data[0].data);
      const csvRows = [
        headers.join(","),
        ...data.map(
          (item) => headers.map((header) => {
            const value = item.data[header] || "";
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(",")
        )
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=scraped-data-${taskId}.csv`);
      res.send(csvRows.join("\n"));
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });
  app2.post("/api/tasks/:taskId/generate-code", authenticateUser, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { language = "python" } = req.body;
      const task = await storage.getScrapingTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      const code = await generateScrapingCode(
        task.url,
        task.selectors,
        task.strategy || "Standard web scraping",
        language
      );
      res.json({ code, language });
    } catch (error) {
      console.error("Generate code error:", error);
      res.status(500).json({ message: "Failed to generate code" });
    }
  });
  app2.post("/api/tasks/:taskId/pause", authenticateUser, async (req, res) => {
    try {
      const { taskId } = req.params;
      await scraperService.pauseTask(taskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Pause task error:", error);
      res.status(500).json({ message: "Failed to pause task" });
    }
  });
  app2.post("/api/tasks/:taskId/stop", authenticateUser, async (req, res) => {
    try {
      const { taskId } = req.params;
      await scraperService.stopTask(taskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Stop task error:", error);
      res.status(500).json({ message: "Failed to stop task" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await connectToDatabase();
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
