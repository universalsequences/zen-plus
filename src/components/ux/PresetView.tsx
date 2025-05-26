import React, { useEffect, useState } from "react";
import { PresetManager } from "@/lib/nodes/definitions/core/preset/manager";
import { ObjectNode } from "@/lib/nodes/types";
import { useValue } from "@/contexts/ValueContext";
import { getRootPatch } from "@/lib/nodes/traverse";
import PresetBase from "./PresetBase";

const PresetViewUI: React.FC<{ objectNode: ObjectNode }> = ({ objectNode }) => {
  const [targetPresetManager, setTargetPresetManager] = useState<PresetManager | null>(null);
  const [targetPresetNode, setTargetPresetNode] = useState<ObjectNode | null>(null);
  const [current, setCurrent] = useState(0);

  // Get the preset scripting name and slot from attributes
  const presetScriptingName = objectNode.attributes.preset as string;
  const slotNumber = (objectNode.attributes.slot as number) || 0;

  // Use useValue to listen to the target preset node
  const { value, setNodeToWatch } = useValue();

  // Set up the node to watch based on scripting name
  useEffect(() => {
    if (!presetScriptingName) {
      setTargetPresetManager(null);
      setTargetPresetNode(null);
      return;
    }

    const rootPatch = getRootPatch(objectNode.patch);
    const targetNodes = rootPatch.scriptingNameToNodes[presetScriptingName];

    if (!targetNodes || targetNodes.length === 0) {
      setTargetPresetManager(null);
      setTargetPresetNode(null);
      return;
    }

    // Get the first node with the matching scripting name
    const targetNode = targetNodes[0];
    const presetManager = targetNode.custom as PresetManager;

    if (presetManager) {
      setTargetPresetManager(presetManager);
      setTargetPresetNode(targetNode);
      setNodeToWatch(targetNode);
    }
  }, [presetScriptingName, setNodeToWatch]);

  useEffect(() => {
    if (Array.isArray(value)) {
      setCurrent(value[0] as number);
    }
  }, [value]);

  useEffect(() => {
    targetPresetNode?.receive(targetPresetNode.inlets[0], slotNumber);
  }, [targetPresetNode, slotNumber]);

  // If we don't have a target preset manager, show an error message
  if (!targetPresetManager) {
    return (
      <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-center">
          {presetScriptingName
            ? `Preset "${presetScriptingName}" not found`
            : "No preset specified"}
        </div>
      </div>
    );
  }

  return (
    <PresetBase
      objectNode={objectNode}
      presetManager={targetPresetManager}
      currentSlot={slotNumber}
      value={value}
      targetNode={targetPresetNode}
    />
  );
};

export default PresetViewUI;
