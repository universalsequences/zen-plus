import { data, BlockGen } from "../data";

export interface MetallicWeb {
  neighbors: Float32Array;
  coeffs?: Float32Array;
  dampening?: Float32Array;
  maxNeighbors: number;
  size: number;
  neighborsMatrix: Level[];
  radius: number;
  noise?: number;
  data: BlockGen;
  dampeningData: BlockGen;
  pointsData?: BlockGen;
  points?: Float32Array;
  // New properties for metallic instruments
  stiffnessData?: BlockGen;
  stiffnessMap?: Float32Array;
  inharmonicityData?: BlockGen;
  inharmonicityMap?: Float32Array;
}

export interface WebConfig {
  numLevels: number;
  radius: number;
  instrumentType: "gong" | "ride" | "crash" | "hihat" | "china";
  centerStiffness?: number; // Stiffness at center
  edgeStiffness?: number; // Stiffness at edge
  centerDamping?: number; // Damping at center
  edgeDamping?: number; // Damping at edge
  rivets?: {
    // For riveted instruments like china cymbals
    count: number; // Number of rivets
    positions: number[]; // Relative positions (0-1)
  };
  bellSize?: number; // Relative size of the bell/dome (0-1)
  rimHeight?: number; // For cymbals with pronounced rims (0-1)
}

export type Structure = MetallicWeb;

type Level = number[];

export type Adjacency = {
  [key: number]: number[];
};

const mod = (x: number, n: number): number => ((x % n) + n) % n;

/**
 * Creates a web structure specifically designed for metallic percussion instruments
 * @param config - Configuration parameters for the metallic web
 */
export const createMetallicWeb = (config: WebConfig): MetallicWeb => {
  const { numLevels, radius, instrumentType } = config;

  // Default configurations based on instrument type
  const defaults: { [key: string]: Partial<WebConfig> } = {
    gong: {
      centerStiffness: 0.3,
      edgeStiffness: 0.2,
      centerDamping: 0.4,
      edgeDamping: 0.6,
      bellSize: 0.3,
    },
    ride: {
      centerStiffness: 0.9,
      edgeStiffness: 0.7,
      centerDamping: 0.2,
      edgeDamping: 0.1,
      bellSize: 0.25,
      rimHeight: 0.2,
    },
    crash: {
      centerStiffness: 0.7,
      edgeStiffness: 0.5,
      centerDamping: 0.1,
      edgeDamping: 0.05,
      bellSize: 0.15,
      rimHeight: 0.1,
    },
    hihat: {
      centerStiffness: 0.95,
      edgeStiffness: 0.9,
      centerDamping: 0.3,
      edgeDamping: 0.1,
      bellSize: 0.1,
      rimHeight: 0.15,
    },
    china: {
      centerStiffness: 0.8,
      edgeStiffness: 0.6,
      centerDamping: 0.15,
      edgeDamping: 0.05,
      bellSize: 0.2,
      rimHeight: 0.3,
      rivets: {
        count: 6,
        positions: [0.6, 0.65, 0.7, 0.75, 0.8, 0.85],
      },
    },
  };

  // Merge defaults with provided config
  const mergedConfig = { ...defaults[instrumentType], ...config };

  // We work by levels starting at the center
  let levels = [];
  let center = [];
  let coeffs = [];
  let mapping: Adjacency = {};
  const maxSize = 1 + radius * numLevels;

  // Initialize dampening array - metallic instruments have variable dampening
  // across the surface
  const dampening = new Float32Array(maxSize);

  // Initialize stiffness map - determines how rigid different parts are
  const stiffnessMap = new Float32Array(maxSize);

  // Initialize inharmonicity map - determines how much modes deviate from harmonic series
  const inharmonicityMap = new Float32Array(maxSize);

  // Initialize points for 2D visualization and excitation
  const points = new Float32Array(maxSize * 2);

  // Fill dampening, stiffness and inharmonicity maps based on instrument type
  for (let i = 0; i < maxSize; i++) {
    // Calculate relative distance from center (0-1)
    const relativeDistance = Math.min(i / maxSize, 1);

    // Dampening varies from center to edge
    dampening[i] = lerp(
      mergedConfig.centerDamping || 0.5,
      mergedConfig.edgeDamping || 0.5,
      relativeDistance,
    );

    // Stiffness varies from center to edge
    stiffnessMap[i] = lerp(
      mergedConfig.centerStiffness || 0.7,
      mergedConfig.edgeStiffness || 0.5,
      relativeDistance,
    );

    // For certain instruments, we want non-linear stiffness profiles
    if (instrumentType === "ride" || instrumentType === "crash") {
      // Bell region has higher stiffness
      const bellSize = mergedConfig.bellSize || 0.2;
      if (relativeDistance < bellSize) {
        stiffnessMap[i] *= 1.5; // Bell is stiffer
      }

      // Rim region also has higher stiffness
      const rimHeight = mergedConfig.rimHeight || 0.1;
      if (relativeDistance > 1 - rimHeight) {
        stiffnessMap[i] *= 1.3; // Rim is stiffer
      }
    } else if (instrumentType === "china") {
      // China cymbals have a distinctive upturn at the edge
      const rimHeight = mergedConfig.rimHeight || 0.3;
      if (relativeDistance > 1 - rimHeight) {
        stiffnessMap[i] *= 1.5; // Upturned edge is stiffer
      }
    }

    // Calculate inharmonicity based on instrument type
    switch (instrumentType) {
      case "gong":
        // Gongs have higher inharmonicity near the center and edge
        inharmonicityMap[i] = 0.3 + 0.4 * Math.abs(relativeDistance - 0.5);
        break;
      case "ride":
        // Rides have higher inharmonicity in the bell
        inharmonicityMap[i] = 0.7 + 0.2 * (1 - relativeDistance);
        break;
      case "crash":
        // Crashes have more uniform inharmonicity
        inharmonicityMap[i] = 0.6;
        break;
      case "hihat":
        // Hi-hats have higher inharmonicity overall
        inharmonicityMap[i] = 0.8;
        break;
      case "china":
        // China cymbals have complex inharmonicity pattern
        inharmonicityMap[i] = 0.7 + 0.2 * Math.sin(relativeDistance * Math.PI * 3);
        break;
      default:
        inharmonicityMap[i] = 0.5;
    }

    // Generate 2D points for visualization and excitation
    const angle = (i / maxSize) * Math.PI * 2 * (numLevels % 2 === 0 ? 1 : 1.5);
    const distanceFromCenter = Math.sqrt(relativeDistance);
    points[i * 2] = 0.5 + Math.cos(angle) * distanceFromCenter * 0.5; // x
    points[i * 2 + 1] = 0.5 + Math.sin(angle) * distanceFromCenter * 0.5; // y
  }

  // Generate center connections - metallic instruments need more connections at center
  for (let i = 0; i < radius; i++) {
    let neighbor = i + 1;
    center.push(neighbor);
    if (!mapping[neighbor]) {
      mapping[neighbor] = [];
    }
    mapping[neighbor].push(0);
  }

  // For metallic instruments, center coefficients are higher for stiffness
  for (let i = 0; i < maxSize; i++) {
    coeffs.push(i === 0 || i > radius ? 0 : 1.3); // Higher coefficient for metals
  }

  levels.push(center);
  let levelId = radius + 1;
  let currentId = 1;

  // Create the levels of the web with appropriate coefficients for metals
  for (let i = 0; i < numLevels; i++) {
    const relativeLevel = i / numLevels; // 0 at center, 1 at edge

    for (let j = 0; j < radius; j++) {
      let n1 = currentId + mod(j + 1, radius); // right
      let n2 = currentId + mod(j - 1, radius); // left
      let id = currentId + j; // current
      let nextLevel = levelId + j; // next
      let prev = mapping[id]; // prev

      // For metallic instruments, we want more cross-connections
      // especially for cymbals which have complex mode shapes
      let _level = new Array(radius + (instrumentType !== "gong" ? 2 : 0)).fill(-1);
      _level[0] = prev === undefined ? 0 : prev[0];
      _level[1] = nextLevel < maxSize ? nextLevel : n1;
      _level[2] = n2;
      _level[3] = nextLevel < maxSize ? n1 : -1;

      // Extra cross-connections for cymbals to create more complex mode patterns
      if (instrumentType !== "gong" && radius > 4) {
        _level[4] = currentId + mod(j + 2, radius); // Cross connection right
        _level[5] = currentId + mod(j - 2, radius); // Cross connection left
      }

      if (!mapping[nextLevel]) {
        mapping[nextLevel] = [];
      }
      mapping[nextLevel].push(id);

      if (!mapping[n1]) {
        mapping[n1] = [];
      }
      mapping[n1].push(id);

      if (!mapping[n2]) {
        mapping[n2] = [];
      }
      mapping[n2].push(id);

      if (nextLevel >= maxSize) {
        _level[3] = id;
      }

      levels.push(_level);
      let arr = new Array(maxSize).fill(0);

      // Coefficient calculation for metallic instruments
      // This is where we set how nodes interact, which affects the wave propagation
      for (let i = 0; i < _level.length; i++) {
        // Skip undefined connections
        if (_level[i] === -1) continue;

        // Base coefficient
        let coeff = 0.6;

        // Modify coefficient based on instrument type
        switch (instrumentType) {
          case "gong":
            // Gongs have more uniform coefficients
            coeff = 0.65;
            break;
          case "ride":
            // Rides have higher coefficients (stiffer)
            coeff = 0.75;
            break;
          case "crash":
            // Crashes have slightly lower coefficients than rides
            coeff = 0.7;
            break;
          case "hihat":
            // Hi-hats have very high coefficients (very stiff)
            coeff = 0.85;
            break;
          case "china":
            // China cymbals vary more with distance from center
            coeff = 0.7 + 0.1 * Math.sin(relativeLevel * Math.PI * 2);
            break;
        }

        arr[_level[i]] = coeff;
      }

      // Set connection strength based on relative level and instrument type
      if (nextLevel < maxSize) {
        if (relativeLevel <= 0.2) {
          // Center to near-center connections
          arr[_level[1]] = instrumentType === "gong" ? 2.5 : 4.0;
        } else if (relativeLevel < 0.5) {
          // Mid-center connections
          arr[_level[1]] = instrumentType === "gong" ? 1.2 : 1.5;
        } else {
          // Edge connections
          // Ride and crash cymbals have stiffer edges
          arr[_level[1]] = instrumentType === "ride" || instrumentType === "crash" ? 3.5 : 2.8;
        }
      }

      // Maintain consistent connections with previous level
      if (prev !== undefined) {
        for (let _prev of prev) {
          arr[_prev] = coeffs[_prev * maxSize + currentId + j];
        }
      }

      // Handle boundary conditions for different instruments
      if (nextLevel >= maxSize) {
        // For regular cymbals, edges reflect (free boundary)
        arr[id] = -1;

        // For china cymbals with upturned edges, modify the reflection
        if (instrumentType === "china") {
          arr[id] = -1.2; // Stronger reflection at the edges
        }
      }

      coeffs = [...coeffs, ...arr];
    }
    levelId = levelId + radius;
    currentId = currentId + radius;
  }

  // Add rivets for china cymbals or other special features
  if (instrumentType === "china" && mergedConfig.rivets) {
    const { count, positions } = mergedConfig.rivets;

    // Rivets modify the stiffness and damping in specific locations
    for (let i = 0; i < count; i++) {
      const pos = positions[i];
      const nodeIndex = Math.floor(pos * maxSize);

      if (nodeIndex < maxSize) {
        // Rivets increase local stiffness
        stiffnessMap[nodeIndex] *= 1.5;
        // Rivets also add some damping
        dampening[nodeIndex] *= 1.2;
      }
    }
  }

  let ogLevels = levels;
  levels = levels.flat(4);
  let size = maxSize;

  let cmat = [];
  for (let i = 0; i < coeffs.length; i += size) {
    let c = [];
    for (let j = 0; j < size; j++) {
      c.push(coeffs[i + j]);
    }
    cmat.push(c);
  }

  // For metallic instruments, we typically need more neighbors
  // to capture the complex modal behavior
  let maxNeighbors = radius + (instrumentType !== "gong" ? 2 : 0);
  let _coeffs = new Float32Array(coeffs);

  return {
    size,
    maxNeighbors,
    neighbors: new Float32Array(levels),
    dampening,
    coeffs: _coeffs,
    neighborsMatrix: ogLevels,
    radius,
    data: data(size, size, _coeffs, true, "none"),
    dampeningData: data(maxSize, 1, dampening, true, "none"),
    stiffnessMap,
    stiffnessData: data(maxSize, 1, stiffnessMap, true, "none"),
    inharmonicityMap,
    inharmonicityData: data(maxSize, 1, inharmonicityMap, true, "none"),
    points,
    pointsData: data(maxSize * 2, 1, points, true, "none"),
  };
};

// Helper function to interpolate between two values
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Convenience functions for creating specific metallic instruments
 */

export const createGongWeb2 = (size: number): MetallicWeb => {
  return createMetallicWeb({
    numLevels: 8, //Math.floor(size / 8),
    radius: 6,
    instrumentType: "gong",
    centerStiffness: 0.8,
    edgeStiffness: 0.2,
  });
};

export const createGongWeb = (size: number): MetallicWeb => {
  return createMetallicWeb({
    numLevels: 8,
    radius: 6,
    instrumentType: "gong",
    centerStiffness: 0.8,
    edgeStiffness: 0.2,
    centerDamping: 0.6, // Increased from 0.4
    edgeDamping: 0.8, // Increased from 0.6
  });
};

export const createRideCymbalWeb = (size: number): MetallicWeb => {
  return createMetallicWeb({
    numLevels: Math.floor(size / 10),
    radius: 10,
    instrumentType: "ride",
    centerStiffness: 0.9,
    edgeStiffness: 0.7,
    bellSize: 0.25,
  });
};

export const createCrashCymbalWeb = (size: number): MetallicWeb => {
  return createMetallicWeb({
    numLevels: Math.floor(size / 12),
    radius: 12,
    instrumentType: "crash",
    centerStiffness: 0.7,
    edgeStiffness: 0.5,
  });
};

export const createHiHatWeb = (size: number): MetallicWeb => {
  return createMetallicWeb({
    numLevels: Math.floor(size / 8),
    radius: 8,
    instrumentType: "hihat",
    centerStiffness: 0.95,
    edgeStiffness: 0.9,
  });
};

export const createChinaCymbalWeb = (size: number): MetallicWeb => {
  return createMetallicWeb({
    numLevels: Math.floor(size / 10),
    radius: 10,
    instrumentType: "china",
    centerStiffness: 0.8,
    edgeStiffness: 0.6,
    rimHeight: 0.3,
    rivets: {
      count: 6,
      positions: [0.6, 0.65, 0.7, 0.75, 0.8, 0.85],
    },
  });
};
