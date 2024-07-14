export const hashFloat32Array = (array: Float32Array | Uint8Array): number => {
  let hash = 0;
  const length = array.length;
  const sampleSize = Math.min(100, length); // Number of elements to sample

  for (let i = 0; i < sampleSize; i++) {
    const index = Math.floor((i / sampleSize) * length); // Evenly distribute sample points
    const value = array[index];

    // Mix the hash
    hash ^= (value * 0x10000000) | 0;
    hash = (hash << 5) - hash + value;
    hash |= 0; // Convert to 32bit integer
  }

  return hash;
};
