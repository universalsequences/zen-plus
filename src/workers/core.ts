import { handleWorkerOperation } from "./operations";
import type { WorkerOperation } from "./types";
import init, {
  new_mgmt,
  new_node,
  connect,
  receive,
  NumberMessage,
  get_node_state,
  run_event_loop,
} from "zen_rust";

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

self.onmessage = async (e: MessageEvent) => {
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

  const a = new_node(mgmt, "+");
  const mess = new_node(mgmt, "message");

  if (a !== undefined && mess !== undefined) {
    console.log("connecting a->b");
    connect(mgmt, a, mess, 0, 1);

    console.log("send 5 to A(1)");
    let recv1 = receive(mgmt, a, 1, { value: 5 });
    console.log("recv1", recv1);
    console.log("send 2 to A(0)");
    let recv2 = receive(mgmt, a, 0, { value: 8 });
    console.log("recv2", recv2);
    console.log("yo 2 to A(0)");

    const state = get_node_state(mgmt, mess);
    console.log("state received=", state);
  }

  //handleWorkerOperation(operation);
};
