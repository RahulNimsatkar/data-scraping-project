import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scrapingTasks = pgTable("scraping_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed, paused
  progress: integer("progress").default(0).notNull(),
  totalItems: integer("total_items").default(0).notNull(),
  scrapedItems: integer("scraped_items").default(0).notNull(),
  selectors: jsonb("selectors"),
  strategy: text("strategy"),
  generatedCode: text("generated_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scrapedData = pgTable("scraped_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => scrapingTasks.id).notNull(),
  data: jsonb("data").notNull(),
  url: text("url").notNull(),
  scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
});

export const websiteAnalysis = pgTable("website_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  selectors: jsonb("selectors"),
  patterns: jsonb("patterns"),
  strategy: text("strategy"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskLogs = pgTable("task_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => scrapingTasks.id).notNull(),
  level: text("level").notNull(), // info, warning, error
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
  scrapingTasks: many(scrapingTasks),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const scrapingTasksRelations = relations(scrapingTasks, ({ one, many }) => ({
  user: one(users, {
    fields: [scrapingTasks.userId],
    references: [users.id],
  }),
  scrapedData: many(scrapedData),
  logs: many(taskLogs),
}));

export const scrapedDataRelations = relations(scrapedData, ({ one }) => ({
  task: one(scrapingTasks, {
    fields: [scrapedData.taskId],
    references: [scrapingTasks.id],
  }),
}));

export const taskLogsRelations = relations(taskLogs, ({ one }) => ({
  task: one(scrapingTasks, {
    fields: [taskLogs.taskId],
    references: [scrapingTasks.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});

export const insertScrapingTaskSchema = createInsertSchema(scrapingTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScrapedDataSchema = createInsertSchema(scrapedData).omit({
  id: true,
  scrapedAt: true,
});

export const insertWebsiteAnalysisSchema = createInsertSchema(websiteAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertTaskLogSchema = createInsertSchema(taskLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ScrapingTask = typeof scrapingTasks.$inferSelect;
export type InsertScrapingTask = z.infer<typeof insertScrapingTaskSchema>;
export type ScrapedData = typeof scrapedData.$inferSelect;
export type InsertScrapedData = z.infer<typeof insertScrapedDataSchema>;
export type WebsiteAnalysis = typeof websiteAnalysis.$inferSelect;
export type InsertWebsiteAnalysis = z.infer<typeof insertWebsiteAnalysisSchema>;
export type TaskLog = typeof taskLogs.$inferSelect;
export type InsertTaskLog = z.infer<typeof insertTaskLogSchema>;
