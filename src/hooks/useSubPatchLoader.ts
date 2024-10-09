import React, { useCallback } from "react";
import { OperatorContextType } from "@/lib/nodes/context";
import { usePatch } from "@/contexts/PatchContext";
import { Node, SerializedPatch, ObjectNode, IOlet } from "@/lib/nodes/types";
import { uuid } from "@/lib/uuid/IDGenerator";

export const useSubPatchLoader = (objectNode: ObjectNode) => {
  const { registerConnection } = usePatch();
  const loadSubPatch = useCallback(
    async (serializedSubPatch: SerializedPatch, name: string) => {
      console.log("loadSubPatch called", objectNode, serializedSubPatch, name);
      if (serializedSubPatch) {
        if (serializedSubPatch.attributes) {
          if (serializedSubPatch.attributes["type"]) {
            objectNode.attributes["type"] = serializedSubPatch.attributes["type"];
            objectNode.subpatch?.setupPatchType(objectNode.attributes.type as string);
          } else {
            objectNode.attributes["type"] = "zen";
          }
          if (serializedSubPatch.attributes["moduleType"]) {
            objectNode.attributes["moduleType"] = serializedSubPatch.attributes["moduleType"];
          }
          if (serializedSubPatch.attributes["slotview"]) {
            objectNode.attributes["slotview"] = serializedSubPatch.attributes["slotview"];
          }
        }

        // goal: we want to maintain the "types" of the modules connected into and out this modules
        // for example, if we have a geneartor connected to an effect & controlled by a sequencer,
        // and this generator is switched for a new generator that has slightly different ordering
        // of the inlets/outlets. it will re-connect everything to actually work out...
        const getIO = (
          node: ObjectNode,
          name: string,
          iolet: IOlet,
          iolets: IOlet[],
        ): string | null => {
          if (!node.subpatch) {
            return null;
          }
          let ioletNumber = iolets.indexOf(iolet);
          let ioNode = node.subpatch.objectNodes.find(
            (x) => x.name === name && x.arguments[0] === ioletNumber + 1,
          );
          if (!ioNode) {
            return null;
          }
          return ioNode.attributes.io as string;
        };

        // disconnects adjacent nodes from this subpatch and takes note of the io type
        // for each inlet/outlet, in order to later try to match it

        interface ConnectionSignature {
          node: Node;
          inletNumber: number;
          outletNumber: number;
          io: string | null;
        }
        // we need to know what "subpatches" are going into and out of this node
        const getAdjacentNodes = (iolets: IOlet[], isInput: boolean): ObjectNode[] => {
          return iolets.flatMap((iolet) =>
            iolet.connections
              .filter(
                (x) =>
                  undefined !==
                  (isInput
                    ? (x.source as ObjectNode).subpatch
                    : (x.destination as ObjectNode).subpatch),
              )
              .map((x) => (isInput ? x.source : x.destination)),
          ) as ObjectNode[];
        };

        let inputNodes = getAdjacentNodes(objectNode.inlets, true);
        let outputNodes = getAdjacentNodes(objectNode.outlets, false);

        const disconnectIO = (
          node: ObjectNode,
          iolets: IOlet[],
          isInput: boolean,
        ): ConnectionSignature[] => {
          return iolets.flatMap((x) =>
            x.connections.map((y) => {
              let ret: ConnectionSignature = {
                node: isInput ? y.source : y.destination,
                inletNumber: isInput
                  ? objectNode.inlets.indexOf(y.destinationInlet)
                  : y.destination.inlets.indexOf(y.destinationInlet),
                outletNumber: isInput
                  ? y.source.outlets.indexOf(y.sourceOutlet)
                  : objectNode.outlets.indexOf(y.sourceOutlet),
                io:
                  getIO(objectNode, "in", y.destinationInlet, objectNode.inlets) ||
                  getIO(y.source as ObjectNode, "out", y.sourceOutlet, y.source.outlets) ||
                  "other",
              };
              y.source.disconnect(y, false);
              return ret as ConnectionSignature;
            }),
          );
        };

        let inletConnections = disconnectIO(objectNode, objectNode.inlets, true);
        let outletConnections = disconnectIO(objectNode, objectNode.outlets, false);

        if (objectNode.subpatch) {
          objectNode.subpatch.objectNodes = [];
          objectNode.subpatch.messageNodes = [];
        }
        objectNode.inlets = [];
        objectNode.outlets = [];

        objectNode.subpatch = undefined;
        objectNode.parse(name, OperatorContextType.ZEN, true, serializedSubPatch);
        //objectNode.id = uuid();
        if (objectNode.subpatch) {
          objectNode.subpatch.id = uuid();
        }

        const getMatchingIO = (ioType: string, node: ObjectNode, name: string): ObjectNode[] => {
          if (!node.subpatch) return [];
          return node.subpatch.objectNodes.filter(
            (x) => x.name === name && x.attributes.io === ioType,
          );
        };

        const reconnectIO2 = (isInput: boolean) => {
          let iolets = isInput ? objectNode.inlets : objectNode.outlets;
          let ioletsChosen: IOlet[] = [];
          for (let i = 0; i < iolets.length; i++) {
            let iolet = iolets[i];
            let ioNode = objectNode.subpatch!.objectNodes.find(
              (x) => x.name === (isInput ? "in" : "out") && x.arguments[0] === i + 1,
            );
            if (!ioNode) {
              continue;
            }
            let io = ioNode.attributes.io as string;
            // find a matching connection for this inlet/outlet that has been taken yet...

            let adjacent = isInput ? inputNodes : outputNodes;
            for (let node of adjacent) {
              let foundMatch = false;
              if (isInput) {
                let matchingIONodes = getMatchingIO(io, node as ObjectNode, "out");
                for (let match of matchingIONodes) {
                  // possible match: "in 5 @io goal_type"
                  let outletNumber = (match.arguments[0] as number) - 1;
                  // extract the outlet number for this patch
                  let outlet = node.outlets[outletNumber];
                  if (ioletsChosen.includes(outlet)) {
                    continue;
                  }
                  if (outlet && iolet) {
                    let c1 = node.connect(objectNode, iolet, outlet, false);
                    registerConnection(node.id, c1);
                    ioletsChosen.push(outlet);
                    registerConnection(objectNode.id, c1);
                    foundMatch = true;
                    break;
                  }
                }
              } else {
                let matchingIONodes = getMatchingIO(io, node as ObjectNode, "in");
                for (let match of matchingIONodes) {
                  // possible match: "in 5 @io goal_type"
                  let inletNumber = (match.arguments[0] as number) - 1;
                  // extract the outlet number for this patch
                  let inlet = node.inlets[inletNumber];
                  if (ioletsChosen.includes(inlet)) {
                    continue;
                  }
                  if (inlet && iolet) {
                    let c1 = objectNode.connect(node, inlet, iolet, false);
                    ioletsChosen.push(inlet);
                    registerConnection(node.id, c1);
                    registerConnection(objectNode.id, c1);
                    foundMatch = true;
                    break;
                  }
                }
              }
              if (foundMatch) {
                break;
              }
            }
          }
        };

        reconnectIO2(true);
        reconnectIO2(false);

        if (objectNode.subpatch) {
          objectNode.subpatch.initialLoadCompile();
        }
      }
    },
    [objectNode],
  );

  return { loadSubPatch };
};
