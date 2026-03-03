"use client";

import { useEffect, useState } from "react";
import { useCallStore } from "@/store/useCallStore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff } from "lucide-react";

interface InCallUIProps {
  onEndCall: () => void;
}

export function InCallUI({ onEndCall }: InCallUIProps) {
  const {
    callerId,
    receiverId,
    callerName,
    callerAvatar,
    receiverName,
    receiverAvatar,
    isIncoming,
    callStartTime,
    isMuted,
    toggleMute,
  } = useCallStore();

  const [duration, setDuration] = useState("00:00");

  // The "other" person's name/avatar depends on whether call is incoming or outgoing
  const otherName = isIncoming ? callerName : receiverName;
  const otherAvatar = isIncoming ? callerAvatar : receiverAvatar;

  // Call duration timer
  useEffect(() => {
    if (!callStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const mins = Math.floor(elapsed / 60)
        .toString()
        .padStart(2, "0");
      const secs = (elapsed % 60).toString().padStart(2, "0");
      setDuration(`${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Connected indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-green-400 text-sm font-medium">Connected</span>
      </div>

      {/* Avatar */}
      <Avatar className="h-24 w-24 mb-6 ring-4 ring-green-500/20">
        <AvatarImage src={otherAvatar ?? undefined} />
        <AvatarFallback className="text-2xl bg-zinc-800 text-white">
          {otherName?.charAt(0)?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <h2 className="text-xl font-semibold text-white mb-1">
        {otherName ?? "Unknown"}
      </h2>

      {/* Duration */}
      <p className="text-zinc-400 text-lg font-mono mb-12">{duration}</p>

      {/* Audio wave indicator */}
      <div className="flex items-end gap-1 mb-8 h-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-1 bg-green-500 rounded-full animate-pulse"
            style={{
              height: `${8 + Math.random() * 16}px`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: "0.8s",
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-8">
        {/* Mute toggle */}
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={toggleMute}
            variant="outline"
            size="lg"
            className={`rounded-full h-14 w-14 p-0 border-zinc-700 ${
              isMuted
                ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                : "bg-zinc-800 text-white hover:bg-zinc-700"
            }`}
          >
            {isMuted ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          <span className="text-zinc-500 text-xs">
            {isMuted ? "Unmute" : "Mute"}
          </span>
        </div>

        {/* End call */}
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={onEndCall}
            variant="destructive"
            size="lg"
            className="rounded-full h-16 w-16 p-0 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
          <span className="text-zinc-500 text-xs">End</span>
        </div>
      </div>
    </div>
  );
}
