import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  text,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  imageUrl: varchar("image_url", { length: 512 }),
  bio: varchar("bio", { length: 500 }),
  isOnline: boolean("is_online").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: varchar("sender_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  receiverId: varchar("receiver_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  imageUrl: varchar("image_url", { length: 1024 }),
  audioUrl: varchar("audio_url", { length: 1024 }),
  documentUrl: varchar("document_url", { length: 1024 }),
  documentName: varchar("document_name", { length: 512 }),
  videoUrl: varchar("video_url", { length: 1024 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
    // Message status fields
    status: varchar("status", { length: 20 }).default("sending").notNull(), // "sending" | "sent" | "delivered" | "seen"
    seenAt: timestamp("seen_at"),
    deliveredAt: timestamp("delivered_at"),
  });
