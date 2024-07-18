
#include <wasm_simd128.h>
#include <stdlib.h>
#include <stdio.h>
#include <emscripten.h>
#include <math.h>
#define BLOCK_SIZE 128 // The size of one block of samples
#define MEM_SIZE 7960281 // Define this based on your needs
#define SINE_TABLE_SIZE 1024
#define MAX_MESSAGES 10000

float memory[MEM_SIZE] __attribute__((aligned(16))); // Your memory buffer
float  sineTable[SINE_TABLE_SIZE]; // Your memory buffer

int elapsed = 0;

struct Message {
   int type;
   float subType;
   float body;
   float currentTime;
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
float * EMSCRIPTEN_KEEPALIVE get_memory() {
    return memory;
}

EMSCRIPTEN_KEEPALIVE
void empty_messages() {
    message_counter = 0;
}

float random_float() {
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



float constant_arg3_214[128] __attribute__((aligned(16)));
float constant_arg3_219[128] __attribute__((aligned(16)));
float constant_arg3_223[128] __attribute__((aligned(16)));
float constant_arg3_227[128] __attribute__((aligned(16)));
float constant_arg3_231[128] __attribute__((aligned(16)));

void initializeConstants() {
    for (int i=0; i < 128; i++) {
        constant_arg3_214[i] = 0;
    }
    for (int i=0; i < 128; i++) {
        constant_arg3_219[i] = 0;
    }
    for (int i=0; i < 128; i++) {
        constant_arg3_223[i] = 0;
    }
    for (int i=0; i < 128; i++) {
        constant_arg3_227[i] = 0;
    }
    for (int i=0; i < 128; i++) {
        constant_arg3_231[i] = 0;
    }

}


EMSCRIPTEN_KEEPALIVE
void initSineTable() {
    for (int i = 0; i < SINE_TABLE_SIZE; i++) {
        sineTable[i] = sin((2 * M_PI * i) / SINE_TABLE_SIZE);
    }

    initializeConstants();
}

EMSCRIPTEN_KEEPALIVE
void setMemorySlot(int idx, float val) {
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

float grain29aq_out[2560]__attribute__((aligned(16)));
float block_maxVal189 [128] __attribute__((aligned(16)));;
float block_subVal202 [128] __attribute__((aligned(16)));;
float block_funcArg163 [128] __attribute__((aligned(16)));;
float block_result159 [128] __attribute__((aligned(16)));;
float block_subVal168 [128] __attribute__((aligned(16)));;
float block_invoc176 [128] __attribute__((aligned(16)));;
float block_multVal150 [128] __attribute__((aligned(16)));;
float block_samps151 [128] __attribute__((aligned(16)));;
float block_funcArg139 [128] __attribute__((aligned(16)));;
float block_divVal131 [128] __attribute__((aligned(16)));;
float block_powVal133 [128] __attribute__((aligned(16)));;
float block_addVal135 [128] __attribute__((aligned(16)));;
float block_historyVal129 [128] __attribute__((aligned(16)));;
float block_historyVal128 [128] __attribute__((aligned(16)));;
float block_historyVal127 [128] __attribute__((aligned(16)));;
float block_historyVal126 [128] __attribute__((aligned(16)));;
float block_historyVal125 [128] __attribute__((aligned(16)));;
float block_historyVal124 [128] __attribute__((aligned(16)));;
float block_historyVal123 [128] __attribute__((aligned(16)));;
float block_historyVal122 [128] __attribute__((aligned(16)));;
float block_historyVal121 [128] __attribute__((aligned(16)));;
float block_output0 [128] __attribute__((aligned(16)));;
float block_histVal155 [128] __attribute__((aligned(16)));;
float block_switch137 [128] __attribute__((aligned(16)));;
float block_gtVal136 [128] __attribute__((aligned(16)));;
float block_message177 [128] __attribute__((aligned(16)));;
float block_addVal205 [128] __attribute__((aligned(16)));;
float block_peekVal212 [128] __attribute__((aligned(16)));;
float block_multVal213 [128] __attribute__((aligned(16)));;
float block_output3 [128] __attribute__((aligned(16)));;
float block_output2 [128] __attribute__((aligned(16)));;
float block_result210 [128] __attribute__((aligned(16)));;
float block_output1 [128] __attribute__((aligned(16)));;
void grain29aq(int invocation, float *totalLength ,float *trig ,float *playhead ,float *pitchOffset ,float *density ) {

    v128_t constantVector186= wasm_f32x4_splat(1);
    v128_t constantVector188= constantVector186;
    v128_t constantVector190= wasm_f32x4_splat(0);
    v128_t constantVector203= constantVector186;
    v128_t constantVector157= wasm_f32x4_splat(0.5);
    v128_t constantVector_1160= wasm_f32x4_splat(-1);
    v128_t constantVector_2161= constantVector186;
    v128_t constantVector169= constantVector190;
    v128_t constantVector144= wasm_f32x4_splat(1.1);
    v128_t constantVector147= constantVector186;
    v128_t constantVector149= wasm_f32x4_splat(1000);
    v128_t constantVector132= wasm_f32x4_splat(12);
    v128_t constantVector208= wasm_f32x4_splat(2);
    v128_t constantVector_2211= constantVector190;
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#71 */
        v128_t historyVal122 = wasm_v128_load(block_historyVal122 + j);
        v128_t historyVal121 = wasm_v128_load(block_historyVal121 + j);
        v128_t historyVal124 = wasm_v128_load(block_historyVal124 + j);
        v128_t subVal185 = wasm_f32x4_sub(constantVector186, historyVal122);
        /* id: 249 */
        v128_t minVal187 = wasm_f32x4_min(subVal185,constantVector188);
        /* id: 251 */
        v128_t maxVal189 = wasm_f32x4_max(constantVector190,minVal187);
        /* id: 253 */
        v128_t subVal202 = wasm_f32x4_sub(constantVector203, historyVal121);
        /* id: 271 */
        v128_t funcArg163 = wasm_v128_load(playhead + j);  /* id: 203 */
        v128_t bitmask158 = wasm_f32x4_gt(historyVal124, constantVector157);
        v128_t trueVec158 = wasm_f32x4_splat(1.0f);
        v128_t falseVec158 = wasm_f32x4_splat(0.0f);
        v128_t gtVal156 = wasm_v128_bitselect(trueVec158, falseVec158, bitmask158);
        /* id: 197 */
        v128_t result159 = float_blend(gtVal156, constantVector_1160, constantVector_2161);
        /* id: 199 */
        v128_t funcArg167 = wasm_v128_load(totalLength + j);  /* id: 209 */
        v128_t subVal168 = wasm_f32x4_sub(funcArg167, constantVector169);
        /* id: 211 */
        wasm_v128_store(block_maxVal189 + j, maxVal189); // Store the result
        wasm_v128_store(block_subVal202 + j, subVal202); // Store the result
        wasm_v128_store(block_funcArg163 + j, funcArg163); // Store the result
        wasm_v128_store(block_result159 + j, result159); // Store the result
        wasm_v128_store(block_subVal168 + j, subVal168); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#72 */
        float invoc176 = invocation;
        /* id: 195 */
        block_invoc176 [j] = invoc176;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#69 */
        v128_t historyVal128 = wasm_v128_load(block_historyVal128 + j);
        v128_t multVal143 = wasm_f32x4_mul(historyVal128, constantVector144);
        /* id: 177 */
        v128_t funcArg145 = wasm_v128_load(density + j);  /* id: 179 */
        v128_t divVal146 = wasm_f32x4_div(constantVector147, funcArg145);
        /* id: 181 */
        v128_t multVal148 = wasm_f32x4_mul(divVal146, constantVector149);
        /* id: 183 */
        v128_t multVal150 = wasm_f32x4_mul(multVal143, multVal148);
        /* id: 185 */
        wasm_v128_store(block_multVal150 + j, multVal150); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#68 */
        float multVal150 = block_multVal150 [j];
        float samps151 = (multVal150/1000)*44100; /* id: 187 */
        block_samps151 [j] = samps151;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#67 */
        v128_t historyVal127 = wasm_v128_load(block_historyVal127 + j);
        v128_t funcArg139 = wasm_v128_load(trig + j);  /* id: 169 */
        v128_t divVal131 = wasm_f32x4_div(historyVal127, constantVector132);
        /* id: 155 */
        wasm_v128_store(block_funcArg139 + j, funcArg139); // Store the result
        wasm_v128_store(block_divVal131 + j, divVal131); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#65 */
        float divVal131 = block_divVal131 [j];
        float powVal133 = pow(2.0,divVal131); /* id: 157 */
        block_powVal133 [j] = powVal133;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#64 */
        v128_t powVal133 = wasm_v128_load(block_powVal133 + j);
        v128_t funcArg134 = wasm_v128_load(pitchOffset + j);  /* id: 159 */
        v128_t addVal135 = wasm_f32x4_add(powVal133, funcArg134);
        /* id: 161 */
        wasm_v128_store(block_addVal135 + j, addVal135); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#61 */
        float historyVal129 = memory[29];/* param */
        block_historyVal129 [j] = historyVal129;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#60 */
        float historyVal128 = memory[28];/* param */
        block_historyVal128 [j] = historyVal128;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#59 */
        float historyVal127 = memory[27];/* param */
        block_historyVal127 [j] = historyVal127;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#58 */
        float historyVal126 = memory[26];/* param */
        block_historyVal126 [j] = historyVal126;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#57 */
        float historyVal125 = memory[25];/* param */
        block_historyVal125 [j] = historyVal125;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#56 */
        float historyVal124 = memory[24];/* param */
        block_historyVal124 [j] = historyVal124;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#55 */
        float historyVal123 = memory[23];/* param */
        block_historyVal123 [j] = historyVal123;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#54 */
        float historyVal122 = memory[22];/* param */
        block_historyVal122 [j] = historyVal122;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#53 */
        float historyVal121 = memory[21];/* param */
        block_historyVal121 [j] = historyVal121;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#51 */
        float historyVal130 = memory[30 + 1*invocation];
        float historyVal121 = block_historyVal121 [j];
        float historyVal125 = block_historyVal125 [j];
        float addVal135 = block_addVal135 [j];
        float funcArg139 = block_funcArg139 [j];
        float samps151 = block_samps151 [j];
        float invoc176 = block_invoc176 [j];
        float result159 = block_result159 [j];
        float funcArg163 = block_funcArg163 [j];
        float subVal168 = block_subVal168 [j];
        float maxVal189 = block_maxVal189 [j];
        float subVal202 = block_subVal202 [j];
        float gtVal136 = historyVal130 > 0.0; /* id: 163 */
        float switch137 = gtVal136 ? 2.0 : 1.0; /* id: 165 */
        float eqVal138 = switch137 == 1.0; /* id: 167 */
        float switch140 = eqVal138 ? funcArg139 : 0.0; /* id: 171 */
        float latchVal141 = memory[7960270 + 1*invocation];
        if (switch140 > 0) {
        memory[7960270 + 1*invocation] = addVal135;
        latchVal141 = memory[7960270 + 1*invocation];
        } /* id: 173 */
        float accum142 = memory[7960275 + 1*invocation];
        if (switch140 > 0) accum142 = 0;
        memory[7960275 + 1*invocation] = accum142 + latchVal141;
        if (memory[7960275 + 1*invocation] >= 100000000) memory[7960275 + 1*invocation] -= 100000000;
        /* id: 175 */
        float divVal152 = samps151 == 0.0 ? 0.0 : accum142 / samps151; /* id: 189 */
        float gteVal153 = divVal152 >= 1.0; /* id: 191 */
        float switch154 = gteVal153 ? 0.0 : divVal152; /* id: 193 */
        memory[30 + 1*invocation] = switch154;
        float histVal155 = historyVal130;
        float multVal162 = accum142 * result159; /* id: 201 */
        float latchVal164 = memory[95 + 1*invocation];
        if (switch140 > 0) {
        memory[95 + 1*invocation] = funcArg163;
        latchVal164 = memory[95 + 1*invocation];
        } /* id: 205 */
        float addVal165 = multVal162 + latchVal164; /* id: 207 */
        float subVal166 = addVal165 - 0.0; /* id: 213 */
        float modVal170 = fmod(subVal166, subVal168); /* id: 215 */
        float gteVal171 = modVal170 >= 0.0; /* id: 217 */
        float addVal172 = modVal170 + 0.0; /* id: 219 */
        float addVal173 = modVal170 + 0.0; /* id: 221 */
        float addVal174 = subVal168 + addVal173; /* id: 223 */
        float switch175 = gteVal171 ? addVal172 : addVal174; /* id: 225 */
        if ((message_checker++) % 97 == 0) {
        new_message(1, invoc176, switch175, 0.0);
        }
        float message177 = switch175;
        /* id: 227 */
        float preIdx178 = message177;
        if (preIdx178 > 3980000 - 1) preIdx178 = 0; //3980000;
        else if (preIdx178 < 0) preIdx178 += 3980000;
        int channelIdx178 = 0.0;
        if (channelIdx178 > 2) channelIdx178 -= 2;
        else if (channelIdx178 < 0) channelIdx178 += 2;
        float peekIdx178 = 3980000 * channelIdx178 + preIdx178;
        float frac178 = peekIdx178 - floor(peekIdx178);
        int nextIdx178 = floor(peekIdx178) + 1;
        if (nextIdx178 >= (3980000 * (0.0)) + 3980000) {
        nextIdx178 =  3980000 * (0.0);
        }
        int peekIdx_2178 = 100 + floor(peekIdx178);
        int peekIdx_3178 = 100 + nextIdx178;
        float peekVal178 = (1 - frac178)*memory[peekIdx_2178] + (frac178)*memory[peekIdx_3178];
        /* id: 229 */
        float ltVal179 = switch154 < historyVal125; /* id: 231 */
        float range1180 = historyVal125 - 0.0;
        float range2180 = 1;
        float normVal180 = range1180 == 0 ? 0 :
        (switch154 - 0.0) / range1180;
        float scaleVal180 = 0.0 + range2180 * pow(normVal180, 1.0); /* id: 233 */
        float range1181 = 1.0 - historyVal125;
        float range2181 = -1;
        float normVal181 = range1181 == 0 ? 0 :
        (switch154 - historyVal125) / range1181;
        float scaleVal181 = 1.0 + range2181 * pow(normVal181, 1.0); /* id: 235 */
        float switch182 = ltVal179 ? scaleVal180 : scaleVal181; /* id: 237 */
        float minVal183 = fmin(switch182,1.0); /* id: 245 */
        float maxVal184 = fmax(0.0,minVal183); /* id: 247 */
        float gteVal191 = maxVal184 >= maxVal189; /* id: 255 */
        float multVal192 = maxVal184 * 3.141592653589793; /* id: 257 */
        float divVal193 = maxVal189 == 0.0 ? 0.0 : multVal192 / maxVal189; /* id: 259 */
        float cosVal194 = cos(divVal193); /* id: 261 */
        float subVal195 = 1.0 - cosVal194; /* id: 263 */
        float multVal196 = subVal195 * 0.5; /* id: 265 */
        float switch197 = gteVal191 ? 1.0 : multVal196; /* id: 267 */
        float multVal198 = switch197 * historyVal121; /* id: 269 */
        float multVal199 = switch182 * 3.141592653589793; /* id: 239 */
        float cosVal200 = cos(multVal199); /* id: 241 */
        float range1201 = -2;
        float range2201 = 1;
        float normVal201 = range1201 == 0 ? 0 :
        (cosVal200 - 1.0) / range1201;
        float scaleVal201 = 0.0 + range2201 * pow(normVal201, 1.0); /* id: 243 */
        float multVal204 = scaleVal201 * subVal202; /* id: 273 */
        float addVal205 = multVal198 + multVal204; /* id: 275 */
        float multVal206 = peekVal178 * addVal205; /* id: 277 */
        float output0 = multVal206;
        float preIdx212 = message177;
        if (preIdx212 > 3980000 - 1) preIdx212 = 0; //3980000;
        else if (preIdx212 < 0) preIdx212 += 3980000;
        int channelIdx212 = 1.0;
        if (channelIdx212 > 2) channelIdx212 -= 2;
        else if (channelIdx212 < 0) channelIdx212 += 2;
        float peekIdx212 = 3980000 * channelIdx212 + preIdx212;
        float frac212 = peekIdx212 - floor(peekIdx212);
        int nextIdx212 = floor(peekIdx212) + 1;
        if (nextIdx212 >= (3980000 * (1.0)) + 3980000) {
        nextIdx212 =  3980000 * (1.0);
        }
        int peekIdx_2212 = 100 + floor(peekIdx212);
        int peekIdx_3212 = 100 + nextIdx212;
        float peekVal212 = (1 - frac212)*memory[peekIdx_2212] + (frac212)*memory[peekIdx_3212];
        /* id: 283 */
        block_output0 [j] = output0;
        block_histVal155 [j] = histVal155;
        block_switch137 [j] = switch137;
        block_gtVal136 [j] = gtVal136;
        block_message177 [j] = message177;
        block_addVal205 [j] = addVal205;
        block_peekVal212 [j] = peekVal212;
        grain29aq_out [0 + 1 * invocation * 128 + j] = output0;
                    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#116 */
        v128_t peekVal212 = wasm_v128_load(block_peekVal212 + j);
        v128_t addVal205 = wasm_v128_load(block_addVal205 + j);
        v128_t multVal213 = wasm_f32x4_mul(peekVal212, addVal205);
        /* id: 285 */
        wasm_v128_store(block_multVal213 + j, multVal213); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#114 */
        float multVal213 = block_multVal213 [j];
        float gtVal136 = block_gtVal136 [j];
        float output3 = multVal213;
        float output2 = gtVal136;
        block_output3 [j] = output3;
        block_output2 [j] = output2;
        grain29aq_out [384 + 4 * invocation * 128 + j] = output3;
                        grain29aq_out [256 + 4 * invocation * 128 + j] = output2;
                    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#111 */
        v128_t switch137 = wasm_v128_load(block_switch137 + j);
        v128_t funcArg139 = wasm_v128_load(block_funcArg139 + j);
        v128_t bitmask209 = wasm_f32x4_eq(switch137, constantVector208);
        v128_t trueVec209 = wasm_f32x4_splat(1.0f);
        v128_t falseVec209 = wasm_f32x4_splat(0.0f);
        v128_t eqVal207 = wasm_v128_bitselect(trueVec209, falseVec209, bitmask209);
        /* id: 279 */
        v128_t result210 = float_blend(eqVal207, funcArg139, constantVector_2211);
        /* id: 281 */
        wasm_v128_store(block_result210 + j, result210); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#109 */
        float result210 = block_result210 [j];
        float output1 = result210;
        grain29aq_out [128 + 2 * invocation * 128 + j] = output1;
                    }
elapsed += 128;

}



float block_historyVal115 [128] __attribute__((aligned(16)));;
float block_historyVal109 [128] __attribute__((aligned(16)));;
float block_historyVal103 [128] __attribute__((aligned(16)));;
float block_message93 [128] __attribute__((aligned(16)));;
float block_historyVal24 [128] __attribute__((aligned(16)));;
float block_clickVal1 [128] __attribute__((aligned(16)));;
float block_latchVal2 [128] __attribute__((aligned(16)));;
float block_historyVal7 [128] __attribute__((aligned(16)));;
float block_historyVal10 [128] __attribute__((aligned(16)));;
float block_powVal11 [128] __attribute__((aligned(16)));;
float block_historyVal9 [128] __attribute__((aligned(16)));;
float block_multVal12 [128] __attribute__((aligned(16)));;
float block_historyVal78 [128] __attribute__((aligned(16)));;
float block_historyVal77 [128] __attribute__((aligned(16)));;
float block_divVal87 [128] __attribute__((aligned(16)));;
float block_ms73 [128] __attribute__((aligned(16)));;
float block_historyVal8 [128] __attribute__((aligned(16)));;
float block_divVal18 [128] __attribute__((aligned(16)));;
float block_multVal27 [128] __attribute__((aligned(16)));;
float block_divVal76 [128] __attribute__((aligned(16)));;
float block_multVal88 [128] __attribute__((aligned(16)));;
float block_subVal94 [128] __attribute__((aligned(16)));;
float block_multVal106 [128] __attribute__((aligned(16)));;
float block_subVal111 [128] __attribute__((aligned(16)));;
float block_multVal116 [128] __attribute__((aligned(16)));;
float block_multVal104 [128] __attribute__((aligned(16)));;
float block_historyVal50 [128] __attribute__((aligned(16)));;
float block_historyVal49 [128] __attribute__((aligned(16)));;
float block_divVal54 [128] __attribute__((aligned(16)));;
float block_multVal51 [128] __attribute__((aligned(16)));;
float block_phasor57 [128] __attribute__((aligned(16)));;
float block_historyVal34 [128] __attribute__((aligned(16)));;
float block_samps28 [128] __attribute__((aligned(16)));;
float block_message13 [128] __attribute__((aligned(16)));;
float block_multVal15 [128] __attribute__((aligned(16)));;
float block_subVal35 [128] __attribute__((aligned(16)));;
float block_addVal44 [128] __attribute__((aligned(16)));;
float block_switch32 [128] __attribute__((aligned(16)));;
float block_message47 [128] __attribute__((aligned(16)));;
float block_rampToTrig72 [128] __attribute__((aligned(16)));;
float block_message119 [128] __attribute__((aligned(16)));;
float block_multVal120 [128] __attribute__((aligned(16)));;
float block_addVal241 [128] __attribute__((aligned(16)));;
float block_samps242 [128] __attribute__((aligned(16)));;
float block_maxVal243 [128] __attribute__((aligned(16)));;
float block_t60Val245 [128] __attribute__((aligned(16)));;
float block_nth218 [128] __attribute__((aligned(16)));;
float block_multVal249 [128] __attribute__((aligned(16)));;
float block_vactrol253 [128] __attribute__((aligned(16)));;
float block_nth222 [128] __attribute__((aligned(16)));;
float block_nth226 [128] __attribute__((aligned(16)));;
float block_nth230 [128] __attribute__((aligned(16)));;
float block_divVal269 [128] __attribute__((aligned(16)));;
float block_output1 [128] __attribute__((aligned(16)));;
float block_divVal255 [128] __attribute__((aligned(16)));;
float block_output0 [128] __attribute__((aligned(16)));;
EMSCRIPTEN_KEEPALIVE
void process(float * inputs, float * outputs, float currentTime) {

    v128_t constantVector80= wasm_f32x4_splat(4);
    v128_t constantVector82= wasm_f32x4_splat(1);
    v128_t constantVector86= wasm_f32x4_splat(32);
    v128_t constantVector17= wasm_f32x4_splat(960);
    v128_t constantVector19= constantVector80;
    v128_t constantVector21= wasm_f32x4_splat(8);
    v128_t constantVector23= wasm_f32x4_splat(1000);
    v128_t constantVector26= constantVector23;
    v128_t constantVector75= constantVector23;
    v128_t constantVector95= wasm_f32x4_splat(0);
    v128_t constantVector105= constantVector82;
    v128_t constantVector107= wasm_f32x4_splat(0.5);
    v128_t constantVector112= constantVector82;
    v128_t constantVector53= constantVector82;
    v128_t constantVector55= wasm_f32x4_splat(44100);
    v128_t constantVector36= constantVector95;
    v128_t constantVector236= wasm_f32x4_splat(2);
    v128_t constantVector238= constantVector82;
    v128_t constantVector240= constantVector236;
    v128_t constantVector244= constantVector82;
    v128_t constantVector248= constantVector82;
    v128_t constantVector259= constantVector95;
    v128_t constantVector270= constantVector236;
    v128_t constantVector217= constantVector95;
    v128_t constantVector256= constantVector236;
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#47 */
        float historyVal115 = memory[20];/* param */
        block_historyVal115 [j] = historyVal115;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#43 */
        float historyVal109 = memory[19];/* param */
        block_historyVal109 [j] = historyVal109;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#42 */
        float historyVal103 = memory[18];/* param */
        block_historyVal103 [j] = historyVal103;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#39 */
        float historyVal34 = block_historyVal34 [j];
        if ((message_checker++) % 97 == 0) {
        new_message(2, 0.0, historyVal34, 0.0);
        }
        float message93 = historyVal34;
        /* id: 353 */
        block_message93 [j] = message93;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#16 */
        float historyVal24 = memory[8];/* param */
        block_historyVal24 [j] = historyVal24;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#4 */
        float clickVal1 = memory[1];
        if (clickVal1 > 0) {
        memory[1] = 0;
        }
        /* id: 37 */
        float latchVal2 = memory[2];
        if (clickVal1 > 0) {
        memory[2] = clickVal1;
        latchVal2 = memory[2];
        } /* id: 95 */
        block_clickVal1 [j] = clickVal1;
        block_latchVal2 [j] = latchVal2;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#7 */
        float historyVal7 = memory[4];/* param */
        block_historyVal7 [j] = historyVal7;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#13 */
        float historyVal10 = memory[7];/* param */
        block_historyVal10 [j] = historyVal10;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#12 */
        float historyVal10 = block_historyVal10 [j];
        float powVal11 = pow(2.0,historyVal10); /* id: 101 */
        block_powVal11 [j] = powVal11;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#11 */
        float historyVal9 = memory[6];/* param */
        block_historyVal9 [j] = historyVal9;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#10 */
        v128_t historyVal9 = wasm_v128_load(block_historyVal9 + j);
        v128_t powVal11 = wasm_v128_load(block_powVal11 + j);
        v128_t multVal12 = wasm_f32x4_mul(historyVal9, powVal11);
        /* id: 103 */
        wasm_v128_store(block_multVal12 + j, multVal12); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#38 */
        float historyVal78 = memory[17];/* param */
        block_historyVal78 [j] = historyVal78;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#37 */
        float historyVal77 = memory[16];/* param */
        block_historyVal77 [j] = historyVal77;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#36 */
        v128_t historyVal77 = wasm_v128_load(block_historyVal77 + j);
        v128_t historyVal78 = wasm_v128_load(block_historyVal78 + j);
        v128_t multVal12 = wasm_v128_load(block_multVal12 + j);
        v128_t historyVal8 = wasm_v128_load(block_historyVal8 + j);
        v128_t multVal79 = wasm_f32x4_mul(historyVal78, constantVector80);
        /* id: 327 */
        v128_t maxVal81 = wasm_f32x4_max(multVal79,constantVector82);
        /* id: 329 */
        v128_t modVal83 = wasm_f32x4_mod(historyVal77, maxVal81);
        /* id: 331 */
        v128_t divVal84 = wasm_f32x4_div(multVal12, historyVal8);
        /* id: 333 */
        v128_t multVal85 = wasm_f32x4_mul(divVal84, constantVector86);
        /* id: 335 */
        v128_t divVal87 = wasm_f32x4_div(modVal83, multVal85);
        /* id: 337 */
        wasm_v128_store(block_divVal87 + j, divVal87); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#34 */
        float historyVal34 = block_historyVal34 [j];
        float ms73 = 1000.0*historyVal34/44100; /* id: 339 */
        block_ms73 [j] = ms73;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#8 */
        float historyVal8 = memory[5];/* param */
        block_historyVal8 [j] = historyVal8;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#15 */
        v128_t historyVal8 = wasm_v128_load(block_historyVal8 + j);
        v128_t historyVal24 = wasm_v128_load(block_historyVal24 + j);
        v128_t ms73 = wasm_v128_load(block_ms73 + j);
        v128_t divVal87 = wasm_v128_load(block_divVal87 + j);
        v128_t message93 = wasm_v128_load(block_message93 + j);
        v128_t historyVal103 = wasm_v128_load(block_historyVal103 + j);
        v128_t historyVal109 = wasm_v128_load(block_historyVal109 + j);
        v128_t historyVal115 = wasm_v128_load(block_historyVal115 + j);
        v128_t historyVal34 = wasm_v128_load(block_historyVal34 + j);
        v128_t divVal16 = wasm_f32x4_div(constantVector17, historyVal8);
        /* id: 111 */
        v128_t divVal18 = wasm_f32x4_div(divVal16, constantVector19);
        /* id: 113 */
        v128_t divVal20 = wasm_f32x4_div(divVal18, constantVector21);
        /* id: 115 */
        v128_t multVal22 = wasm_f32x4_mul(divVal20, constantVector23);
        /* id: 117 */
        v128_t divVal25 = wasm_f32x4_div(historyVal24, constantVector26);
        /* id: 119 */
        v128_t multVal27 = wasm_f32x4_mul(multVal22, divVal25);
        /* id: 121 */
        v128_t divVal74 = wasm_f32x4_div(ms73, constantVector75);
        /* id: 341 */
        v128_t divVal76 = wasm_f32x4_div(divVal18, divVal74);
        /* id: 343 */
        float multVal88 = divVal87 * divVal76; /* id: 345 */
        v128_t subVal94 = wasm_f32x4_sub(message93, constantVector95);
        /* id: 355 */
        v128_t multVal104 = wasm_f32x4_mul(historyVal103, constantVector105);
        /* id: 373 */
        v128_t multVal106 = wasm_f32x4_mul(multVal104, constantVector107);
        /* id: 375 */
        v128_t subVal111 = wasm_f32x4_sub(constantVector112, historyVal109);
        /* id: 381 */
        v128_t multVal116 = wasm_f32x4_mul(historyVal115, historyVal34);
        /* id: 387 */
        wasm_v128_store(block_divVal18 + j, divVal18); // Store the result
        wasm_v128_store(block_multVal27 + j, multVal27); // Store the result
        wasm_v128_store(block_divVal76 + j, divVal76); // Store the result
        wasm_v128_store(block_multVal88 + j, multVal88); // Store the result
        wasm_v128_store(block_subVal94 + j, subVal94); // Store the result
        wasm_v128_store(block_multVal106 + j, multVal106); // Store the result
        wasm_v128_store(block_subVal111 + j, subVal111); // Store the result
        wasm_v128_store(block_multVal116 + j, multVal116); // Store the result
        wasm_v128_store(block_multVal104 + j, multVal104); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#24 */
        float historyVal50 = memory[12];/* param */
        block_historyVal50 [j] = historyVal50;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#23 */
        float historyVal49 = memory[11];/* param */
        block_historyVal49 [j] = historyVal49;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#22 */
        v128_t historyVal49 = wasm_v128_load(block_historyVal49 + j);
        v128_t historyVal50 = wasm_v128_load(block_historyVal50 + j);
        v128_t multVal51 = wasm_f32x4_mul(historyVal49, historyVal50);
        /* id: 289 */
        v128_t multVal52 = wasm_f32x4_mul(multVal51, constantVector53);
        /* id: 291 */
        v128_t divVal54 = wasm_f32x4_div(multVal52, constantVector55);
        /* id: 293 */
        wasm_v128_store(block_divVal54 + j, divVal54); // Store the result
        wasm_v128_store(block_multVal51 + j, multVal51); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#28 */
        float divVal54 = block_divVal54 [j];
        float accum56 = memory[14];
        memory[14] = accum56 + divVal54;
        if (memory[14] >= 1) memory[14] -= 1;
        /* id: 295 */
        float phasor57 = accum56;
        /* id: 297 */
        block_phasor57 [j] = phasor57;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#17 */
        float historyVal34 = memory[9];/* param */
        block_historyVal34 [j] = historyVal34;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#14 */
        float multVal27 = block_multVal27 [j];
        float multVal12 = block_multVal12 [j];
        float samps28 = (multVal27/1000)*44100; /* id: 123 */
        if ((message_checker++) % 97 == 0) {
        new_message(3, 0.0, multVal12, 0.0);
        }
        float message13 = multVal12;
        /* id: 105 */
        block_samps28 [j] = samps28;
        block_message13 [j] = message13;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#6 */
        v128_t historyVal7 = wasm_v128_load(block_historyVal7 + j);
        v128_t historyVal8 = wasm_v128_load(block_historyVal8 + j);
        v128_t message13 = wasm_v128_load(block_message13 + j);
        v128_t historyVal34 = wasm_v128_load(block_historyVal34 + j);
        v128_t divVal14 = wasm_f32x4_div(historyVal8, message13);
        /* id: 107 */
        v128_t multVal15 = wasm_f32x4_mul(historyVal7, divVal14);
        /* id: 109 */
        v128_t subVal35 = wasm_f32x4_sub(historyVal34, constantVector36);
        /* id: 133 */
        wasm_v128_store(block_multVal15 + j, multVal15); // Store the result
        wasm_v128_store(block_subVal35 + j, subVal35); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#1 */
        float historyVal10 = memory[7];/* param */
        float historyVal0 = memory[0];
        float historyVal6 = memory[3];
        float historyVal48 = memory[10];
        float historyVal64 = memory[15];
        float multVal15 = block_multVal15 [j];
        float latchVal2 = block_latchVal2 [j];
        float samps28 = block_samps28 [j];
        float subVal35 = block_subVal35 [j];
        float clickVal1 = block_clickVal1 [j];
        float historyVal34 = block_historyVal34 [j];
        float phasor57 = block_phasor57 [j];
        float divVal76 = block_divVal76 [j];
        float multVal88 = block_multVal88 [j];
        float subVal94 = block_subVal94 [j];
        float multVal106 = block_multVal106 [j];
        float historyVal109 = block_historyVal109 [j];
        float subVal111 = block_subVal111 [j];
        float multVal116 = block_multVal116 [j];
        float multVal104 = block_multVal104 [j];
        float addVal3 = latchVal2 + historyVal0; /* id: 97 */
        float ltVal29 = addVal3 < samps28; /* id: 125 */
        float gtVal30 = addVal3 > 0.0; /* id: 127 */
        float andVal31 = ltVal29 && gtVal30; /* id: 129 */
        float switch32 = andVal31 ? 1.0 : 0.0; /* id: 131 */
        float subVal33 = historyVal6 - 0.0; /* id: 135 */
        float modVal37 = fmod(subVal33, subVal35); /* id: 137 */
        float gteVal38 = modVal37 >= 0.0; /* id: 139 */
        float addVal39 = modVal37 + 0.0; /* id: 141 */
        float addVal40 = modVal37 + 0.0; /* id: 143 */
        float addVal41 = subVal35 + addVal40; /* id: 145 */
        float switch42 = gteVal38 ? addVal39 : addVal41; /* id: 147 */
        float switch43 = switch32 ? switch42 : 0.0; /* id: 149 */
        float addVal44 = multVal15 + switch43; /* id: 151 */
        float switch45 = clickVal1 ? 0.0 : addVal44; /* id: 153 */
        memory[3] = switch45;
        float histVal46 = historyVal6;
        float switch4 = clickVal1 ? 0.0 : addVal3; /* id: 99 */
        memory[0] = switch4;
        float histVal5 = historyVal0;
        if ((message_checker++) % 97 == 0) {
        new_message(4, 0.0, historyVal34, 0.0);
        }
        float message47 = historyVal34;
        /* id: 287 */
        memory[10] = phasor57;
        float histVal58 = historyVal48;
        float subVal59 = phasor57 - historyVal48; /* id: 301 */
        float addVal60 = phasor57 + historyVal48; /* id: 303 */
        float divVal61 = addVal60 == 0.0 ? 0.0 : subVal59 / addVal60; /* id: 305 */
        float absVal62 = fabs(divVal61); /* id: 307 */
        float ltVal63 = 0.5 < absVal62; /* id: 309 */
        memory[15] = ltVal63;
        float histVal65 = historyVal64;
        float subVal66 = ltVal63 - historyVal64; /* id: 313 */
        float ltVal67 = 0.0 < subVal66; /* id: 315 */
        float ltVal68 = subVal66 < 0.0; /* id: 317 */
        float subVal69 = ltVal67 - ltVal68; /* id: 319 */
        float sign70 = subVal69;
        /* id: 321 */
        float ltVal71 = 0.0 < sign70; /* id: 323 */
        float rampToTrig72 = ltVal71;
        /* id: 325 */
        if ((message_checker++) % 97 == 0) {
        new_message(5, 0.0, multVal88, 0.0);
        }
        float message89 = multVal88;
        /* id: 347 */
        float multVal90 = message89 * historyVal34; /* id: 349 */
        float addVal91 = multVal90 + addVal44; /* id: 351 */
        float subVal92 = addVal91 - 0.0; /* id: 357 */
        float modVal96 = fmod(subVal92, subVal94); /* id: 359 */
        float gteVal97 = modVal96 >= 0.0; /* id: 361 */
        float addVal98 = modVal96 + 0.0; /* id: 363 */
        float addVal99 = modVal96 + 0.0; /* id: 365 */
        float addVal100 = subVal94 + addVal99; /* id: 367 */
        float switch101 = gteVal97 ? addVal98 : addVal100; /* id: 369 */
        float subVal102 = divVal76 - switch101; /* id: 371 */
        float addVal108 = subVal102 + multVal106; /* id: 377 */
        float multVal110 = addVal108 * historyVal109; /* id: 379 */
        float multVal113 = switch101 * subVal111; /* id: 383 */
        float addVal114 = multVal110 + multVal113; /* id: 385 */
        float addVal117 = addVal114 + multVal116; /* id: 389 */
        float addVal118 = addVal117 + multVal104; /* id: 391 */
        if ((message_checker++) % 97 == 0) {
        new_message(6, 0.0, addVal118, 0.0);
        }
        float message119 = addVal118;
        /* id: 393 */
        float multVal120 = 0; /* id: 395 */
        block_addVal44 [j] = addVal44;
        block_switch32 [j] = switch32;
        block_message47 [j] = message47;
        block_rampToTrig72 [j] = rampToTrig72;
        block_message119 [j] = message119;
        block_multVal120 [j] = multVal120;
    }

    grain29aq(0, block_message47,block_rampToTrig72,block_message119,constant_arg3_214,block_multVal51);


    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#140 */
        v128_t switch32 = wasm_v128_load(block_switch32 + j);
        v128_t multVal235 = wasm_f32x4_mul(constantVector236, switch32);
        /* id: 430 */
        v128_t subVal237 = wasm_f32x4_sub(constantVector238, switch32);
        /* id: 432 */
        v128_t multVal239 = wasm_f32x4_mul(constantVector240, subVal237);
        /* id: 434 */
        v128_t addVal241 = wasm_f32x4_add(multVal235, multVal239);
        /* id: 436 */
        wasm_v128_store(block_addVal241 + j, addVal241); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#139 */
        float addVal241 = block_addVal241 [j];
        float samps242 = (addVal241/1000)*44100; /* id: 438 */
        block_samps242 [j] = samps242;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#138 */
        v128_t samps242 = wasm_v128_load(block_samps242 + j);
        v128_t maxVal243 = wasm_f32x4_max(constantVector244,samps242);
        /* id: 440 */
        wasm_v128_store(block_maxVal243 + j, maxVal243); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#137 */
        float maxVal243 = block_maxVal243 [j];
        float t60Val245 = exp(-6.907755278921 / maxVal243);
        /* id: 442 */
        block_t60Val245 [j] = t60Val245;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#120 */
        v128_t nth218 = wasm_v128_load((grain29aq_out + 512*0) + 128 * 1  + j);  /* id: 402 */
        wasm_v128_store(block_nth218 + j, nth218); // Store the result
    }

    grain29aq(1, block_message47,block_nth218,block_message119,constant_arg3_219,block_multVal51);


    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#136 */
        v128_t switch32 = wasm_v128_load(block_switch32 + j);
        v128_t t60Val245 = wasm_v128_load(block_t60Val245 + j);
        v128_t subVal247 = wasm_f32x4_sub(constantVector248, t60Val245);
        /* id: 448 */
        v128_t multVal249 = wasm_f32x4_mul(switch32, subVal247);
        /* id: 450 */
        wasm_v128_store(block_multVal249 + j, multVal249); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#135 */
        float historyVal234 = memory[7960280];
        float t60Val245 = block_t60Val245 [j];
        float multVal249 = block_multVal249 [j];
        float multVal246 = historyVal234 * t60Val245; /* id: 446 */
        float addVal250 = multVal246 + multVal249; /* id: 452 */
        memory[7960280] = addVal250;
        float histVal251 = historyVal234;
        float onepole252 = addVal250;
        /* id: 454 */
        float vactrol253 = onepole252;
        /* id: 456 */
        block_vactrol253 [j] = vactrol253;
    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#124 */
        v128_t nth222 = wasm_v128_load((grain29aq_out + 512*1) + 128 * 1  + j);  /* id: 409 */
        wasm_v128_store(block_nth222 + j, nth222); // Store the result
    }

    grain29aq(2, block_message47,block_nth222,block_message119,constant_arg3_223,block_multVal51);


    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#128 */
        v128_t nth226 = wasm_v128_load((grain29aq_out + 512*2) + 128 * 1  + j);  /* id: 416 */
        wasm_v128_store(block_nth226 + j, nth226); // Store the result
    }

    grain29aq(3, block_message47,block_nth226,block_message119,constant_arg3_227,block_multVal51);


    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#132 */
        v128_t nth230 = wasm_v128_load((grain29aq_out + 512*3) + 128 * 1  + j);  /* id: 423 */
        wasm_v128_store(block_nth230 + j, nth230); // Store the result
    }

    grain29aq(4, block_message47,block_nth230,block_message119,constant_arg3_231,block_multVal51);


    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#143 */
        v128_t vactrol253 = wasm_v128_load(block_vactrol253 + j);
        v128_t nth257 = wasm_v128_load((grain29aq_out + 512*0) + 128 * 3  + j);  /* id: 462 */
        v128_t addVal258 = wasm_f32x4_add(constantVector259, nth257);
        /* id: 464 */
        v128_t nth260 = wasm_v128_load((grain29aq_out + 512*1) + 128 * 3  + j);  /* id: 466 */
        v128_t addVal261 = wasm_f32x4_add(addVal258, nth260);
        /* id: 468 */
        v128_t nth262 = wasm_v128_load((grain29aq_out + 512*2) + 128 * 3  + j);  /* id: 470 */
        v128_t addVal263 = wasm_f32x4_add(addVal261, nth262);
        /* id: 472 */
        v128_t nth264 = wasm_v128_load((grain29aq_out + 512*3) + 128 * 3  + j);  /* id: 474 */
        v128_t addVal265 = wasm_f32x4_add(addVal263, nth264);
        /* id: 476 */
        v128_t nth266 = wasm_v128_load((grain29aq_out + 512*4) + 128 * 3  + j);  /* id: 478 */
        v128_t addVal267 = wasm_f32x4_add(addVal265, nth266);
        /* id: 480 */
        v128_t multVal268 = wasm_f32x4_mul(addVal267, vactrol253);
        /* id: 482 */
        v128_t divVal269 = wasm_f32x4_div(multVal268, constantVector270);
        /* id: 484 */
        wasm_v128_store(block_divVal269 + j, divVal269); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#141 */
        float divVal269 = block_divVal269 [j];
        float output1 = divVal269;
        block_output1 [j] = output1;
        outputs [128 + j] = output1;
                    }
    for (int j=0; j < BLOCK_SIZE; j+= 4) {
    /* context#20 */
        v128_t vactrol253 = wasm_v128_load(block_vactrol253 + j);
        v128_t nth215 = wasm_v128_load((grain29aq_out + 512*0) + 128 * 0  + j);  /* id: 398 */
        v128_t addVal216 = wasm_f32x4_add(constantVector217, nth215);
        /* id: 400 */
        v128_t nth220 = wasm_v128_load((grain29aq_out + 512*1) + 128 * 0  + j);  /* id: 405 */
        v128_t addVal221 = wasm_f32x4_add(addVal216, nth220);
        /* id: 407 */
        v128_t nth224 = wasm_v128_load((grain29aq_out + 512*2) + 128 * 0  + j);  /* id: 412 */
        v128_t addVal225 = wasm_f32x4_add(addVal221, nth224);
        /* id: 414 */
        v128_t nth228 = wasm_v128_load((grain29aq_out + 512*3) + 128 * 0  + j);  /* id: 419 */
        v128_t addVal229 = wasm_f32x4_add(addVal225, nth228);
        /* id: 421 */
        v128_t nth232 = wasm_v128_load((grain29aq_out + 512*4) + 128 * 0  + j);  /* id: 426 */
        v128_t addVal233 = wasm_f32x4_add(addVal229, nth232);
        /* id: 428 */
        v128_t multVal254 = wasm_f32x4_mul(addVal233, vactrol253);
        /* id: 458 */
        v128_t divVal255 = wasm_f32x4_div(multVal254, constantVector256);
        /* id: 460 */
        wasm_v128_store(block_divVal255 + j, divVal255); // Store the result
    }
    for (int j=0; j < BLOCK_SIZE; j+= 1) {
    /* context#18 */
        float divVal255 = block_divVal255 [j];
        float output0 = divVal255;
        outputs [0 + j] = output0;
                    }
elapsed += 128;

}
