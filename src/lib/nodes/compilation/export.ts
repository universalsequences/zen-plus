import { ZenGraph } from "@/lib/zen";
import * as Handlebars from "handlebars";

export interface ParameterData {
  address: number;
  initData?: number[];
  default?: number;
  name: string;
  min: number;
  max: number;
}

export interface ExportedAudioUnit {
  audioUnitMM: string;
  baseAudioUnitMM: string;
  baseAudioUnitHeader: string;
  engineC: string;
  engineH: string;
  parameters: ParameterData[];
}

export const exportParameters = (zenGraph: ZenGraph) => {
  // what we need is the parameters
  const context = zenGraph.context;
  const parameterData: ParameterData[] = [];
  for (let block of context.memory.blocksInUse) {
    if (block.initData) {
      let idx = block._idx === undefined ? block.idx : block._idx;
      const min = block.min !== undefined ? block.min : 0;
      const max = block.max !== undefined ? block.max : 1;
      const defaultValue = block.initData.length === 1 ? block.initData[0] : undefined;
      const name = block.name || "data";
      parameterData.push({
        address: idx as number,
        name: `${name}_${idx}`,
        min,
        max,
        default: defaultValue,
        initData: defaultValue === undefined ? Array.from(block.initData) : undefined,
      });
    }
  }
  return parameterData;
};

export const exportToAudioUnit = (
  parameters: ParameterData[],
  wasmCode: string,
): ExportedAudioUnit => {
  let prunedCode = wasmCode
    .replaceAll("#include <emscripten.h>", "")
    .replaceAll("#include <wasm_simd128.h>", "")
    .replaceAll("EMSCRIPTEN_KEEPALIVE", "")
    .replaceAll(
      "void process(float * inputs, float * outputs, float currentTime)",
      "void process(float* inputs, float* outputs, uint32_t numFrames, uint32_t numChannels)",
    )
    .replaceAll("__attribute__((aligned(16)))", "")
    .replaceAll("for (int j=0; j < BLOCK_SIZE; j+= 1)", "for (int j=0; j < numFrames; j+= 1)");

  let start = prunedCode.indexOf("v128_t wasm");
  let ending =
    "return wasm_v128_or(wasm_v128_and(mask, vecA), wasm_v128_and(wasm_v128_not(mask), vecB));";
  let end = prunedCode.indexOf(ending) + ending.length + 6;

  prunedCode = prunedCode.slice(0, start) + prunedCode.slice(end);

  console.log("parameters= ", parameters);
  const template = Handlebars.compile(audioUnitTemplate);
  const compiled = template({
    className: `AudioUnit${Math.floor(Math.random() * 1000000)}`,
    parameters: parameters.filter((x) => x.default !== undefined),
  });

  let audioUnit = {
    engineC: prunedCode,
    engineH: engineHeader,
    parameters,
    audioUnitMM: compiled,
    baseAudioUnitHeader,
    baseAudioUnitMM,
  };

  console.log(audioUnit);
  return audioUnit;
};

const audioUnitTemplate = `
#import "BaseAudioUnit.h"
#include "engine.h"

@interface {{className}} : BaseAudioUnit

@end

@implementation {{className}}

- (instancetype)initWithComponentDescription:(AudioComponentDescription)componentDescription
                                      options:(AudioComponentInstantiationOptions)options
                                        error:(NSError **)outError {
    NSArray *parameterConfigs = @[
        {{#each parameters}}
        @{
            @"name": @"{{this.name}}",
            @"address": @({{this.address}}),
            @"min": @({{this.min}}),
            @"max": @({{this.max}})
        },
        {{/each}}
    ];

    void (^processBlock)(float *, float *, uint32_t, uint32_t) = ^(float *inputs, float *outputs, uint32_t numFrames, uint32_t numChannels) {
          process(inputs, outputs, numFrames, numChannels);
      };

      return [super initWithComponentDescription:componentDescription options:options error:outError parameterConfigs:parameterConfigs processBlock:processBlock];
}

@end
`;

const baseAudioUnitMM = `
#import "BaseAudioUnit.h"

@interface BaseAudioUnit ()

@property (nonatomic, strong) NSMutableArray<AUParameter *> *parameters;
@property (nonatomic, strong) AUParameterTree *parameterTree;
@property (nonatomic, copy) void (^processBlock)(float *, float *, uint32_t, uint32_t);

@end

@implementation BaseAudioUnit {
    AudioBufferList *_inputBufferList;
    float *_outputBuffer;
    AUAudioFrameCount _maxFramesToRender;
}

- (instancetype)initWithComponentDescription:(AudioComponentDescription)componentDescription
                                      options:(AudioComponentInstantiationOptions)options
                                        error:(NSError **)outError
                             parameterConfigs:(NSArray<NSDictionary *> *)parameterConfigs
                                 processBlock:(void (^)(float *, float *, uint32_t, uint32_t))processBlock {
    self = [super initWithComponentDescription:componentDescription options:options error:outError];
    if (!self) {
        return nil;
    }

    _parameters = [NSMutableArray array];
    NSMutableArray<AUParameter *> *parameterArray = [NSMutableArray array];

    for (NSDictionary *config in parameterConfigs) {
        AUParameter *parameter = [AUParameterTree createParameterWithIdentifier:config[@"name"]
                                                                           name:config[@"name"]
                                                                        address:[config[@"address"] unsignedIntValue]
                                                                            min:[config[@"min"] floatValue]
                                                                            max:[config[@"max"] floatValue]
                                                                           unit:kAudioUnitParameterUnit_Generic
                                                                       unitName:nil
                                                                          flags:0
                                                                   valueStrings:nil
                                                            dependentParameters:nil];
        [parameterArray addObject:parameter];
        [_parameters addObject:parameter];
    }

    _parameterTree = [AUParameterTree createTreeWithChildren:parameterArray];
    _processBlock = [processBlock copy];

    _inputBufferList = (AudioBufferList *)malloc(sizeof(AudioBufferList) + sizeof(AudioBuffer));
    _inputBufferList->mNumberBuffers = 1;
    _inputBufferList->mBuffers[0].mNumberChannels = 1;
    _inputBufferList->mBuffers[0].mDataByteSize = 0;
    _inputBufferList->mBuffers[0].mData = NULL;

    _outputBuffer = (float *)malloc(sizeof(float) * 4096);

    return self;
}

- (AUInternalRenderBlock)internalRenderBlock {
    return ^AUAudioUnitStatus(AUAudioUnitRenderActionFlags *actionFlags,
                              const AudioTimeStamp *timestamp,
                              AUAudioFrameCount frameCount,
                              NSInteger outputBusNumber,
                              AudioBufferList *outputBufferList,
                              const AURenderEvent *realtimeEventListHead,
                              AURenderPullInputBlock pullInputBlock) {
        AUAudioUnitStatus status = noErr;

        if (pullInputBlock) {
            status = pullInputBlock(actionFlags, timestamp, frameCount, 0, _inputBufferList);
            if (status != noErr) return status;
        }

        float *outputData = _outputBuffer;
        _processBlock(NULL, outputData, frameCount, 1);

        for (AUAudioFrameCount frame = 0; frame < frameCount; frame++) {
            float sample = outputData[frame];
            for (int channel = 0; channel < outputBufferList->mNumberBuffers; channel++) {
                ((float *)outputBufferList->mBuffers[channel].mData)[frame] = sample;
            }
        }

        return noErr;
    };
}

@end
`;

const baseAudioUnitHeader = `
#import <AudioToolbox/AudioToolbox.h>

@interface BaseAudioUnit : AUAudioUnit

- (instancetype)initWithComponentDescription:(AudioComponentDescription)componentDescription
                                      options:(AudioComponentInstantiationOptions)options
                                        error:(NSError **)outError
                             parameterConfigs:(NSArray<NSDictionary *> *)parameterConfigs
                                 processBlock:(void (^)(float *, float *, uint32_t, uint32_t))processBlock;

@property (nonatomic, readonly) AUParameterTree *parameterTree;

@end
`;

const engineHeader = `
//
//  engine.h
//

#ifndef engine_h
#define engine_h

#include <stdio.h>

void process(float *inputs, float *outputs, uint32_t numFrames, uint32_t numChannels);
void initializeMemory(float* data, int length);

#endif /* engine_h */

`;
