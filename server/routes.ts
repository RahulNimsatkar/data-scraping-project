import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { analyzeWebsiteStructure, generateScrapingCode } from "./services/openai";
import { performEnhancedWebsiteAnalysis, generateAdvancedScrapingCode } from "./services/enhanced-ai-analysis";
import { advancedScraperService } from "./services/advanced-scraper";
import { testOpenAIKey } from "./services/openai";
import { addScrapingJob } from "./services/queue";
import { scraperService } from "./services/scraper";
import { scrapingTaskSchema, scrapedDataSchema, websiteAnalysisSchema, aiProviderKeySchema } from "@shared/schema";
import crypto from "crypto";
import puppeteer from 'puppeteer';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  scraperService.setWebSocketServer(wss);
  advancedScraperService.setWebSocketServer(wss);

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Authentication middleware (simplified for demo)
  const authenticateUser = async (req: any, res: any, next: any) => {
    // For demo purposes, create a default user
    const defaultUser = {
      id: 'demo-user-123',
      username: 'demo-user',
      email: 'demo@example.com',
      plan: 'pro'
    };
    req.user = defaultUser;
    next();
  };

  // Get user dashboard stats
  app.get("/api/stats", authenticateUser, async (req: any, res) => {
    try {
      const stats = await storage.getUserStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get user's scraping tasks
  app.get("/api/tasks", authenticateUser, async (req: any, res) => {
    try {
      const tasks = await storage.getScrapingTasks(req.user.id);
      res.json(tasks);
    } catch (error) {
      console.error("Tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get active scraping tasks
  app.get("/api/tasks/active", authenticateUser, async (req: any, res) => {
    try {
      const activeTasks = await storage.getActiveScrapingTasks(req.user.id);
      res.json(activeTasks);
    } catch (error) {
      console.error("Active tasks error:", error);
      res.status(500).json({ message: "Failed to fetch active tasks" });
    }
  });

  // Analyze website structure
  app.post("/api/analyze", authenticateUser, async (req: any, res) => {
    try {
      const { url, prompt } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Check if we have a recent analysis
      const existingAnalysis = await storage.getWebsiteAnalysis(url);
      if (existingAnalysis && 
          Date.now() - new Date(existingAnalysis.createdAt).getTime() < 24 * 60 * 60 * 1000) {
        return res.json(existingAnalysis);
      }

      let htmlContent = '';
      
      // Use simple fetch for now since browser dependencies are not available in this environment
      console.log('Fetching website content using HTTP request...');
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      htmlContent = await response.text();

      // Analyze with OpenAI
      const analysis = await analyzeWebsiteStructure(url, htmlContent, prompt, req.user.id);
      
      // Store analysis - transform selectors to match schema
      const selectorsRecord: Record<string, string> = {
        primary: analysis.selectors.primary,
        fallback: Array.isArray(analysis.selectors.fallback) 
          ? analysis.selectors.fallback.join(', ') 
          : analysis.selectors.fallback
      };

      const validatedAnalysis = websiteAnalysisSchema.parse({
        url,
        selectors: selectorsRecord,
        patterns: analysis.patterns,
        strategy: analysis.strategy,
        confidence: parseFloat(analysis.confidence.toString()) // Ensure confidence is a number
      });
      const savedAnalysis = await storage.createWebsiteAnalysis(validatedAnalysis);

      res.json({
        ...savedAnalysis,
        recommendations: analysis.recommendations
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Analysis error:", error);
      res.status(500).json({ message: `Failed to analyze website: ${errorMessage}` });
    }
  });

  // Create new scraping task
  app.post("/api/tasks", authenticateUser, async (req: any, res) => {
    try {
      const validatedData = scrapingTaskSchema.parse({
        ...req.body,
        userId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const task = await storage.createScrapingTask(validatedData);

      // Generate scraping code
      const generatedCode = await generateScrapingCode(
        task.url,
        task.selectors || {}, // Provide an empty object as fallback
        task.strategy || "Standard web scraping",
        'python',
        req.user.id
      );

      await storage.updateScrapingTask(task.id!, { generatedCode });

      // Add to scraping queue
      await addScrapingJob({
        taskId: task.id!,
        url: task.url,
        selectors: task.selectors || {}, // Provide an empty object as fallback
        strategy: task.strategy ?? "Standard web scraping",
        maxPages: 5,
        delay: 2000
      });

      res.json({ ...task, generatedCode });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Create task error:", error);
      res.status(500).json({ message: `Failed to create scraping task: ${errorMessage}` });
    }
  });

  // Get scraped data for a task
  app.get("/api/tasks/:taskId/data", authenticateUser, async (req: any, res) => {
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

  // Update scraped data item
  app.put("/api/data/:id", authenticateUser, async (req: any, res) => {
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

  // Delete scraped data item
  app.delete("/api/data/:id", authenticateUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteScrapedData(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete data error:", error);
      res.status(500).json({ message: "Failed to delete scraped data" });
    }
  });

  // Export data as CSV
  app.get("/api/tasks/:taskId/export", authenticateUser, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const data = await storage.getScrapedData(taskId, 10000, 0);
      
      if (data.length === 0) {
        return res.status(404).json({ message: "No data found to export" });
      }

      // Convert to CSV
      const headers = Object.keys(data[0].data as Record<string, any>);
      const csvRows = [
        headers.join(','),
        ...data.map(item => 
          headers.map(header => {
            const value = (item.data as Record<string, any>)[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=scraped-data-${taskId}.csv`);
      res.send(csvRows.join('\n'));
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Generate code for a task
  app.post("/api/tasks/:taskId/generate-code", authenticateUser, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const { language = 'python' } = req.body;
      
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

  // Pause/resume task
  app.post("/api/tasks/:taskId/pause", authenticateUser, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      await scraperService.pauseTask(taskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Pause task error:", error);
      res.status(500).json({ message: "Failed to pause task" });
    }
  });

  // Stop task
  app.post("/api/tasks/:taskId/stop", authenticateUser, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      await scraperService.stopTask(taskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Stop task error:", error);
      res.status(500).json({ message: "Failed to stop task" });
    }
  });

  // Dynamic analytics routes for real-time website analysis
  app.post("/api/analytics/auto-analyze", authenticateUser, async (req: any, res) => {
    try {
      const { url, enableAutoScraping = false } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Perform automatic analysis with enhanced capabilities
      const startTime = Date.now();
      
      // Fetch website content with multiple strategies
      let htmlContent = '';
      let metrics = {
        loadTime: 0,
        contentSize: 0,
        title: '',
        links: 0,
        images: 0,
        forms: 0
      };

      try {
        console.log('Auto-analyzing website with dynamic fetching...');
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache'
          }
        });
        
        htmlContent = await response.text();
        metrics.loadTime = Date.now() - startTime;
        metrics.contentSize = htmlContent.length;

        // Extract basic website metrics
        const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
        metrics.title = titleMatch ? titleMatch[1].trim() : '';
        metrics.links = (htmlContent.match(/<a\s+[^>]*href/gi) || []).length;
        metrics.images = (htmlContent.match(/<img\s+[^>]*src/gi) || []).length;
        metrics.forms = (htmlContent.match(/<form\s+[^>]*>/gi) || []).length;

      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        return res.status(500).json({ message: "Failed to fetch website content" });
      }

      // Enhanced AI analysis with metrics
      const analysis = await analyzeWebsiteStructure(url, htmlContent, 
        "Perform comprehensive analysis including data extraction patterns, API endpoints detection, and optimal scraping strategies", req.user.id);
      
      // Store enhanced analysis with metrics
      const enhancedAnalysis = {
        url,
        selectors: { primary: analysis.selectors.primary },
        patterns: analysis.patterns,
        strategy: analysis.strategy,
        confidence: parseFloat(analysis.confidence.toString()),
        createdAt: new Date()
      };

      const savedAnalysis = await storage.createWebsiteAnalysis(enhancedAnalysis);

      // Automatically create and start scraping task if requested
      if (enableAutoScraping) {
        const autoTask = await storage.createScrapingTask({
          name: `Auto-generated analysis: ${metrics.title || new URL(url).hostname}`,
          url,
          selectors: { primary: analysis.selectors.primary },
          strategy: analysis.strategy,
          userId: req.user.id,
          status: 'pending',
          progress: 0,
          totalItems: 0,
          scrapedItems: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Generate and store scraping code
        const generatedCode = await generateScrapingCode(
          url,
          analysis.selectors,
          analysis.strategy,
          'python',
          req.user.id
        );
        await storage.updateScrapingTask(autoTask.id!, { generatedCode });

        // Add to scraping queue for automatic execution
        await addScrapingJob({
          taskId: autoTask.id!,
          url,
          selectors: analysis.selectors,
          strategy: analysis.strategy,
          maxPages: 10,
          delay: 1500
        });

        return res.json({
          analysis: savedAnalysis,
          autoTask,
          metrics,
          recommendations: analysis.recommendations,
          message: "Website analyzed and scraping task automatically created"
        });
      }

      res.json({
        analysis: savedAnalysis,
        metrics,
        recommendations: analysis.recommendations,
        message: "Dynamic website analysis completed"
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Auto-analysis error:", error);
      res.status(500).json({ message: `Auto-analysis failed: ${errorMessage}` });
    }
  });

  // Real-time website monitoring endpoint
  app.get("/api/analytics/monitor/:taskId", authenticateUser, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      
      const task = await storage.getScrapingTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Get real-time task data and logs
      const scrapedData = await storage.getScrapedData(taskId, 10, 0);
      const taskLogs = await storage.getTaskLogs(taskId);
      
      // Calculate real-time metrics
      const totalItems = await storage.getScrapedData(taskId, 10000, 0);
      const recentItems = await storage.getScrapedData(taskId, 5, 0);
      
      const analytics = {
        task,
        status: task.status,
        totalItemsScraped: totalItems.length,
        recentItems: recentItems.length,
        lastUpdate: task.updatedAt,
        progressRate: totalItems.length / Math.max(1, (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60)), // items per minute
        recentData: scrapedData,
        logs: taskLogs.slice(0, 10), // Last 10 logs
        performance: {
          startTime: task.createdAt,
          runTime: Date.now() - new Date(task.createdAt).getTime(),
          itemsPerMinute: totalItems.length / Math.max(1, (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60)),
          errorRate: taskLogs.filter(log => log.level === 'error').length / Math.max(1, taskLogs.length) * 100
        }
      };

      res.json(analytics);
    } catch (error) {
      console.error("Monitor error:", error);
      res.status(500).json({ message: "Failed to get monitoring data" });
    }
  });

  // Bulk analysis endpoint for multiple URLs
  app.post("/api/analytics/bulk-analyze", authenticateUser, async (req: any, res) => {
    try {
      const { urls, autoCreateTasks = false } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ message: "URLs array is required" });
      }

      if (urls.length > 10) {
        return res.status(400).json({ message: "Maximum 10 URLs allowed per request" });
      }

      const results = [];
      
      for (const url of urls) {
        try {
          // Quick analysis for bulk processing
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          const htmlContent = await response.text();
          const analysis = await analyzeWebsiteStructure(url, htmlContent, 
            "Quick analysis for bulk processing - focus on main content extraction patterns");
          
          const result: any = {
            url,
            analysis,
            status: 'success',
            timestamp: new Date()
          };

          // Auto-create tasks if requested
          if (autoCreateTasks) {
            const bulkTask = await storage.createScrapingTask({
              name: `Bulk analysis: ${new URL(url).hostname}`,
              url,
              selectors: { primary: analysis.selectors.primary },
              strategy: analysis.strategy,
              userId: req.user.id,
              status: 'pending',
              progress: 0,
              totalItems: 0,
              scrapedItems: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            result.taskId = bulkTask.id;
          }

          results.push(result);
          
        } catch (urlError) {
          results.push({
            url,
            status: 'error',
            error: urlError instanceof Error ? urlError.message : 'Unknown error',
            timestamp: new Date()
          });
        }
      }

      res.json({
        results,
        summary: {
          total: urls.length,
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length,
          tasksCreated: autoCreateTasks ? results.filter((r: any) => r.taskId).length : 0
        }
      });

    } catch (error) {
      console.error("Bulk analysis error:", error);
      res.status(500).json({ message: "Bulk analysis failed" });
    }
  });

  // Enhanced real-time data streaming endpoint
  app.get("/api/analytics/stream/:taskId", authenticateUser, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      
      // Set up Server-Sent Events for real-time streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Send initial data
      const task = await storage.getScrapingTask(taskId);
      if (task) {
        const scrapedData = await storage.getScrapedData(taskId, 5, 0);
        sendEvent({
          type: 'initial',
          task,
          recentData: scrapedData,
          timestamp: new Date()
        });
      }

      // Set up interval for real-time updates
      const updateInterval = setInterval(async () => {
        try {
          const currentTask = await storage.getScrapingTask(taskId);
          const recentData = await storage.getScrapedData(taskId, 3, 0);
          
          sendEvent({
            type: 'update',
            status: currentTask?.status,
            itemCount: (await storage.getScrapedData(taskId, 10000, 0)).length,
            recentData,
            timestamp: new Date()
          });
        } catch (streamError) {
          console.error('Stream update error:', streamError);
        }
      }, 5000); // Update every 5 seconds

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(updateInterval);
      });

    } catch (error) {
      console.error("Stream error:", error);
      res.status(500).json({ message: "Failed to start data stream" });
    }
  });

  // AI Provider Keys Management Routes
  app.get("/api/ai-keys", authenticateUser, async (req: any, res) => {
    try {
      const keys = await storage.getAiProviderKeys(req.user.id);
      // Don't send actual API keys to frontend, only metadata
      const safeKeys = keys.map(key => ({
        ...key,
        apiKey: key.apiKey.substring(0, 8) + "..." + key.apiKey.slice(-4) // Show only first 8 and last 4 chars
      }));
      res.json(safeKeys);
    } catch (error) {
      console.error("Get AI keys error:", error);
      res.status(500).json({ message: "Failed to fetch AI provider keys" });
    }
  });

  app.post("/api/ai-keys", authenticateUser, async (req: any, res) => {
    try {
      const { provider, name, apiKey } = req.body;
      
      if (!provider || !name || !apiKey) {
        return res.status(400).json({ message: "Provider, name, and API key are required" });
      }

      // Check if user already has a key for this provider
      const existingKey = await storage.getAiProviderKey(req.user.id, provider);
      if (existingKey) {
        return res.status(400).json({ message: `You already have an active ${provider} API key` });
      }

      const newKey = await storage.createAiProviderKey({
        userId: req.user.id,
        provider,
        name,
        apiKey, // In production, this should be encrypted
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Return safe version without full API key
      const safeKey = {
        ...newKey,
        apiKey: newKey.apiKey.substring(0, 8) + "..." + newKey.apiKey.slice(-4)
      };

      res.json(safeKey);
    } catch (error) {
      console.error("Create AI key error:", error);
      res.status(500).json({ message: "Failed to create AI provider key" });
    }
  });

  app.put("/api/ai-keys/:keyId", authenticateUser, async (req: any, res) => {
    try {
      const { keyId } = req.params;
      const updates = req.body;
      
      const updatedKey = await storage.updateAiProviderKey(keyId, updates);
      
      // Return safe version without full API key
      const safeKey = {
        ...updatedKey,
        apiKey: updatedKey.apiKey.substring(0, 8) + "..." + updatedKey.apiKey.slice(-4)
      };

      res.json(safeKey);
    } catch (error) {
      console.error("Update AI key error:", error);
      res.status(500).json({ message: "Failed to update AI provider key" });
    }
  });

  app.delete("/api/ai-keys/:keyId", authenticateUser, async (req: any, res) => {
    try {
      const { keyId } = req.params;
      await storage.deleteAiProviderKey(keyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete AI key error:", error);
      res.status(500).json({ message: "Failed to delete AI provider key" });
    }
  });

  app.post("/api/ai-keys/test/:keyId", authenticateUser, async (req: any, res) => {
    try {
      const { keyId } = req.params;
      const userKeys = await storage.getAiProviderKeys(req.user.id);
      const key = userKeys.find(k => k.id === keyId);
      
      if (!key) {
        return res.status(404).json({ message: "API key not found" });
      }

      // Test the API key with a simple request
      let testResult = { success: false, message: "Unknown provider", provider: key.provider };
      
      try {
        if (key.provider === 'openai') {
          const { testOpenAIKey } = await import('./services/openai');
          const result = await testOpenAIKey(key.apiKey);
          testResult = { ...result, provider: key.provider };
        } else if (key.provider === 'gemini') {
          // Add Gemini testing logic
          testResult = { success: true, message: "Gemini key validation not implemented yet", provider: 'gemini' };
        } else if (key.provider === 'claude') {
          // Add Claude testing logic  
          testResult = { success: true, message: "Claude key validation not implemented yet", provider: 'claude' };
        }

        // Update usage count and last used
        if (testResult.success) {
          await storage.updateAiProviderKey(keyId, {
            lastUsed: new Date(),
            usageCount: key.usageCount + 1
          });
        }

        res.json(testResult);
      } catch (testError) {
        console.error("API key test error:", testError);
        res.json({ 
          success: false, 
          message: testError instanceof Error ? testError.message : "Failed to test API key",
          provider: key.provider 
        });
      }
    } catch (error) {
      console.error("Test AI key error:", error);
      res.status(500).json({ message: "Failed to test AI provider key" });
    }
  });

  // Database Connection Management Routes
  app.get("/api/databases", authenticateUser, async (req: any, res) => {
    try {
      const connections = await storage.getDatabaseConnections(req.user.id);
      // Don't send passwords to frontend, only metadata
      const safeConnections = connections.map(conn => ({
        ...conn,
        password: conn.password ? "***" : undefined,
        url: conn.url.replace(/\/\/[^:]+:[^@]+@/, "//***:***@") // Mask credentials in URL
      }));
      res.json(safeConnections);
    } catch (error) {
      console.error("Get database connections error:", error);
      res.status(500).json({ message: "Failed to fetch database connections" });
    }
  });

  app.post("/api/databases", authenticateUser, async (req: any, res) => {
    try {
      const { name, type, url, username, password, database, isDefault } = req.body;
      
      if (!name || !type || !url) {
        return res.status(400).json({ message: "Name, type, and URL are required" });
      }

      // If this is set as default, unset other defaults for this user
      if (isDefault) {
        const existingConnections = await storage.getDatabaseConnections(req.user.id);
        for (const conn of existingConnections) {
          if (conn.isDefault && conn.id) {
            await storage.updateDatabaseConnection(conn.id, { isDefault: false });
          }
        }
      }

      const newConnection = await storage.createDatabaseConnection({
        userId: req.user.id,
        name,
        type,
        url,
        username,
        password,
        database,
        isActive: true,
        isDefault: !!isDefault,
        status: "disconnected",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Return safe version without credentials
      const safeConnection = {
        ...newConnection,
        password: newConnection.password ? "***" : undefined,
        url: newConnection.url.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
      };

      res.json(safeConnection);
    } catch (error) {
      console.error("Create database connection error:", error);
      res.status(500).json({ message: "Failed to create database connection" });
    }
  });

  app.patch("/api/databases/:id", authenticateUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // If this is being set as default, unset other defaults for this user
      if (updates.isDefault) {
        const existingConnections = await storage.getDatabaseConnections(req.user.id);
        for (const conn of existingConnections) {
          if (conn.isDefault && conn.id && conn.id !== id) {
            await storage.updateDatabaseConnection(conn.id, { isDefault: false });
          }
        }
      }

      const updatedConnection = await storage.updateDatabaseConnection(id, {
        ...updates,
        updatedAt: new Date()
      });

      // Return safe version without credentials
      const safeConnection = {
        ...updatedConnection,
        password: updatedConnection.password ? "***" : undefined,
        url: updatedConnection.url.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")
      };

      res.json(safeConnection);
    } catch (error) {
      console.error("Update database connection error:", error);
      res.status(500).json({ message: "Failed to update database connection" });
    }
  });

  app.delete("/api/databases/:id", authenticateUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDatabaseConnection(id);
      res.json({ message: "Database connection deleted successfully" });
    } catch (error) {
      console.error("Delete database connection error:", error);
      res.status(500).json({ message: "Failed to delete database connection" });
    }
  });

  app.post("/api/databases/:id/test", authenticateUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const result = await storage.testDatabaseConnection(id);
      res.json(result);
    } catch (error) {
      console.error("Test database connection error:", error);
      res.status(500).json({ message: "Failed to test database connection" });
    }
  });

  // Enhanced website analysis endpoint
  app.post("/api/analyze/enhanced", authenticateUser, async (req: any, res) => {
    try {
      const { url, prompt } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      console.log('Performing enhanced website analysis...');
      
      // Fetch website content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const htmlContent = await response.text();

      // Perform enhanced analysis
      const analysis = await performEnhancedWebsiteAnalysis(url, htmlContent, prompt, req.user.id);
      
      res.json(analysis);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Enhanced analysis error:", error);
      res.status(500).json({ message: `Failed to perform enhanced analysis: ${errorMessage}` });
    }
  });

  // Advanced scraping task creation endpoint
  app.post("/api/tasks/advanced", authenticateUser, async (req: any, res) => {
    try {
      const { url, renderMode, browserType, maxPages, delay, waitForSelector, scrollToBottom } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Create scraping task
      const taskData = {
        userId: req.user.id,
        name: `Advanced Scrape: ${new URL(url).hostname}`,
        url,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        selectors: {}, // Will be generated dynamically
        strategy: `Advanced ${renderMode || 'dynamic'} scraping`
      };

      const task = await storage.createScrapingTask(taskData as any);

      // Start advanced scraping
      const options = {
        url,
        selectors: {}, // Will be auto-generated
        strategy: taskData.strategy,
        maxPages: maxPages || 3,
        delay: delay || 2000,
        renderMode: renderMode || 'dynamic',
        browserType: browserType || 'chromium',
        waitForSelector,
        waitForNetworkIdle: true,
        scrollToBottom,
        captureScreenshots: false
      };

      // Start scraping in background
      advancedScraperService.startAdvancedScraping(task.id!, options).catch(error => {
        console.error('Background scraping error:', error);
      });

      res.json(task);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Create advanced task error:", error);
      res.status(500).json({ message: `Failed to create advanced scraping task: ${errorMessage}` });
    }
  });

  // Generate advanced scraping code endpoint
  app.post("/api/code/generate/advanced", authenticateUser, async (req: any, res) => {
    try {
      const { url, analysis, language = 'javascript' } = req.body;
      
      if (!url || !analysis) {
        return res.status(400).json({ message: "URL and analysis are required" });
      }

      const code = await generateAdvancedScrapingCode(url, analysis, language, req.user.id);
      
      res.json({ 
        code,
        language,
        framework: analysis.technology?.framework || 'unknown',
        complexity: analysis.estimatedComplexity || 'medium'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Code generation error:", error);
      res.status(500).json({ message: `Failed to generate scraping code: ${errorMessage}` });
    }
  });

  // Stop advanced scraping task
  app.post("/api/tasks/:taskId/stop/advanced", authenticateUser, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      
      await advancedScraperService.stopTask(taskId);
      
      res.json({ message: "Advanced scraping task stopped successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Stop advanced task error:", error);
      res.status(500).json({ message: `Failed to stop advanced scraping task: ${errorMessage}` });
    }
  });

  // ===== AI PROVIDER KEY MANAGEMENT ROUTES =====

  // Get user's AI provider keys
  app.get("/api/ai-keys", authenticateUser, async (req: any, res) => {
    try {
      const keys = await storage.getAiProviderKeys(req.user.id);
      // Don't send the actual API key, just metadata
      const safeKeys = keys.map(key => ({
        ...key,
        apiKey: key.apiKey ? key.apiKey.substring(0, 8) + '...' + key.apiKey.slice(-4) : ''
      }));
      res.json(safeKeys);
    } catch (error) {
      console.error("Get AI keys error:", error);
      res.status(500).json({ message: "Failed to fetch AI provider keys" });
    }
  });

  // Create new AI provider key
  app.post("/api/ai-keys", authenticateUser, async (req: any, res) => {
    try {
      const { provider, name, apiKey } = req.body;
      
      if (!provider || !name || !apiKey) {
        return res.status(400).json({ message: "Provider, name, and API key are required" });
      }

      const validatedKey = aiProviderKeySchema.parse({
        userId: req.user.id,
        provider,
        name,
        apiKey,
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedKey = await storage.createAiProviderKey(validatedKey);
      
      // Don't return the actual API key
      const safeKey = {
        ...savedKey,
        apiKey: savedKey.apiKey.substring(0, 8) + '...' + savedKey.apiKey.slice(-4)
      };

      res.json(safeKey);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Create AI key error:", error);
      res.status(500).json({ message: `Failed to create AI provider key: ${errorMessage}` });
    }
  });

  // Delete AI provider key
  app.delete("/api/ai-keys/:keyId", authenticateUser, async (req: any, res) => {
    try {
      const { keyId } = req.params;
      await storage.deleteAiProviderKey(keyId);
      res.json({ message: "AI provider key deleted successfully" });
    } catch (error) {
      console.error("Delete AI key error:", error);
      res.status(500).json({ message: "Failed to delete AI provider key" });
    }
  });

  // Test AI provider key
  app.post("/api/ai-keys/test/:keyId", authenticateUser, async (req: any, res) => {
    try {
      const { keyId } = req.params;
      
      const key = await storage.getAiProviderKeys(req.user.id);
      const targetKey = key.find(k => k.id === keyId);
      
      if (!targetKey) {
        return res.status(404).json({ message: "API key not found" });
      }

      let testResult;
      
      // Test based on provider type
      switch (targetKey.provider) {
        case 'openai':
          testResult = await testOpenAIKey(targetKey.apiKey);
          break;
        case 'gemini':
        case 'claude':
        case 'cohere':
        case 'huggingface':
          // For now, just validate the key format for other providers
          const isValidFormat = targetKey.apiKey && targetKey.apiKey.length > 10;
          testResult = {
            success: isValidFormat,
            message: isValidFormat ? 
              `${targetKey.provider} API key format appears valid` : 
              `Invalid ${targetKey.provider} API key format`,
            provider: targetKey.provider
          };
          break;
        default:
          testResult = { success: false, message: "Unsupported provider", provider: targetKey.provider };
      }

      // Update last used if test was successful
      if (testResult.success) {
        await storage.updateAiProviderKey(keyId, {
          lastUsed: new Date(),
          usageCount: targetKey.usageCount + 1
        });
      }

      res.json(testResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Test AI key error:", error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to test API key: ${errorMessage}`,
        provider: 'unknown'
      });
    }
  });

  return httpServer;
}
