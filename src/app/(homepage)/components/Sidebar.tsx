import UserList from "./UserList"
import ProfileMenu from "./ProfileMenu"
import { Separator } from "@/components/ui/separator"
import { users } from "@/db/schema"
import { ne } from "drizzle-orm"
import { getDBUserId } from "@/actions/user.action"
import { db } from "@/index"

export default async function Sidebar() {
  const currentUserId = await getDBUserId()
  if (!currentUserId) return null

  // Fetch users only (no lastMessage, since db.raw is not supported)
  const otherUsers = await db
    .select({
      id: users.id,
      name: users.name,
      imageUrl: users.imageUrl,
    })
    .from(users)
    .where(ne(users.id, currentUserId))

  return (
    <div className="w-[320px] border-r border-zinc-800 flex flex-col bg-zinc-900">
      
      {/* TOP */}
      <div className="p-4">
        <h2 className="text-lg font-semibold">Chats</h2>
      </div>

      <Separator />

      {/* USERS */}
        <div className="flex-1 overflow-y-auto">
          <UserList users={otherUsers} />
      </div>

      <Separator />

      {/* BOTTOM PROFILE */}
      <div className="p-3">
        <ProfileMenu />
      </div>

    </div>
  )
}