// This is "processor.js" file, evaluated in AudioWorkletGlobalScope upon
// audioWorklet.addModule() call in the main global scope.

class MetroWorklet extends AudioWorkletProcessor {
  constructor() {
    super();

    this.playing = true;
    this.sampleCount = 0;
    this.stepCounter = 0;
    
    this.bpm = 128;
    
    this.port.onmessage = (e) => {
      if (e.data.type === "bpm") {
        this.bpm = e.data.value;
      }
      if (e.data.type === "play") {
        this.playing = true;
      }
      if (e.data.type === "stop") {
        this.playing = false;
        this.sampleCount = 0;
        this.stepCounter = 0;
      }
    };
  }
  
  get divisor() {
    return ((7.5 * 44100) / this.bpm);
  }
  
  get lookahead() {
    return 256;
  }
  
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];

    let sampleRate = 44100; 

    if (!this.playing) {
      return true;
    }

    for (let i = 0; i < outputs.length; i++) {
      for (let j = 0; j < outputs[i].length; j++) {
        for (let k=0; k < outputs[i][j].length; k++) {
          this.sampleCount++;
          if (this.sampleCount % Math.floor(this.divisor) === Math.floor(this.divisor - this.lookahead)) {
            // calculate time til the thing
            let lookaheadTime = this.lookahead / 44100.0;
            this.stepCounter++;
            
            this.port.postMessage({
              time: currentTime + lookaheadTime,
              stepNumber: this.stepCounter
            });
          }
        }
      }
    }
    return true;
  }
}

registerProcessor('metro-processor', MetroWorklet);
