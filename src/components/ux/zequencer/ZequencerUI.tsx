import { usePosition } from "@/contexts/PositionContext";
import type { Selection } from "./types";
import type { ObjectNode } from "@/lib/nodes/types";
import type React from "react";
import { Step } from "./Step";
import { useAttributedByNameNode } from "@/hooks/useAttributedByNameNode";
import { useSelection } from "@/contexts/SelectionContext";
import { useValue } from "@/contexts/ValueContext";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GenericStepData, StepDataSchema } from "@/lib/nodes/definitions/core/zequencer/types";
import { useStepsContext } from "@/contexts/StepsContext";
import { Cirklon } from "./Cirklon";
import { CirklonParameters } from "./CirklonParameters";
import { PianoRoll } from "./PianoRoll";
import { PlusCircledIcon, MinusCircledIcon, MixerVerticalIcon } from "@radix-ui/react-icons";

export const ZequencerUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const { presentationMode, updateSize } = usePosition();
  useSelection();

  const { width, height } = objectNode.size || { width: 200, height: 200 };
  const [selection, setSelection] = useState<Selection | null>(null);

  const { selectedSteps, setSelectedSteps } = useStepsContext();

  const attributes = objectNode.attributes;

  const { setNodeToWatch, value } = useValue();

  const { selectedNodes } = useSelection();

  const { node } = useAttributedByNameNode(
    objectNode,
    attributes.target as string,
    "zequencer.core",
  );
  const currentStepNumber = Array.isArray(value) ? (value[0] as number) : 0;

  const selectedStepsRef = useRef(selectedSteps);

  if (node?.custom?.value) {
    // Make sure we're handling the correct format (array of arrays)
    if (Array.isArray(node.custom.value) && node.custom.value.length > 0) {
      if (Array.isArray(node.custom.value[0])) {
        // Already in correct format
        node.steps = node.custom.value as GenericStepData[][];
      } else {
        // Convert legacy format to polyphonic
        node.steps = (node.custom.value as GenericStepData[]).map((step) => [step]);
      }
    }
  }

  useEffect(() => {
    return () => setSelectedSteps(null);
  }, []);

  useEffect(() => {
    selectedStepsRef.current = selectedSteps;
  }, [selectedSteps]);
  // Helper to find steps in the nested structure
  const findStepInPolyphonicStructure = (step: GenericStepData, steps: GenericStepData[][]) => {
    if (!steps) return false;

    // Check each step position and its voices
    for (let i = 0; i < steps.length; i++) {
      const voices = steps[i];
      // Check if this step exists in any of the voices
      if (voices && voices.some((voice) => voice.stepNumber === step.stepNumber)) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    if (!node?.steps || !selectedStepsRef.current) return;

    // Filter selected steps to only include those still present in the step data
    const validSelectedSteps = selectedStepsRef.current.filter((step) =>
      findStepInPolyphonicStructure(step, node.steps),
    );

    if (validSelectedSteps.length !== selectedStepsRef.current.length) {
      setSelectedSteps(validSelectedSteps.length > 0 ? validSelectedSteps : null);
    }
  }, [node?.steps]);

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

  useEffect(() => {
    return () => setSelectedSteps([]);
  }, []);

  const onMouseUp = useCallback(() => {
    if (selection && node?.steps) {
      // Get the first voice from each step position in the selection range
      const selectedVoices: GenericStepData[] = [];

      for (let i = selection.fromStepNumber; i <= selection.toStepNumber; i++) {
        if (i >= 0 && i < node.steps.length) {
          const voices = node.steps[i];
          if (voices && voices.length > 0 && voices[0].on) {
            // Add only the first voice from each step position
            selectedVoices.push(voices[0]);
          }
        }
      }

      setSelectedSteps(selectedVoices.length > 0 ? selectedVoices : null);
    }

    setStepEditingDuration(null);
    setStepNumberMoving(null);
    setSelection(null);
    setMouseStartY(null);
    setStepMoved(false);
  }, [selection, node]);

  useEffect(() => {
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [onMouseUp]);

  const rows: GenericStepData[][] = [];
  const steps = node?.steps;
  if (steps) {
    // Create a flat array of steps, preferring selected steps when available
    const flatSteps: GenericStepData[] = steps.map((voiceArray, stepIndex) => {
      // If there's no voice at this position, return a default step
      if (!voiceArray || voiceArray.length === 0) {
        return {
          id: "",
          on: false,
          stepNumber: stepIndex,
          parameterLocks: [],
        } as GenericStepData;
      }

      // Check if we have a selected step at this position
      const selectedStep = selectedSteps?.find((step) => step.stepNumber === stepIndex);

      // If there's a selected step at this position and it exists in the voices array, use it
      if (selectedStep) {
        const matchingVoice = voiceArray.find((voice) => voice.id === selectedStep.id);
        if (matchingVoice) {
          return matchingVoice;
        }
      }

      // Otherwise, show the first voice (default behavior)
      return voiceArray[0];
    });

    // Organize flat steps into rows
    for (let i = 0; i < flatSteps.length; i += 16) {
      rows.push(flatSteps.slice(i, i + 16));
    }
  }

  const [durationSteps, setDurationSteps] = useState<boolean[]>([]);
  const [stepEditingDuration, setStepEditingDuration] = useState<number | null>(null);

  // Helper to find step numbers in polyphonic structure
  const findStepNumbersInPolyphonicSteps = (
    steps: GenericStepData[],
    allSteps: GenericStepData[][],
  ) => {
    const stepNumbers: number[] = [];

    for (const step of steps) {
      for (let i = 0; i < allSteps.length; i++) {
        const voices = allSteps[i];
        if (voices && voices.some((voice) => voice.stepNumber === step.stepNumber)) {
          stepNumbers.push(i);
          break;
        }
      }
    }

    return stepNumbers;
  };

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedSteps || !node?.steps || !selectedSteps.length) {
        return;
      }

      if (e.key === "Backspace") {
        // Get the IDs of the selected steps
        const stepIdsToDelete = selectedSteps.map((step) => step.id);

        // For backward compatibility, also find step numbers
        const stepsToDelete = findStepNumbersInPolyphonicSteps(selectedSteps, node.steps);

        if (stepsToDelete.length > 0 || stepIdsToDelete.length > 0) {
          node.receive(node.inlets[0], {
            stepsToDelete: [],
            stepIdsToDelete,
          });
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        // Use step numbers from the selected steps
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
        // Use step numbers from the selected steps
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
        // Use step numbers from the selected steps
        const stepNumbers = selectedSteps.map((x) => x.stepNumber);

        node.receive(node.inlets[0], {
          stepsToLegato: stepNumbers,
        });
      }
    },
    [selectedSteps, node, selectedNodes],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    if (node?.steps) {
      const durs = new Array(node.steps.length).fill(false);
      for (let i = 0; i < node.steps.length; i++) {
        // Get all voices at this step
        const stepVoices = node.steps[i];
        if (stepVoices && stepVoices.length > 0) {
          // Find all active steps at this position
          const activeSteps = stepVoices.filter((voice) => voice.on);

          // If we have selected steps, prioritize them
          const selectedStep = selectedSteps?.find(
            (step) => step.stepNumber === i && stepVoices.some((v) => v.id === step.id),
          );

          if (selectedStep) {
            // If we have a selected step at this position, use its duration
            const matchingStep = stepVoices.find((v) => v.id === selectedStep.id);
            if (matchingStep && matchingStep.duration && matchingStep.on) {
              const duration = matchingStep.duration as number;
              for (let j = 0; j < duration; j++) {
                durs[i + j] = true;
              }
            }
          } else if (activeSteps.length > 0) {
            // No specific selection - display the longest duration among all active steps
            let maxDuration = 0;
            for (const step of activeSteps) {
              if (step.duration && typeof step.duration === "number") {
                maxDuration = Math.max(maxDuration, step.duration as number);
              }
            }

            if (maxDuration > 0) {
              for (let j = 0; j < maxDuration; j++) {
                durs[i + j] = true;
              }
            }
          }
        }
      }
      setDurationSteps(durs);
    }
  }, [node?.steps, selectedSteps]);

  const schema = node?.stepsSchema as StepDataSchema;
  const [parameter, setParameter] = useState(schema?.[0]?.name);
  const showParameters = objectNode.attributes.parameters;
  const showPatternLengthControls = objectNode.attributes.showPatternLengthControls;
  const showParametersToggleIcon = objectNode.attributes.showParametersToggle;

  useEffect(() => {
    setParameter(schema?.[0]?.name);
  }, [schema]);

  const [mouseStartY, setMouseStartY] = useState<number | null>(null);

  // Pattern length control handlers
  const handlePatternLengthIncrease = useCallback(() => {
    if (node) {
      node.receive(node.inlets[0], { patternLengthMultiple: 2 });
    }
  }, [node]);

  const handlePatternLengthDecrease = useCallback(() => {
    if (node) {
      node.receive(node.inlets[0], { patternLengthMultiple: 0.5 });
    }
  }, [node]);

  // Get the piano roll height from attributes
  const pianoRollHeight = Number(attributes.pianoRollHeight || 60);

  // Track previous pattern length for dynamic height calculation
  const [prevPatternLength, setPrevPatternLength] = useState<number>(0);

  const [prevShowParameters, setPrevShowParameters] = useState(showParameters);
  // Dynamic height logic
  useEffect(() => {
    if (!attributes.dynamicHeight || !node?.steps) return;

    const currentPatternLength = node.steps.length;
    const rowHeight = showParameters ? 68 : 28; // Approximate height per row
    const pianoRollHeightValue = attributes.showPianoRoll ? pianoRollHeight : 0;
    const baseHeight = 50; // Base padding and margins

    if (prevPatternLength === 0) {
      // First time setting up, just track the current length
      setPrevPatternLength(currentPatternLength);
    } else if (
      currentPatternLength !== prevPatternLength ||
      showParameters !== prevShowParameters
    ) {
      // Pattern length changed, update height
      const currentRows = Math.ceil(currentPatternLength / 16);
      const newHeight = currentRows * rowHeight + pianoRollHeightValue + baseHeight;

      if (updateSize) {
        objectNode.size = {
          width: objectNode.size?.width || 200,
          height: newHeight,
        };
        updateSize(objectNode.id, { ...objectNode.size });
      }

      setPrevPatternLength(currentPatternLength);
      setPrevShowParameters(showParameters);
    }
  }, [
    updateSize,
    node?.steps?.length,
    attributes.dynamicHeight,
    showParameters,
    pianoRollHeight,
    attributes.showPianoRoll,
    prevPatternLength,
    objectNode,
  ]);

  const toggleShowParameters = () => {
    objectNode.setAttribute("parameters", objectNode.attributes.parameters ? false : true);
  };

  // Handler for when a step is clicked in the piano roll
  const handlePianoRollStepClick = useCallback(
    (step: GenericStepData) => {
      if (!node) return;

      // If step is already selected, unselect it
      if (selectedSteps?.some((s) => s.id === step.id)) {
        setSelectedSteps(selectedSteps.filter((s) => s.id !== step.id));
      } else {
        // Make sure we have the most up-to-date version of the step from node.steps
        // This is important to ensure the correct step is selected in the sequencer view
        let updatedStep = step;

        if (node.steps && node.steps[step.stepNumber]) {
          const exactStep = node.steps[step.stepNumber].find((voice) => voice.id === step.id);
          if (exactStep) {
            updatedStep = exactStep;
          }
        }

        // Select the step (either add to selection with meta key or replace selection)
        setSelectedSteps([updatedStep]);

        // Check if we need to scroll the view to ensure this step is visible
        const stepRow = Math.floor(step.stepNumber / 16);
        if (stepRow >= rows.length) {
          // The step might be outside the visible rows, so we can't scroll to it
          return;
        }

        // We could add scrolling to the right row here if needed in the future
      }
    },
    [node, selectedSteps, setSelectedSteps, rows.length],
  );

  return (
    <div className="bg-zinc-900 p-2" style={{ width, height }}>
      <div className={`flex flex-col gap-1 h-full w-full ${!showParameters ? "items-start" : ""}`}>
        {/* Piano Roll Visualization */}
        {node && pianoRollHeight > 0 && attributes.showPianoRoll && (
          <div className="mb-2">
            <PianoRoll
              objectNode={objectNode}
              node={node}
              pianoRollHeight={pianoRollHeight}
              onStepClick={handlePianoRollStepClick}
              schema={schema}
              currentStepNumber={currentStepNumber}
            />
          </div>
        )}

        <div
          className={`flex flex-col gap-1 h-full w-full ${!showParameters ? "items-start" : ""}`}
        >
          {/* Pattern Length Controls - show at top when parameters are hidden */}
          {!showParameters && (showParametersToggleIcon || showPatternLengthControls) && (
            <div className="flex justify-end mb-2 ml-auto">
              <div className="ml-auto flex gap-1">
                {showPatternLengthControls && (
                  <button
                    onClick={handlePatternLengthIncrease}
                    className="p-1 hover:bg-zinc-700 rounded"
                    title="Double pattern length"
                  >
                    <PlusCircledIcon className="w-4 h-4 text-white" />
                  </button>
                )}
                {showPatternLengthControls && (
                  <button
                    onClick={handlePatternLengthDecrease}
                    className="p-1 hover:bg-zinc-700 rounded"
                    title="Halve pattern length"
                  >
                    <MinusCircledIcon className="w-4 h-4 text-white" />
                  </button>
                )}
                {showParametersToggleIcon && (
                  <button
                    onClick={toggleShowParameters}
                    className={`p-1 ${showParameters && "bg-zinc-800"} hover:bg-zinc-700 rounded`}
                  >
                    <MixerVerticalIcon
                      className={`w-4 h-4 ${showParameters ? "text-zinc-500" : "text-white"}`}
                    />
                  </button>
                )}
              </div>
            </div>
          )}

          {showParameters && schema && parameter && (
            <div className="flex items-center justify-between">
              <CirklonParameters
                color={attributes.stepOnColor as string}
                schema={schema}
                setParameter={setParameter}
                parameter={parameter}
              />
              {/* Pattern Length Controls - show next to parameters when visible */}
              {(showPatternLengthControls || showParametersToggleIcon) && (
                <div className="ml-auto flex gap-1 ml-2">
                  {showPatternLengthControls && (
                    <button
                      onClick={handlePatternLengthIncrease}
                      className="p-1 hover:bg-zinc-700 rounded"
                      title="Double pattern length"
                    >
                      <PlusCircledIcon className="w-4 h-4 text-white" />
                    </button>
                  )}
                  {showPatternLengthControls && (
                    <button
                      onClick={handlePatternLengthDecrease}
                      className="p-1 hover:bg-zinc-700 rounded"
                      title="Halve pattern length"
                    >
                      <MinusCircledIcon className="w-4 h-4 text-white" />
                    </button>
                  )}
                  {showParametersToggleIcon && (
                    <button
                      onClick={toggleShowParameters}
                      className={`p-1 ${showParameters && "bg-zinc-800"} hover:bg-zinc-700 rounded`}
                    >
                      <MixerVerticalIcon className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {node &&
            rows.map((steps, rowIndex) => (
              <div
                key={rowIndex}
                className={`flex flex-col gap-1 w-full ${!showParameters ? "items-start" : "h-full"}`}
              >
                {node && showParameters && schema && (
                  <Cirklon
                    setMouseStartY={setMouseStartY}
                    mouseStartY={mouseStartY}
                    color={attributes.stepOnColor as string}
                    parameter={parameter}
                    schema={schema}
                    objectNode={node}
                    steps={steps}
                  />
                )}
                <div className={`flex w-full ${showParameters ? "h-8" : "h-full"}`}>
                  {steps.map((step, index) => (
                    <Step
                      isMini={!showParameters}
                      stepEditingDuration={stepEditingDuration}
                      setStepEditingDuration={setStepEditingDuration}
                      isDurationStep={durationSteps[rowIndex * 16 + index] || false}
                      isSelected={selectedSteps?.some((s) => s.id === step.id) || false}
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
