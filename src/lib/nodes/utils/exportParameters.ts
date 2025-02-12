import { ParamInfo } from "@/lib/zen";
import { ObjectNode, Patch } from "../types";
import { PresetManager } from "../definitions/core/preset";
import { getNodesControllableByAttriUI } from "./getNodesControllableByAttriUI";

export type ExportedParameter = ParamInfo & {
  tag?: string;
  id: string;
};

export type ExportedBuffer = {
  id: string;
  idx: number;
  channels: number;
  size: number;
  name?: string;
};

export type ExportedClick = {
  id: string;
  idx: number;
  name?: string;
};

type ExportedPreset = {
  [id: string]: number;
};

export type ExportedPatch = {
  workletCode?: string;
  parameters: ExportedParameter[];
  presets: ExportedPreset[];
  visualsCode?: string;
};

export const exportParameters = (patch: Patch, visualsCode: string) => {
  const allNodes = patch.getAllNodes();
  const paramNodes = allNodes.filter((x) => x.name === "param");
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

  const clickNodes = allNodes.filter((x) => x.name === "click");
  const clicks: ExportedClick[] = [];
  for (const node of clickNodes) {
    const objectNode = node as ObjectNode;
    const { click } = objectNode;
    if (click) {
      if (click.getIdx) {
        clicks.push({
          id: objectNode.id,
          name: (objectNode.attributes.name || "") as string,
          idx: click.getIdx(),
        });
      } else {
        console.log("no idx for click");
      }
    } else {
      console.log("no click found...");
    }
  }

  const dataNodes = allNodes.filter((x) => x.name === "data");
  const dataBuffers: ExportedBuffer[] = [];
  for (const node of dataNodes) {
    const objectNode = node as ObjectNode;
    const { blockGen } = objectNode;
    if (blockGen) {
      if (blockGen.getChannels && blockGen.getSize && blockGen.getIdx) {
        dataBuffers.push({
          id: objectNode.id,
          name: (objectNode.attributes.name || "") as string,
          idx: blockGen.getIdx(),
          channels: blockGen.getChannels(),
          size: blockGen.getSize(),
        });
      }
    }
  }

  const presets = exportPreset(patch);
  const exported = {
    presets,
    parameters: params,
    clicks,
    dataBuffers,
    workletCode: patch.workletCode,
    visualsCode,
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
