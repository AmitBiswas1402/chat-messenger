import React, { useEffect, useRef } from "react";

type VideoCallProps = {
  stream: MediaStream | null;
  onEnd: () => void;
};

const VideoCall: React.FC<VideoCallProps> = ({ stream, onEnd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center">
        <video ref={videoRef} autoPlay playsInline className="w-96 h-72 rounded mb-4" />
        <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={onEnd}>End Call</button>
      </div>
    </div>
  );
};

export default VideoCall;
