import { GenericStepData } from "@/lib/nodes/definitions/core/zequencer/types";
import { createContext, useEffect, useCallback, useState, useContext } from "react";
import { useSelection } from "./SelectionContext";
import { usePatches } from "./PatchesContext";
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
  const { patches } = usePatches();

  useEffect(() => {
    if (selectedNodes.every((x) => {
      const name = (x as ObjectNode).name;
      return !name?.includes("zequencer") && !name?.includes("attrui");
    })) {
      setSelectedSteps(null);
    }
  }, [selectedNodes]);

  // Send worker message when selectedSteps changes
  useEffect(() => {
    const stepIds = selectedSteps?.map(step => step.id) || [];
    // Use any available patch to send the worker message
    const patch = Object.values(patches)[0];
    if (patch?.sendWorkerMessage) {
      patch.sendWorkerMessage({
        type: "setSelectedSteps",
        body: {
          stepIds
        }
      });
    }
  }, [selectedSteps, patches]);

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
