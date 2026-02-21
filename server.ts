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
    socket.join(userId)
    console.log(`User ${userId} joined room`)
  })

  socket.on("send-message", (data: { receiverId: string; message: any }) => {
    io.to(data.receiverId).emit("new-message", data.message)
    io.to(data.message.senderId).emit("new-message", data.message)
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`)
})
