import { createContext, useEffect, useCallback, useState, useContext } from "react";
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/db/firebase";

interface IAudioContextContext {
  audioContext: AudioContext;
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
  const [audioContext, setAudioContext] = useState<AudioContext>(
    new AudioContext({ sampleRate: 44100 }),
  );
  return <AudioContextContext.Provider
        value={
  {
    audioContext;
  }
};
>
{
  children;
}
</AudioContextContext.Provider>

}
