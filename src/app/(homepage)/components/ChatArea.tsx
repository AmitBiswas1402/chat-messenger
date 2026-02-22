"use client";
import { useEffect, useRef, useState } from "react";
import { StreamVideoClient, StreamVideoProvider, StreamCall, Call, CallControls, StreamTheme } from "@stream-io/video-react-sdk";
// Helper to fetch Stream token
async function fetchStreamToken(userId: string) {
  const res = await fetch("/api/stream-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Failed to fetch Stream token");
  return res.json();
}
import { useSocket } from "@/components/SocketProvider";
import {
  getMessages,
  sendMessage,
  uploadImage,
  uploadAudio,
  uploadDocument,
} from "@/actions/message.action";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Smile, ImagePlus, X, Mic, Square, Trash2, FileText, Download, Video } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  documentUrl?: string | null;
  documentName?: string | null;
  videoUrl?: string | null;
  createdAt: Date;
}

interface Props {
  chatId?: string;
  currentUserId?: string;
  chatUser?: {
    id: string;
    name: string;
    image?: string | null;
  };
}

const ChatArea = ({ chatId, currentUserId, chatUser }: Props) => {
  // Custom call UI state
  const [isCalling, setIsCalling] = useState(false); // true for caller while waiting for answer
  const [isRinging, setIsRinging] = useState(false); // true for receiver when incoming call
  const [ringtoneAudio, setRingtoneAudio] = useState<HTMLAudioElement | null>(null);
    // Stream Video state
    const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
    const [call, setCall] = useState<Call | null>(null);
    const [callActive, setCallActive] = useState(false);

    // Fetch Stream token and initialize client
    useEffect(() => {
      if (!currentUserId || !chatUser) return;
      let client: StreamVideoClient;
      fetchStreamToken(currentUserId).then(({ token, apiKey }) => {
        client = new StreamVideoClient({
          apiKey,
          user: { id: currentUserId, name: currentUserId },
          token,
        });
        setStreamClient(client);
      });
      return () => {
        if (client) client.disconnectUser?.();
      };
    }, [currentUserId, chatUser]);

    // Helper to generate a short, deterministic call ID for a user pair
    function getCallId(userA: string, userB: string) {
      // Sort, join, and hash to 32 chars (SHA-256, hex, first 32 chars)
      const raw = [userA, userB].sort().join(":");
      // Simple hash (FNV-1a, 32-bit, hex) for brevity and determinism
      let hash = 2166136261;
      for (let i = 0; i < raw.length; i++) {
        hash ^= raw.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      return 'call_' + Math.abs(hash >>> 0).toString(16);
    }

  // Helper to request camera/mic permissions
  const requestMediaPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return true;
    } catch (err) {
      alert("Camera and microphone access is required for calls. Please allow permissions in your browser settings.");
      return false;
    }
  };

  // Start a call with chatUser
  const handleStartCall = async () => {
    if (!streamClient || !chatUser || !currentUserId) return;
    const hasPerm = await requestMediaPermissions();
    if (!hasPerm) return;
    const callId = getCallId(currentUserId, chatUser.id);
    const call = streamClient.call("default", callId);
    setCall(call);
    setCallActive(true);
    setIsCalling(true);
    await call.join({ create: true });
  };

  // End call handler
  const handleEndCall = () => {
    setCallActive(false);
    setCall(null);
    setIsCalling(false);
    setIsRinging(false);
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }
  };

  // Listen for Stream call state changes to show custom UI and play ringtone
  useEffect(() => {
    if (!call) return;
    // Handler for call state
    const handleStateChanged = (event: any) => {
      // If I'm the caller and call is ringing, show 'Calling...'
      if (call.state.callingState === "ringing" && call.state.localParticipant) {
        setIsCalling(true);
      } else if (call.state.callingState === "joined") {
        setIsCalling(false);
        setIsRinging(false);
        if (ringtoneAudio) {
          ringtoneAudio.pause();
          ringtoneAudio.currentTime = 0;
        }
      }
    };
    // Handler for incoming call (receiver)
    const handleRinging = () => {
      setIsRinging(true);
      // Play ringtone
      if (!ringtoneAudio) {
        const audio = new Audio("/ringtone.mp3");
        audio.loop = true;
        setRingtoneAudio(audio);
        audio.play();
      } else {
        ringtoneAudio.currentTime = 0;
        ringtoneAudio.play();
      }
    };
    // Use correct event names as per Stream SDK types
    call.on("call.state_changed" as any, handleStateChanged);
    call.on("call.ring" as any, handleRinging);
    return () => {
      call.off("call.state_changed" as any, handleStateChanged);
      call.off("call.ring" as any, handleRinging);
    };
    // eslint-disable-next-line
  }, [call, ringtoneAudio]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPreviewEmoji, setShowPreviewEmoji] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const previewEmojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const socket = useSocket();
  const router = useRouter();


  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Document state
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docCaption, setDocCaption] = useState("");
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [showDocEmoji, setShowDocEmoji] = useState(false);
  const docEmojiRef = useRef<HTMLDivElement>(null);
  const docCaptionRef = useRef<HTMLInputElement>(null);

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoCaption, setVideoCaption] = useState("");
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showVideoEmoji, setShowVideoEmoji] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoEmojiRef = useRef<HTMLDivElement>(null);
  const videoCaptionRef = useRef<HTMLInputElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (
        previewEmojiRef.current &&
        !previewEmojiRef.current.contains(e.target as Node)
      ) {
        setShowPreviewEmoji(false);
      }
      if (
        docEmojiRef.current &&
        !docEmojiRef.current.contains(e.target as Node)
      ) {
        setShowDocEmoji(false);
      }
      if (
        videoEmojiRef.current &&
        !videoEmojiRef.current.contains(e.target as Node)
      ) {
        setShowVideoEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load existing messages
  useEffect(() => {
    if (!chatId) return;
    getMessages(chatId).then((msgs) => {
      setMessages(
        msgs.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })),
      );
    });
  }, [chatId]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !chatId) return;
    const handler = (msg: Message) => {
      const isRelevant =
        (msg.senderId === chatId && msg.receiverId === currentUserId) ||
        (msg.senderId === currentUserId && msg.receiverId === chatId);
      if (isRelevant) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, createdAt: new Date(msg.createdAt) }];
        });
      }
    };
    socket.on("new-message", handler);
    return () => {
      socket.off("new-message", handler);
    };
  }, [socket, chatId, currentUserId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!chatId || !chatUser) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-zinc-500 text-2xl">
          Select a chat to start messaging
        </div>
      </div>
    );
  }

  // Handle image file selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setCaption("");
    // Reset file input so same file can be re-selected
    e.target.value = "";
  };

  // Cancel image preview
  const cancelImagePreview = () => {
    setImagePreview(null);
    setImageFile(null);
    setCaption("");
    setShowPreviewEmoji(false);
  };

  // Send image with caption
  const handleSendImage = async () => {
    if (!imageFile || sending) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const uploadedUrl = await uploadImage(formData);

      const msg = await sendMessage(chatId, caption || "", uploadedUrl);

      socket?.emit("send-message", {
        receiverId: chatId,
        message: msg,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, createdAt: new Date(msg.createdAt) }];
      });

      cancelImagePreview();
    } catch (err) {
      console.error("Failed to send image:", err);
    } finally {
      setSending(false);
    }
  };

  // Send text message
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setInput("");

    try {
      const msg = await sendMessage(chatId, text);

      socket?.emit("send-message", {
        receiverId: chatId,
        message: msg,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, createdAt: new Date(msg.createdAt) }];
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePreviewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendImage();
    }
  };

  // Document functions
  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    setDocCaption("");
    setShowDocPreview(true);
    e.target.value = "";
  };

  const cancelDocPreview = () => {
    setDocFile(null);
    setDocCaption("");
    setShowDocPreview(false);
    setShowDocEmoji(false);
  };

  const handleSendDocument = async () => {
    if (!docFile || sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("document", docFile);
      const uploadedUrl = await uploadDocument(formData);

      const msg = await sendMessage(
        chatId,
        docCaption || "",
        undefined,
        undefined,
        uploadedUrl,
        docFile.name
      );

      socket?.emit("send-message", {
        receiverId: chatId,
        message: msg,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, createdAt: new Date(msg.createdAt) }];
      });

      cancelDocPreview();
    } catch (err) {
      console.error("Failed to send document:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDocKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendDocument();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Video functions
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setVideoCaption("");
    setShowVideoPreview(true);
    e.target.value = "";
  };

  const cancelVideoPreview = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setVideoCaption("");
    setShowVideoPreview(false);
    setShowVideoEmoji(false);
  };

  const handleSendVideo = async () => {
    if (!videoFile || sending) return;
    setSending(true);
    try {
      // Get signed upload params from server
      const signRes = await fetch("/api/upload-video");
      if (!signRes.ok) throw new Error("Failed to get upload signature");
      const { signature, timestamp, cloudName, apiKey } = await signRes.json();

      // Upload directly to Cloudinary from the browser
      const formData = new FormData();
      formData.append("file", videoFile);
      formData.append("signature", signature);
      formData.append("timestamp", String(timestamp));
      formData.append("api_key", apiKey);
      formData.append("folder", "messenger/videos");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error("Cloudinary upload error:", errText);
        throw new Error("Video upload failed");
      }
      const { secure_url: uploadedUrl } = await uploadRes.json();

      const msg = await sendMessage(
        chatId,
        videoCaption || "",
        undefined,
        undefined,
        undefined,
        undefined,
        uploadedUrl
      );

      socket?.emit("send-message", {
        receiverId: chatId,
        message: msg,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, createdAt: new Date(msg.createdAt) }];
      });

      cancelVideoPreview();
    } catch (err) {
      console.error("Failed to send video:", err);
    } finally {
      setSending(false);
    }
  };

  const handleVideoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendVideo();
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream
        ?.getTracks()
        .forEach((t) => t.stop());
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingTime(0);
  };

  const handleSendAudio = async () => {
    if (!audioBlob || sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice-message.webm");
      const uploadedUrl = await uploadAudio(formData);

      const msg = await sendMessage(chatId, "", undefined, uploadedUrl);

      socket?.emit("send-message", {
        receiverId: chatId,
        message: msg,
      });

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, { ...msg, createdAt: new Date(msg.createdAt) }];
      });

      setAudioBlob(null);
      setAudioPreviewUrl(null);
      setRecordingTime(0);
    } catch (err) {
      console.error("Failed to send voice message:", err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Custom Calling Modal for Caller */}
      {isCalling && !isRinging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center">
            <div className="text-2xl font-semibold mb-4">Calling {chatUser?.name}...</div>
            <Button onClick={handleEndCall} className="mt-2">Cancel</Button>
          </div>
        </div>
      )}
      {/* Custom Incoming Call Modal for Receiver */}
      {isRinging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center">
            <div className="text-2xl font-semibold mb-4">Incoming call from {chatUser?.name}</div>
            <div className="flex gap-4">
              <Button onClick={async () => {
                setIsRinging(false);
                if (ringtoneAudio) { ringtoneAudio.pause(); ringtoneAudio.currentTime = 0; }
                if (call) {
                  const hasPerm = await requestMediaPermissions();
                  if (hasPerm) await call.join();
                }
              }} className="bg-green-500 hover:bg-green-600">Accept</Button>
              <Button onClick={handleEndCall} className="bg-red-500 hover:bg-red-600">Reject</Button>
            </div>
          </div>
        </div>
      )}
      {/* HEADER */}
      <div className="h-16 border-b border-zinc-800 flex items-center px-6 gap-3 shrink-0">
        {/* Stream Video Call UI (modal) */}
        {callActive && call && streamClient && (
          <StreamTheme>
            <StreamVideoProvider client={streamClient}>
              <StreamCall call={call}>
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
                  <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center">
                    <CallControls onLeave={handleEndCall} />
                  </div>
                </div>
              </StreamCall>
            </StreamVideoProvider>
          </StreamTheme>
        )}
        <Avatar className="h-10 w-10">
          <AvatarImage src={chatUser.image ?? undefined} />
          <AvatarFallback>{chatUser.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-medium">{chatUser.name}</div>
          <div className="text-xs text-zinc-500">Chat</div>
        </div>
        {/* Stream Call Button (right side, before close) */}
        {streamClient && chatUser && (
          <Button
            variant="ghost"
            size="icon"
            className="text-green-500 hover:text-green-700"
            onClick={handleStartCall}
          >
            <Video className="h-5 w-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-white"
          onClick={() => router.push("/")}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-600 text-sm">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl max-w-xs overflow-hidden ${
                  isOwn
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-zinc-800 text-zinc-100 rounded-tl-sm"
                }`}
              >
                {/* Image */}
                {msg.imageUrl && (
                  <div className="relative w-64 h-48">
                    <Image
                      src={msg.imageUrl}
                      alt="Shared image"
                      fill
                      className="object-cover"
                      sizes="256px"
                    />
                  </div>
                )}
                {/* Audio */}
                {msg.audioUrl && (
                  <div className="px-3 pt-3">
                    <audio
                      controls
                      src={msg.audioUrl}
                      className="h-8 max-w-55"
                      style={{ filter: "invert(1)" }}
                    />
                  </div>
                )}
                {/* Video */}
                {msg.videoUrl && (
                  <div className="relative w-64">
                    <video
                      src={msg.videoUrl}
                      controls
                      className="w-full rounded-t-sm"
                      preload="metadata"
                    />
                  </div>
                )}
                {/* Document */}
                {msg.documentUrl && (
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                      isOwn ? "hover:bg-blue-700/50" : "hover:bg-zinc-700/50"
                    } transition`}
                    onClick={async () => {
                      try {
                        const res = await fetch(msg.documentUrl!);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = msg.documentName || "document";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error("Download failed:", err);
                        window.open(msg.documentUrl!, "_blank");
                      }
                    }}
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isOwn ? "bg-blue-500/30" : "bg-zinc-600/50"
                    }`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {msg.documentName || "Document"}
                      </p>
                      <p className={`text-[11px] ${
                        isOwn ? "text-blue-200" : "text-zinc-400"
                      }`}>Document</p>
                    </div>
                    <Download className="h-4 w-4 shrink-0 opacity-60" />
                  </div>
                )}
                {/* Text + Time */}
                <div className="px-4 py-2">
                  {msg.content && (
                    <p className="text-sm wrap-break-word">{msg.content}</p>
                  )}
                  <p
                    className={`text-[10px] mt-1 ${isOwn ? "text-blue-200" : "text-zinc-500"}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* IMAGE PREVIEW OVERLAY (WhatsApp-style) */}
      {imagePreview && (
        <div className="absolute inset-0 z-50 bg-zinc-950/95 flex flex-col">
          {/* Preview Header */}
          <div className="h-14 flex items-center px-4 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelImagePreview}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Preview Image */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <div className="relative max-w-full max-h-full">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-[60vh] max-w-full rounded-lg object-contain"
              />
            </div>
          </div>

          {/* Preview Input Bar */}
          <div className="p-4 shrink-0">
            <div className="relative flex items-center gap-3">
              {/* Emoji for preview */}
              <div ref={previewEmojiRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-zinc-400 hover:text-zinc-100"
                  onClick={() => setShowPreviewEmoji((prev) => !prev)}
                >
                  <Smile className="h-5 w-5" />
                </Button>

                {showPreviewEmoji && (
                  <div className="absolute bottom-14 left-0 z-50">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: { native: string }) => {
                        setCaption((prev) => prev + emoji.native);
                        captionRef.current?.focus();
                      }}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="search"
                    />
                  </div>
                )}
              </div>

              <Input
                ref={captionRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={handlePreviewKeyDown}
                placeholder="Add a caption..."
                className="flex-1 bg-zinc-800 border-zinc-700 rounded-full px-4 py-2"
                disabled={sending}
              />

              <Button
                onClick={handleSendImage}
                disabled={sending}
                size="icon"
                className="rounded-full bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW OVERLAY */}
      {showVideoPreview && videoPreview && (
        <div className="absolute inset-0 z-50 bg-zinc-950/95 flex flex-col">
          {/* Preview Header */}
          <div className="h-14 flex items-center px-4 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelVideoPreview}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Preview Video */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <video
              src={videoPreview}
              controls
              className="max-h-[60vh] max-w-full rounded-lg"
            />
          </div>

          {/* Preview Input Bar */}
          <div className="p-4 shrink-0">
            <div className="relative flex items-center gap-3">
              {/* Emoji for video preview */}
              <div ref={videoEmojiRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-zinc-400 hover:text-zinc-100"
                  onClick={() => setShowVideoEmoji((prev) => !prev)}
                >
                  <Smile className="h-5 w-5" />
                </Button>

                {showVideoEmoji && (
                  <div className="absolute bottom-14 left-0 z-50">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: { native: string }) => {
                        setVideoCaption((prev) => prev + emoji.native);
                        videoCaptionRef.current?.focus();
                      }}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="search"
                    />
                  </div>
                )}
              </div>

              <Input
                ref={videoCaptionRef}
                value={videoCaption}
                onChange={(e) => setVideoCaption(e.target.value)}
                onKeyDown={handleVideoKeyDown}
                placeholder="Add a caption..."
                className="flex-1 bg-zinc-800 border-zinc-700 rounded-full px-4 py-2"
                disabled={sending}
              />

              <Button
                onClick={handleSendVideo}
                disabled={sending}
                size="icon"
                className="rounded-full bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW OVERLAY */}
      {showDocPreview && docFile && (
        <div className="absolute inset-0 z-50 bg-zinc-950/95 flex flex-col">
          {/* Preview Header */}
          <div className="h-14 flex items-center px-4 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelDocPreview}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
            <div className="ml-3">
              <p className="text-sm font-medium text-zinc-200 truncate max-w-md">
                {docFile.name}
              </p>
              <p className="text-xs text-zinc-500">
                {formatFileSize(docFile.size)}
              </p>
            </div>
          </div>

          {/* Document Preview Area */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            <div className="bg-zinc-800 rounded-2xl p-10 flex flex-col items-center gap-4 max-w-sm">
              <div className="h-20 w-20 rounded-xl bg-zinc-700 flex items-center justify-center">
                <FileText className="h-10 w-10 text-blue-400" />
              </div>
              <p className="text-zinc-200 font-medium text-center truncate max-w-64">
                {docFile.name}
              </p>
              <p className="text-zinc-500 text-sm">
                {formatFileSize(docFile.size)}
              </p>
            </div>
          </div>

          {/* Preview Input Bar */}
          <div className="p-4 shrink-0">
            <div className="relative flex items-center gap-3">
              {/* Emoji for doc preview */}
              <div ref={docEmojiRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-zinc-400 hover:text-zinc-100"
                  onClick={() => setShowDocEmoji((prev) => !prev)}
                >
                  <Smile className="h-5 w-5" />
                </Button>

                {showDocEmoji && (
                  <div className="absolute bottom-14 left-0 z-50">
                    <Picker
                      data={data}
                      onEmojiSelect={(emoji: { native: string }) => {
                        setDocCaption((prev) => prev + emoji.native);
                        docCaptionRef.current?.focus();
                      }}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="search"
                    />
                  </div>
                )}
              </div>

              <Input
                ref={docCaptionRef}
                value={docCaption}
                onChange={(e) => setDocCaption(e.target.value)}
                onKeyDown={handleDocKeyDown}
                placeholder="Add a caption..."
                className="flex-1 bg-zinc-800 border-zinc-700 rounded-full px-4 py-2"
                disabled={sending}
              />

              <Button
                onClick={handleSendDocument}
                disabled={sending}
                size="icon"
                className="rounded-full bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* INPUT BAR */}
      <div className="border-t border-zinc-800 p-4 shrink-0">
        {/* Voice Recording UI */}
        {(isRecording || audioPreviewUrl) ? (
          <div className="flex items-center gap-3">
            {/* Delete recording */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-red-400 hover:text-red-300"
              onClick={cancelRecording}
            >
              <Trash2 className="h-5 w-5" />
            </Button>

            {isRecording ? (
              /* Active recording indicator */
              <div className="flex-1 flex items-center gap-3 bg-zinc-800 rounded-full px-4 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-zinc-300 font-mono">
                  {formatTime(recordingTime)}
                </span>
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-0.75 bg-red-400 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 16 + 6}px`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Audio preview after stopping */
              <div className="flex-1 flex items-center gap-3 bg-zinc-800 rounded-full px-4 py-2">
                <audio
                  controls
                  src={audioPreviewUrl!}
                  className="h-8 flex-1"
                  style={{ filter: "invert(1)" }}
                />
                <span className="text-xs text-zinc-400 font-mono">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}

            {isRecording ? (
              /* Stop button */
              <Button
                type="button"
                onClick={stopRecording}
                size="icon"
                className="rounded-full bg-red-600 hover:bg-red-700 shrink-0"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              /* Send voice message */
              <Button
                onClick={handleSendAudio}
                disabled={sending}
                size="icon"
                className="rounded-full bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          /* Normal input bar */
          <div className="relative flex items-center gap-3">
          {/* Emoji Toggle */}
          <div ref={emojiRef}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-zinc-400 hover:text-zinc-100"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
            >
              <Smile className="h-5 w-5" />
            </Button>

            {showEmojiPicker && (
              <div className="absolute bottom-14 left-0 z-50">
                <Picker
                  data={data}
                  onEmojiSelect={(emoji: { native: string }) => {
                    setInput((prev) => prev + emoji.native);
                    inputRef.current?.focus();
                  }}
                  theme="dark"
                  previewPosition="none"
                  skinTonePosition="search"
                />
              </div>
            )}
          </div>

          {/* Image Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-zinc-400 hover:text-zinc-100"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Video Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-zinc-400 hover:text-zinc-100"
            onClick={() => videoInputRef.current?.click()}
          >
            <Video className="h-5 w-5" />
          </Button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />

          {/* Document Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-zinc-400 hover:text-zinc-100"
            onClick={() => docInputRef.current?.click()}
          >
            <FileText className="h-5 w-5" />
          </Button>
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            className="hidden"
            onChange={handleDocSelect}
          />

          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-800 border-zinc-700 rounded-full px-4 py-2"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            size="icon"
            className="rounded-full bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>

          {/* Mic Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-zinc-400 hover:text-zinc-100"
            onClick={startRecording}
          >
            <Mic className="h-5 w-5" />
          </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
