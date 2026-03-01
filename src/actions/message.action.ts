
"use server"


// Edit a text message (content only)
export async function editMessage(messageId: string, newContent: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  // Only allow editing own messages
  const [msg] = await db
    .update(messages)
    .set({ content: newContent })
    .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)))
    .returning();
  return msg;
}

// Delete any message (soft delete could be added, but here it's hard delete)
export async function deleteMessage(messageId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  // Only allow deleting own messages
  const [msg] = await db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)))
    .returning();
  return msg;
}
import { db } from "@/index"
import { messages } from "@/db/schema"
import { and, eq, or, asc, desc, ne, count } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import cloudinary from "@/lib/cloudinary"

export async function getMessages(otherUserId: string) {
  const { userId } = await auth()
  if (!userId) return []

  const result = await db
    .select()
    .from(messages)
    .where(
      or(
        and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
      )
    )
    .orderBy(asc(messages.createdAt))

  return result
}

export async function sendMessage(
  receiverId: string,
  content: string,
  imageUrl?: string,
  audioUrl?: string,
  documentUrl?: string,
  documentName?: string,
  videoUrl?: string
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Not authenticated")

  const [msg] = await db
    .insert(messages)
    .values({
      senderId: userId,
      receiverId,
      content,
      imageUrl: imageUrl ?? null,
      audioUrl: audioUrl ?? null,
      documentUrl: documentUrl ?? null,
      documentName: documentName ?? null,
      videoUrl: videoUrl ?? null,
    })
    .returning()

  return msg
}

export async function uploadImage(formData: FormData): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error("Not authenticated")

  const file = formData.get("image") as File
  if (!file) throw new Error("No file provided")

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "messenger",
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Upload failed"))
        else resolve(result as { secure_url: string })
      }
    ).end(buffer)
  })

  return result.secure_url
}

export async function uploadAudio(formData: FormData): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error("Not authenticated")

  const file = formData.get("audio") as File
  if (!file) throw new Error("No file provided")

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "messenger/audio",
        resource_type: "video", // Cloudinary uses "video" for audio files
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Upload failed"))
        else resolve(result as { secure_url: string })
      }
    ).end(buffer)
  })

  return result.secure_url
}

export async function uploadVideo(formData: FormData): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error("Not authenticated")

  const file = formData.get("video") as File
  if (!file) throw new Error("No file provided")

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "messenger/videos",
        resource_type: "video",
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Upload failed"))
        else resolve(result as { secure_url: string })
      }
    ).end(buffer)
  })

  return result.secure_url
}

export async function uploadDocument(formData: FormData): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error("Not authenticated")

  const file = formData.get("document") as File
  if (!file) throw new Error("No file provided")

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: "messenger/documents",
        resource_type: "raw",
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Upload failed"))
        else resolve(result as { secure_url: string })
      }
    ).end(buffer)
  })

  return result.secure_url
}

// Mark all messages from a specific sender to the current user as seen
// Returns the number of messages actually marked
export async function markMessagesSeen(senderId: string): Promise<number> {
  const { userId } = await auth()
  if (!userId) return 0

  const updated = await db
    .update(messages)
    .set({ status: "seen", seenAt: new Date() })
    .where(
      and(
        eq(messages.senderId, senderId),
        eq(messages.receiverId, userId),
        or(
          eq(messages.status, "sent"),
          eq(messages.status, "delivered")
        )
      )
    )
    .returning({ id: messages.id })

  return updated.length
}

// Mark all undelivered messages addressed to the current user as delivered
// Returns the distinct sender IDs so we can notify them via socket
export async function markAllMessagesDelivered() {
  const { userId } = await auth()
  if (!userId) return []

  const updated = await db
    .update(messages)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(
      and(
        eq(messages.receiverId, userId),
        eq(messages.status, "sent")
      )
    )
    .returning({ senderId: messages.senderId })

  const senderIds = [...new Set(updated.map((r) => r.senderId))]
  return senderIds
}

// Mark messages from a specific sender to the current user as delivered
export async function markMessageDelivered(senderId: string) {
  const { userId } = await auth()
  if (!userId) return

  await db
    .update(messages)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(
      and(
        eq(messages.senderId, senderId),
        eq(messages.receiverId, userId),
        eq(messages.status, "sent")
      )
    )
}

// Get the last message for each conversation the current user is part of
export async function getLastMessagePerUser() {
  const { userId } = await auth()
  if (!userId) return []

  const allMessages = await db
    .select()
    .from(messages)
    .where(
      or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      )
    )
    .orderBy(desc(messages.createdAt))

  const seen = new Set<string>()
  const result: Array<{
    otherUserId: string
    content: string
    senderId: string
    createdAt: string
    status: string
    imageUrl: string | null
    audioUrl: string | null
    videoUrl: string | null
    documentUrl: string | null
  }> = []

  for (const msg of allMessages) {
    const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId
    if (seen.has(otherUserId)) continue
    seen.add(otherUserId)
    result.push({
      otherUserId,
      content: msg.content,
      senderId: msg.senderId,
      createdAt: msg.createdAt.toISOString(),
      status: msg.status,
      imageUrl: msg.imageUrl,
      audioUrl: msg.audioUrl,
      videoUrl: msg.videoUrl,
      documentUrl: msg.documentUrl,
    })
  }

  return result
}

// Get count of unread (not "seen") messages per sender for the current user
export async function getUnreadCounts() {
  const { userId } = await auth()
  if (!userId) return {}

  const rows = await db
    .select({
      senderId: messages.senderId,
      unread: count(),
    })
    .from(messages)
    .where(
      and(
        eq(messages.receiverId, userId),
        ne(messages.status, "seen")
      )
    )
    .groupBy(messages.senderId)

  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.senderId] = row.unread
  }
  return counts
}
