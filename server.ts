import { createServer } from "http"
import { Server } from "socket.io"

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map<string, Set<string>>()

function broadcastOnlineUsers() {
  const userIds = Array.from(onlineUsers.keys())
  io.emit("users:online", userIds)
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  let currentUserId: string | null = null

  socket.on("join", (userId: string) => {
    currentUserId = userId
    socket.join(userId)

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set())
    }
    onlineUsers.get(userId)!.add(socket.id)

    // Broadcast this user came online
    socket.broadcast.emit("user:online", userId)
    broadcastOnlineUsers()

    console.log(`[Socket.IO] User ${userId} joined room (socket.id=${socket.id})`)
  })

  // Message sending
  socket.on("send-message", (data: { receiverId: string; message: any }) => {
    io.to(data.receiverId).emit("new-message", data.message)
    io.to(data.message.senderId).emit("new-message", data.message)
  })

  // Edit message relay
  socket.on("edit-message", (data: { id: string; content: string; receiverId: string }) => {
    io.to(data.receiverId).emit("message:edited", { id: data.id, content: data.content })
  })

  // Delete message relay
  socket.on("delete-message", (data: { id: string; receiverId: string }) => {
    io.to(data.receiverId).emit("message:deleted", { id: data.id })
  })

  // Typing indicators
  socket.on("typing", (data: { to: string; from: string }) => {
    io.to(data.to).emit("typing", { from: data.from })
  })

  socket.on("stop-typing", (data: { to: string; from: string }) => {
    io.to(data.to).emit("stop-typing", { from: data.from })
  })

  // Message status updates
  socket.on("message:delivered", (data: { to: string; from: string }) => {
    io.to(data.to).emit("message:status-update", { from: data.from, status: "delivered" })
  })

  socket.on("message:seen", (data: { to: string; from: string }) => {
    io.to(data.to).emit("message:status-update", { from: data.from, status: "seen" })
  })

  // WebRTC signaling events
  socket.on("call", (data) => {
    console.log(`[Socket.IO] call event:`, data);
    io.to(data.to).emit("incoming-call", {
      from: data.from,
      name: data.name,
      avatar: data.avatar,
    });
    console.log(`[Socket.IO] Emitted incoming-call to ${data.to}`);
  });

  socket.on("cancel-call", (data) => {
    io.to(data.to).emit("call-cancelled");
  });

  socket.on("accept-call", (data) => {
    io.to(data.to).emit("call-accepted", { from: data.from });
  });

  socket.on("decline-call", (data) => {
    io.to(data.to).emit("call-declined", { from: data.from });
  });

  socket.on("signal", (data) => {
    io.to(data.to).emit("signal", { from: data.from, signal: data.signal });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)

    if (currentUserId) {
      const sockets = onlineUsers.get(currentUserId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          onlineUsers.delete(currentUserId)
          socket.broadcast.emit("user:offline", currentUserId)
          broadcastOnlineUsers()
        }
      }
    }
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`)
})
