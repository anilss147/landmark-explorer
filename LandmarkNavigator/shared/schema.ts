import { pgTable, text, serial, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the landmark facts schema
const landmarkFactSchema = z.object({
  type: z.string().min(1, "Type is required"),
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
});

// Landmark table
export const landmarks = pgTable("landmarks", {
  id: serial("id").primaryKey(),
  pageid: numeric("pageid").notNull().unique().index(),
  title: text("title").notNull(),
  lat: numeric("lat").notNull(),
  lon: numeric("lon").notNull(),
  description: text("description").default("No description available"),
  thumbnail: text("thumbnail"),
  address: text("address"),
  facts: jsonb("facts").$type<Array<z.infer<typeof landmarkFactSchema>>>(),
  createdAt: numeric("created_at").default(() => Date.now()),
  updatedAt: numeric("updated_at").default(() => Date.now()),
});

// Cache table for storing API responses
export const caches = pgTable("caches", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique().index(),
  value: jsonb("value").notNull(),
  expires: numeric("expires").notNull(),
  createdAt: numeric("created_at").default(() => Date.now()),
  updatedAt: numeric("updated_at").default(() => Date.now()),
});

// Schema for inserting a landmark
export const insertLandmarkSchema = createInsertSchema(landmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for inserting a cache entry
export const insertCacheSchema = createInsertSchema(caches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertLandmark = z.infer<typeof insertLandmarkSchema>;
export type Landmark = typeof landmarks.$inferSelect;
export type InsertCache = z.infer<typeof insertCacheSchema>;
export type Cache = typeof caches.$inferSelect;
