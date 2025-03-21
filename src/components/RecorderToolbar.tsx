import { PlayIcon } from "@radix-ui/react-icons";
import React, { useCallback, useEffect, useState } from "react";
import type { Patch } from "@/lib/nodes/types";

interface Props {
  patch: Patch;
}

export const RecorderToolbar = ({ patch }: Props) => {
  const [recording, setRecording] = useState(patch.isRecording);
  const [startTime, setStartTime] = useState<Date | null>(patch.recordingStartedAt || null);
  const [elapsedTime, setElapsedTime] = useState<number>(
    patch.recordingStartedAt ? new Date().getTime() - patch.recordingStartedAt.getTime() : 0,
  );

  // Function to start or stop recording
  const toggleRecording = useCallback(() => {
    if (recording) {
      patch.stopRecording();
      patch.getBuffer();
      setStartTime(null); // Reset start time when stopping recording
    } else {
      patch.startRecording();
      setStartTime(new Date()); // Set start time when starting recording
    }
    setRecording(!recording); // Toggle recording state
  }, [recording, patch]);

  // Update elapsed time every second when recording is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (recording) {
      interval = setInterval(() => {
        if (startTime) {
          const now = new Date();
          const elapsed = now.getTime() - startTime.getTime();
          setElapsedTime(elapsed);
        }
      }, 1000); // Update every second
    } else {
      setElapsedTime(0); // Reset elapsed time when not recording
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recording, startTime]);

  // Format elapsed time for display
  const formatElapsedTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  return (
    <div className="flex items-center">
      <div
        onClick={toggleRecording}
        className={`ml-3 w-4 h-4 rounded-full ${recording ? "bg-red-500" : ""} border-zinc-100 border-2 border cursor-pointer`}
      ></div>
      <div className="w-8">
        {recording ? (
          <span className="text-white text-xs ml-1">{formatElapsedTime(elapsedTime)}</span>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};
