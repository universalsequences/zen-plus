import { ObjectNode, SubPatch } from "../types";

export const getNodesControllableByAttriUI = (objectNode: ObjectNode, label?: string): ObjectNode[] => {
  let outbound = objectNode.outlets[0].connections.map((x) => x.destination);
  let zenObjects: ObjectNode[] = (outbound as ObjectNode[]).filter((x) => x.name === "zen");
  let subpatches = zenObjects.map((x) => x.subpatch).filter((x) => x) as SubPatch[];
  let allNodes = subpatches.flatMap((x) => x.getAllNodes());
  let paramNodes: ObjectNode[] = [...outbound, ...allNodes].filter(
    (x) => (x as ObjectNode).name === "uniform" || (x as ObjectNode).name === "param",
  ) as ObjectNode[];
  if ((objectNode.patch as SubPatch).parentNode) {
    paramNodes = [
      ...paramNodes,
      ...objectNode.patch.objectNodes.filter((x) => x.name === "param" || x.name === "uniform"),
    ];
  }
  if (!label) {
    return paramNodes;
  }

  return paramNodes.filter((x) => x.arguments[0] === label);
};
