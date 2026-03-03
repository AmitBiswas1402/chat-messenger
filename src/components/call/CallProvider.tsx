"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCallStore } from "@/store/useCallStore";
import { useCallSocket, CallSocketCallbacks } from "@/hooks/useCallSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import { OutgoingCallModal } from "./OutgoingCallModal";
import { IncomingCallModal } from "./IncomingCallModal";
import { InCallUI } from "./InCallUI";

const CALL_TIMEOUT_MS = 30_000; // 30 seconds

export function CallProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const {
    callStatus,
    callerId,
    receiverId,
    isIncoming,
    remoteStream,
    endCall,
    reset,
  } = useCallStore();

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callbacksRef = useRef<CallSocketCallbacks | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Socket signaling ---
  const {
    emitCallRequest,
    emitAcceptCall,
    emitDeclineCall,
    emitCancelCall,
    emitCallEnd,
    emitSignal,
  } = useCallSocket(callbacksRef);

  // --- WebRTC ---
  const { startCall, handleOffer, handleAnswer, handleIceCandidate, cleanup } =
    useWebRTC({ emitSignal });

  // --- Wire callbacks so useCallSocket can trigger WebRTC actions ---
  useEffect(() => {
    callbacksRef.current = {
      onCallAccepted: () => {
        // Caller side: call was accepted, start WebRTC offer
        const state = useCallStore.getState();
        if (state.receiverId && state.callerId) {
          startCall(state.receiverId, state.callerId);
        }
      },
      onSignalOffer: (from: string, sdp: RTCSessionDescriptionInit) => {
        // Receiver side: got an offer, handle it
        handleOffer(from, userId, sdp);
      },
      onSignalAnswer: (sdp: RTCSessionDescriptionInit) => {
        handleAnswer(sdp);
      },
      onSignalCandidate: (candidate: RTCIceCandidateInit) => {
        handleIceCandidate(candidate);
      },
    };
  }, [startCall, handleOffer, handleAnswer, handleIceCandidate]);

  // --- Play remote audio stream ---
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // --- 30-second call timeout ---
  useEffect(() => {
    if (callStatus === "calling") {
      timeoutRef.current = setTimeout(() => {
        console.log("[CallProvider] Call timeout — no answer");
        const state = useCallStore.getState();
        if (state.receiverId) {
          emitCancelCall(state.receiverId);
        }
        cleanup();
        endCall();
      }, CALL_TIMEOUT_MS);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [callStatus, emitCancelCall, cleanup, endCall]);

  // --- Handle tab close / refresh ---
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useCallStore.getState();
      if (state.callStatus === "idle" || state.callStatus === "ended") return;

      if (state.callStatus === "calling" && state.receiverId) {
        emitCancelCall(state.receiverId);
      } else if (
        (state.callStatus === "connected" || state.callStatus === "ringing") &&
        state.callerId &&
        state.receiverId
      ) {
        const to = state.isIncoming ? state.callerId : state.receiverId;
        const from = state.isIncoming ? state.receiverId : state.callerId;
        emitCallEnd(to ?? "", from ?? "");
      }

      cleanup();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [emitCancelCall, emitCallEnd, cleanup]);

  // --- Action handlers for UI ---

  const handleCancelOutgoing = useCallback(() => {
    const state = useCallStore.getState();
    if (state.receiverId) {
      emitCancelCall(state.receiverId);
    }
    cleanup();
    endCall();
  }, [emitCancelCall, cleanup, endCall]);

  const handleAcceptIncoming = useCallback(() => {
    const state = useCallStore.getState();
    if (state.callerId) {
      emitAcceptCall(state.callerId, userId);
    }
  }, [emitAcceptCall, userId]);

  const handleDeclineIncoming = useCallback(() => {
    const state = useCallStore.getState();
    if (state.callerId) {
      emitDeclineCall(state.callerId, userId);
    }
    cleanup();
    endCall();
  }, [emitDeclineCall, cleanup, endCall, userId]);

  const handleEndCall = useCallback(() => {
    const state = useCallStore.getState();
    const to = state.isIncoming ? state.callerId : state.receiverId;
    const from = state.isIncoming ? state.receiverId : state.callerId;
    if (to && from) {
      emitCallEnd(to, from);
    }
    cleanup();
    endCall();
  }, [emitCallEnd, cleanup, endCall]);

  return (
    <>
      {children}

      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Call UI overlays */}
      {callStatus === "calling" && !isIncoming && (
        <OutgoingCallModal onCancel={handleCancelOutgoing} />
      )}

      {callStatus === "ringing" && isIncoming && (
        <IncomingCallModal
          onAccept={handleAcceptIncoming}
          onDecline={handleDeclineIncoming}
        />
      )}

      {callStatus === "connected" && (
        <InCallUI onEndCall={handleEndCall} />
      )}

      {callStatus === "ended" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 text-white px-6 py-3 rounded-full text-sm font-medium shadow-lg">
          Call ended
        </div>
      )}
    </>
  );
}
