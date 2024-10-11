import { Message } from "@/lib/nodes/types";
import { handleWorkerOperation } from "./operations";
import type { WorkerOperation } from "./types";
/*
import init, {
  new_mgmt,
  new_node,
  edit_node,
  connect,
  receive,
  NumberMessage,
  get_node_state,
  run_event_loop,
} from "zen_rust";
*/

/**
 * what is the point of this worker stuff?
 * could we try doing the absolute simplest thing possible:
 * simply run the function on the worker thread
 * in the main thread:
 * when register a function we register a node here so theres one copy
 * when we need to call it we set its current arguments here and run it here
 * we output the results
 *
 * problem 1: serializing shit like buffers and arrays will result in bad memory performance
 *
 * ideally we'd stay in the graph fully
 */

let inited = false;
let mgmt: number;

type NodeIdMapFrom = {
  [x: string]: number;
};

type NodeIdMapTo = {
  [x: number]: string;
};

const NODE_ID_MAP_FROM: NodeIdMapFrom = {};
const NODE_ID_MAP_TO: NodeIdMapTo = {};

const serialize = (message: Message) => {
  if (typeof message === "number") {
    return {
      value: message as number,
    };
  }
  if (typeof message === "string") {
    if (message === "bang") {
      return {
        bang: true,
      };
    }
    return {
      value: message as string,
    };
  }
  return {
    bang: true,
  };
};
self.onmessage = async (e: MessageEvent) => {
  /*
  console.log("on message e.data=", e.data);
  if (e.data.type === "register_new_node") {
    console.log("yas");
    if (!mgmt) {
      return;
    }
    const { name, inlets, outlets, id } = e.data.data;
    console.log("mgmt=", mgmt);
    console.log("NAME=%s inlets=%s outlets=%s", name, inlets, outlets);
    const existing_id = NODE_ID_MAP_FROM[id];
    const node_id =
      existing_id !== undefined
        ? edit_node(mgmt, existing_id, name, inlets, outlets)
        : new_node(mgmt, name, inlets, outlets);
    console.log("id returned", node_id);
    if (node_id !== undefined) {
      NODE_ID_MAP_FROM[id] = node_id;
      NODE_ID_MAP_TO[node_id] = id;
    }
  } else if (e.data.type === "connect") {
    console.log("connecting");
    if (!mgmt) {
      return;
    }
    const { fromId, toId, inlet, outlet } = e.data.data;
    const rust_from_id = NODE_ID_MAP_FROM[fromId];
    const rust_to_id = NODE_ID_MAP_FROM[toId];
    console.log("NODE_ID_MAP_FROM", NODE_ID_MAP_FROM);
    if (rust_from_id !== undefined && rust_to_id !== undefined) {
      connect(mgmt, rust_from_id, rust_to_id, outlet, inlet);
    }
  } else if (e.data.type === "receive") {
    const { id, message, inlet } = e.data.data;
    const rust_id = NODE_ID_MAP_FROM[id];
    const serialized = serialize(message);
    console.log("serialized=", serialized);
    receive(mgmt, rust_id, inlet, serialized);
  } else {
    console.log("initializing wasm");
    if (!inited) {
      await init();
      inited = true;
      mgmt = new_mgmt();
      console.log("runnign event loop");
      console.log("its running");
    }

    if (!mgmt) {
      return;
    }
    console.log("initialized");
    const operation = e.data as WorkerOperation;

    console.log("created mgmt", mgmt);

    const a = new_node(mgmt, "+", 2, 1);
    const mess = new_node(mgmt, "message", 2, 1);
    const pack = new_node(mgmt, "pack", 2, 1);
    console.log("mess returned=", mess);

    if (a !== undefined && mess !== undefined && pack !== undefined) {
      console.log("connecting a->b");
      connect(mgmt, pack, mess, 0, 1);

      receive(mgmt, pack, 1, { value: 15 });
      receive(mgmt, pack, 0, { value: 5 });

      receive(mgmt, mess, 1, { value: 6 });
      console.log("send 5 to A(1)");
      let recv1 = receive(mgmt, a, 1, { value: 5 });
      console.log("recv1", recv1);
      console.log("send 2 to A(0)");
      let recv2 = receive(mgmt, a, 0, { value: 8 });
      console.log("recv2", recv2);
      console.log("yo 2 to A(0)");

      //const state = get_node_state(mgmt, mess);
      //console.log("state received=", state);
    }
  }
  */
  //handleWorkerOperation(operation);
};
