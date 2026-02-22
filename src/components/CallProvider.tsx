"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useSocket } from "@/components/SocketProvider";

interface CallContextType {
  callState: {
    incoming: null | { from: string; name: string; avatar: string };
    active: null | { peerId: string; stream: MediaStream | null };
    outgoing: null | { to: string; name: string; avatar: string };
    error: null | string;
  };
  setCallState: React.Dispatch<React.SetStateAction<{
    incoming: null | { from: string; name: string; avatar: string };
    active: null | { peerId: string; stream: MediaStream | null };
    outgoing: null | { to: string; name: string; avatar: string };
    error: null | string;
  }>>;
  peerRef: React.RefObject<any>;
  localStreamRef: React.RefObject<any>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function useCall(): CallContextType {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("CallProvider missing in tree");
  return ctx;
}

interface CallProviderProps {
  children: React.ReactNode;
  userId: string;
}

export function CallProvider({ children, userId }: CallProviderProps) {
  const socket = useSocket();
  const [callState, setCallState] = useState<{
    incoming: null | { from: string; name: string; avatar: string };
    active: null | { peerId: string; stream: MediaStream | null };
    outgoing: null | { to: string; name: string; avatar: string };
    error: null | string;
  }>({
    incoming: null,
    active: null,
    outgoing: null,
    error: null,
  });
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  // Handle incoming call
  useEffect(() => {
    if (!socket) return;
    socket.on("incoming-call", (data) => {
      console.log("[CallProvider] incoming-call event received", data);
      setCallState((s) => {
        console.log("[CallProvider] updating callState.incoming", data);
        return { ...s, incoming: data };
      });
    });
    socket.on("call-cancelled", () => {
      console.log("[CallProvider] call-cancelled event received");
      setCallState((s) => ({ ...s, incoming: null }));
    });
    socket.on("call-error", (err) => {
      console.log("[CallProvider] call-error event received", err);
      setCallState((s) => ({ ...s, error: err }));
    });
    return () => {
      socket.off("incoming-call");
      socket.off("call-cancelled");
      socket.off("call-error");
    };
  }, [socket]);

  // Accept/decline logic, WebRTC setup, etc. will be added here

  return (
    <CallContext.Provider value={{ callState, setCallState, peerRef, localStreamRef }}>
      {children}
    </CallContext.Provider>
  );
}
