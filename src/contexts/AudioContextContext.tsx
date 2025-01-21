import React, { createContext, useEffect, useCallback, useState, useContext } from "react";

interface IAudioContextContext {
  audioContext: AudioContext | null;
}

const AudioContextContext = createContext<IAudioContextContext | undefined>(undefined);

export const useAudioContext = (): IAudioContextContext => {
  const context = useContext(AudioContextContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const AudioContextProvider: React.FC<Props> = ({ children }) => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    setAudioContext(
      new AudioContext({
        sampleRate: 44100,
        channelCount: 10,
        channelCountMode: "explicit",
      }),
    );
  }, []);

  useEffect(() => {
    if (!audioContext) {
      return;
    }
    const handleInteraction = async () => {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    };

    // Add event listeners for common user interactions
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, handleInteraction);
    });

    // Cleanup event listeners
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [audioContext]);

  return (
    <AudioContextContext.Provider
      value={{
        audioContext,
      }}
    >
      {children}
    </AudioContextContext.Provider>
  );
};
