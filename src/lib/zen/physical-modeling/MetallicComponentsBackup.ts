import { data, peek, BlockGen, poke } from "../data";
import { MetallicWeb } from "./metallic-web-generator";
import { zswitch } from "../switch";
import { clamp, mult, atan, mix, sqrt, add, sub, div, pow, min, abs, sin } from "../math";
import { neq, eq } from "../compare";
import { sumLoop } from "../loop";
import { noise } from "../noise";
import { scale } from "../scale";
import { accum } from "../accum";
import { s } from "../seq";
import { UGen, Arg } from "../zen";

export interface MetallicMaterial {
  // Basic parameters
  pitch: Arg;
  release: Arg;
  x: Arg;
  y: Arg;
  noise: Arg;
  couplingCoefficient: Arg;

  // Metal-specific parameters
  stiffness: Arg; // Overall stiffness multiplier
  brightness: Arg; // Controls spectral content
  nonlinearity: Arg; // Controls chaotic behavior/shimmer
  inharmonicity: Arg; // Controls deviation from harmonic series
  modeCoupling: Arg; // Cross-modal interaction strength
  hfDamping: Arg; // High-frequency damping
  closedDamping?: Arg; // Special for hi-hats - damping when closed
}

interface Connection {
  component: MetallicComponent;
  neighbors: BlockGen;
}

export class MetallicComponent {
  isEntryPoint: boolean;
  material: MetallicMaterial;
  web: MetallicWeb;
  neighbors: BlockGen;
  coeffs: BlockGen;
  u: BlockGen;
  currentChannel: UGen;
  dampening: BlockGen;
  stiffness: BlockGen; // Reference to stiffness data
  inharmonicity: BlockGen; // Reference to inharmonicity data
  prevChannel: UGen;
  nt2: UGen; // damping
  p_eff: UGen; // pitch
  connections: Connection[];
  u_center: UGen;
  p0: UGen;
  tension: UGen;
  excitementEnergy?: UGen;
  time: UGen; // Time accumulator for complex modal behavior

  constructor(material: MetallicMaterial, web: MetallicWeb, isEntryPoint: boolean) {
    this.connections = [];
    this.isEntryPoint = isEntryPoint;

    this.material = material;
    this.web = web;

    // Set up the neighbors matrix from web
    this.neighbors = data(web.size * web.maxNeighbors, 1, web.neighbors, true, "none");

    // Set up coefficients from web
    this.coeffs = web.data;

    // Set up dampening from web
    this.dampening = web.dampeningData;

    // NEW: Access the stiffness and inharmonicity maps from the metallic web
    this.stiffness = web.stiffnessData!;
    this.inharmonicity = web.inharmonicityData!;

    // The dampening- i.e. "the release"
    this.nt2 = mix(pow(2, -8), pow(2, -13), material.release);

    // Contains the displacement data for 3 time steps (now, now-1, now-2)
    this.u = data(web.size, 3, undefined, true, "none");

    // Keep track of current index (so we know what channel to peek into U)
    this.currentChannel = accum(1, 0, { min: 0, max: 2, exclusive: false });
    this.prevChannel = sub(this.currentChannel, 1);

    // Using current index grab the center value for "now"
    this.u_center = peek(this.u, 0, this.prevChannel);

    // Initialize time accumulator for complex modal behaviors
    this.time = accum(1 / 44100, 0, { min: 0, max: 100000, exclusive: false });

    // For metallic instruments, tension is less important than stiffness
    // but we still need it for the basic wave equation
    let tense = 0.0999151;
    this.tension = mix(pow(2, -12), pow(2, -5), tense);
    this.p0 = mix(0.00000000000011044095, 0.01, material.pitch);

    // Effective pitch - but for metals this is more complex
    // and involves stiffness as well
    this.p_eff = min(
      0.47,
      add(this.p0, mult(material.stiffness, pow(mult(this.u_center, this.tension, 1), 2))),
    );
  }

  get size() {
    return this.web.size;
  }

  /**
   * Calculate the entire displacement across the network
   */
  gen(input: UGen) {
    if (this.isEntryPoint) {
      this.excitementEnergy = input;
    }

    // Update the time accumulator (for modal behavior)
    this.time = accum(0.1 / 44100.0, 0, { min: 0, max: 1000000, exclusive: false });

    console.log("this.time=", this.time);
    console.log("currentChannel", this.currentChannel);
    console.log("prevChanne;", this.prevChannel);
    console.log("input", input);
    console.log("nt2", this.nt2);
    console.log("ucenter", this.u_center);
    console.log("tension", this.tension);
    console.log("p0", this.p0);
    console.log("p_eff", this.p_eff);

    console.log(this);

    return s(
      this.time,
      this.currentChannel,
      this.prevChannel,
      input,
      this.nt2,
      this.u_center,
      this.tension,
      this.p0,
      this.p_eff,
      mult(
        div(200, this.size),
        sumLoop({ min: 0, max: this.size }, (idx: UGen) => this.nodeDisplacement(input, idx)),
      ),
    );
  }

  // Calculate the displacement for one node - metallic version
  nodeDisplacement(input: UGen, idx: UGen) {
    // Current displacement value at this node
    let val: UGen = peek(this.u, idx, this.prevChannel);

    // Previous displacement (t-2)
    let prev2 = peek(this.u, idx, sub(this.currentChannel, 2));

    // Get node-specific stiffness and inharmonicity from the web's stiffness map
    let nodeStiffness = peek(this.stiffness, idx, 0);
    let nodeInharmonicity = peek(this.inharmonicity, idx, 0);

    // Combined stiffness from material and node properties
    let combinedStiffness = mult(this.material.stiffness, nodeStiffness);

    // Combined inharmonicity from material and node properties
    let combinedInharmonicity = mult(this.material.inharmonicity, nodeInharmonicity);

    // Calculate neighbors contribution using the web structure
    let neighborsEnergy: UGen = this.calculateMetallicNeighborsEnergy(idx, val, input);

    // Excitement energy at this node - where the "strike" happens
    // This uses the 2D positions from the metallic web
    let energy = mult(input, this.lerpExcitementEnergy(idx, this.material.x, this.material.y));

    // Damping term - get specific damping for this node from the web
    let dampingBase = mix(
      pow(2, -8),
      pow(2, -13),
      mult(peek(this.dampening, idx, 0), this.material.release),
    );

    // For hi-hats - additional damping when closed
    let closedDamping = this.material.closedDamping ? this.material.closedDamping : 0;
    let nt2 = add(dampingBase, closedDamping);

    // METAL-SPECIFIC MODIFICATIONS:

    // 1. Stiffness term (4th-order spatial derivative approximation)
    // This is what gives metal its characteristic "ring"
    let stiffnessTerm = mult(
      combinedStiffness,
      // This approximates a biharmonic term (∇⁴u)
      sub(neighborsEnergy, mult(4, val)),
    );

    // 2. Nonlinearity term - essential for the characteristic "shimmer" of cymbals
    let nonlinearTerm = mult(this.material.nonlinearity, pow(val, 3));

    // 3. Inharmonicity term - creates the complex beating patterns
    let inharmonicityTerm = mult(
      combinedInharmonicity,
      sin(mult(val, add(1, mult(this.time, 0.01)))),
    );

    // 4. Mode coupling term - how different modes interact
    let modeCouplingTerm = mult(
      this.material.modeCoupling,
      // This creates interaction between nodes at different distances
      sin(add(mult(val, 5), mult(this.time, 0.1))),
    );

    // 5. High-frequency damping term
    let hfDampingTerm = mult(
      this.material.hfDamping,
      // Apply stronger damping to higher frequency oscillations
      mult(prev2, mult(val, val)),
    );

    // Combine all terms to calculate the next displacement
    // Based on the Kirchhoff-Love plate equation with nonlinear terms
    let current = div(
      add(
        mult(2, val), // 2*u(t)

        // Stiffness and neighbor energy terms
        mult(
          this.p_eff,
          add(
            // Basic wave propagation
            neighborsEnergy,
            // Input energy
            mult(1, energy),
            // Basic displacement
            mult(-4, val),
            // Additional stiffness term
            stiffnessTerm,
          ),
        ),

        // Metal-specific nonlinear terms
        nonlinearTerm,
        inharmonicityTerm,
        modeCouplingTerm,

        // Damping terms
        mult(-1, sub(1, nt2), prev2),
        hfDampingTerm,
      ),
      add(1, nt2), // damping denominator
    );

    // Use a custom waveshaping function to handle large displacements
    let shaped = div(atan(mult(0.6366197723675814, current)), 0.6366197723675814);

    // Store the result back in the buffer for the next time step
    return s(poke(this.u, idx, this.currentChannel, shaped), shaped);
  }

  // Calculate the neighbors energy contribution for metallic instruments
  calculateMetallicNeighborsEnergy(idx: UGen, val: UGen, input: UGen) {
    // Metal can have more chaotic noise behavior
    let noiseParam = min(20, this.material.noise);

    // Dynamic noise with time variation
    let noiseFactor = mult(
      scale(noise(), 0, 1, -1, 1),
      mult(noiseParam, add(1, mult(0.5, sin(mult(this.time, 0.1))))),
    );

    // Handle input energy from connected components
    if (this.connections[0] && this.connections[0].component.isEntryPoint) {
      input = this.connections[0].component.excitementEnergy!;
    }

    // Calculate the basic neighbor energy using the web structure
    let neighborsEnergy = mult(
      0.5,
      add(
        mult(mix(pow(input, 0.5), val, 1), noiseFactor),
        this.sumNeighbors(
          idx,
          this.prevChannel,
          this.web.maxNeighbors,
          this.u,
          this.neighbors,
          this.coeffs,
        ),
      ),
    );

    // Handle connections to other components (for multi-component instruments)
    for (let connection of this.connections) {
      let { component, neighbors } = connection;
      let connectedIdx = peek(neighbors, idx, 0);
      let isConnected = neq(connectedIdx, -1);
      let connectedValue = peek(component.u, connectedIdx, component.prevChannel);
      let displacementDiff = sub(connectedValue, val);

      // For metal-to-metal connections (like in hi-hats)
      let couplingForce = zswitch(
        isConnected,
        mult(
          displacementDiff,
          // Nonlinear coupling that varies with displacement
          mix(
            this.material.couplingCoefficient,
            mult(this.material.couplingCoefficient, 2),
            min(1, abs(displacementDiff)),
          ),
        ),
        0,
      );

      neighborsEnergy = add(neighborsEnergy, couplingForce);
    }

    return neighborsEnergy;
  }

  // Calculate excitement energy based on the 2D position data in the web
  lerpExcitementEnergy(idx: UGen, x: Arg, y: Arg): UGen {
    // Access the 2D position coordinates from the web's pointsData
    let xidx = mult(idx, 2);
    let x1 = peek(this.web.pointsData!, xidx, 0);
    let y1 = peek(this.web.pointsData!, add(xidx, 1), 0);

    // Calculate distance from strike position
    let distance = sqrt(add(pow(sub(x1, x), 2), pow(sub(y1, y), 2)));

    // Scale the energy based on distance
    let maxDistance = 80;
    let energy = clamp(sub(1, div(distance, maxDistance)), 0, 1);

    return energy;
  }

  // Calculate sum of neighbors contribution - similar to original implementation
  sumNeighbors(
    idx: Arg,
    prevChannel: Arg = this.prevChannel,
    maxNeighbors: number,
    u: BlockGen = this.u,
    neighbors: BlockGen = this.neighbors,
    coeffs: BlockGen = this.coeffs,
  ) {
    return sumLoop(
      {
        min: 0,
        max: maxNeighbors + 1,
      },
      (i) => {
        // Get the index of the i'th neighbor
        let neighbor = peek(neighbors, add(mult(maxNeighbors, idx), i), 0);

        // Get the coefficient for this neighbor-node pair
        let coeff = peek(coeffs, neighbor, idx);

        // Calculate contribution if it's a valid neighbor
        return s(
          zswitch(
            neq(neighbor, -1),
            mult(
              zswitch(
                eq(coeff, -1),
                // Boundary reflection for metals
                mult(-1, peek(u, idx, prevChannel)),
                // Normal neighbor contribution
                peek(u, neighbor, prevChannel),
              ),
              coeff,
            ),
            0,
          ),
        );
      },
    );
  }

  // Connect two metallic components
  bidirectionalConnect(component: MetallicComponent) {
    let neighborsA: Float32Array;
    let neighborsB: Float32Array;

    if (component.size < this.size) {
      let [A, B] = generateMetallicStructure(component, this);
      neighborsA = A;
      neighborsB = B;
    } else {
      let [B, A] = generateMetallicStructure(this, component);
      neighborsA = A;
      neighborsB = B;
    }

    let A = data(neighborsA.length, 1, neighborsA, true, "none");
    let B = data(neighborsB.length, 1, neighborsB, true, "none");

    this.connections.push({ component, neighbors: B });
    component.connections.push({ component: this, neighbors: A });
  }

  // Connect two components at specific points (for hi-hats)
  connectAtPoints(component: MetallicComponent, contactPoints: number[]) {
    // Create arrays to store the connection mapping between components
    const mySize = this.size;
    const otherSize = component.size;

    // Initialize arrays with -1 (no connection)
    let neighborsA = new Float32Array(mySize);
    let neighborsB = new Float32Array(otherSize);

    for (let i = 0; i < mySize; i++) {
      neighborsA[i] = -1; // Default: no connection
    }
    for (let i = 0; i < otherSize; i++) {
      neighborsB[i] = -1; // Default: no connection
    }

    // Create connections only at the specified contact points
    for (let point of contactPoints) {
      // Get the index in each component based on relative position
      const myIdx = Math.floor(point * mySize);
      const otherIdx = Math.floor(point * otherSize);

      // Create the connection if indices are valid
      if (myIdx >= 0 && myIdx < mySize && otherIdx >= 0 && otherIdx < otherSize) {
        neighborsA[myIdx] = otherIdx;
        neighborsB[otherIdx] = myIdx;
      }
    }

    // Create BlockGen data from arrays
    let A = data(neighborsA.length, 1, neighborsA, true, "none");
    let B = data(neighborsB.length, 1, neighborsB, true, "none");

    // Store the connections
    this.connections.push({ component, neighbors: B });
    component.connections.push({ component: this, neighbors: A });
  }
}

// Generate connection structure between two metallic components
export const generateMetallicStructure = (
  A: MetallicComponent,
  B: MetallicComponent,
): [Float32Array, Float32Array] => {
  let neighborsA = new Float32Array(A.size);
  let neighborsB = new Float32Array(B.size);

  // For metallic instruments, we might want different connection patterns

  // Initialize all to -1 (no connection)
  for (let i = 0; i < A.size; i++) {
    neighborsA[i] = -1;
  }
  for (let i = 0; i < B.size; i++) {
    neighborsB[i] = -1;
  }

  // Create a sparse connection pattern for metal instruments
  // (unlike membrane drums that need more continuous connection)
  const connectionDensity = 0.3; // 30% of points get connected
  const connectionCount = Math.floor(A.size * connectionDensity);

  // Connect evenly spaced points
  for (let i = 0; i < connectionCount; i++) {
    // Calculate indices with even spacing
    const idxA = Math.floor((i / connectionCount) * A.size);
    const idxB = Math.floor((i / connectionCount) * B.size);

    if (idxA < A.size && idxB < B.size) {
      neighborsA[idxA] = idxB;
      neighborsB[idxB] = idxA;
    }
  }

  return [neighborsA, neighborsB];
};
