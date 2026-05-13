import type { Config } from "drizzle-kit";

export default {
  schema: "./api/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_PATH ? `file:${process.env.DB_PATH}` : "file:sqlite.db",
  },
} satisfies Config;
