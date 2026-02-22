import React, { useEffect } from "react";

type IncomingCallProps = {
  incoming: { from: string; name: string; avatar: string };
  onAccept: () => void;
  onDecline: () => void;
};

const IncomingCall: React.FC<IncomingCallProps> = ({ incoming, onAccept, onDecline }) => {
  useEffect(() => {
    const audio = new Audio("/ringtone.mp3");
    audio.loop = true;
    audio.play();
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  if (!incoming) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center">
        <img src={incoming.avatar} alt="avatar" className="w-16 h-16 rounded-full mb-2" />
        <div className="font-bold text-lg mb-1">{incoming.name} is calling...</div>
        <div className="flex gap-4 mt-2">
          <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={onAccept}>Accept</button>
          <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={onDecline}>Decline</button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;
