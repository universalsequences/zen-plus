import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import { OperatorContextType } from "@/lib/nodes/context";
import Assistant from "@/lib/openai/assistant";
import { useStorage } from "@/contexts/StorageContext";
import { OnchainSubPatch, fetchOnchainSubPatch } from "@/lib/onchain/fetch";
import { abi } from "@/lib/abi/minter-abi";
import { MINTER_CONTRACT, DROP_CONTRACT } from "@/components/WriteOnChain";
import { usePublicClient, useContractRead } from "wagmi";
import pako from "pako";
import { getSegmentation } from "@/lib/cables/getSegmentation";
import { usePosition } from "@/contexts/PositionContext";
import { SizeIndex } from "./PositionContext";
import { currentUUID, uuid, plusUUID, registerUUID } from "@/lib/uuid/IDGenerator";
import { Project } from "@/contexts/StorageContext";
import ObjectNodeImpl from "@/lib/nodes/ObjectNode";
import {
  SerializedPatch,
  Positioned,
  Patch,
  IOlet,
  MessageNode,
  IOConnection,
  ObjectNode,
  Coordinate,
  SubPatch,
} from "@/lib/nodes/types";
import { PatchImpl } from "@/lib/nodes/Patch";
import { prompt } from "@/lib/anthropic/assistant";
import { api } from "@/lib/nodes/definitions/zen/index";

export type Connections = {
  [x: string]: IOConnection[];
};

interface PatcherContext {
  segmentCable: (x: IOConnection, segment: number) => void;
  segmentCables: (sizeIndex: SizeIndex) => void;
  loadProject: (x: Project) => void;
  updateConnections: (x: Connections) => void;
  deleteNodes: (x: (ObjectNode | MessageNode)[], shallow?: boolean) => void;
  connections: Connections;
  registerConnection: (x: string, connection: IOConnection) => void;
  deleteConnection: (id: string, connection: IOConnection) => void;
  patch: Patch;
  setPatch: (x: Patch) => void;
  messageNodes: MessageNode[];
  objectNodes: ObjectNode[];
  newMessageNode: (x: MessageNode, position: Coordinate) => void;
  newObjectNode: (x: ObjectNode, position: Coordinate) => void;
  isCustomView: boolean;
  loadProjectPatch: (x: SerializedPatch) => void;
  assist: (prompt: string) => Promise<ObjectNode[]>;
}

interface Props {
  children: React.ReactNode;
  patch: Patch;
  isCustomView?: boolean;
}

const PatchContext = createContext<PatcherContext | undefined>(undefined);

export const usePatch = (): PatcherContext => {
  const context = useContext(PatchContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

export type Coordinates = {
  [x: string]: Coordinate;
};

type ZIndices = {
  [x: string]: number;
};

type Size = {
  width: number;
  height: number;
};

export const PatchProvider: React.FC<Props> = ({ children, ...props }) => {
  const [connections, setConnections] = useState<Connections>({});
  const [patch, setPatch] = useState<Patch>(props.patch);
  const [objectNodes, setObjectNodes] = useState<ObjectNode[]>([]);
  const [messageNodes, setMessageNodes] = useState<MessageNode[]>([]);
  let assistantNodes = useRef<ObjectNode[]>([]);

  const { patches } = usePatches();

  const assist = useCallback(
    (text: string): Promise<ObjectNode[]> => {
      return new Promise((resolve) => {
        prompt(text).then((msgData) => {
          // first clear the old assistant nodes
          console.log("deleting previous nodes...", [...assistantNodes.current]);
          patch.objectNodes = [];
          setObjectNodes([]);
          // deleteNodes(patch.assistant.nodesAdded);
          assistantNodes.current = [];
          if (msgData) {
            let msg = msgData[0];
            console.log(msg);
            const operations = msgData[0];
            /*
            let operations = msgData.find(
              (x) => !x.includes("json") && x.includes("create") && !x.includes("..."),
            ) as string;
            if (operations === undefined) {
              operations = msgData.find((x) => x.includes("json")) as string;
              let start = operations.indexOf("[");
              let end = operations.indexOf("]");
              operations = operations.slice(start, end + 1);
            }
            */
            let ops = [];
            try {
              ops = JSON.parse(operations);
            } catch (e) {
              ops = operations.split("\n").filter((x) => x.trim() !== "");
            }
            console.log("ops = ", ops);
            let ids: any = {};
            let coordinates: Coordinates = {};
            let positions = {};
            let outNumber = 1;
            let inNumber = 1;
            let nodes: ObjectNode[] = [];
            for (let op of ops) {
              let tokens = Array.isArray(op) ? op : op.split(" ");
              if (api[tokens[0]]) {
                tokens = ["create", ...tokens];
                if (tokens.length > 5) {
                tokens.splice(3, 1);
                }
              }
              let [operationType, operatorName, id, x, y] = tokens;
              console.log("tokens", tokens);

              operatorName = operatorName.replaceAll("$1", "");
              operatorName = operatorName.replaceAll("~", "");

              console.log("operator name=", operatorName);

              let position = {
                x: parseInt(x),
                y: parseInt(y),
              };
              console.log("position=", position);
              if (operationType === "comment") {
                let [operationType, x, y, ...comments] = tokens;
                let comment = comments.join(" ").replace("'", "");
                let node = new ObjectNodeImpl(patch);
                let text = "comment " + comment;
                console.log("parsing =", text);
                let success = node.parse("comment", OperatorContextType.CORE); // " + comment);
                node.text = text;
                console.log("comment node=", node);

                node.position = {
                  x: parseInt(x),
                  y: parseInt(y),
                };

                ids[id] = node;
                newObjectNode(node, node.position);
                nodes.push(node);
              } else if (operationType === "create" || operationType === "number") {
                let node = new ObjectNodeImpl(patch);
                if (operatorName === "number") {
                  operatorName = tokens[2];
                  id = tokens[3];
                  position.x = parseInt(tokens[4]);
                  position.y = parseInt(tokens[5]);
                } else if (operationType === "create" && tokens.length === 6) {
                  console.log("TOKENS.length=6 moving");
                  operatorName = tokens[1] + " " + tokens[2];
                  id = tokens[3];
                  position.x = parseInt(tokens[4]);
                  position.y = parseInt(tokens[5]);
                }
                if (operatorName === "out") {
                  operatorName = "out " + outNumber;
                  outNumber++;
                }
                if (operatorName === "in") {
                  operatorName = "in " + inNumber;
                  inNumber++;
                }
                let ret = node.parse(operatorName, OperatorContextType.ZEN, false);
                if (!ret) {
                  console.log("MISSING OPERATOR NAME=", operatorName);
                } else {
                }
                node.position = position;

                console.log(
                  "saving node=%s with id=%s tokens.length=%s",
                  node.name,
                  id,
                  tokens.length,
                );
                ids[id] = node;
                newObjectNode(node, position);
                nodes.push(node);
              }
            }

            let connections: Connections = {};
            for (let op of ops) {
              let tokens = Array.isArray(op) ? op : op.split(" ");
              console.log(tokens);
              let [operationType, source, dest, sourceOutlet, destInlet] = tokens;
              if (operationType === "connect") {
                let _source = ids[source];
                let _dest = ids[dest];
                if (!_dest || !_source) {
                  console.log("there was no source for id=", dest, source);
                  continue;
                }
                let outlet = parseInt(sourceOutlet);
                let inlet = parseInt(destInlet);
                if (!_dest.inlets[inlet] || !_source.outlets[outlet]) {
                  continue;
                }
                let c = _source.connect(_dest, _dest.inlets[inlet], _source.outlets[outlet], false);

                if (!connections[_source.id]) {
                  connections[_source.id] = [];
                }

                connections[_source.id].push(c);
              }
            }
            updateConnections(connections);
            patch.recompileGraph();
            patch.assistant.nodesAdded = nodes;
            resolve(nodes);
          }
        });
      });
    },
    [patch, setObjectNodes, connections, setConnections, objectNodes],
  );

  useEffect(() => {
    window.addEventListener("click", resume);
    return () => window.removeEventListener("click", resume);
  }, [patch]);

  const resume = useCallback(() => {
    if (patch && patch.audioContext.state === "suspended") {
      patch.audioContext.resume();
    }
  }, [patch]);

  useEffect(() => {
    if (props.isCustomView) {
      patch.setObjectNodes = setObjectNodes;
    }
  }, [setObjectNodes, patch]);

  const loadProjectPatch = useCallback(
    (serializedPatch: SerializedPatch) => {
      patch.objectNodes = [];
      patch.messageNodes = [];
      let connections = patch.fromJSON(serializedPatch);
      //patch.previousSerializedPatch = _json;
      setConnections(connections);
      setObjectNodes([...patch.objectNodes]);
      setMessageNodes([...patch.messageNodes]);
    },
    [setMessageNodes, setObjectNodes, patch, setConnections],
  );

  const loadProject = useCallback(
    (project: Project) => {
      patch.name = project.name;
      patch.objectNodes = [];
      if ((project.json as any).compressed) {
        const binaryBuffer = Buffer.from((project.json as any).compressed, "base64");

        // Decompress the data using Pako
        const decompressed = pako.inflate(binaryBuffer, { to: "string" });
        let _json = JSON.parse(decompressed);
        let connections = patch.fromJSON(_json);
        //patch.previousSerializedPatch = _json;
        setConnections(connections);
        setObjectNodes([...patch.objectNodes]);
        setMessageNodes([...patch.messageNodes]);
      } else {
        let connections = patch.fromJSON(project.json);
        //patch.previousSerializedPatch = project.json;
        setConnections(connections);
        setObjectNodes([...patch.objectNodes]);
        setMessageNodes([...patch.messageNodes]);
      }
    },
    [setMessageNodes, setObjectNodes, patch, setConnections],
  );

  useEffect(() => {
    setPatch(props.patch);
  }, [props.patch]);

  useEffect(() => {}, [props.patch]);

  useEffect(() => {
    setObjectNodes([...patch.objectNodes]);
    setMessageNodes([...patch.messageNodes]);

    let connections: Connections = {};
    for (let node of patch.objectNodes) {
      let _connections: IOConnection[] = [];
      for (let outlet of node.outlets) {
        _connections = [..._connections, ...outlet.connections];
      }
      connections[node.id] = _connections;
    }
    setConnections(connections);
  }, [patch, setObjectNodes, setMessageNodes, patches]);

  const segmentCable = useCallback(
    (connection: IOConnection, segment: number) => {
      if (segment !== undefined && !isNaN(segment)) {
        connection.segmentation = segment;
      }
      setConnections({ ...connections });
    },
    [setConnections, connections],
  );

  const segmentCables = useCallback(
    (sizeIndex: SizeIndex) => {
      for (let id in connections) {
        for (let connection of connections[id]) {
          if ((!connection.segmentation || connection.segmentation < 0) && sizeIndex[id]) {
            let segment = getSegmentation(connection, sizeIndex);
            if (segment !== undefined && !isNaN(segment)) {
              connection.segmentation = segment;
            }
          }
        }
      }
      setConnections({ ...connections });
    },
    [setConnections, connections],
  );

  const registerConnection = useCallback(
    (id: string, connection: IOConnection) => {
      if (!connections[id]) {
        connections[id] = [];
      }
      connections[id] = [...connections[id], connection];
      setConnections({ ...connections });
    },
    [setConnections, connections],
  );

  const updateConnections = useCallback(
    (x: Connections) => {
      setConnections({
        ...connections,
        ...x,
      });
    },
    [setConnections],
  );

  let connectionsRef = useRef<Connections>(connections);
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const deleteConnection = useCallback(
    (id: string, connection: IOConnection) => {
      if (connectionsRef.current[id]) {
        connectionsRef.current[id] = connections[id].filter((x) => x !== connection);
      }
      setConnections({ ...connectionsRef.current });
    },
    [setConnections, connections],
  );

  const deleteNodes = useCallback(
    (nodes: (ObjectNode | MessageNode)[], shallow?: boolean) => {
      if (shallow) {
        patch.objectNodes = patch.objectNodes.filter((x) => !nodes.includes(x));
        patch.messageNodes = patch.messageNodes.filter((x) => !nodes.includes(x));

        setObjectNodes([...patch.objectNodes]);
        setMessageNodes([...patch.messageNodes]);
        return;
      }
      patch.objectNodes = patch.objectNodes.filter((x) => !nodes.includes(x));
      patch.messageNodes = patch.messageNodes.filter((x) => !nodes.includes(x));

      for (let node of nodes) {
        let name = (node as ObjectNode).name;
        if (name == "in" || name === "out") {
          // delete inlet if neede
          let parentNode = (node.patch as SubPatch).parentNode;
          if (parentNode) {
            let args = (node as ObjectNode).arguments;
            if (args && args[0]) {
              let ioletNumber: number = (args[0] as number) - 1;
              if (name === "in") {
                parentNode.inlets.splice(ioletNumber, 1);
              } else {
                parentNode.outlets.splice(ioletNumber, 1);
              }
            }
          }
        }

        for (let outlet of node.outlets) {
          for (let connection of outlet.connections) {
            connection.destination.disconnect(connection, false, true);
            console.log("node.disconnect connection", node, connection);
            node.disconnect(connection, false);
            let id = node.id;
            if (connections[id]) {
              connections[id] = connections[id].filter((x) => x !== connection);
            }
            id = (connection.destination as any).id;
            if (connections[id]) {
              connections[id] = connections[id].filter((x) => x !== connection);
            }
          }
        }
        for (let inlet of node.inlets) {
          for (let connection of inlet.connections) {
            console.log("node.disconnect connection", node, connection);
            connection.source.disconnect(connection, false);
            node.disconnect(connection, false);
            let id = (connection.source as any).id;
            if (connections[id]) {
              connections[id] = connections[id].filter((x) => x !== connection);
            }
            id = (connection.destination as any).id;
            if (connections[id]) {
              connections[id] = connections[id].filter((x) => x !== connection);
            }
          }
        }
      }
      setConnections({ ...connections });
      setObjectNodes([...patch.objectNodes]);
      setMessageNodes([...patch.messageNodes]);
      if (
        nodes.some(
          (x) =>
            (x as ObjectNode).operatorContextType === OperatorContextType.ZEN ||
            (x as ObjectNode).operatorContextType === OperatorContextType.GL,
        )
      ) {
        console.log("BRUV");
        patch.recompileGraph();
      }
    },
    [patch, setObjectNodes, connections, setConnections],
  );

  const newObjectNode = useCallback(
    (objectNode: ObjectNode, position: Coordinate) => {
      objectNode.position = position;
      patch.objectNodes = [...patch.objectNodes, objectNode];
      setObjectNodes(patch.objectNodes);
    },
    [setObjectNodes, patch],
  );

  /*
    const publicClient = usePublicClient();
    const { data: subpatches, isError, isLoading } = useContractRead({
        address: MINTER_CONTRACT,
        abi: abi,
        functionName: 'getPatchHeads',
        args: [true]
    })


    let flagg = useRef(false);
    useEffect(() => {
        if (!(patch as SubPatch).parentPatch && subpatches && !flagg.current) {
            flagg.current = true;
            fetchAll(subpatches);
        }
    }, [subpatches]);

    let { storePatch } = useStorage();
    const fetchAll = async (list: any) => {
        let fetched: any[] = [];
        let position = { x: 100, y: 100 };
        for (let elem of list) {
            let tokenId = elem.tokenId;
            let _patch = await fetchOnchainSubPatch(publicClient, tokenId);
            let node = new ObjectNodeImpl(patch);
            node.parse(elem.name, undefined, undefined, _patch);
            position = {
                ...position,
                y: position.y + 30
            }
            // newObjectNode(node, position);
            let __patch = node.subpatch;
            if (__patch) {
                console.log('storing patch', elem.name);
                await storePatch(elem.name, __patch, true, "alecresende@gmail.com");
            }
        }
    };
    */

  const newMessageNode = useCallback(
    (messageNode: MessageNode, position: Coordinate) => {
      messageNode.position = position;
      patch.messageNodes = [...patch.messageNodes, messageNode];
      setMessageNodes(patch.messageNodes);
    },
    [setObjectNodes, patch],
  );

  return (
    <PatchContext.Provider
      value={{
        updateConnections,
        setPatch,
        deleteNodes,
        patch,
        objectNodes,
        messageNodes,
        newMessageNode,
        newObjectNode,
        registerConnection,
        connections,
        deleteConnection,
        loadProject,
        segmentCable,
        segmentCables,
        loadProjectPatch,
        assist,
        isCustomView: props.isCustomView ? true : false,
      }}
    >
      {children}
    </PatchContext.Provider>
  );
};
