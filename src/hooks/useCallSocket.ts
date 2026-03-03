"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/components/SocketProvider";
import { useCallStore } from "@/store/useCallStore";

interface SignalData {
  from: string;
  signal: {
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
}

interface IncomingCallData {
  from: string;
  name: string;
  avatar: string | null;
}

// Callback refs so CallProvider can wire WebRTC actions
export interface CallSocketCallbacks {
  onCallAccepted: () => void;
  onSignalOffer: (from: string, sdp: RTCSessionDescriptionInit) => void;
  onSignalAnswer: (sdp: RTCSessionDescriptionInit) => void;
  onSignalCandidate: (candidate: RTCIceCandidateInit) => void;
}

export function useCallSocket(callbacks: React.MutableRefObject<CallSocketCallbacks | null>) {
  const socket = useSocket();
  const {
    receiveIncomingCall,
    endCall,
    callStatus,
    callerId,
    receiverId,
  } = useCallStore();

  const callStatusRef = useRef(callStatus);
  callStatusRef.current = callStatus;

  // --- Emit functions ---

  const emitCallRequest = useCallback(
    (to: string, from: string, name: string, avatar: string | null) => {
      socket?.emit("call", { to, from, name, avatar });
    },
    [socket]
  );

  const emitAcceptCall = useCallback(
    (to: string, from: string) => {
      socket?.emit("accept-call", { to, from });
    },
    [socket]
  );

  const emitDeclineCall = useCallback(
    (to: string, from: string) => {
      socket?.emit("decline-call", { to, from });
    },
    [socket]
  );

  const emitCancelCall = useCallback(
    (to: string) => {
      socket?.emit("cancel-call", { to });
    },
    [socket]
  );

  const emitCallEnd = useCallback(
    (to: string, from: string) => {
      socket?.emit("call-end", { to, from });
    },
    [socket]
  );

  const emitSignal = useCallback(
    (to: string, from: string, signal: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      socket?.emit("signal", { to, from, signal });
    },
    [socket]
  );

  // --- Listen for events ---

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: IncomingCallData) => {
      console.log("[useCallSocket] incoming-call", data);
      // If busy, auto-decline
      if (callStatusRef.current !== "idle") {
        socket.emit("decline-call", { to: data.from, from: "busy" });
        return;
      }
      receiveIncomingCall(data.from, data.name, data.avatar);
    };

    const handleCallAccepted = () => {
      console.log("[useCallSocket] call-accepted");
      callbacks.current?.onCallAccepted();
    };

    const handleCallDeclined = () => {
      console.log("[useCallSocket] call-declined");
      endCall();
    };

    const handleCallCancelled = () => {
      console.log("[useCallSocket] call-cancelled");
      endCall();
    };

    const handleCallEnded = () => {
      console.log("[useCallSocket] call-ended");
      endCall();
    };

    const handleSignal = (data: SignalData) => {
      console.log("[useCallSocket] signal received", data);
      if (data.signal.sdp) {
        if (data.signal.sdp.type === "offer") {
          callbacks.current?.onSignalOffer(data.from, data.signal.sdp);
        } else if (data.signal.sdp.type === "answer") {
          callbacks.current?.onSignalAnswer(data.signal.sdp);
        }
      }
      if (data.signal.candidate) {
        callbacks.current?.onSignalCandidate(data.signal.candidate);
      }
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("call-declined", handleCallDeclined);
    socket.on("call-cancelled", handleCallCancelled);
    socket.on("call-ended", handleCallEnded);
    socket.on("signal", handleSignal);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("call-declined", handleCallDeclined);
      socket.off("call-cancelled", handleCallCancelled);
      socket.off("call-ended", handleCallEnded);
      socket.off("signal", handleSignal);
    };
  }, [socket, receiveIncomingCall, endCall, callbacks]);

  return {
    emitCallRequest,
    emitAcceptCall,
    emitDeclineCall,
    emitCancelCall,
    emitCallEnd,
    emitSignal,
  };
}
