import ChatArea from "../../components/ChatArea"
import { CallProvider } from "@/components/CallProvider";
import { users } from "@/db/schema"
import { db } from "@/index"
import { eq } from "drizzle-orm"
import { getDBUserId } from "@/actions/user.action"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const currentUserId = await getDBUserId()

  const [selectedUser] = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.imageUrl,
    })
    .from(users)
    .where(eq(users.id, id))

  if (!selectedUser) {
    return <div>User not found</div>
  }

  if (!currentUserId) {
    return (
      <ChatArea
        chatId={id}
        currentUserId={undefined}
        chatUser={selectedUser}
      />
    );
  }
  return (
    <CallProvider userId={currentUserId}>
      <ChatArea
        chatId={id}
        currentUserId={currentUserId}
        chatUser={selectedUser}
      />
    </CallProvider>
  );
}