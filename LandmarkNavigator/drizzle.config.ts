import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables from .env file
dotenv.config();

// Validate DATABASE_URL
const DATABASE_URL: string = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Ensure it is set in the environment variables or .env file.");
}

// Ensure the migrations directory exists
const migrationsDir = path.resolve(__dirname, "./migrations");
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: process.env.DB_DIALECT || "postgresql", // Default to PostgreSQL
  dbCredentials: {
    url: DATABASE_URL,
  },
});