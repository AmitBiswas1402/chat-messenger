"use client";

import { useCallStore } from "@/store/useCallStore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff } from "lucide-react";

interface IncomingCallModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({ onAccept, onDecline }: IncomingCallModalProps) {
  const { callerName, callerAvatar } = useCallStore();

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Avatar with ring animation */}
      <div className="relative mb-8">
        <div className="absolute -inset-2 rounded-full bg-green-500/20 animate-pulse" />
        <Avatar className="h-24 w-24 relative z-10 ring-4 ring-green-500/30 animate-bounce"
          style={{ animationDuration: "2s" }}
        >
          <AvatarImage src={callerAvatar ?? undefined} />
          <AvatarFallback className="text-2xl bg-zinc-800 text-white">
            {callerName?.charAt(0)?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Caller info */}
      <h2 className="text-xl font-semibold text-white mb-2">
        {callerName ?? "Unknown"}
      </h2>
      <p className="text-zinc-400 text-sm mb-12">Incoming Voice Call...</p>

      {/* Accept / Decline buttons */}
      <div className="flex items-center gap-12">
        {/* Decline */}
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={onDecline}
            variant="destructive"
            size="lg"
            className="rounded-full h-16 w-16 p-0 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
          <span className="text-zinc-500 text-xs">Decline</span>
        </div>

        {/* Accept */}
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={onAccept}
            size="lg"
            className="rounded-full h-16 w-16 p-0 bg-green-600 hover:bg-green-700"
          >
            <Phone className="h-7 w-7 text-white" />
          </Button>
          <span className="text-zinc-500 text-xs">Accept</span>
        </div>
      </div>
    </div>
  );
}
