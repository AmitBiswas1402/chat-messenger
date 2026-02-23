import { getDBUserId } from "@/actions/user.action";
import { db } from "@/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

import ChatArea from "@/app/(homepage)/components/ChatArea";

// Server Component: do NOT use 'use client'
export default async function ChatPage(props: any) {
  const params = await props.params;
  const chatId = params?.id ?? "";
  const currentUserId = await getDBUserId();
  let chatUser = null;
  if (chatId === currentUserId) {
    return (
      <div className="flex items-center justify-center h-full w-full text-zinc-400 text-lg">
        You cannot chat with yourself. Please select another user.
      </div>
    );
  }
  if (chatId) {
    const userArr = await db
      .select({
        id: users.id,
        name: users.name,
        imageUrl: users.imageUrl,
      })
      .from(users)
      .where(eq(users.id, chatId))
      .limit(1);
    chatUser = userArr[0] ?? null;
  }
  if (!chatUser) {
    console.log('DEBUG: chatUser not found for chatId:', chatId);
    return (
      <div className="flex items-center justify-center h-full w-full text-zinc-400 text-lg">
        User not found. Please select a valid chat.
      </div>
    );
  }
  // Map imageUrl to image for ChatArea compatibility
  const chatUserForChatArea = {
    ...chatUser,
    image: chatUser.imageUrl,
  };
  console.log('DEBUG: chatUser found:', chatUserForChatArea);
  return (
    <ChatArea
      chatId={chatId || undefined}
      currentUserId={currentUserId || undefined}
      chatUser={chatUserForChatArea}
    />
  );
}