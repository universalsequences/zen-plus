import { ParamInfo } from "@/lib/zen";
import { ObjectNode, Patch } from "../types";
import { PresetManager } from "../definitions/core/preset";
import { getNodesControllableByAttriUI } from "./getNodesControllableByAttriUI";

export type ExportedParameter = ParamInfo & {
  tag?: string;
  id: string;
};

export type ExportedPatch = {
  workletCode?: string;
  parameters: ExportedParameter[];
  presets: ExportedPreset[];
};

export const exportParameters = (patch: Patch) => {
  const paramNodes = patch.getAllNodes().filter((x) => x.name === "param");
  const params: ExportedParameter[] = [];
  for (const node of paramNodes) {
    const objectNode = node as ObjectNode;
    if (objectNode.param) {
      const param = objectNode.param;
      if (param.getParamInfo) {
        const paramInfo = param.getParamInfo();
        const { min, max } = paramInfo;
        params.push({
          ...paramInfo,
          max: max || 1,
          min: min || 0,
          id: objectNode.id,
          tag: objectNode.attributes.tag as string | undefined,
        });
      }
    }
  }

  const presets = exportPreset(patch);
  const exported = {
    presets,
    parameters: params,
    workletCode: patch.workletCode,
  };

  console.log(exported);
  const jsonString = JSON.stringify(exported, null, 2);

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
  const downloadAnchor = document.createElement("a");
  const fileName = `${patch.name || "patch"}.zen`;
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", fileName);

  // Append the anchor to the DOM, trigger the click, and remove it
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
};

type ExportedPreset = {
  [id: string]: number;
};
export const exportPreset = (patch: Patch) => {
  const presetNodes = patch.getAllNodes().filter((x) => x.name === "preset");
  const exportedPresets: ExportedPreset[] = [];
  for (const presetNode of presetNodes) {
    const objectNode = presetNode as ObjectNode;
    if (objectNode.custom) {
      const p = objectNode.custom as PresetManager;
      for (const preset of p.presets) {
        const exportedPreset: ExportedPreset = {};
        for (const id in preset) {
          const n = preset[id].node as ObjectNode;
          if (n.name === "attrui") {
            const controllable = getNodesControllableByAttriUI(n);
            if (controllable.length > 0) {
              const node = controllable[0];
              const paramId = node.id;
              exportedPreset[paramId] = preset[id].state as number;
            }
          }
        }
        if (Object.keys(exportedPreset).length > 0) {
          exportedPresets.push(exportedPreset);
        }
      }
    }
  }
  return exportedPresets;
};
