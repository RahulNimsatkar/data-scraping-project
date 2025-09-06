import {
  userSchema,
  apiKeySchema,
  scrapingTaskSchema,
  scrapedDataSchema,
  websiteAnalysisSchema,
  taskLogSchema,
  User,
  ApiKey,
  ScrapingTask,
  ScrapedData,
  WebsiteAnalysis,
  TaskLog,
} from "@shared/schema";
import { getDb } from "./db";
import { Collection, ObjectId } from "mongodb";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: User): Promise<User>;

  // API Keys
  getApiKeys(userId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: ApiKey): Promise<ApiKey>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;

  // Scraping Tasks
  getScrapingTasks(userId: string): Promise<ScrapingTask[]>;
  getScrapingTask(id: string): Promise<ScrapingTask | undefined>;
  createScrapingTask(task: ScrapingTask): Promise<ScrapingTask>;
  updateScrapingTask(id: string, updates: Partial<ScrapingTask>): Promise<ScrapingTask>;
  getActiveScrapingTasks(userId: string): Promise<ScrapingTask[]>;

  // Scraped Data
  getScrapedData(taskId: string, limit?: number, offset?: number): Promise<ScrapedData[]>;
  createScrapedData(data: ScrapedData): Promise<ScrapedData>;
  updateScrapedData(id: string, updates: Partial<ScrapedData>): Promise<ScrapedData>;
  deleteScrapedData(id: string): Promise<void>;

  // Website Analysis
  getWebsiteAnalysis(url: string): Promise<WebsiteAnalysis | undefined>;
  createWebsiteAnalysis(analysis: WebsiteAnalysis): Promise<WebsiteAnalysis>;

  // Task Logs
  getTaskLogs(taskId: string): Promise<TaskLog[]>;
  createTaskLog(log: TaskLog): Promise<TaskLog>;

  // Statistics
  getUserStats(userId: string): Promise<{
    totalScraped: number;
    activeTasks: number;
    successRate: number;
    apiCalls: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  private getUsersCollection(): Collection<User> {
    return getDb().collection<User>("users");
  }

  private getApiKeysCollection(): Collection<ApiKey> {
    return getDb().collection<ApiKey>("apiKeys");
  }

  private getScrapingTasksCollection(): Collection<ScrapingTask> {
    return getDb().collection<ScrapingTask>("scrapingTasks");
  }

  private getScrapedDataCollection(): Collection<ScrapedData> {
    return getDb().collection<ScrapedData>("scrapedData");
  }

  private getWebsiteAnalysisCollection(): Collection<WebsiteAnalysis> {
    return getDb().collection<WebsiteAnalysis>("websiteAnalysis");
  }

  private getTaskLogsCollection(): Collection<TaskLog> {
    return getDb().collection<TaskLog>("taskLogs");
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const user = await this.getUsersCollection().findOne({ _id: new ObjectId(id) });
      return user ? userSchema.parse({ ...user, id: user._id.toHexString() }) : undefined;
    } catch (error) {
      console.error("Error in getUser:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await this.getUsersCollection().findOne({ username });
    return user ? userSchema.parse({ ...user, id: user._id.toHexString() }) : undefined;
  }

  async createUser(user: User): Promise<User> {
    const validatedUser = userSchema.parse(user);
    const result = await this.getUsersCollection().insertOne(validatedUser as any); // Cast to any to allow _id insertion
    return userSchema.parse({ ...validatedUser, id: result.insertedId.toHexString() });
  }

  async getApiKeys(userId: string): Promise<ApiKey[]> {
    const apiKeys = await this.getApiKeysCollection().find({ userId }).toArray();
    return apiKeys.map(key => apiKeySchema.parse({ ...key, id: key._id.toHexString() }));
  }

  async createApiKey(apiKey: ApiKey): Promise<ApiKey> {
    const validatedApiKey = apiKeySchema.parse(apiKey);
    const result = await this.getApiKeysCollection().insertOne(validatedApiKey as any);
    return apiKeySchema.parse({ ...validatedApiKey, id: result.insertedId.toHexString() });
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const apiKey = await this.getApiKeysCollection().findOne({ keyHash });
    return apiKey ? apiKeySchema.parse({ ...apiKey, id: apiKey._id.toHexString() }) : undefined;
  }

  async getScrapingTasks(userId: string): Promise<ScrapingTask[]> {
    const tasks = await this.getScrapingTasksCollection().find({ userId }).sort({ createdAt: -1 }).toArray();
    return tasks.map(task => scrapingTaskSchema.parse({ ...task, id: task._id.toHexString() }));
  }

  async getScrapingTask(id: string): Promise<ScrapingTask | undefined> {
    try {
      const task = await this.getScrapingTasksCollection().findOne({ _id: new ObjectId(id) });
      return task ? scrapingTaskSchema.parse({ ...task, id: task._id.toHexString() }) : undefined;
    } catch (error) {
      console.error("Error in getScrapingTask:", error);
      return undefined;
    }
  }

  async createScrapingTask(task: ScrapingTask): Promise<ScrapingTask> {
    const validatedTask = scrapingTaskSchema.parse(task);
    const result = await this.getScrapingTasksCollection().insertOne(validatedTask as any);
    return scrapingTaskSchema.parse({ ...validatedTask, id: result.insertedId.toHexString() });
  }

  async updateScrapingTask(id: string, updates: Partial<ScrapingTask>): Promise<ScrapingTask> {
    const validatedUpdates = scrapingTaskSchema.partial().parse(updates);
    const result: any = await this.getScrapingTasksCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...validatedUpdates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!result.value) { // result.value is null if no document was found
      throw new Error(`Scraping task with id ${id} not found.`);
    }
    return scrapingTaskSchema.parse({ ...result.value, id: result.value._id.toHexString() });
  }

  async getActiveScrapingTasks(userId: string): Promise<ScrapingTask[]> {
    const tasks = await this.getScrapingTasksCollection().find({ userId, status: "running" }).toArray();
    return tasks.map(task => scrapingTaskSchema.parse({ ...task, id: task._id.toHexString() }));
  }

  async getScrapedData(taskId: string, limit = 50, offset = 0): Promise<ScrapedData[]> {
    const data = await this.getScrapedDataCollection()
      .find({ taskId })
      .sort({ scrapedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    return data.map(item => scrapedDataSchema.parse({ ...item, id: item._id.toHexString() }));
  }

  async createScrapedData(data: ScrapedData): Promise<ScrapedData> {
    const validatedData = scrapedDataSchema.parse(data);
    const result = await this.getScrapedDataCollection().insertOne(validatedData as any);
    return scrapedDataSchema.parse({ ...validatedData, id: result.insertedId.toHexString() });
  }

  async updateScrapedData(id: string, updates: Partial<ScrapedData>): Promise<ScrapedData> {
    const validatedUpdates = scrapedDataSchema.partial().parse(updates);
    const result: any = await this.getScrapedDataCollection().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: validatedUpdates },
      { returnDocument: 'after' }
    );
    if (!result.value) { // result.value is null if no document was found
      throw new Error(`Scraped data with id ${id} not found.`);
    }
    return scrapedDataSchema.parse({ ...result.value, id: result.value._id.toHexString() });
  }

  async deleteScrapedData(id: string): Promise<void> {
    await this.getScrapedDataCollection().deleteOne({ _id: new ObjectId(id) });
  }

  async getWebsiteAnalysis(url: string): Promise<WebsiteAnalysis | undefined> {
    const analysis = await this.getWebsiteAnalysisCollection().findOne({ url });
    return analysis ? websiteAnalysisSchema.parse({ ...analysis, id: analysis._id.toHexString() }) : undefined;
  }

  async createWebsiteAnalysis(analysis: WebsiteAnalysis): Promise<WebsiteAnalysis> {
    const validatedAnalysis = websiteAnalysisSchema.parse(analysis);
    const result = await this.getWebsiteAnalysisCollection().insertOne(validatedAnalysis as any);
    return websiteAnalysisSchema.parse({ ...validatedAnalysis, id: result.insertedId.toHexString() });
  }

  async getTaskLogs(taskId: string): Promise<TaskLog[]> {
    const logs = await this.getTaskLogsCollection().find({ taskId }).sort({ createdAt: -1 }).toArray();
    return logs.map(log => taskLogSchema.parse({ ...log, id: log._id.toHexString() }));
  }

  async createTaskLog(log: TaskLog): Promise<TaskLog> {
    const validatedLog = taskLogSchema.parse(log);
    const result = await this.getTaskLogsCollection().insertOne(validatedLog as any);
    return taskLogSchema.parse({ ...validatedLog, id: result.insertedId.toHexString() });
  }

  async getUserStats(userId: string): Promise<{
    totalScraped: number;
    activeTasks: number;
    successRate: number;
    apiCalls: number;
  }> {
    const userTasks = await this.getScrapingTasksCollection().find({ userId }).project({ _id: 1, status: 1 }).toArray();
    const taskIds = userTasks.map(task => task._id.toHexString());

    const totalScraped = await this.getScrapedDataCollection().countDocuments({ taskId: { $in: taskIds } });
    const activeTasks = userTasks.filter(task => task.status === "running").length;
    const completedTasks = userTasks.filter(task => task.status === "completed").length;
    const totalTasks = userTasks.length;

    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalScraped: totalScraped,
      activeTasks: activeTasks,
      successRate: Math.round(successRate * 10) / 10,
      apiCalls: Math.floor(Math.random() * 50000) + 10000, // Mock for now
    };
  }
}

export const storage = new DatabaseStorage();
