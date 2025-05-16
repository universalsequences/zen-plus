import { Target } from "./targets";
import {
  CodeOutput,
  ParsedCode,
  genMemory,
  genProcess,
  parseMessages,
  prettyPrint,
} from "./worklet";
import { ZenGraph } from "./zen";

export const createWorkletCode = (name: string, graph: ZenGraph): CodeOutput => {
  // first lets replace all instances of @message with what we want
  let parsed: ParsedCode = {
    code: graph.code || "",
    messageConstants: [],
    messageIdx: 1,
    messageArray: "",
  };

  parsed = parseMessages(graph.context.target, graph.code || "", parsed);
  graph.code = parsed.code;
  let { code, wasm } = genProcess(graph);

  parsed = parseMessages(
    graph.context.target,
    graph.context.target === Target.C ? wasm : code,
    parsed,
  );

  if (graph.context.target === Target.C) {
    wasm = parsed.code;
  } else {
    code = parsed.code;
  }

  let out = `
class ${name}Processor extends AudioWorkletProcessor {

  async loadWASM(wasmBuffer) {
try {
    const wasmModule = await WebAssembly.compile(wasmBuffer);
    const importObject = {
    env: {
      memory: new WebAssembly.Memory({ initial: 256, maximum: 256 })
    },
 GOT: {
    mem: {}
  }
   };

    const wasmInstance = await WebAssembly.instantiate(wasmModule, importObject);
    this.wasmModule = wasmInstance;
    this.elapsed = 0;
    const BLOCK_SIZE = 128;
    this.inputPtr = wasmInstance.exports.my_malloc(BLOCK_SIZE * 4 * ${graph.numberOfInputs});
    this.input = new Float32Array(wasmInstance.exports.memory.buffer, this.inputPtr, BLOCK_SIZE * ${graph.numberOfInputs});
    this.outputPtr = wasmInstance.exports.my_malloc(BLOCK_SIZE * 4 * ${graph.numberOfOutputs});
    this.output = new Float32Array(wasmInstance.exports.memory.buffer, this.outputPtr, BLOCK_SIZE * ${graph.numberOfOutputs});
    this.port.postMessage({type: "wasm-ready"});
    this.wasmModule.exports.initSineTable();
} catch ( E) {
this.port.postMessage({type: "error-compiling", data: "yo"});
}
  }

  constructor(options) {
    super();
    this.ready = false;
    this.counter=0;
    this.messageCounter = 0;
    this.messagePort = this.port;
    this.messageRate = 32;
    this.disposed = false;
    this.id = "${name}";
    this.events = [];
    this.messageKey = { type: '', subType: '' };
    this.messageQueue = {}; // Map of type/subType -> array of messages
    this.lastMessageTime = new Map(); // Map of type/subType -> last message time
    this.messageInterval = 100; // Minimum interval between messages for a given type/subType (in milliseconds)

    ${prettyPrint("    ", genMemory(graph))}

    this.messageKeys = [];
    ${parsed.messageArray}

    this.createSineTable();

    this.port.onmessage = (e) => {
       if (e.data.type === "memory-set") {
         let {idx, value} = e.data.body;
         if (this.wasmModule) {
           this.wasmModule.exports.setMemorySlot(idx, value);
         } else {
            this.memory[idx] = value;
         }
       } else if (e.data.type === "message-port") {
         this.messagePort =  e.data.port;
       } else if (e.data.type === "load-wasm") {
          this.loadWASM(e.data.body);
       } else if (e.data.type === "schedule-set") {
         let {idx, value, time} = e.data.body;
         this.events.push(e.data.body);
       } else if (e.data.type === "cancel-schedule-set") {
         const { uuid } = e.data.body;
         this.cancelSchedule(uuid);
       } else if (e.data.type === "messageRate") {
         this.messageRate = e.data.body;
       } else if (e.data.type === "init-memory") {
         let {idx, data, time} = e.data.body;
         if (this.wasmModule) {
          if (time) {
            for (let i=0; i < data.length; i++) {
              this.events.push({idx: idx+i, value: data[i], time});
            }
          } else {
            const ptr = this.allocateMemory(data.length);
            this.copyDataToWasmMemory(data, ptr);
            this.wasmModule.exports.initializeMemory(idx, ptr, data.length);
            this.wasmModule.exports.my_free(ptr);
          }
         } else {
            this.memory.set(data, idx)
         }
      } else if (e.data.type === "memory-get") {
           if (this.wasmModule) {
             const memPointer = this.wasmModule.exports.get_memory();
             const memArray  = new Float32Array(this.wasmModule.exports.memory.buffer, memPointer , this.memory.length * 3);
             let {idx, allocatedSize} = e.data.body;
             this.port.postMessage({
               type: "memory-get",
               body: memArray.slice(idx, idx+allocatedSize)
             });

           } else {
             let {idx, allocatedSize} = e.data.body;
             this.port.postMessage({
               type: "memory-get",
               body: this.memory.slice(idx, idx+allocatedSize)
             });
           }
       } else if (e.data.type === "dispose") {
           this.disposed = true;
           this.memory = null;
       } else if (e.data.type === "ready") {
           this.ready = true;
       }
    }
  }

  cancelSchedule(uuid) {
    this.events = this.events.filter(x => x.uuid !== uuid);
  }

  createSineTable() {
    const sineTableSize = 1024; // Choose a suitable size for the table, e.g., 4096
    this.sineTable = new Float32Array(sineTableSize);

    for (let i = 0; i < sineTableSize; i++) {
      this.sineTable[i] = Math.sin((2 * Math.PI * i) / sineTableSize);
    }
  }

  toDelete = [];
  scheduleEvents(time=1) {
      this.toDelete.length = 0;
      for (let event of this.events) {
          let idx = event.idx;
          let value = event.value;
          event.time -= time;
          if (event.time <= 0) {
             if (this.wasmModule) {
                this.wasmModule.exports.setMemorySlot(idx, value);
             } else {
               this.memory[idx] = value;
             }
             this.toDelete.push(event);
          }
     }
     if (this.toDelete.length > 0) {
        for (let event of this.toDelete) {
           let index = this.events.indexOf(event);
           this.events.splice(index, 1);
        }
     }
  }

   flushWASMMessages() {
      if (!this.wasmModule) {
         return;
      }
      let numMessages = this.wasmModule.exports.get_message_counter();
      if (numMessages === 0) {
        return;
      }
      const messageArrayPtr = this.wasmModule.exports.flush_messages();
      const messageArray = new Float32Array(this.wasmModule.exports.memory.buffer, messageArrayPtr, 1000 * 24);
      let messages = {
       };
      let times = {
       };
      let heap32 = new Int32Array(this.wasmModule.exports.memory.buffer);
      //let heapF64 = new Float64Array(this.wasmModule.exports.memory.buffer);
      let heapF32 = new Float32Array(this.wasmModule.exports.memory.buffer);
let ids = [];
let keys = [];
      for (let i=0; i < numMessages*28; i+=28) {
          let messagePtr = messageArrayPtr + i;
          let _type = heap32[messagePtr / 4] - 1;
          let subType = heapF32[(messagePtr + 4) / 4];
          let body = heapF32[(messagePtr + 8) / 4];
          let time = heapF32[(messagePtr + 12) / 4];

         let type = this.messageKeys[_type];
         ids.push(_type);
         keys.push(type);
         if (!messages[type]) {
            messages[type] = {};
         }
         messages[type][subType] = body;
         if (!times[type]) {
            times[type] = {};
         }
         times[type][subType] = time;
      }
      for (let type in messages) {
          for (let subType in messages[type]) {
             subType = parseFloat(subType);
let msg = {type, subType, body: messages[type][subType], time: times[type][subType]};
             this.port.postMessage(msg);
          }
      }
      this.wasmModule.exports.empty_messages();
   }


   copyDataToWasmMemory(data, ptr) {
     const bytesPerElement = Float32Array.BYTES_PER_ELEMENT;
     const memory = this.wasmModule.exports.memory;
     const wasmFloat32Array = new Float32Array(memory.buffer, ptr, data.length);
     wasmFloat32Array.set(data);
   }

   allocateMemory(length) {
     const bytesPerElement = Float32Array.BYTES_PER_ELEMENT;
     const ptr = this.wasmModule.exports.my_malloc(length * bytesPerElement);
     return ptr;
   }

   queueMessage(type, subType, data) {
    // Get the subType map for the given type
    let subTypeMap = this.messageQueue.get(type);
    if (!subTypeMap) {
      subTypeMap = new Map();
      this.messageQueue.set(type, subTypeMap);
    }

    // Add the message to the queue for the given type/subType
    subTypeMap.set(subType, data);
  }

  checkMessages() {
    // Iterate over the message queue and send messages if the rate limit has elapsed
    for (const [type, subTypeMap] of this.messageQueue.entries()) {
      for (const [subType, message] of subTypeMap.entries()) {
          this.port.postMessage({type, subType, body: message});
      }
    }
  }

  ${prettyPrint("   ", code)}
}

registerProcessor("${name}", ${name}Processor)
`;
  return {
    code: out,
    wasm,
  };
};
