"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  imageUrl: string | null;
}

export default function UserList({ users }: { users: User[] }) {
  const [query, setQuery] = useState("");

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="p-2 space-y-2">
      <div className="relative">
        {/* LEFT SEARCH ICON */}
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />

        <Input
          placeholder="Search chats..."
          className="pl-11 pr-10 h-11 rounded-full bg-zinc-800 border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-600"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* CLEAR BUTTON */}
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-zinc-700 transition"
          >
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        )}
      </div>

      {/* USER LIST */}
      {filteredUsers.length === 0 && (
        <div className="p-4 text-zinc-400 text-center text-sm">
          No chats found
        </div>
      )}

      {filteredUsers.map((user) => (
        <Link
          key={user.id}
          href={`/chat/${user.id}`}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 transition"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.imageUrl ?? undefined} />
            <AvatarFallback>{user.name?.charAt(0) ?? "U"}</AvatarFallback>
          </Avatar>

          <span className="text-sm font-medium">{user.name}</span>
        </Link>
      ))}
    </div>
  );
}
