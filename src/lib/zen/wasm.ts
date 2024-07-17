import { ZenGraph, Generated } from "./zen";
import { Context } from "./context";
import {
  isVariableEmitted,
  getAllVariables,
  printCodeFragments,
  CodeFragment,
} from "./emitter";

import { CodeBlock, SIMDBlock } from "./simd";
import { replaceAll } from "./replaceAll";
import {
  genFunctions,
  genInputs,
  genHistories,
  declareOutputs,
  prettyPrint,
  genOutputs,
} from "./worklet";
import { determineBlocks } from "./blocks/analyze";
import { printBlocks, printUserFunction } from "./blocks/printBlock";
import { printConstantInitializer } from "./blocks/printConstants";
import { Target } from "./targets";
import { determineMemorySize } from "./memory/initialize";

export const generateWASM = (graph: ZenGraph) => {
  const memorySize = determineMemorySize(graph.context);

  const hasSIMD = true;
  const blocks = determineBlocks(...graph.codeFragments);
  const blocksCode = printBlocks(blocks, Target.C);

  let code = `
${hasSIMD ? "#include <wasm_simd128.h>" : ""}
#include <stdlib.h>
#include <stdio.h>
#include <emscripten.h>
#include <math.h>
#define BLOCK_SIZE 128 // The size of one block of samples
#define MEM_SIZE ${memorySize} // Define this based on your needs
#define SINE_TABLE_SIZE 1024
#define MAX_MESSAGES 10000

double memory[MEM_SIZE] __attribute__((aligned(16))); // Your memory buffer
double  sineTable[SINE_TABLE_SIZE]; // Your memory buffer

int elapsed = 0;

struct Message {
   int type;
   double subType;
   double body;
   double currentTime;
};

int message_checker = 0;
int message_counter = 0;
struct Message messages[MAX_MESSAGES];

void new_message(int type, float subType, float body, float currentTime) {
   messages[message_counter].type = type;
   messages[message_counter].subType = subType;
   messages[message_counter].body = body;
   messages[message_counter].currentTime = currentTime;
   message_counter = (message_counter + 1);
   if (message_counter >= MAX_MESSAGES) {
     message_counter = 0;
   }
}

EMSCRIPTEN_KEEPALIVE
int get_message_counter() {
  return message_counter;
}

// Get a pointer to the messages array
struct Message* EMSCRIPTEN_KEEPALIVE flush_messages() {
   return messages;
}

// Get a pointer to the messages array
double * EMSCRIPTEN_KEEPALIVE get_memory() {
    return memory;
}

EMSCRIPTEN_KEEPALIVE
void empty_messages() {
    message_counter = 0;
}

double random_double() {
    return rand() / (float)RAND_MAX;
}

EMSCRIPTEN_KEEPALIVE
void* my_malloc(size_t size) {
    return malloc(size);
}


EMSCRIPTEN_KEEPALIVE
void my_free(float *ptr) {
    free(ptr);
}


${printConstantInitializer(graph.context)}

EMSCRIPTEN_KEEPALIVE
void initSineTable() {
    for (int i = 0; i < SINE_TABLE_SIZE; i++) {
        sineTable[i] = sin((2 * M_PI * i) / SINE_TABLE_SIZE);
    }

    initializeConstants();
}

EMSCRIPTEN_KEEPALIVE
void setMemorySlot(int idx, double val) {
    memory[idx] = val;
}

// Function to initialize the memory array
EMSCRIPTEN_KEEPALIVE
void initializeMemory(int idx, float* data, int length) {
    for (int i = 0; i < length && i < MEM_SIZE; i++) {
        memory[idx + i] = data[i];
    }
}

v128_t wasm_f32x4_mod(v128_t a, v128_t b) {
    // a: dividend vector, b: divisor vector
    v128_t div_result = wasm_f32x4_div(a, b);
    v128_t floored = wasm_f32x4_floor(div_result);
    v128_t multiplied_back = wasm_f32x4_mul(floored, b);
    v128_t remainder = wasm_f32x4_sub(a, multiplied_back);
    return remainder;
}


v128_t float_blend(v128_t condition, v128_t vecA, v128_t vecB) {
    // Generate a mask where true (condition > 0) lanes are all bits set
    v128_t mask = wasm_f32x4_gt(condition, wasm_f32x4_splat(0.0));

    // This part assumes vecA if condition > 0, else vecB.
    // Since WebAssembly currently lacks a direct f32x4 blend operation based on a mask,
    // a workaround that simulates this operation is necessary.

    // Apply mask: true selects from vecA, false selects from vecB.
    // Unfortunately, we can't apply wasm_v128_and/not/or directly to floating points
    // in a manner that achieves conditional selection based on floating-point values.
    // The correct approach in WebAssembly SIMD would typically involve integer masks
    // generated from comparisons, then using these masks to select between vectors.

    // Placeholder for a correct SIMD blending approach:
    // - Use comparison operations to generate masks.
    // - Use generated masks to blend between vectors.

    // Return a placeholder result; this needs proper implementation.
    return wasm_v128_or(wasm_v128_and(mask, vecA), wasm_v128_and(wasm_v128_not(mask), vecB));
}

${graph.functions.map((x) => printUserFunction(x, Target.C)).join("\n")}

${blocksCode}
`;
  if (hasSIMD) {
    code = replaceAll(code, "double", "float");
  }
  return code;
};

const genSIMDArrays = (simdBlocks: SIMDBlock[]): string => {
  let code = "";
  for (let block of simdBlocks) {
    let variable = block.variable;
    // need to declare all the arrays we need outside the body of the process function
    code += `
float block_${variable}[128];
`;
  }
  return code;
};

const genBlockArrays = (variables: string[]): string => {
  let code = "";
  let arrays = [];
  for (let variable of variables) {
    arrays.push(`float block_${variable}[128];`);
  }
  return Array.from(new Set(arrays)).join("\n");
};

const getOutboundVariables = (
  block: CodeBlock,
  blocks: CodeBlock[],
  isSIMD: boolean,
): string[] => {
  if (!block.codeFragments) {
    return [];
  }
  let allVariables = getAllVariables(
    block.context!,
    block.codeFragments[block.codeFragments.length - 1],
  );

  if (isSIMD) {
    return allVariables.filter((x) => !x.includes("constant"));
  }
  let outbound: string[] = [];
  for (let b of blocks) {
    if (b === block) continue;
    let frags = b.codeFragments;
    if (frags) {
      console.log(
        "block #%s frags",
        b.context!.id,
        frags[frags.length - 1],
        frags,
      );
      let blockVariables = getAllVariables(null, frags[frags.length - 1]);
      let out = blockVariables.filter((x) => allVariables.includes(x));
      console.log(
        "out for block #%s",
        b.context!.id,
        out,
        blockVariables,
        allVariables,
      );
      outbound.push(...out);
    }
  }
  outbound = Array.from(new Set(outbound));
  console.log("outbound=", block.context!.id, outbound);
  return outbound.filter((x) => !x.includes("constant"));
};
