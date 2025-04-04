import React, { createContext, useContext, useState, useRef } from "react";
import { type Buffer, BufferType } from "@/lib/tiling/types";

interface BufferContextType {
  currentBuffer: Buffer | null;
  commandText: string;
  setCommandText: React.Dispatch<React.SetStateAction<string>>;
  containerRef: React.RefObject<HTMLDivElement> | null;
  setContainerRef: (ref: React.RefObject<HTMLDivElement>) => void;
}

const BufferContext = createContext<BufferContextType | undefined>(undefined);

export const useBuffer = () => {
  const context = useContext(BufferContext);
  if (context === undefined) {
    throw new Error("useBuffer must be used within a BufferProvider");
  }
  return context;
};

export const BufferProvider: React.FC<{ 
  children: React.ReactNode, 
  buffer: Buffer 
}> = ({
  children,
  buffer
}) => {
  const [commandText, setCommandText] = useState<string>("");
  const [containerRef, setContainerRefState] = useState<React.RefObject<HTMLDivElement> | null>(null);
  
  const setContainerRef = (ref: React.RefObject<HTMLDivElement>) => {
    if (buffer.type === BufferType.Object) {
      setContainerRefState(ref);
    }
  };

  return (
    <BufferContext.Provider
      value={{
        currentBuffer: buffer,
        commandText,
        setCommandText,
        containerRef,
        setContainerRef,
      }}
    >
      {children}
    </BufferContext.Provider>
  );
};