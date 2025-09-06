import { 
  users, 
  apiKeys, 
  scrapingTasks, 
  scrapedData, 
  websiteAnalysis, 
  taskLogs,
  type User, 
  type InsertUser,
  type ApiKey,
  type InsertApiKey,
  type ScrapingTask,
  type InsertScrapingTask,
  type ScrapedData,
  type InsertScrapedData,
  type WebsiteAnalysis,
  type InsertWebsiteAnalysis,
  type TaskLog,
  type InsertTaskLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // API Keys
  getApiKeys(userId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  
  // Scraping Tasks
  getScrapingTasks(userId: string): Promise<ScrapingTask[]>;
  getScrapingTask(id: string): Promise<ScrapingTask | undefined>;
  createScrapingTask(task: InsertScrapingTask): Promise<ScrapingTask>;
  updateScrapingTask(id: string, updates: Partial<ScrapingTask>): Promise<ScrapingTask>;
  getActiveScrapingTasks(userId: string): Promise<ScrapingTask[]>;
  
  // Scraped Data
  getScrapedData(taskId: string, limit?: number, offset?: number): Promise<ScrapedData[]>;
  createScrapedData(data: InsertScrapedData): Promise<ScrapedData>;
  updateScrapedData(id: string, updates: Partial<ScrapedData>): Promise<ScrapedData>;
  deleteScrapedData(id: string): Promise<void>;
  
  // Website Analysis
  getWebsiteAnalysis(url: string): Promise<WebsiteAnalysis | undefined>;
  createWebsiteAnalysis(analysis: InsertWebsiteAnalysis): Promise<WebsiteAnalysis>;
  
  // Task Logs
  getTaskLogs(taskId: string): Promise<TaskLog[]>;
  createTaskLog(log: InsertTaskLog): Promise<TaskLog>;
  
  // Statistics
  getUserStats(userId: string): Promise<{
    totalScraped: number;
    activeTasks: number;
    successRate: number;
    apiCalls: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db
      .insert(apiKeys)
      .values(insertApiKey)
      .returning();
    return apiKey;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    return apiKey || undefined;
  }

  async getScrapingTasks(userId: string): Promise<ScrapingTask[]> {
    return await db
      .select()
      .from(scrapingTasks)
      .where(eq(scrapingTasks.userId, userId))
      .orderBy(desc(scrapingTasks.createdAt));
  }

  async getScrapingTask(id: string): Promise<ScrapingTask | undefined> {
    const [task] = await db.select().from(scrapingTasks).where(eq(scrapingTasks.id, id));
    return task || undefined;
  }

  async createScrapingTask(insertTask: InsertScrapingTask): Promise<ScrapingTask> {
    const [task] = await db
      .insert(scrapingTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateScrapingTask(id: string, updates: Partial<ScrapingTask>): Promise<ScrapingTask> {
    const [task] = await db
      .update(scrapingTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scrapingTasks.id, id))
      .returning();
    return task;
  }

  async getActiveScrapingTasks(userId: string): Promise<ScrapingTask[]> {
    return await db
      .select()
      .from(scrapingTasks)
      .where(and(
        eq(scrapingTasks.userId, userId),
        eq(scrapingTasks.status, "running")
      ));
  }

  async getScrapedData(taskId: string, limit = 50, offset = 0): Promise<ScrapedData[]> {
    return await db
      .select()
      .from(scrapedData)
      .where(eq(scrapedData.taskId, taskId))
      .orderBy(desc(scrapedData.scrapedAt))
      .limit(limit)
      .offset(offset);
  }

  async createScrapedData(insertData: InsertScrapedData): Promise<ScrapedData> {
    const [data] = await db
      .insert(scrapedData)
      .values(insertData)
      .returning();
    return data;
  }

  async updateScrapedData(id: string, updates: Partial<ScrapedData>): Promise<ScrapedData> {
    const [data] = await db
      .update(scrapedData)
      .set(updates)
      .where(eq(scrapedData.id, id))
      .returning();
    return data;
  }

  async deleteScrapedData(id: string): Promise<void> {
    await db.delete(scrapedData).where(eq(scrapedData.id, id));
  }

  async getWebsiteAnalysis(url: string): Promise<WebsiteAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(websiteAnalysis)
      .where(eq(websiteAnalysis.url, url))
      .orderBy(desc(websiteAnalysis.createdAt))
      .limit(1);
    return analysis || undefined;
  }

  async createWebsiteAnalysis(insertAnalysis: InsertWebsiteAnalysis): Promise<WebsiteAnalysis> {
    const [analysis] = await db
      .insert(websiteAnalysis)
      .values(insertAnalysis)
      .returning();
    return analysis;
  }

  async getTaskLogs(taskId: string): Promise<TaskLog[]> {
    return await db
      .select()
      .from(taskLogs)
      .where(eq(taskLogs.taskId, taskId))
      .orderBy(desc(taskLogs.createdAt));
  }

  async createTaskLog(insertLog: InsertTaskLog): Promise<TaskLog> {
    const [log] = await db
      .insert(taskLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getUserStats(userId: string): Promise<{
    totalScraped: number;
    activeTasks: number;
    successRate: number;
    apiCalls: number;
  }> {
    // Get user's tasks
    const userTasks = await db
      .select()
      .from(scrapingTasks)
      .where(eq(scrapingTasks.userId, userId));

    // Get total scraped items
    const totalScrapedResult = await db
      .select({ count: count() })
      .from(scrapedData)
      .innerJoin(scrapingTasks, eq(scrapedData.taskId, scrapingTasks.id))
      .where(eq(scrapingTasks.userId, userId));

    // Get active tasks count
    const activeTasksResult = await db
      .select({ count: count() })
      .from(scrapingTasks)
      .where(and(
        eq(scrapingTasks.userId, userId),
        eq(scrapingTasks.status, "running")
      ));

    // Calculate success rate
    const completedTasks = userTasks.filter(task => task.status === "completed").length;
    const totalTasks = userTasks.length;
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalScraped: totalScrapedResult[0]?.count || 0,
      activeTasks: activeTasksResult[0]?.count || 0,
      successRate: Math.round(successRate * 10) / 10,
      apiCalls: Math.floor(Math.random() * 50000) + 10000, // Mock for now
    };
  }
}

export const storage = new DatabaseStorage();
