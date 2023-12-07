// This is "processor.js" file, evaluated in AudioWorkletGlobalScope upon
// audioWorklet.addModule() call in the main global scope.

class VisualizerWorklet extends AudioWorkletProcessor {
    constructor() {
        super();

        this.sampleCount = 0;
        this.maxValue = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        let sampleRate = 44100; //this.context.sampleRate;

        for (let i = 0; i < input.length; i++) {
            for (let j = 0; j < input[i].length; j++) {
                if (Math.abs(input[i][j]) > Math.abs(this.maxValue)) {
                    this.maxValue = input[i][j];
                }
                this.sampleCount++;
                if (this.sampleCount >= sampleRate * 0.005) {
                    this.port.postMessage(this.maxValue);
                    this.maxValue = 0;
                    this.sampleCount = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('visualizer-processor', VisualizerWorklet);
