"use server";

import { users } from "@/db/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "..";

export async function syncUser() {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  if (!userId || !clerkUser) return null;

  // check if already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing.length) return existing[0];

  // create new
  const [created] = await db
    .insert(users)
    .values({
      id: userId, // clerk id
      name:
        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}` ||
        clerkUser.username ||
        "User",
      email: clerkUser.emailAddresses[0].emailAddress,
      imageUrl: clerkUser.imageUrl,
    })
    .returning();

  return created;
}

export async function getCurrentDBUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  return user ?? null;
}

export async function getDBUserId() {
  const { userId } = await auth();
  return userId ?? null;
}