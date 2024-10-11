import type { API } from "@/lib/nodes/context";
/*
import { projection } from './projection';
import { ADD_SOURCE_SHADER } from './source';
import { DIFFUSION_SHADER, ADVECT_A_SHADER, ADVECT_B_SHADER } from './navier';
import { doc } from './doc';
import { ObjectNode, Message, Lazy } from '@/lib/nodes/types';

doc(
    'fluid',
    {
        description: "",
        numberOfInlets: 1,
        numberOfOutlets: 2,
        inletNames: ["trigger"]
    });

const device = (node: ObjectNode) => {
    node.needsLoad = true;

    node.attributes["width"] = 100;
    node.attributes["height"] = 100;

    let device: GPUDevice;
    let bufferA1: GPUBuffer;
    let bufferA2: GPUBuffer;
    let bufferA3: GPUBuffer;
    let bufferA4: GPUBuffer;
    let bufferB1: GPUBuffer;
    let bufferB2: GPUBuffer;
    let bufferB3: GPUBuffer;
    let bufferB4: GPUBuffer;
    let inputBuffer1: GPUBuffer;
    let outputBuffer1: GPUBuffer;
    let inputBuffer2: GPUBuffer;
    let outputBuffer2: GPUBuffer;
    let inputBuffer3: GPUBuffer;
    let outputBuffer3: GPUBuffer;
    let inputBuffer4: GPUBuffer;
    let outputBuffer4: GPUBuffer;
    let diffusionPipeline: GPUComputePipeline;
    let projectionAPipeline: GPUComputePipeline;
    let projectionBPipeline: GPUComputePipeline;
    let projectionCPipeline: GPUComputePipeline;
    let projectionA2Pipeline: GPUComputePipeline;
    let projectionB2Pipeline: GPUComputePipeline;
    let projectionC2Pipeline: GPUComputePipeline;
    let advectAPipeline: GPUComputePipeline;
    let advectBPipeline: GPUComputePipeline;
    let sourcePipeline: GPUComputePipeline;
    let matrixSize = 100;
    let bufferSize = 100;
    // Function to create a bind group

    function initializeBuffers() {
        // Create buffers for the first pair
        bufferA1 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        bufferB1 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        // Create buffers for the second pair
        bufferA2 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        bufferB2 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        bufferA3 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        bufferB3 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        bufferA4 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        bufferB4 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });


    }

    // Function to create a bind group
    function createBindGroup(pipeline: GPUComputePipeline, buffer1: GPUBuffer, buffer2: GPUBuffer, buffer3: GPUBuffer, buffer4: GPUBuffer) {
        return device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: buffer1 } },
                { binding: 1, resource: { buffer: buffer2 } },
                { binding: 2, resource: { buffer: buffer3 } },
                { binding: 3, resource: { buffer: buffer4 } },
            ],
        });
    }


    const setup = async () => {
        // Check WebGPU support
        if (!navigator.gpu) {
            console.error('WebGPU is not supported by this browser.');
            return;
        }

        // Initialize WebGPU
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            return;
        }
        device = await adapter.requestDevice();
        let width = node.attributes["width"] as number;
        let height = node.attributes["height"] as number;
        matrixSize = width * height;
        bufferSize = matrixSize * Float32Array.BYTES_PER_ELEMENT;
        console.log('matrix size=', matrixSize);
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" as GPUBufferBindingType }
                },
            ]
        });


        // Create two buffers for alternating between passes
        const bufferA = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        const bufferB = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });

        initializeBuffers();

        // Fill buffer A with initial data
        const initialData1 = new Float32Array(matrixSize).fill(.1); // Filling with 1s
        const initialData2 = new Float32Array(matrixSize).fill(.1); // Filling with 1s
        const initialData3 = new Float32Array(matrixSize).fill(.1); // Filling with 1s
        const initialData4 = new Float32Array(matrixSize).fill(.1); // Filling with 1s
        for (let i = 0; i < initialData2.length; i++) {
            initialData1[i] = Math.random();
            initialData3[i] = initialData1[i];
            initialData2[i] = Math.random();
            initialData4[i] = initialData2[i];
        }
        device.queue.writeBuffer(bufferA1, 0, initialData1.buffer);
        device.queue.writeBuffer(bufferA2, 0, initialData2.buffer);
        device.queue.writeBuffer(bufferA3, 0, initialData3.buffer);
        device.queue.writeBuffer(bufferA4, 0, initialData4.buffer);
        console.log('intialData = ', initialData1);

        // Create shader module and pipeline
        const diffusionModule = device.createShaderModule({ code: DIFFUSION_SHADER });
        diffusionPipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: diffusionModule,
                entryPoint: 'main',
            },
        });

        const sourceModule = device.createShaderModule({ code: ADD_SOURCE_SHADER });
        sourcePipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: sourceModule,
                entryPoint: 'main',
            },
        });


        let projectionShadersA = projection("u", "u_prev", "v", "v_prev");
        const projectionAModule = device.createShaderModule({ code: projectionShadersA[0] });
        projectionAPipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: projectionAModule,
                entryPoint: 'main',
            },
        });

        const projectionBModule = device.createShaderModule({ code: projectionShadersA[1] });
        projectionBPipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: projectionBModule,
                entryPoint: 'main',
            },
        });

        const projectionCModule = device.createShaderModule({ code: projectionShadersA[2] });
        projectionCPipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: projectionCModule,
                entryPoint: 'main',
            },
        });

        const advectAModule = device.createShaderModule({ code: ADVECT_A_SHADER });
        advectAPipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: advectAModule,
                entryPoint: 'main',
            },
        });

        const advectBModule = device.createShaderModule({ code: ADVECT_B_SHADER });
        advectBPipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: advectBModule,
                entryPoint: 'main',
            },
        });

        let projectionShadersB = projection("u_prev", "u", "v_prev", "v");
        const projectionA2Module = device.createShaderModule({ code: projectionShadersB[0] });
        projectionA2Pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: projectionA2Module,
                entryPoint: 'main',
            },
        });

        const projectionB2Module = device.createShaderModule({ code: projectionShadersB[1] });
        projectionB2Pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: projectionB2Module,
                entryPoint: 'main',
            },
        });

        const projectionC2Module = device.createShaderModule({ code: projectionShadersB[2] });
        projectionC2Pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
            compute: {
                module: projectionC2Module,
                entryPoint: 'main',
            },
        });


        // Run multiple passes, swapping buffers each time
        inputBuffer1 = bufferA1;
        outputBuffer1 = bufferB1;
        inputBuffer2 = bufferA2;
        outputBuffer2 = bufferB2;

        inputBuffer3 = bufferA3;
        outputBuffer3 = bufferB3;
        inputBuffer4 = bufferA4;
        outputBuffer4 = bufferB4;
    };

    const runPipeline = async (pipeline: GPUComputePipeline, numberOfPasses: number) => {
        for (let i = 0; i < numberOfPasses; i++) {
            const bindGroup = createBindGroup(pipeline, inputBuffer1, inputBuffer2, inputBuffer3, inputBuffer4);
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            let N = 100;
            const workgroupSize = 8; // This should match @workgroup_size in your WGSL code
            const numGroups = Math.ceil(N / workgroupSize); // N is the size of your grid

            passEncoder.dispatchWorkgroups(numGroups, numGroups);
            passEncoder.end();

            // Copy data to output buffers
            commandEncoder.copyBufferToBuffer(inputBuffer1, 0, outputBuffer1, 0, bufferSize);
            commandEncoder.copyBufferToBuffer(inputBuffer2, 0, outputBuffer2, 0, bufferSize);
            commandEncoder.copyBufferToBuffer(inputBuffer3, 0, outputBuffer3, 0, bufferSize);
            commandEncoder.copyBufferToBuffer(inputBuffer4, 0, outputBuffer4, 0, bufferSize);
            device.queue.submit([commandEncoder.finish()]);

            // Wait for the GPU to finish
            await device.queue.onSubmittedWorkDone();

            // Swap the buffers
            [inputBuffer1, outputBuffer1] = [outputBuffer1, inputBuffer1];
            [inputBuffer2, outputBuffer2] = [outputBuffer2, inputBuffer2];
            [inputBuffer3, outputBuffer3] = [outputBuffer3, inputBuffer3];
            [inputBuffer4, outputBuffer4] = [outputBuffer4, inputBuffer4];

        }
    };
    const pass = async () => {
        const iterations = 20;
        runPipeline(advectAPipeline, 1);
        runPipeline(advectBPipeline, 1);
        runPipeline(sourcePipeline, 1);
        runPipeline(diffusionPipeline, iterations);
        runPipeline(projectionAPipeline, 1);
        runPipeline(projectionBPipeline, iterations);
        runPipeline(projectionCPipeline, 1);
        const commandEncoder = device.createCommandEncoder();

        commandEncoder.copyBufferToBuffer(outputBuffer3, 0, inputBuffer1, 0, bufferSize);
        commandEncoder.copyBufferToBuffer(outputBuffer4, 0, inputBuffer2, 0, bufferSize);

        // Read the final output from the last input buffer
        const readbackBuffer1 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });

        const readbackBuffer2 = device.createBuffer({
            size: bufferSize,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });



        // Copy the final result to the readback buffer
        commandEncoder.copyBufferToBuffer(inputBuffer2, 0, readbackBuffer1, 0, bufferSize);
        commandEncoder.copyBufferToBuffer(inputBuffer4, 0, readbackBuffer2, 0, bufferSize);
        device.queue.submit([commandEncoder.finish()]);

        // Wait for the GPU to finish
        await device.queue.onSubmittedWorkDone();

        // Map and read the readback buffer
        await readbackBuffer1.mapAsync(GPUMapMode.READ);
        const arrayBuffer1 = readbackBuffer1.getMappedRange();
        const finalOutput1 = new Float32Array(arrayBuffer1.slice(0));
        readbackBuffer1.unmap();
        node.send(node.outlets[0], finalOutput1.slice(0));

        await readbackBuffer2.mapAsync(GPUMapMode.READ);
        const arrayBuffer2 = readbackBuffer2.getMappedRange();
        const finalOutput2 = new Float32Array(arrayBuffer2.slice(0));
        readbackBuffer2.unmap();
        node.send(node.outlets[1], finalOutput2.slice(0));

    };

    return (x: Message) => {
        if (!device) {
            setup();
            return [];
        }

        pass();
        return [];
    };
};
*/
export const api: API = {
  //fluid: device
};
