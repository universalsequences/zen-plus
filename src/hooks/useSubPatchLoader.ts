import React, { useCallback } from "react";
import {
  OperatorContext,
  OperatorContextType,
  getAllContexts,
  getOperatorContext,
} from "@/lib/nodes/context";
import { File } from "@/lib/files/types";
import { useStorage } from "@/contexts/StorageContext";
import { usePatch } from "@/contexts/PatchContext";
import { Node, SerializedPatch, ObjectNode, IOlet } from "@/lib/nodes/types";
import { uuid } from "@/lib/uuid/IDGenerator";

export const useSubPatchLoader = (objectNode: ObjectNode) => {
  const { registerConnection } = usePatch();
  let { fetchSubPatchForDoc, onchainSubPatches } = useStorage();
  const loadSubPatch = useCallback(
    async (serializedSubPatch: SerializedPatch, name: string) => {
      //let serializedSubPatch = await fetchSubPatchForDoc(id);
      if (serializedSubPatch) {
        if (serializedSubPatch.attributes) {
          if (serializedSubPatch.attributes["type"]) {
            objectNode.attributes["type"] =
              serializedSubPatch.attributes["type"];
            objectNode.subpatch?.setupPatchType(
              objectNode.attributes.type as string,
            );
          } else {
            objectNode.attributes["type"] = "zen";
          }
          if (serializedSubPatch.attributes["moduleType"]) {
            objectNode.attributes["moduleType"] =
              serializedSubPatch.attributes["moduleType"];
          }
          if (serializedSubPatch.attributes["slotview"]) {
            objectNode.attributes["slotview"] =
              serializedSubPatch.attributes["slotview"];
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
        const getAdjacentNodes = (
          iolets: IOlet[],
          isInput: boolean,
        ): ObjectNode[] => {
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
                  getIO(
                    objectNode,
                    "in",
                    y.destinationInlet,
                    objectNode.inlets,
                  ) ||
                  getIO(
                    y.source as ObjectNode,
                    "out",
                    y.sourceOutlet,
                    y.source.outlets,
                  ) ||
                  "other",
              };
              y.source.disconnect(y, false);
              return ret as ConnectionSignature;
            }),
          );
        };

        let inletConnections = disconnectIO(
          objectNode,
          objectNode.inlets,
          true,
        );
        let outletConnections = disconnectIO(
          objectNode,
          objectNode.outlets,
          false,
        );

        if (objectNode.subpatch) {
          objectNode.subpatch.objectNodes = [];
          objectNode.subpatch.messageNodes = [];
        }
        objectNode.inlets = [];
        objectNode.outlets = [];

        objectNode.parse(
          name,
          OperatorContextType.ZEN,
          true,
          serializedSubPatch,
        );
        objectNode.id = uuid();
        if (objectNode.subpatch) {
          objectNode.subpatch.id = uuid();
        }

        const getMatchingIO = (
          ioType: string,
          node: ObjectNode,
          name: string,
        ): ObjectNode[] => {
          if (!node.subpatch) return [];
          return node.subpatch.objectNodes.filter(
            (x) => x.name === name && x.attributes.io === ioType,
          );
        };

        const reconnectIO = (x: ConnectionSignature[], isInput: boolean) => {
          let ioletsMatched: IOlet[] = [];
          for (let connection of x) {
            let alreadyMatched: ObjectNode[] = [];
            let { io, node, inletNumber, outletNumber } = connection;
            let nodes = isInput
              ? [connection.node as ObjectNode, ...inputNodes]
              : [connection.node as ObjectNode, ...outputNodes];

            let foundMatch = false;
            for (let node of nodes) {
              // lets check this adjacent node and see if we can use still use it
              // we want to essentially match

              if (node.subpatch && objectNode.subpatch && io) {
                // see if theres a two-way match
                if (!isInput) {
                  // OUTPUT case

                  // in this case we are looking out from this node to another node
                  // for this connection we "know" the outlet already that we want to use

                  // this is the inlet we want to match
                  let inlet = node.inlets[inletNumber]; // it has a type IO

                  // so we need to see if theres anything in this node we're reloading (i.e. objectNode) that
                  // matches ioType = IO
                  let matchingIONodes = getMatchingIO(io, objectNode, "out");
                  let exactMatches = matchingIONodes.filter(
                    (x) => (x.arguments[0] as number) - 1 === outletNumber,
                  );
                  let secondaryMatches = matchingIONodes.filter((x) => {
                    let ionumber = (x.arguments[0] as number) - 1;
                    return !ioletsMatched.includes(
                      objectNode.outlets[ionumber],
                    );
                  });

                  for (let match of [...exactMatches, ...matchingIONodes]) {
                    // possible match: "out 5 @io goal_type"
                    let outletNumber = (match.arguments[0] as number) - 1;
                    // extract the outlet number for this patch
                    let outlet = objectNode.outlets[outletNumber];

                    if (ioletsMatched.includes(outlet)) {
                      //  continue;
                    }
                    if (outlet && inlet) {
                      let c1 = objectNode.connect(node, inlet, outlet, false);
                      registerConnection(objectNode.id, c1);
                      registerConnection(node.id, c1);
                      foundMatch = true;
                      ioletsMatched.push(outlet);
                      alreadyMatched.push(match);
                      break;
                    }
                  }
                } else {
                  // INPUT case

                  // we have a source node & outlet in mind already, and need to find an inlet
                  // in this new subpatch we're loading that matches this signature

                  let outlet = node.outlets[outletNumber]; // it has a type IO

                  let matchingIONodes = getMatchingIO(io, objectNode, "in");
                  let exactMatches = matchingIONodes.filter(
                    (x) => (x.arguments[0] as number) - 1 === inletNumber,
                  );
                  let secondaryMatches = matchingIONodes.filter((x) => {
                    let ionumber = (x.arguments[0] as number) - 1;
                    return !ioletsMatched.includes(node.inlets[ionumber]);
                  });

                  for (let match of [...exactMatches, ...matchingIONodes]) {
                    // possible match: "in 5 @io goal_type"
                    let inletNumber = (match.arguments[0] as number) - 1;
                    // extract the outlet number for this patch
                    let inlet = objectNode.inlets[inletNumber];

                    if (ioletsMatched.includes(inlet)) {
                      continue;
                    }
                    if (outlet && inlet) {
                      let c1 = node.connect(objectNode, inlet, outlet, false);
                      registerConnection(node.id, c1);
                      registerConnection(objectNode.id, c1);
                      foundMatch = true;
                      alreadyMatched.push(match);
                      ioletsMatched.push(inlet);
                      break;
                    }
                  }
                  if (foundMatch) {
                    break;
                  }
                }
              }
            }
            if (!foundMatch && io) {
              // fall back on whatever it was connected to before
              let source = isInput ? node : objectNode;
              let dest = isInput ? objectNode : node;
              if (isInput) {
                // we havent found anything so just find any outlet that matches the type of this inlet
                let inlet = objectNode.inlets[inletNumber];
                let ioNode = objectNode.subpatch!.objectNodes.find(
                  (x) => x.name === "in" && x.arguments[0] === inletNumber + 1,
                );
                if (ioNode) {
                  io = ioNode.attributes.io as string;
                }
                let matchingIONodes = getMatchingIO(
                  io,
                  node as ObjectNode,
                  "out",
                );
                for (let match of matchingIONodes) {
                  // possible match: "in 5 @io goal_type"
                  let outletNumber = (match.arguments[0] as number) - 1;
                  // extract the outlet number for this patch
                  let outlet = node.outlets[outletNumber];
                  if (inlet && inlet) {
                    let c1 = source.connect(dest, inlet, outlet, false);
                    registerConnection(node.id, c1);
                    registerConnection(objectNode.id, c1);
                    break;
                  }
                }
              } else {
                // we havent found anything so just find any outlet that matches the type of this inlet
                let outlet = objectNode.outlets[outletNumber];
                let ioNode = objectNode.subpatch!.objectNodes.find(
                  (x) => x.name === "out" && x.arguments[0] === inletNumber + 1,
                );
                if (ioNode) {
                  io = ioNode.attributes.io as string;
                }
                let matchingIONodes = getMatchingIO(
                  io,
                  node as ObjectNode,
                  "in",
                );
                for (let match of matchingIONodes) {
                  // possible match: "in 5 @io goal_type"
                  let inletNumber = (match.arguments[0] as number) - 1;
                  // extract the outlet number for this patch
                  let inlet = node.inlets[inletNumber];
                  if (inlet && outlet) {
                    let c1 = source.connect(dest, inlet, outlet, false);
                    registerConnection(node.id, c1);
                    registerConnection(objectNode.id, c1);
                    break;
                  }
                }
              }
            }
          }
        };

        const reconnectIO2 = (isInput: boolean) => {
          let iolets = isInput ? objectNode.inlets : objectNode.outlets;
          let ioletsChosen: IOlet[] = [];
          for (let i = 0; i < iolets.length; i++) {
            let iolet = iolets[i];
            let ioNode = objectNode.subpatch!.objectNodes.find(
              (x) =>
                x.name === (isInput ? "in" : "out") && x.arguments[0] === i + 1,
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
                let matchingIONodes = getMatchingIO(
                  io,
                  node as ObjectNode,
                  "out",
                );
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
                let matchingIONodes = getMatchingIO(
                  io,
                  node as ObjectNode,
                  "in",
                );
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
        //reconnectIO(outletConnections, false);

        /*
            for (let connection of inletConnections) {
                let inlet = objectNode.inlets[connection.inletNumber];
                if (inlet) {
                    let c1 = connection.source.connect(objectNode, inlet, connection.source.outlets[connection.outletNumber], false);
                    registerConnection(connection.source.id, c1);
                }
            }
            */

        if (objectNode.subpatch) {
          objectNode.subpatch.initialLoadCompile();
        }
      }
    },
    [objectNode],
  );

  return { loadSubPatch };
};
