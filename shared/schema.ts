import { z } from "zod";

// Define Zod schemas for data validation
export const userSchema = z.object({
  id: z.string().optional(), // MongoDB will generate _id
  username: z.string().min(1),
  password: z.string().min(1),
  email: z.string().email(),
  plan: z.string().default("free"),
  createdAt: z.date().default(() => new Date()),
});

export const apiKeySchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string().min(1),
  keyHash: z.string().min(1),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
});

export const scrapingTaskSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string().min(1),
  url: z.string().url(),
  status: z.enum(["pending", "running", "completed", "failed", "paused"]).default("pending"),
  progress: z.number().int().min(0).default(0),
  totalItems: z.number().int().min(0).default(0),
  scrapedItems: z.number().int().min(0).default(0),
  selectors: z.record(z.string(), z.string()).optional(), // Assuming selectors are key-value pairs
  strategy: z.string().optional(),
  generatedCode: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export const scrapedDataSchema = z.object({
  id: z.string().optional(),
  taskId: z.string(),
  data: z.record(z.string(), z.any()), // Flexible for various scraped data
  url: z.string().url(),
  scrapedAt: z.date().default(() => new Date()),
});

export const websiteAnalysisSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  selectors: z.record(z.string(), z.string()).optional(),
  patterns: z.record(z.string(), z.any()).optional(),
  strategy: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(), // Assuming confidence is a percentage
  createdAt: z.date().default(() => new Date()),
});

export const taskLogSchema = z.object({
  id: z.string().optional(),
  taskId: z.string(),
  level: z.enum(["info", "warning", "error"]),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date().default(() => new Date()),
});

// AI Provider API Keys Schema
export const aiProviderKeySchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  provider: z.enum(["openai", "gemini", "claude", "cohere", "huggingface"]),
  name: z.string().min(1),
  apiKey: z.string().min(1), // Encrypted in storage
  isActive: z.boolean().default(true),
  lastUsed: z.date().optional(),
  usageCount: z.number().int().min(0).default(0),
  maxUsage: z.number().int().optional(), // Optional usage limit
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// Types
export type User = z.infer<typeof userSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type ScrapingTask = z.infer<typeof scrapingTaskSchema>;
export type ScrapedData = z.infer<typeof scrapedDataSchema>;
export type WebsiteAnalysis = z.infer<typeof websiteAnalysisSchema>;
export type TaskLog = z.infer<typeof taskLogSchema>;
export type AiProviderKey = z.infer<typeof aiProviderKeySchema>;
