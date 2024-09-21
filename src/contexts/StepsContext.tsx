import { GenericStepData } from "@/lib/nodes/definitions/core/zequencer/types";
import { createContext, useEffect, useCallback, useState, useContext } from "react";
import { useSelection } from "./SelectionContext";
import { ObjectNode } from "@/lib/nodes/types";

interface IStepsContext {
  selectedSteps: GenericStepData[] | null;
  setSelectedSteps: React.Dispatch<React.SetStateAction<GenericStepData[] | null>>;
}

const StepsContext = createContext<IStepsContext | undefined>(undefined);

export const useStepsContext = (): IStepsContext => {
  const context = useContext(StepsContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const StepsProvider: React.FC<Props> = ({ children }) => {
  const [selectedSteps, setSelectedSteps] = useState<GenericStepData[] | null>(null);
  const { selectedNodes } = useSelection();

  useEffect(() => {
    if (selectedNodes.every((x) => {
      const name = (x as ObjectNode).name;
      return !name?.includes("zequencer") && !name?.includes("attrui");
    })) {
      setSelectedSteps(null);
    }
  }, [selectedNodes]);

  return (
    <StepsContext.Provider
      value={{
        selectedSteps,
        setSelectedSteps,
      }}
    >
      {children}
    </StepsContext.Provider>
  );
};
