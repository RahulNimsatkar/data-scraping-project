import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { analyzeWebsiteStructure, generateScrapingCode } from "./services/openai";
import { addScrapingJob } from "./services/queue";
import { scraperService } from "./services/scraper";
import { insertScrapingTaskSchema, insertScrapedDataSchema } from "@shared/schema";
import crypto from "crypto";
import puppeteer from 'puppeteer';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  scraperService.setWebSocketServer(wss);

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
      const analysis = await analyzeWebsiteStructure(url, htmlContent, prompt);
      
      // Store analysis
      const savedAnalysis = await storage.createWebsiteAnalysis({
        url,
        selectors: analysis.selectors,
        patterns: analysis.patterns,
        strategy: analysis.strategy,
        confidence: analysis.confidence.toString()
      });

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
      const validatedData = insertScrapingTaskSchema.parse({
        ...req.body,
        userId: req.user.id
      });

      const task = await storage.createScrapingTask(validatedData);

      // Generate scraping code
      const generatedCode = await generateScrapingCode(
        task.url,
        task.selectors,
        task.strategy || "Standard web scraping"
      );

      await storage.updateScrapingTask(task.id, { generatedCode });

      // Add to scraping queue
      await addScrapingJob({
        taskId: task.id,
        url: task.url,
        selectors: task.selectors,
        strategy: task.strategy || "Standard web scraping",
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

  return httpServer;
}
