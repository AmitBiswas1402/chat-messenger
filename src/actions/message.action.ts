"use server"

import { db } from "@/index"
import { messages } from "@/db/schema"
import { and, eq, or, asc } from "drizzle-orm"
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
    cloudinary.uploader
      .upload_stream(
        {
          folder: "messenger",
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"))
          else resolve(result)
        }
      )
      .end(buffer)
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
    cloudinary.uploader
      .upload_stream(
        {
          folder: "messenger/audio",
          resource_type: "video", // Cloudinary uses "video" for audio files
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"))
          else resolve(result)
        }
      )
      .end(buffer)
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
    cloudinary.uploader
      .upload_stream(
        {
          folder: "messenger/videos",
          resource_type: "video",
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"))
          else resolve(result)
        }
      )
      .end(buffer)
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
    cloudinary.uploader
      .upload_stream(
        {
          folder: "messenger/documents",
          resource_type: "raw",
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"))
          else resolve(result)
        }
      )
      .end(buffer)
  })

  return result.secure_url
}
