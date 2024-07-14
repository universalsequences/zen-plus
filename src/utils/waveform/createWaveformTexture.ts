import { DataTexture, RedFormat, FloatType, NearestFilter } from "three";

const cache: { [x: string]: Float32Array } = {};

export function createWaveformTexture(
  key: string,
  audioSamples: Float32Array,
  zoomLevel: number, // Zoom level (1.0 = all samples, >1 = zoomed in)
  textureWidth: number, // The width of the texture - how many pixels you have to display the waveform
): DataTexture {
  // The number of audio samples per pixel
  const samplesPerPixel = Math.floor(
    audioSamples.length / zoomLevel / textureWidth,
  );

  // The buffer for the texture data
  const textureData = cache[key] || new Float32Array(textureWidth);

  if (!cache[key]) {
    for (let i = 0; i < textureWidth; i++) {
      // Calculate the start and end sample index for this pixel
      const startSampleIndex = i * samplesPerPixel;
      const endSampleIndex = startSampleIndex + samplesPerPixel;

      // Initialize values for calculating RMS or peak
      let sumSquare = 0;

      let step = 1;
      if (samplesPerPixel > 10) {
        step = Math.ceil(samplesPerPixel / 10);
      }
      // Go through each sample in the chunk
      for (let j = startSampleIndex; j < endSampleIndex; j += step) {
        // If you want to use the peak value instead of RMS, uncomment the next two lines:
        // peak = Math.max(peak, Math.abs(audioSamples[j]));
        // continue;

        // For RMS: sum the squares of the sample values
        sumSquare += audioSamples[j] * audioSamples[j];
      }

      // Calculate the RMS value for this chunk of audio data
      // Uncomment the following line if you're using peak instead of RMS
      // textureData[i] = peak;
      textureData[i] = Math.sqrt(sumSquare / (samplesPerPixel / step));
      if (Number.isNaN(textureData[i])) {
        textureData[i] = 0;
      }

      const scaleExponent = 0.5;

      // Normalize the RMS value to the range of 0 to 1
      textureData[i] = textureData[i] ** scaleExponent;
    }
    cache[key] = new Float32Array(textureData);
  } else {
  }

  // Create the data texture from the RMS or peak data
  const texture = new DataTexture(
    textureData,
    textureWidth,
    1,
    RedFormat,
    FloatType,
  );

  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;

  return texture;
}
