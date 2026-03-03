"use client";

import { useRef, useCallback } from "react";
import { useCallStore } from "@/store/useCallStore";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface UseWebRTCParams {
  emitSignal: (
    to: string,
    from: string,
    signal: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
  ) => void;
}

export function useWebRTC({ emitSignal }: UseWebRTCParams) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const { setLocalStream, setRemoteStream, setConnected, endCall } =
    useCallStore();

  // --- Cleanup ---

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
  }, []);

  // --- Create peer connection ---

  const createPeer = useCallback(
    (to: string, from: string) => {
      const peer = new RTCPeerConnection(ICE_SERVERS);

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          emitSignal(to, from, { candidate: event.candidate.toJSON() });
        }
      };

      peer.ontrack = (event) => {
        console.log("[useWebRTC] Remote track received");
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
      };

      peer.oniceconnectionstatechange = () => {
        console.log("[useWebRTC] ICE state:", peer.iceConnectionState);
        if (peer.iceConnectionState === "connected") {
          setConnected();
        }
        if (
          peer.iceConnectionState === "disconnected" ||
          peer.iceConnectionState === "failed"
        ) {
          console.log("[useWebRTC] Connection lost, ending call");
          endCall();
          cleanup();
        }
      };

      peerRef.current = peer;
      return peer;
    },
    [emitSignal, setRemoteStream, setConnected, endCall, cleanup]
  );

  // --- Get microphone stream ---

  const getLocalStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, [setLocalStream]);

  // --- Caller: create offer ---

  const startCall = useCallback(
    async (to: string, from: string) => {
      try {
        const stream = await getLocalStream();
        const peer = createPeer(to, from);

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        emitSignal(to, from, { sdp: peer.localDescription!.toJSON() });
      } catch (err) {
        console.error("[useWebRTC] Failed to start call:", err);
        endCall();
        cleanup();
      }
    },
    [getLocalStream, createPeer, emitSignal, endCall, cleanup]
  );

  // --- Receiver: handle incoming offer ---

  const handleOffer = useCallback(
    async (from: string, currentUserId: string, sdp: RTCSessionDescriptionInit) => {
      try {
        const stream = await getLocalStream();
        const peer = createPeer(from, currentUserId);

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        await peer.setRemoteDescription(new RTCSessionDescription(sdp));

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        emitSignal(from, currentUserId, { sdp: peer.localDescription!.toJSON() });
      } catch (err) {
        console.error("[useWebRTC] Failed to handle offer:", err);
        endCall();
        cleanup();
      }
    },
    [getLocalStream, createPeer, emitSignal, endCall, cleanup]
  );

  // --- Caller: handle answer from receiver ---

  const handleAnswer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      try {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(sdp)
          );
        }
      } catch (err) {
        console.error("[useWebRTC] Failed to handle answer:", err);
      }
    },
    []
  );

  // --- Handle ICE candidate ---

  const handleIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      try {
        if (peerRef.current) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("[useWebRTC] Failed to add ICE candidate:", err);
      }
    },
    []
  );

  return {
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    cleanup,
    peerRef,
  };
}
