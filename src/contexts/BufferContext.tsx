import React, { createContext, useContext, useState } from "react";
import { type Buffer } from "@/lib/tiling/types";

interface BufferContextType {
  currentBuffer: Buffer | null;
  commandText: string;
  setCommandText: React.Dispatch<React.SetStateAction<string>>;
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

  return (
    <BufferContext.Provider
      value={{
        currentBuffer: buffer,
        commandText,
        setCommandText,
      }}
    >
      {children}
    </BufferContext.Provider>
  );
};