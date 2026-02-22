import { createServer } from "http"
import { Server } from "socket.io"

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  socket.on("join", (userId: string) => {
    socket.join(userId);
    console.log(`[Socket.IO] User ${userId} joined room (socket.id=${socket.id})`);
  });

  socket.on("send-message", (data: { receiverId: string; message: any }) => {
    io.to(data.receiverId).emit("new-message", data.message)
    io.to(data.message.senderId).emit("new-message", data.message)
  })

  // WebRTC signaling events
  socket.on("call", (data) => {
    // { to, from, name, avatar }
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
    // { to, from, signal }
    io.to(data.to).emit("signal", { from: data.from, signal: data.signal });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`)
})
