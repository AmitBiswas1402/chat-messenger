"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io("http://localhost:3001", {
      transports: ["websocket"],
    });

    s.on("connect", () => {
      console.log("Socket connected:", s.id);
      s.emit("join", userId);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}
