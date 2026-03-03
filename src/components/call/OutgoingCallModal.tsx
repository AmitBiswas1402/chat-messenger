"use client";

import { useCallStore } from "@/store/useCallStore";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, X } from "lucide-react";

interface OutgoingCallModalProps {
  onCancel: () => void;
}

export function OutgoingCallModal({ onCancel }: OutgoingCallModalProps) {
  const { receiverName, receiverAvatar } = useCallStore();

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Pulsing ring effect */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
        <div className="absolute -inset-3 rounded-full bg-green-500/10 animate-pulse" />
        <Avatar className="h-24 w-24 relative z-10 ring-4 ring-green-500/30">
          <AvatarImage src={receiverAvatar ?? undefined} />
          <AvatarFallback className="text-2xl bg-zinc-800 text-white">
            {receiverName?.charAt(0)?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Caller info */}
      <h2 className="text-xl font-semibold text-white mb-2">
        {receiverName ?? "Unknown"}
      </h2>
      <p className="text-zinc-400 text-sm mb-1">Voice Call</p>
      <div className="flex items-center gap-2 text-zinc-500 text-sm mb-12">
        <Phone className="h-4 w-4 animate-pulse text-green-400" />
        <span>Calling...</span>
      </div>

      {/* Cancel button */}
      <Button
        onClick={onCancel}
        variant="destructive"
        size="lg"
        className="rounded-full h-16 w-16 p-0 bg-red-600 hover:bg-red-700"
      >
        <X className="h-7 w-7" />
      </Button>
      <span className="text-zinc-500 text-xs mt-3">Cancel</span>
    </div>
  );
}
