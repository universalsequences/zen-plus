import { ZenGraph } from './zen';
import { replaceAll } from './replaceAll';
import { genFunctions, genInputs, genHistories, declareOutputs, prettyPrint, genOutputs } from './worklet';


export const generateWASM = (graph: ZenGraph) => {
    let memorySize = graph.context.memory.size;
    const SIMD_FUNCTIONS = `
    float matrix4x4SumResult[4];

    float* matrix4x4Sum(int inputIdx, int matrixIdx, int size) {
       v128_t sum = wasm_f32x4_splat(0.0f); // initialize an SIMD vector with zeros
       int i=0;
       for (i=0; i < 4; i++) {
          v128_t weights = wasm_f32x4_splat(memory[inputIdx+i]); 
          int idx = matrixIdx + i * size;
          v128_t row = wasm_v128_load(&memory[idx]);
          v128_t prod = wasm_f32x4_mul(row, weights);
          sum = wasm_f32x4_add(sum, prod);
       }
       wasm_v128_store(matrix4x4SumResult, sum); 
       return matrix4x4SumResult;
    }
`;
    let hasSIMD = true;
    if (!graph.functions.some(x => x.code.includes("matrix4x4")) &&
        !graph.code.includes("matrix4x4")) {
        hasSIMD = false;
    }

    let varKeyword = graph.context.varKeyword;
    let code = `
${hasSIMD ? "#include <wasm_simd128.h>" : ""}
#include <stdlib.h>
#include <emscripten.h>
#include <math.h>
#define BLOCK_SIZE 128 // The size of one block of samples

#define MEM_SIZE ${memorySize} // Define this based on your needs
#define SINE_TABLE_SIZE 1024
#define MAX_MESSAGES 10000

double memory[MEM_SIZE]; // Your memory buffer
double  sineTable[SINE_TABLE_SIZE]; // Your memory buffer

int elapsed = 0;

struct Message {
   int type;
   double subType;
   double body;
};

int message_counter = 0;
struct Message messages[MAX_MESSAGES];

void new_message(int type, float subType, float body) {
   messages[message_counter].type = type;
   messages[message_counter].subType = subType;
   messages[message_counter].body = body;
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
        //message_counter = 0;
    }

    
    double random_double() {
        return rand() / (float)RAND_MAX;
    }

${hasSIMD ? SIMD_FUNCTIONS : ""}
/*
*/

    EMSCRIPTEN_KEEPALIVE
    void* my_malloc(size_t size) {
        return malloc(size);
    }

    EMSCRIPTEN_KEEPALIVE
    void initSineTable() {
        for (int i = 0; i < SINE_TABLE_SIZE; i++) {
            sineTable[i] = sin((2 * M_PI * i) / SINE_TABLE_SIZE);
        }
    }

/*
    void init(float * mem) {
        for (int i = 0; i < MEM_SIZE; i++) {
            memory[i] = mem[i];
        }
    }
*/

    EMSCRIPTEN_KEEPALIVE
    void setMemorySlot(int idx, double val) {
        memory[idx] = val;
    }

/*
    void setMemoryRegion(int idx, double* val, int size) {
        for (int i = 0; i < size; i++) {
            memory[idx + i] = val[i];
        }
    }
*/

${genFunctions(graph.functions, graph.context.target, graph.context.varKeyword)}

    EMSCRIPTEN_KEEPALIVE
    void process(float * inputs, float * outputs) {
        for (int j = 0; j < BLOCK_SIZE; j++) {
      ${genInputs(graph)}
      ${declareOutputs(graph)}
      ${genHistories(graph)}
      ${prettyPrint("      ", graph.code)}
      ${genOutputs(graph)}
            elapsed++;
        }
    }

    `;
    if (hasSIMD) {
        code = replaceAll(code, "double", "float");
    }
    return code;
}
