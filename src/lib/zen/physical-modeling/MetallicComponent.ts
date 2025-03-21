import { data, peek, poke, type BlockGen } from "../data";
import { mult, add, sub, exp, cos } from "../math";
import { sumLoop } from "../loop";
import { s } from "../seq";
import type { UGen, Arg } from "../zen";

export class MetallicComponent {
  numModes: number;
  sr: number; // Sample rate
  cData: BlockGen; // Coefficients: b0, a1, a2 per mode
  kData: BlockGen; // Coefficients: b0, a1, a2 per mode
  state: BlockGen; // State: y[n-1], y[n-2] per mode
  d0: Arg;
  f0: Arg;

  constructor(numModes: number, f0: Arg, d0: Arg) {
    this.numModes = numModes;
    const sr = 44100;
    this.sr = 44100;
    this.f0 = f0;
    this.d0 = d0;

    // Inharmonic frequency ratios for a gong-like sound
    const ratios = generateRatios(numModes);
    if (ratios.length < numModes) {
      throw new Error("Not enough frequency ratios for the number of modes.");
    }

    // Precompute k_i and c_i
    const k = new Float32Array(numModes);
    const c = new Float32Array(numModes);
    for (let i = 0; i < numModes; i++) {
      k[i] = ((2 * Math.PI) / sr) * ratios[i]; // For frequency
      c[i] = ratios[i] / sr; // For damping
    }
    this.kData = data(numModes, 1, k, true, "none"); // Store precomputed k_i
    this.cData = data(numModes, 1, c, true, "none"); // Store precomputed c_i

    // State buffer: 2 values (y[n-1], y[n-2]) per mode
    this.state = data(2 * numModes, 1, undefined, true, "none");
  }

  gen(input: UGen, f0: Arg = this.f0, d0: Arg = this.d0): UGen {
    // Compute output by summing all modes
    return s(
      input,
      mult(
        0.1,
        sumLoop({ min: 0, max: this.numModes }, (i: UGen) => {
          // Get precomputed values
          const k_i = peek(this.kData, i, 0); // k_i for frequency
          const c_i = peek(this.cData, i, 0); // c_i for damping

          // Compute damping term: r_i = exp(-d0 * c_i)
          const r_i = exp(mult(-1, d0, c_i));

          // Compute frequency term: theta_i = k_i * f0
          const theta_i = mult(k_i, f0);

          // Compute filter coefficients
          const a1_i = mult(-2, r_i, cos(theta_i));
          const a2_i = mult(r_i, r_i);

          // Load previous outputs from state
          const y2 = peek(this.state, i, 0); // y[n-2]
          const y1 = peek(this.state, add(i, this.numModes), 0); // y[n-1]

          // Compute current output
          const y = sub(input, add(mult(a1_i, y1), mult(a2_i, y2)));

          return s(
            poke(this.state, i, 0, y1), // y[n-2] = y[n-1]
            poke(this.state, add(i, this.numModes), 0, y), // y[n-1] = y[n]
            y,
          );
        }),
      ),
    );
  }
}

function generateRatios(numModes: number) {
  const b = 0.6;
  const ratios = Array.from({ length: numModes }, (_, n) => Math.pow(n + 1, b));
  return ratios;
}
