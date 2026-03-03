import { create } from "zustand";

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

interface CallState {
  callStatus: CallStatus;
  callerId: string | null;
  receiverId: string | null;
  callerName: string | null;
  callerAvatar: string | null;
  receiverName: string | null;
  receiverAvatar: string | null;
  isIncoming: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callStartTime: number | null;
  isMuted: boolean;
}

interface CallActions {
  startOutgoingCall: (
    callerId: string,
    receiverId: string,
    receiverName: string,
    receiverAvatar: string | null
  ) => void;
  receiveIncomingCall: (
    callerId: string,
    callerName: string,
    callerAvatar: string | null
  ) => void;
  setConnected: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  toggleMute: () => void;
  endCall: () => void;
  reset: () => void;
}

const initialState: CallState = {
  callStatus: "idle",
  callerId: null,
  receiverId: null,
  callerName: null,
  callerAvatar: null,
  receiverName: null,
  receiverAvatar: null,
  isIncoming: false,
  localStream: null,
  remoteStream: null,
  callStartTime: null,
  isMuted: false,
};

export const useCallStore = create<CallState & CallActions>((set, get) => ({
  ...initialState,

  startOutgoingCall: (callerId, receiverId, receiverName, receiverAvatar) => {
    set({
      callStatus: "calling",
      callerId,
      receiverId,
      receiverName,
      receiverAvatar,
      isIncoming: false,
    });
  },

  receiveIncomingCall: (callerId, callerName, callerAvatar) => {
    const { callStatus } = get();
    // If already in a call, ignore
    if (callStatus !== "idle") return;
    set({
      callStatus: "ringing",
      callerId,
      callerName,
      callerAvatar,
      isIncoming: true,
    });
  },

  setConnected: () => {
    set({
      callStatus: "connected",
      callStartTime: Date.now(),
    });
  },

  setLocalStream: (stream) => {
    set({ localStream: stream });
  },

  setRemoteStream: (stream) => {
    set({ remoteStream: stream });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // toggle: if muted, enable; if unmuted, disable
      });
    }
    set({ isMuted: !isMuted });
  },

  endCall: () => {
    const { localStream } = get();
    // Stop all local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    set({ ...initialState, callStatus: "ended" });
    // Auto-reset to idle after a short delay
    setTimeout(() => {
      set({ callStatus: "idle" });
    }, 2000);
  },

  reset: () => {
    const { localStream } = get();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    set(initialState);
  },
}));
