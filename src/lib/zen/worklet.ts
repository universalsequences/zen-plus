import { Context } from "./context";
import { generateWASM } from "./wasm";
import { Target } from "./targets";
import type { ZenGraph } from "./zen";
import { replaceAll } from "./replaceAll";
import type { Function, Argument } from "./functions";
import { fetchWithRetry } from "./fetchWithRetry";
import { generateJSProcess } from "./javascript";
import { determineMemorySize, initMemory } from "./memory/initialize";

export interface ZenWorklet {
  code: string;
  wasm?: string;
  workletNode: AudioWorkletNode;
}

export type LazyZenWorklet = ZenWorklet | (() => AudioWorkletNode);

export const createWorklet = (
  ctxt: AudioContext,
  graph: ZenGraph,
  name = "Zen",
  onlyCompile = false,
): Promise<ZenWorklet> => {
  return new Promise((resolve: (x: ZenWorklet) => void) => {
    const { code, wasm } = createWorkletCode(name, graph);
    console.log(code);
    const workletCode = code;
    const workletBase64 = btoa(workletCode);
    const url = `data:application/javascript;base64,${workletBase64}`;

    const onCompilation = (): AudioWorkletNode => {
      const workletNode = new AudioWorkletNode(ctxt, name, {
        channelInterpretation: "discrete",
        numberOfInputs: graph.context.numberOfInputs,
        numberOfOutputs: 1,
        channelCount: graph.numberOfInputs,
        outputChannelCount: [graph.numberOfOutputs],
      });

      workletNode.port.onmessage = (e: MessageEvent) => {
        const type = e.data.type;
        const body = e.data.body;
        graph.context.onMessage({
          type,
          body,
        });

        if (graph.context.target === Target.C) {
          if (type === "wasm-ready") {
            initMemory(graph.context, workletNode);
            workletNode.port.postMessage({ type: "ready" });
          }
        }
      };

      // Send initial data (Param & Data operators) to the worklet
      if (graph.context.target === Target.C) {
        //fetch("https://zequencer.io/compile", {
        fetch("http://localhost:7171/compile", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: wasm,
        }).then(async (response) => {
          const wasmBuffer = await response.arrayBuffer();
          const wasmModule = await WebAssembly.compile(wasmBuffer);
          workletNode.port.postMessage({ type: "load-wasm", body: wasmBuffer });
        });
      } else {
        initMemory(graph.context, workletNode);
        workletNode.port.postMessage({ type: "ready" });
      }

      // once complete send message saying "ready"

      graph.context.addWorklet(workletNode);
      if (!onlyCompile) {
        resolve({
          code: workletCode,
          workletNode,
          wasm,
        });
      }
      return workletNode;
    };

    ctxt.audioWorklet.addModule(url).then(() => {
      /*
      if (onlyCompile) {
        resolve(onCompilation);
        return;
      }
      */
      onCompilation();
    });
  });
};

interface ParsedCode {
  code: string;
  messageIdx: number;
  messageConstants: string[];
  messageArray: string;
}

const parseMessages = (target: Target, code: string, parsed: ParsedCode): ParsedCode => {
  let beginToken = "@beginMessage";
  let endToken = "@endMessage";
  let indexOf = code.indexOf(beginToken);
  let messageIdx = parsed.messageIdx;
  let messageConstants = [];
  while (indexOf > -1) {
    let end = code.indexOf(endToken);
    if (end === -1) {
      break;
    }
    let messageKey = code.slice(indexOf + beginToken.length, end);
    messageConstants.push(messageKey);
    if (target === Target.C) {
      code = code.slice(0, indexOf) + `${messageIdx++}` + code.slice(end + endToken.length);
    } else {
      code =
        code.slice(0, indexOf) +
        `this.messageKey${messageIdx++}` +
        code.slice(end + endToken.length);
    }
    indexOf = code.indexOf(beginToken);
  }
  messageIdx = parsed.messageIdx;
  for (let message of messageConstants) {
    parsed.messageArray += `this.messageKey${messageIdx} = "${message}";` + "\n";
    parsed.messageArray += `this.messageKeys[${messageIdx - 1}] = "${message}";` + "\n";
    messageIdx++;
  }

  parsed.messageIdx = messageIdx;
  parsed.messageConstants = [...parsed.messageConstants, ...messageConstants];

  return {
    ...parsed,
    code,
  };
};

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
this.port.postMessage({type: "load wasm called",body: "yo"});
try {
    const wasmModule = await WebAssembly.compile(wasmBuffer);
this.port.postMessage({type: "compile completed",body: "yo"});
    const importObject = {
    env: {
      memory: new WebAssembly.Memory({ initial: 256, maximum: 256 })
    },
 GOT: {
    mem: {}
  }
   };

this.port.postMessage({type: "initing wasm",body: "yo"});
    const wasmInstance = await WebAssembly.instantiate(wasmModule, importObject);
    this.wasmModule = wasmInstance;
    this.elapsed = 0;
this.port.postMessage({type: "init succesfful for wasm",body: "yo"});

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

  constructor() {
    super();
    this.ready = false;
    this.counter=0;
    this.messageCounter = 0;
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

this.port.postMessage({type: "ack",body: "yo"});


    this.port.onmessage = (e) => {
       if (e.data.type === "memory-set") {
         let {idx, value} = e.data.body;
         if (this.wasmModule) {
           this.wasmModule.exports.setMemorySlot(idx, value);
         } else {
            this.memory[idx] = value;
         }
       } else if (e.data.type === "load-wasm") {
          this.loadWASM(e.data.body);
       } else if (e.data.type === "schedule-set") {
         let {idx, value, time} = e.data.body;
         this.events.push(e.data.body);
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

interface CodeOutput {
  code: string;
  wasm: string;
}
const genProcess = (graph: ZenGraph): CodeOutput => {
  for (const history of graph.histories) {
    if (!history.includes("*i")) {
      graph.code = replaceAll(graph.code || "", history, "");
    }
  }

  if (graph.context.target === Target.C) {
    const wasmFile = generateWASM(graph);
    const code = `
process(inputs, outputs, parameters) {
    if (this.disposed || !this.ready) {
      return true;
    }
    const BLOCK_SIZE = 128;
    let inputChannel = inputs[0];
    let outputChannel = outputs[0];

    if (this.messageCounter % 32 === 0) {
      this.flushWASMMessages();
    }
    this.messageCounter++;

    this.scheduleEvents(128);

    for (let i = 0; i < 1; i ++) {
      if (!this.wasmModule) {
         return true;
      }
      for (let j = 0; j < ${graph.numberOfInputs}; j++) {
        const inputChannel = inputs[0][j];
        // Copy input samples to input buffer
        if (inputChannel) {
          this.input.set(inputChannel, j * 128);
        }
      }

      // Process samples
      this.wasmModule.exports.process(this.inputPtr, this.outputPtr, currentTime);

      // Copy output buffer to output channel
      for (let j=0; j < ${graph.numberOfOutputs}; j++) {

         let arr = this.output.slice(j*128, (j+1)*128);
if (j === 1) {
}
         outputs[0][j].set(arr, 0);
      }
    }
    return true;
}
`;
    return { code, wasm: wasmFile };
  }

  const jsCode = generateJSProcess(graph);
  let generatedFunctions = genFunctions(
    graph.functions,
    graph.context.target,
    graph.context.varKeyword,
  );

  const codeOut = `
${jsCode.functions}
${jsCode.process}
`;

  return { code: codeOut, wasm: "" };
  let out = `
${generatedFunctions}
process(inputs, outputs) {
    if (this.disposed || !this.ready) {
      return true;
    }
  let memory = this.memory;


  // note: we need to go thru each output channel for each sample
  // instead of how we are doing it here... or else the histories
  // will get all messed up.
  // actually, really the whole channels concept should be removed...
  for (let j=0; j < outputs[0][0].length; j++) {
      let elapsed = this.elapsed++;
      this.messageCounter++;

    if (this.messageCounter % 2000 === 0) {
      //this.checkMessages();
    }
      this.scheduleEvents();
      ${genInputs(graph)}
      ${declareOutputs(graph)}
      ${genHistories(graph)}
      ${prettyPrint("      ", graph.code || "")}
      ${genOutputs(graph)}
    }
  return true;
}
`;

  return { code: out, wasm: "" };
};

export const genHistories = (graph: ZenGraph): string => {
  return _genHistories(graph.context.varKeyword, graph.histories, true);
};

export const _genHistories = (
  varKeyword: string,
  histories: string[],
  isMain: boolean = true,
): string => {
  let out = "";
  let already: string[] = [];
  for (let hist of histories) {
    if (isMain && hist.includes("*i")) {
      continue;
    }
    hist = hist.replace("let", varKeyword) + ";";
    if (!already.includes(hist) && !out.includes(hist)) {
      out += prettyPrint("   ", hist);
    }
    already.push(hist);
  }
  return out;
};

export const declareOutputs = (graph: ZenGraph): string => {
  let out = ``;
  for (let i = 0; i < graph.numberOfOutputs; i++) {
    out += `${graph.context.varKeyword} output${i} = 0;`;
  }
  return out;
};

export const genInputs = (graph: ZenGraph): string => {
  let out = "";
  for (let i = 0; i < graph.numberOfInputs; i++) {
    if (graph.context.target === Target.C) {
      out += `${graph.context.varKeyword} in${i} = inputs[j + ${128 * i}];
`;
    } else {
      out += `${graph.context.varKeyword} in${i} = inputs[0][${i}]  ? inputs[0][${i}][j] : 0;
`;
    }
  }
  return out;
};

export const genOutputs = (graph: ZenGraph): string => {
  let out = ``;
  for (let i = 0; i < graph.numberOfOutputs; i++) {
    if (graph.context.target === Target.C) {
      out += `
        outputs[j + ${128 * i}] = output${i};
`;
    } else {
      out += `
            outputs[0][${i}][j] = output${i};
            `;
    }
  }
  return out;
};

export const genMemory = (graph: ZenGraph): string => {
  return `
            this.memory = new Float64Array(${determineMemorySize(graph.context)});
            `;
};

export const prettyPrint = (prefix: string, code: string): string => {
  return code
    .split("\n")
    .map((x) => prefix + x)
    .join("\n");
};

export const genFunctions = (functions: Function[], target: Target, varKeyword: string) => {
  let out = "";
  for (let func of functions) {
    let name: string = func.name;
    let body: string = func.code || "";
    let __args = dedupeArgs(func.functionArguments);
    __args.sort((a, b) => a.num - b.num);
    let args: string = __args
      .map((x) => (target === Target.C ? varKeyword + " " : "") + x.name)
      .join(",");
    let histories = func.histories;
    let THIS = target === Target.C ? "" : "this.";
    let memory = target === Target.C ? "" : "let memory = this.memory;";
    let generatedHistories = _genHistories("let", histories, false);
    for (let history of histories) {
      body = replaceAll(body, history, "");
    }
    let elapsed = target === Target.C ? "" : "let elapsed = this.elapsed";
    let bodyCode = `
${elapsed}
${memory}
${generatedHistories}
${body}
return ${func.variable!};
    `;
    let prefix = target === Target.C ? varKeyword + "* " : "";
    let invoc = target === Target.C ? "int " : "";
    let array =
      target === Target.C
        ? `${varKeyword} ${name}Array[16];`
        : `${name}Array = new Float32Array(16)`;
    out += `
 ${array}

${prefix} ${name}(${invoc} invocation, ${args}) {
${prettyPrint("    ", bodyCode)}
}
            `;
  }
  return out;
};

const dedupeArgs = (args: Argument[]) => {
  let x: Argument[] = [];
  for (let arg of args) {
    if (!x.some((x) => x.num === arg.num)) {
      x.push(arg);
    }
  }
  return x;
};
