import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const prompts = sqliteTable("prompts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: text("project_id").notNull(),
  timestamp: text("timestamp").notNull(),
  content: text("content"),
  promptText: text("prompt_text").notNull(),
  aspectRatio: text("aspect_ratio").default("1:1"),
  negativePrompt: text("negative_prompt"),
  imageUrl: text("image_url"),
  model: text("model"),
  llmEnhanced: integer("llm_enhanced", { mode: "boolean" }).default(false),
  category: text("category"),
  style: text("style"),
  tone: text("tone"),
  userId: text("user_id"),
  isPublic: integer("is_public", { mode: "boolean" }).default(false),
  likes: integer("likes").default(0),
  tags: text("tags"),
  folderId: integer("folder_id"),
  suggestedPalette: text("suggested_palette"),
  suggestedIcons: text("suggested_icons"),
});

export const folders = sqliteTable("folders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const presets = sqliteTable("presets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  config: text("config").notNull(), // JSON string of selectors
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatar: text("avatar"),
  role: text("role").default("user"), // user, pro, admin
  address: text("address"),
  contact: text("contact"),
  profileComplete: integer("profile_complete", { mode: "boolean" }).default(false),
});
