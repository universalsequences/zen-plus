import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react";
import { usePatches } from "@/contexts/PatchesContext";
import type { Buffer } from "@/lib/tiling/types";
import { OperatorContextType } from "@/lib/nodes/context";
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
  buffer?: Buffer;
}

interface Props {
  children: React.ReactNode;
  patch: Patch;
  isCustomView?: boolean;
  buffer?: Buffer;
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

  const { patches, counter } = usePatches();

  useEffect(() => {
    window.addEventListener("click", resume);
    return () => window.removeEventListener("click", resume);
  }, [patch]);

  const resume = useCallback(() => {
    if (patch?.audioContext?.state === "suspended") {
      patch.audioContext?.resume();
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
  }, [patch, setObjectNodes, setMessageNodes, patches, counter]);

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
        patch.clearCache();
        patch.recompileGraph();
      }
    },
    [patch, setObjectNodes, connections, setConnections],
  );

  const newObjectNode = useCallback(
    (objectNode: ObjectNode, position: Coordinate) => {
      objectNode.position = position;
      patch.objectNodes = [...patch.objectNodes, objectNode];
      objectNode.justCreated = true;
      setObjectNodes(patch.objectNodes);
    },
    [setObjectNodes, patch],
  );

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
        buffer: props.buffer,
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
        isCustomView: props.isCustomView ? true : false,
      }}
    >
      {children}
    </PatchContext.Provider>
  );
};
