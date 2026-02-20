import { pgTable, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(), 
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  imageUrl: varchar("image_url", { length: 512 }), 
  bio: varchar("bio", { length: 500 }), 
  isOnline: boolean("is_online").default(false), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
