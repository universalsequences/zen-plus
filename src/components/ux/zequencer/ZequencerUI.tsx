import { usePosition } from "@/contexts/PositionContext";
import type { Selection } from "./types";
import type { ObjectNode } from "@/lib/nodes/types";
import type React from "react";
import { Step } from "./Step";
import { useAttributedByNameNode } from "@/hooks/useAttributedByNameNode";
import { useSelection } from "@/contexts/SelectionContext";
import { useValue } from "@/contexts/ValueContext";
import { useCallback, useEffect, useState } from "react";
import type { GenericStepData } from "@/lib/nodes/definitions/core/zequencer/types";

export const ZequencerUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { sizeIndex } = usePosition();
  const { width, height } = objectNode.size || { width: 200, height: 200 };

  const [selectedSteps, setSelectedSteps] = useState<GenericStepData[] | null>(null);

  const [selection, setSelection] = useState<Selection | null>(null);

  const attributes = objectNode.attributes;
  const { attributesIndex } = useSelection();

  const { setNodeToWatch, value } = useValue();

  const currentStepNumber = Array.isArray(value) ? (value[0] as number) : 0;

  const { node } = useAttributedByNameNode(objectNode, attributes.name as string);

  const { presentationMode } = usePosition();

  useEffect(() => {
    if (node) {
      // this zequencer.ui is concerned with a zequencer.core node
      // so we must watch it for changes in step values
      setNodeToWatch(node);
      setTimeout(() => {
        if (node) {
          setNodeToWatch(node);
        }
      }, 500);
    }
  }, [node, setNodeToWatch, presentationMode]);

  const [stepNumberMoving, setStepNumberMoving] = useState<number | null>(null);
  const [stepMoved, setStepMoved] = useState(false);

  const onMouseUp = useCallback(() => {
    if (selection && node?.steps) {
      const steps = node.steps.filter(
        (x, stepNumber) =>
          x.on && stepNumber >= selection.fromStepNumber && stepNumber <= selection.toStepNumber,
      );
      setSelectedSteps(steps);
    }
    setStepEditingDuration(null);
    setStepNumberMoving(null);
    setSelection(null);
    setStepMoved(false);
  }, [selection, node]);

  useEffect(() => {
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [onMouseUp]);

  const rows: GenericStepData[][] = [];
  if (node?.steps) {
    for (let i = 0; i < node.steps.length; i += 16) {
      rows.push(node.steps.slice(i, i + 16));
    }
  }

  const [durationSteps, setDurationSteps] = useState<boolean[]>([]);
  const [stepEditingDuration, setStepEditingDuration] = useState<number | null>(null);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedSteps || !node?.steps) {
        return;
      }
      if (e.key === "Backspace") {
        const stepsToDelete = [];
        for (const step of selectedSteps) {
          stepsToDelete.push(node.steps.indexOf(step));
        }
        node.receive(node.inlets[0], {
          stepsToDelete,
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const stepNumbers = selectedSteps.map((x) => x.stepNumber);
        const fromStepNumber = Math.min(...stepNumbers);
        const toStepNumber = fromStepNumber - 1;
        node.receive(node.inlets[0], {
          fromStepNumber,
          toStepNumber,
          selectedSteps: stepNumbers,
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const stepNumbers = selectedSteps.map((x) => x.stepNumber);
        const fromStepNumber = Math.min(...stepNumbers);
        const toStepNumber = fromStepNumber + 1;
        node.receive(node.inlets[0], {
          fromStepNumber,
          toStepNumber,
          selectedSteps: stepNumbers,
        });
      } else if (e.metaKey && e.key === "l") {
        e.preventDefault();
        const stepNumbers = selectedSteps.map((x) => x.stepNumber);
        node.receive(node.inlets[0], {
          stepsToLegato: stepNumbers,
        });
      }
    },
    [selectedSteps, node],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    if (node?.steps) {
      const durs = new Array(node.steps.length).fill(false);
      for (let i = 0; i < node.steps.length; i++) {
        if (node.steps[i].duration && node.steps[i].on) {
          const duration = node.steps[i].duration as number;
          for (let j = 0; j < duration; j++) {
            durs[i + j] = true;
          }
        }
      }
      setDurationSteps(durs);
    }
  }, [node?.steps]);

  return (
    <div className="bg-zinc-900 p-2" style={{ width, height }}>
      <div className="flex flex-col gap-1 h-full">
        <div className="flex flex-col gap-1 h-full">
          {node &&
            rows.map((steps, rowIndex) => (
              <div key={rowIndex} className="flex flex-col gap-1 h-full">
                <div className="flex h-full">
                  {steps.map((step, index) => (
                    <Step
                      stepEditingDuration={stepEditingDuration}
                      setStepEditingDuration={setStepEditingDuration}
                      isDurationStep={durationSteps[rowIndex * 16 + index] || false}
                      isSelected={selectedSteps?.includes(step) || false}
                      selection={selection}
                      setSelection={setSelection}
                      stepBaseColor={attributes.stepBaseColor as string}
                      setStepNumberMoving={setStepNumberMoving}
                      stepNumberMoving={stepNumberMoving}
                      onColor={attributes.stepOnColor as string}
                      offColor={attributes.stepOffColor as string}
                      stepMoved={stepMoved}
                      setStepMoved={setStepMoved}
                      selectedSteps={selectedSteps}
                      setSelectedSteps={setSelectedSteps}
                      key={index}
                      node={node}
                      stepNumber={index + rowIndex * 16}
                      step={step}
                    />
                  ))}
                </div>
                <div
                  style={{
                    backgroundColor: attributes.stepBaseColor as string,
                  }}
                  className="w-full h-0.5  relative"
                >
                  <div
                    className="absolute top-0 left-0 h-full flex "
                    style={{
                      background: `linear-gradient(90deg, #00000000, ${attributes.stepOnColor as string})`,
                      width:
                        rowIndex * 16 <= currentStepNumber &&
                        (rowIndex + 1) * 16 > currentStepNumber
                          ? `${((currentStepNumber - rowIndex * 16 + 1) / Math.min(steps.length, 16)) * 100}%`
                          : 0,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: attributes.stepOnColor as string,
                      }}
                      className="w-8 ml-auto h-0.5"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};