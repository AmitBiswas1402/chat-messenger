import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface User {
  id: string
  name: string | null
  imageUrl: string | null
}

export default function UserList({ users }: { users: User[] }) {
  return (
    <div className="p-2 space-y-1">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/chat/${user.id}`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 transition"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.imageUrl ?? undefined} />
            <AvatarFallback>
              {user.name?.charAt(0) ?? "U"}
            </AvatarFallback>
          </Avatar>

          <span className="text-sm font-medium">
            {user.name}
          </span>
        </Link>
      ))}
    </div>
  )
}