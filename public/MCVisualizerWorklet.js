/*  Multi-channel RMS meter
    - Emits Float32Array [rms0, rms1, … rmsN] every 5 ms (window ≈ 220 samples @44.1 kHz)
*/
class MCVisualizerWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.winSamples = Math.round(sampleRate * 0.005); // 5 ms window
    this.sumsq = []; // per-channel running Σ(x²)
    this.count = 0; // samples accumulated so far
  }

  process(inputs) {
    const input = inputs[0]; // [[ch0-frames], [ch1-frames], …]
    const chs = input.length;
    if (!chs) return true; // nothing routed – keep processor alive

    // grow the per-channel buffer once if needed
    if (this.sumsq.length < chs) this.sumsq = new Float64Array(chs).fill(0);

    const frames = input[0].length;
    for (let ch = 0; ch < chs; ch++) {
      const buf = input[ch];
      if (!buf) continue; // channel not connected this block
      let sum = this.sumsq[ch];
      for (let i = 0; i < frames; i++) {
        const s = buf[i];
        sum += s * s; // Σ(x²)
      }
      this.sumsq[ch] = sum;
    }
    this.count += frames;

    // Send RMS once per window
    if (this.count >= this.winSamples) {
      const rms = new Float32Array(chs);
      for (let ch = 0; ch < chs; ch++) {
        rms[ch] = Math.sqrt(this.sumsq[ch] / this.count) || 0;
        this.sumsq[ch] = 0; // reset for next window
      }
      this.count = 0;
      this.port.postMessage(rms);
    }
    return true;
  }
}

registerProcessor("mc-visualizer-processor", MCVisualizerWorklet);
