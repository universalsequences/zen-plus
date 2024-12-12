import { createContext, useContext, useState, ReactNode } from "react";

interface GlossaryContextType {
  selectedTerm: string | null;
  setSelectedTerm: (term: string | null) => void;
}

const GlossaryContext = createContext<GlossaryContextType | undefined>(undefined);

export const useGlossary = () => {
  const context = useContext(GlossaryContext);
  if (!context) {
    throw new Error("useGlossary must be used within a GlossaryProvider");
  }
  return context;
};

interface GlossaryProviderProps {
  children: ReactNode;
}

export const GlossaryProvider = ({ children }: GlossaryProviderProps) => {
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  return (
    <GlossaryContext.Provider value={{ selectedTerm, setSelectedTerm }}>
      {children}
    </GlossaryContext.Provider>
  );
};
