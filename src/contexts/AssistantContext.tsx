import React, { createContext, useContext, useCallback, useRef } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { OperatorContextType } from "@/lib/nodes/context";
import { prompt } from "@/lib/anthropic/assistant";
import { api } from "@/lib/nodes/definitions/zen/index";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import type { ObjectNode, Coordinate, IOConnection } from "@/lib/nodes/types";
import { parseAssistantResponse } from "@/lib/assistant/responseParser";

export type Connections = {
  [x: string]: IOConnection[];
};

interface AssistantContextType {
  assist: (prompt: string) => Promise<ObjectNode[]>;
  explanation: string;
  intent: string;
  signalFlow: string;
  usageNotes: string;
}

interface Props {
  children: React.ReactNode;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const useAssistant = (): AssistantContextType => {
  const context = useContext(AssistantContext);
  if (!context) throw new Error("useAssistant must be used within AssistantProvider");
  return context;
};

export const AssistantProvider: React.FC<Props> = ({ children }) => {
  const { selectedPatch } = usePatches();
  let assistantNodes = useRef<ObjectNode[]>([]);

  const [explanation, setExplanation] = React.useState<string>("");
  const [intent, setIntent] = React.useState<string>("");
  const [signalFlow, setSignalFlow] = React.useState<string>("");
  const [usageNotes, setUsageNotes] = React.useState<string>("");

  const assist = useCallback(
    (text: string): Promise<ObjectNode[]> => {
      if (!selectedPatch) {
        return Promise.resolve([]);
      }

      return new Promise((resolve) => {
        prompt(text).then((msgData) => {
          // first clear the old assistant nodes
          console.log("deleting previous nodes...", [...assistantNodes.current]);
          selectedPatch.objectNodes = [];
          // deleteNodes(selectedPatch.assistant.nodesAdded);
          assistantNodes.current = [];
          if (msgData) {
            let msg = msgData[0];
            console.log(msg);
            console.log(msgData);
            const fullResponse = msgData[0];

            // Parse the response using the utility functions
            const parsed = parseAssistantResponse(fullResponse);

            setIntent(parsed.intent);
            setSignalFlow(parsed.signalFlow);
            setUsageNotes(parsed.usageNotes);
            setExplanation(parsed.fullResponse);

            const ops = parsed.commands;
            console.log("ops = ", ops);
            let ids: any = {};
            let coordinates: { [x: string]: Coordinate } = {};
            let positions = {};
            let outNumber = 1;
            let inNumber = 1;
            let nodes: ObjectNode[] = [];
            let connections: { [x: string]: any[] } = {};
            for (let op of ops) {
              let operationString = Array.isArray(op) ? op.join(" ") : op;
              console.log("parsing operation:", operationString);

              if (operationString.startsWith("create ")) {
                // Parse: create [operator_type] [unique_id] ([x_position],[y_position])
                const createMatch = operationString.match(
                  /^create\s+(\S+)\s+(\S+)\s+\((\d+),(\d+)\)$/,
                );
                if (createMatch) {
                  const [, operatorName, id, x, y] = createMatch;

                  let node = new ObjectNodeImpl(selectedPatch);
                  let cleanOperatorName = operatorName.replaceAll("$1", "").replaceAll("~", "");

                  if (cleanOperatorName === "out") {
                    cleanOperatorName = "out " + outNumber;
                    outNumber++;
                  }
                  if (cleanOperatorName === "in") {
                    cleanOperatorName = "in " + inNumber;
                    inNumber++;
                  }

                  let ret = node.parse(cleanOperatorName, OperatorContextType.ZEN, false);
                  if (!ret) {
                    console.log("MISSING OPERATOR NAME=", cleanOperatorName);
                    continue;
                  }

                  node.position = {
                    x: parseInt(x),
                    y: parseInt(y),
                  };

                  node.size = {
                    width: 120,
                    height: 20,
                  };

                  console.log("creating node:", cleanOperatorName, "with id:", id);
                  ids[id] = node;
                  selectedPatch.objectNodes = [...selectedPatch.objectNodes, node];
                  nodes.push(node);
                }
              } else if (operationString.startsWith("param ")) {
                // Parse: param [destination_id].[inlet_number] [value] ([x_position],[y_position])
                // This creates a param node and connects it to the destination object's inlet
                const paramMatch = operationString.match(
                  /^param\s+(\S+)\.(\d+)\s+(\S+)\s+\((\d+),(\d+)\)$/,
                );
                if (paramMatch) {
                  const [, destinationId, inletNumber, value, x, y] = paramMatch;

                  // Find the destination object
                  let destinationNode = ids[destinationId];
                  if (!destinationNode) {
                    console.log("Destination node not found for param:", destinationId);
                    continue;
                  }

                  let inlet = parseInt(inletNumber);
                  if (!destinationNode.inlets[inlet]) {
                    console.log("Invalid inlet for param connection:", destinationId, inlet);
                    continue;
                  }

                  // Create param node with a descriptive name based on destination
                  let node = new ObjectNodeImpl(selectedPatch);
                  let paramName = `${destinationId}_param_${inlet}`;
                  let paramText = `param ${paramName} @default ${value}`;

                  let ret = node.parse(paramText, OperatorContextType.ZEN, false);
                  if (!ret) {
                    console.log("Failed to create param node:", paramText);
                    continue;
                  }

                  node.position = {
                    x: parseInt(x),
                    y: parseInt(y),
                  };

                  node.size = {
                    width: 120,
                    height: 20,
                  };

                  // Generate unique ID for the param node
                  let paramId = `param_${destinationId}_${inlet}`;

                  // Connect the param node to the destination inlet
                  let connection = node.connect(
                    destinationNode,
                    destinationNode.inlets[inlet],
                    node.outlets[0],
                    false,
                  );

                  console.log(
                    "Created and connected param node:",
                    paramText,
                    "to",
                    destinationId,
                    "inlet",
                    inlet,
                  );

                  ids[paramId] = node;
                  selectedPatch.objectNodes = [...selectedPatch.objectNodes, node];
                  nodes.push(node);

                  // Store the connection for later processing
                  if (!connections[node.id]) {
                    connections[node.id] = [];
                  }
                  connections[node.id].push(connection);
                }
              } else if (operationString.startsWith("comment ")) {
                // Parse legacy comment format for backward compatibility
                const tokens = operationString.split(" ");
                const [operationType, x, y, ...comments] = tokens;
                const comment = comments.join(" ").replace(/'/g, "");

                let node = new ObjectNodeImpl(selectedPatch);
                let text = "comment " + comment;
                let success = node.parse("comment", OperatorContextType.CORE);
                node.text = text;

                node.position = {
                  x: parseInt(x),
                  y: parseInt(y),
                };

                node.size = {
                  width: 120,
                  height: 20,
                };

                // Generate a unique ID for comment
                const commentId = "comment_" + Math.random().toString(36).substr(2, 9);
                ids[commentId] = node;
                selectedPatch.objectNodes = [...selectedPatch.objectNodes, node];
                nodes.push(node);
              }
            }

            // Process connection commands
            for (let op of ops) {
              let operationString = Array.isArray(op) ? op.join(" ") : op;

              // Only process actual connection operations
              if (operationString.startsWith("connect ")) {
                console.log("parsing connection:", operationString);
                // Parse: connect [source_id].[outlet] [destination_id].[inlet]
                const connectMatch = operationString.match(
                  /^connect\s+(\S+)\.(\d+)\s+(\S+)\.(\d+)$/,
                );
                if (connectMatch) {
                  const [, sourceId, sourceOutlet, destId, destInlet] = connectMatch;

                  let _source = ids[sourceId];
                  let _dest = ids[destId];

                  if (!_dest || !_source) {
                    console.log(
                      "Missing node for connection:",
                      sourceId,
                      "->",
                      destId,
                      connectMatch,
                      ids,
                    );
                    continue;
                  }

                  let outlet = parseInt(sourceOutlet);
                  let inlet = parseInt(destInlet);

                  if (!_dest.inlets[inlet] || !_source.outlets[outlet]) {
                    console.log(
                      "Invalid inlet/outlet for connection:",
                      sourceId,
                      outlet,
                      "->",
                      destId,
                      inlet,
                    );
                    continue;
                  }

                  let c = _source.connect(
                    _dest,
                    _dest.inlets[inlet],
                    _source.outlets[outlet],
                    false,
                  );

                  if (!connections[_source.id]) {
                    connections[_source.id] = [];
                  }

                  connections[_source.id].push(c);
                  console.log(
                    "Connected:",
                    sourceId,
                    "outlet",
                    outlet,
                    "to",
                    destId,
                    "inlet",
                    inlet,
                  );
                }
              }
            }
            selectedPatch.recompileGraph();
            //selectedPatch.assistant.nodesAdded = nodes;
            resolve(nodes);
          }
        });
      });
    },
    [selectedPatch],
  );

  return (
    <AssistantContext.Provider
      value={{
        assist,
        explanation,
        intent,
        signalFlow,
        usageNotes,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};
