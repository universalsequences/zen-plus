import React, { createContext, useState, useContext, useRef, useEffect } from "react";
import { type KeyCommand, useGlobalKeyBindings } from "@/hooks/useGlobalKeyBindings";

interface IGlobalKeyBindings {
  keyCommand: KeyCommand | null;
  setKeyCommand: React.Dispatch<React.SetStateAction<KeyCommand | null>>;
}
const GlobalKeyBindingsContext = createContext<IGlobalKeyBindings | undefined>(undefined);

export const useGlobalKeyBindingsContext = (): IGlobalKeyBindings => {
  const context = useContext(GlobalKeyBindingsContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

/**
 * Component that wraps children and provides global keyboard bindings
 * This should be placed below PatchesContext in the component tree
 */
const GlobalKeyBindingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize the global key bindings
  const { keyCommand, setKeyCommand } = useGlobalKeyBindings();

  // This component doesn't render anything itself, just enables the keyboard shortcuts
  return (
    <GlobalKeyBindingsContext.Provider
      value={{
        keyCommand,
        setKeyCommand,
      }}
    >
      {children}
    </GlobalKeyBindingsContext.Provider>
  );
};

export default GlobalKeyBindingsProvider;
