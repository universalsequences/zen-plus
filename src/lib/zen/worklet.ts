import { Context } from "./context";
import { createWorkletCode } from "./createWorkletCode";
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

export interface ParsedCode {
  code: string;
  messageIdx: number;
  messageConstants: string[];
  messageArray: string;
}

export const parseMessages = (target: Target, code: string, parsed: ParsedCode): ParsedCode => {
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

export interface CodeOutput {
  code: string;
  wasm: string;
}

export const genProcess = (graph: ZenGraph): CodeOutput => {
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

    if (this.messageCounter % 128 === 0) {
      this.flushWASMMessages();
    }
    this.messageCounter++;

    if (this.events.length > 0) {
      this.scheduleEvents(128);
    }

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

         //let arr = this.output.slice(j*128, (j+1)*128);
         //outputs[0][j].set(arr, 0);
         outputs[0][j].set(this.output.subarray(j * 128, (j + 1) * 128), 0);

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
