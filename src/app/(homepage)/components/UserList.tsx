"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useSocket } from "@/components/SocketProvider";
import {
  markAllMessagesDelivered,
  markMessageDelivered,
  getLastMessagePerUser,
  getUnreadCounts,
} from "@/actions/message.action";

interface User {
  id: string;
  name: string | null;
  imageUrl: string | null;
}

interface LastMessage {
  otherUserId: string;
  content: string;
  senderId: string;
  createdAt: string;
  status: string;
  imageUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
}

interface Props {
  users: User[];
  currentUserId: string;
  initialLastMessages: LastMessage[];
  initialUnreadCounts: Record<string, number>;
}

export default function UserList({
  users,
  currentUserId,
  initialLastMessages,
  initialUnreadCounts,
}: Props) {
  const socket = useSocket();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>(
    () => {
      const map: Record<string, LastMessage> = {};
      initialLastMessages.forEach((m) => {
        map[m.otherUserId] = m;
      });
      return map;
    }
  );
  const [unreadCounts, setUnreadCounts] =
    useState<Record<string, number>>(initialUnreadCounts);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Mark all pending messages as delivered on connect/reconnect
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const onConnect = () => {
      // Refresh sidebar data from DB on (re)connect to pick up missed updates
      Promise.all([getLastMessagePerUser(), getUnreadCounts()])
        .then(([freshMessages, freshCounts]) => {
          const map: Record<string, LastMessage> = {};
          freshMessages.forEach((m) => {
            map[m.otherUserId] = m;
          });
          setLastMessages(map);
          setUnreadCounts(freshCounts);
        })
        .catch((e) => console.error("Failed to refresh sidebar:", e));

      // Mark all sent-to-me messages as delivered
      markAllMessagesDelivered().then((senderIds) => {
        senderIds.forEach((senderId) => {
          socket.emit("message:delivered", { to: senderId, from: currentUserId });
        });
      });
    };

    // Run immediately if already connected, and on every future (re)connect
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);

    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket, currentUserId]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const onUsersOnline = (ids: string[]) => {
      setOnlineUserIds(new Set(ids));
    };
    const onUserOnline = (id: string) => {
      setOnlineUserIds((prev) => new Set(prev).add(id));
    };
    const onUserOffline = (id: string) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    };

    const onNewMessage = (msg: any) => {
      const isRelevant =
        msg.senderId === currentUserId || msg.receiverId === currentUserId;
      if (!isRelevant) return;

      const otherUserId =
        msg.senderId === currentUserId ? msg.receiverId : msg.senderId;

      setLastMessages((prev) => ({
        ...prev,
        [otherUserId]: {
          otherUserId,
          content: msg.content,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
          status: msg.status,
          imageUrl: msg.imageUrl ?? null,
          audioUrl: msg.audioUrl ?? null,
          videoUrl: msg.videoUrl ?? null,
          documentUrl: msg.documentUrl ?? null,
        },
      }));

      // Increment unread if message is from someone else and we're not in their chat
      const activeChatId = pathname?.startsWith("/chat/")
        ? pathname.split("/chat/")[1]
        : null;
      if (msg.senderId !== currentUserId && msg.senderId !== activeChatId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }

      // Mark incoming messages as delivered in real-time
      if (msg.senderId !== currentUserId && msg.receiverId === currentUserId) {
        markMessageDelivered(msg.senderId).then(() => {
          socket.emit("message:delivered", {
            to: msg.senderId,
            from: currentUserId,
          });
        });
      }
    };

    const onTyping = (data: { from: string }) => {
      setTypingUsers((prev) => new Set(prev).add(data.from));
    };
    const onStopTyping = (data: { from: string }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.from);
        return next;
      });
    };

    // Only upgrade status, never downgrade: sent → delivered → seen
    const statusPriority: Record<string, number> = { sending: 0, sent: 1, delivered: 2, seen: 3 };
    const onStatusUpdate = (data: { from: string; status: string }) => {
      setLastMessages((prev) => {
        const existing = prev[data.from];
        if (existing && existing.senderId === currentUserId) {
          const current = statusPriority[existing.status] ?? 0;
          const incoming = statusPriority[data.status] ?? 0;
          if (incoming > current) {
            return { ...prev, [data.from]: { ...existing, status: data.status } };
          }
        }
        return prev;
      });
    };

    socket.on("users:online", onUsersOnline);
    socket.on("user:online", onUserOnline);
    socket.on("user:offline", onUserOffline);
    socket.on("new-message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("stop-typing", onStopTyping);
    socket.on("message:status-update", onStatusUpdate);

    return () => {
      socket.off("users:online", onUsersOnline);
      socket.off("user:online", onUserOnline);
      socket.off("user:offline", onUserOffline);
      socket.off("new-message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("stop-typing", onStopTyping);
      socket.off("message:status-update", onStatusUpdate);
    };
  }, [socket, currentUserId, pathname]);

  // Clear unread count when navigating to a chat
  useEffect(() => {
    const activeChatId = pathname?.startsWith("/chat/")
      ? pathname.split("/chat/")[1]
      : null;
    if (activeChatId) {
      setUnreadCounts((prev) => {
        if (prev[activeChatId]) {
          const next = { ...prev };
          delete next[activeChatId];
          return next;
        }
        return prev;
      });
    }
  }, [pathname]);

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(query.toLowerCase())
  );

  // Sort by last message time (most recent first)
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aMsg = lastMessages[a.id];
    const bMsg = lastMessages[b.id];
    if (!aMsg && !bMsg) return 0;
    if (!aMsg) return 1;
    if (!bMsg) return -1;
    return (
      new Date(bMsg.createdAt).getTime() - new Date(aMsg.createdAt).getTime()
    );
  });

  function getPreviewText(msg: LastMessage): string {
    if (msg.imageUrl) return "\ud83d\udcf7 Photo";
    if (msg.audioUrl) return "\ud83c\udfb5 Voice message";
    if (msg.videoUrl) return "\ud83c\udfac Video";
    if (msg.documentUrl) return "\ud83d\udcc4 Document";
    return msg.content || "";
  }

  function getTickIcon(msg: LastMessage) {
    if (msg.senderId !== currentUserId) return null;
    const status = msg.status;
    if (status === "seen") {
      return (
        <svg
          width="16"
          height="12"
          viewBox="0 0 16 12"
          fill="none"
          className="inline-block ml-1 shrink-0"
        >
          <path
            d="M1.5 6l3 3L11 2.5"
            stroke="#3b82f6"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M5.5 6l3 3L15 2.5"
            stroke="#3b82f6"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    }
    if (status === "delivered") {
      return (
        <svg
          width="16"
          height="12"
          viewBox="0 0 16 12"
          fill="none"
          className="inline-block ml-1 shrink-0"
        >
          <path
            d="M1.5 6l3 3L11 2.5"
            stroke="#888"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M5.5 6l3 3L15 2.5"
            stroke="#888"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    }
    // sent
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        className="inline-block ml-1 shrink-0"
      >
        <path
          d="M2 6l3 3L10 3"
          stroke="#888"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {/* Search bar */}
      <div className="relative mb-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <Input
          placeholder="Search chats..."
          className="pl-11 pr-10 h-11 rounded-full bg-zinc-800 border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-600"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
      {sortedUsers.length === 0 && (
        <div className="p-4 text-zinc-400 text-center text-sm">
          No chats found
        </div>
      )}

      {sortedUsers.map((user) => {
        const msg = lastMessages[user.id];
        const unread = unreadCounts[user.id] || 0;
        const isOnline = onlineUserIds.has(user.id);
        const isUserTyping = typingUsers.has(user.id);
        const activeChatId = pathname?.startsWith("/chat/")
          ? pathname.split("/chat/")[1]
          : null;
        const isActive = activeChatId === user.id;

        return (
          <Link
            key={user.id}
            href={`/chat/${user.id}`}
            className={`flex items-center gap-3 p-3 rounded-lg transition ${
              isActive ? "bg-zinc-800" : "hover:bg-zinc-800/60"
            }`}
          >
            {/* Avatar with online dot */}
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.imageUrl ?? undefined} />
                <AvatarFallback>{user.name?.charAt(0) ?? "U"}</AvatarFallback>
              </Avatar>
              {isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-zinc-900" />
              )}
            </div>

            {/* Name + preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">
                  {user.name}
                </span>
                {msg && (
                  <span className="text-[10px] text-zinc-500 shrink-0 ml-2" suppressHydrationWarning>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                {isUserTyping ? (
                  <span className="text-xs text-emerald-400 italic truncate">
                    typing...
                  </span>
                ) : msg ? (
                  <span className="text-xs text-zinc-400 truncate flex items-center">
                    {getTickIcon(msg)}
                    <span className="truncate ml-0.5">
                      {getPreviewText(msg)}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">No messages yet</span>
                )}
                {unread > 0 && (
                  <span className="ml-2 shrink-0 bg-emerald-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                    {unread}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
